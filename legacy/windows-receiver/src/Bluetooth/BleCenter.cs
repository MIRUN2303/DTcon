namespace Dtcon.Receiver.Bluetooth;

/// <summary>
/// Thin WinRT wrapper around the DTCON peripheral: scan for the service UUID,
/// connect, subscribe to TX notifications, write to RX. Events fire on
/// arbitrary threads by design; callers marshal as needed.
/// </summary>
public sealed class BleCenter : IBleTransport, IDisposable
{
    private readonly BluetoothLEAdvertisementWatcher _watcher;
    private BluetoothLEDevice? _device;
    private GattCharacteristic? _tx;
    private GattCharacteristic? _rx;
    private GattSession? _session;
    private bool _wasConnected;
    private bool _disposed;

    /// <summary>Raised repeatedly while scanning for each advertisement carrying the DTCON service UUID.</summary>
    public event Action<ulong, string>? DeviceDiscovered;

    /// <summary>Raised once the phone is connected and subscribed to TX.</summary>
    public event Action<string>? Connected;

    /// <summary>Raised when the link drops or is torn down while it was up.</summary>
    public event Action? Disconnected;

    /// <summary>Raw bytes of one TX notification from the phone.</summary>
    public event Action<byte[]>? PacketReceived;

    public BleCenter()
    {
        _watcher = new BluetoothLEAdvertisementWatcher
        {
            ScanningMode = BluetoothLEScanningMode.Active,
        };
        _watcher.AdvertisementFilter.Advertisement.ServiceUuids.Add(new Guid(ProtocolConstants.ServiceUuid));
        _watcher.Received += OnWatcherReceived;
    }

    public bool IsConnected => _wasConnected;

    public void StartScanning()
    {
        if (_disposed) return;
        if (_watcher.Status != BluetoothLEAdvertisementWatcherStatus.Started)
            _watcher.Start();
    }

    public void StopScanning()
    {
        if (_watcher.Status == BluetoothLEAdvertisementWatcherStatus.Started)
            _watcher.Stop();
    }

    private void OnWatcherReceived(
        BluetoothLEAdvertisementWatcher sender,
        BluetoothLEAdvertisementReceivedEventArgs args)
    {
        if (!args.Advertisement.ServiceUuids.Contains(new Guid(ProtocolConstants.ServiceUuid))) return;
        DeviceDiscovered?.Invoke(args.BluetoothAddress, args.Advertisement.LocalName ?? string.Empty);
    }

    /// <summary>
    /// Connects to the phone at <paramref name="address"/>, discovers the DTCON
    /// service, subscribes to TX and starts a GattSession. Returns false on any
    /// failure (link is cleaned up either way).
    /// </summary>
    public async Task<bool> ConnectAsync(ulong address, string deviceName, CancellationToken ct = default)
    {
        StopScanning();
        Cleanup(false);

        var device = await BluetoothLEDevice.FromBluetoothAddressAsync(address).AsTask(ct);
        if (_disposed || device is null) return false;
        _device = device;
        device.ConnectionStatusChanged += OnDeviceConnectionStatusChanged;

        var services = await device.GetGattServicesForUuidAsync(new Guid(ProtocolConstants.ServiceUuid), BluetoothCacheMode.Uncached).AsTask(ct);
        if (services.Status != GattCommunicationStatus.Success || services.Services.Count == 0)
        {
            Cleanup(false);
            return false;
        }
        var service = services.Services[0];

        var tx = await service.GetCharacteristicsForUuidAsync(new Guid(ProtocolConstants.TxUuid)).AsTask(ct);
        var rx = await service.GetCharacteristicsForUuidAsync(new Guid(ProtocolConstants.RxUuid)).AsTask(ct);
        if (tx.Status != GattCommunicationStatus.Success || tx.Characteristics.Count == 0
            || rx.Status != GattCommunicationStatus.Success || rx.Characteristics.Count == 0)
        {
            Cleanup(false);
            return false;
        }

        _tx = tx.Characteristics[0];
        _rx = rx.Characteristics[0];
        _tx.ValueChanged += OnTxValueChanged;

        var subscribe = await _tx.WriteClientCharacteristicConfigurationDescriptorAsync(
            GattClientCharacteristicConfigurationDescriptorValue.Notify).AsTask(ct);
        if (subscribe != GattCommunicationStatus.Success)
        {
            Cleanup(false);
            return false;
        }

        _session = await GattSession.FromDeviceIdAsync(device.DeviceId).AsTask(ct);
        _session!.MaintainConnection = true;
        _session.SessionStatusChanged += OnSessionStatusChanged;

        _wasConnected = true;
        Connected?.Invoke(deviceName);
        return true;
    }

    /// <summary>Best-effort write to the RX characteristic (write-without-response).</summary>
    public async Task<bool> WriteAsync(byte[] payload)
    {
        if (_rx is null || _disposed) return false;
        try
        {
            using var writer = new DataWriter();
            writer.WriteBytes(payload);
            var status = await _rx.WriteValueAsync(writer.DetachBuffer(), GattWriteOption.WriteWithoutResponse);
            return status == GattCommunicationStatus.Success;
        }
        catch
        {
            return false;
        }
    }

    public void Disconnect()
    {
        Cleanup(true);
    }

    private void OnTxValueChanged(GattCharacteristic sender, GattValueChangedEventArgs args)
    {
        PacketReceived?.Invoke(ToBytes(args.CharacteristicValue));
    }

    private void OnDeviceConnectionStatusChanged(BluetoothLEDevice device, object args)
    {
        if (device.ConnectionStatus == BluetoothConnectionStatus.Disconnected)
            Cleanup(true);
    }

    private void OnSessionStatusChanged(GattSession session, object args)
    {
        if (session.SessionStatus == GattSessionStatus.Closed)
            Cleanup(true);
    }

    private void Cleanup(bool raiseDisconnect)
    {
        var wasConnected = _wasConnected;
        _wasConnected = false;

        if (_watcher.Status == BluetoothLEAdvertisementWatcherStatus.Started)
            _watcher.Stop();

        if (_session is not null)
        {
            _session.SessionStatusChanged -= OnSessionStatusChanged;
            _session.Dispose();
            _session = null;
        }
        if (_tx is not null)
        {
            _tx.ValueChanged -= OnTxValueChanged;
            try { _ = _tx.WriteClientCharacteristicConfigurationDescriptorAsync(GattClientCharacteristicConfigurationDescriptorValue.None); }
            catch { /* best effort unsubscribe */ }
            _tx = null;
        }
        _rx = null;
        if (_device is not null)
        {
            _device.ConnectionStatusChanged -= OnDeviceConnectionStatusChanged;
            _device.Dispose();
            _device = null;
        }

        if (raiseDisconnect && wasConnected)
            Disconnected?.Invoke();
    }

    private static byte[] ToBytes(IBuffer buffer)
    {
        var reader = DataReader.FromBuffer(buffer);
        var bytes = new byte[reader.UnconsumedBufferLength];
        reader.ReadBytes(bytes);
        return bytes;
    }

    public void Dispose()
    {
        if (_disposed) return;
        _disposed = true;
        _watcher.Stop();
        _watcher.Received -= OnWatcherReceived;
        Cleanup(false);
    }
}