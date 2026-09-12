namespace Dtcon.Receiver.Services;

public enum ReceiverState
{
    Scanning,
    Connecting,
    Connected,
    Disconnected,
}

/// <summary>
/// Owns the receiver lifecycle: (re)scan loop → connect → handshake → packet
/// dispatch. Enforces connection safety (validate, stale-sequence rejection,
/// release-all-on-disconnect) before any input lands.
/// </summary>
public sealed class ReceiverService : IDisposable
{
    private readonly IBleTransport _ble;
    private readonly InputState _state;
    private readonly IInputSink _sink;
    private readonly ReceiverSettings _settings;
    private readonly object _lock = new();

    private ulong _seenAddress;
    private string _seenName = string.Empty;
    private bool _connecting;
    private bool _disposed;
    private byte _inSequence;
    private byte _outSequence;
    private bool _haveSession;

    public event Action<ReceiverState, string>? StateChanged;
    public event Action<string>? LogLine;

    public ReceiverService(ReceiverSettings settings, IInputSink sink, IBleTransport? transport = null)
    {
        _settings = settings;
        _sink = sink;
        _state = new InputState(sink);
        _ble = transport ?? new BleCenter();
        _ble.DeviceDiscovered += OnDeviceDiscovered;
        _ble.Connected += OnLinkConnected;
        _ble.Disconnected += OnLinkDisconnected;
        _ble.PacketReceived += OnPacketReceived;
    }

    public ReceiverState State { get; private set; } = ReceiverState.Scanning;
    public string DeviceName { get; private set; } = string.Empty;

    public void Start()
    {
        Log("Receiver started. Scanning for DTCON device…");
        SetState(ReceiverState.Scanning, string.Empty);
        _ble.StartScanning();

        if (_settings.LastAddress is { } address)
        {
            _ = Task.Run(() => ConnectLoop(address, _settings.LastName ?? string.Empty));
        }
    }

    private async Task ConnectLoop(ulong address, string name)
    {
        if (!TryBeginConnect()) return;
        try
        {
            SetState(ReceiverState.Connecting, name);
            Log($"Connecting to {name ?? address.ToString()}…");
            var ok = await _ble.ConnectAsync(address, name);
            if (ok)
            {
                _seenAddress = address;
                _seenName = name;
                _settings.LastAddress = address;
                _settings.LastName = name;
                _settings.Save();
            }
            else
            {
                Log("Connect failed, rescanning…");
                EndConnect();
                _ble.StartScanning();
            }
        }
        catch (Exception ex)
        {
            Log($"Connect error: {ex.Message}");
            EndConnect();
            _ble.StartScanning();
        }
    }

    private void OnDeviceDiscovered(ulong address, string name)
    {
        lock (_lock)
        {
            if (_connecting || State == ReceiverState.Connected) return;
            _seenAddress = address;
            _seenName = name;
        }
        Log($"Found device: {name} ({address})");
        _ = Task.Run(() => ConnectLoop(address, name));
    }

    private bool TryBeginConnect()
    {
        lock (_lock)
        {
            if (_connecting) return false;
            _connecting = true;
            return true;
        }
    }

    private void EndConnect()
    {
        lock (_lock)
        {
            _connecting = false;
        }
    }

    private void OnLinkConnected(string name)
    {
        _haveSession = false;
        _inSequence = 0;
        _outSequence = 0;
        Log($"GATT connected: {name}. Waiting for handshake…");
        SetState(ReceiverState.Connecting, name);
    }

    private void OnLinkDisconnected()
    {
        // Safety first: on any lost link, release every held button before
        // anything else, so a dead phone can never leave a mouse button stuck.
        _state.Reset();
        _haveSession = false;
        _inSequence = 0;
        _outSequence = 0;
        SetState(ReceiverState.Disconnected, _seenName);
        Log("Link closed — released held buttons. Rescanning…");
        _ble.StartScanning();
    }

    private void OnPacketReceived(byte[] bytes)
    {
        if (!PacketCodec.TryDecode(bytes, out var packet, out var error))
        {
            Log($"Rejected invalid packet: {error}");
            return;
        }
        if (!IsCurrent(packet!.Sequence))
        {
            Log($"Dropped stale/duplicate packet seq={packet.Sequence} type=0x{packet.Type:X2}");
            return;
        }

        switch (packet.Type)
        {
            case (byte)PacketType.Hello:
                OnHandshake();
                break;
            case (byte)PacketType.Ping:
                Send(PacketCodec.Encode((byte)PacketType.Pong, 0, NextSequence()));
                break;
            case (byte)PacketType.MouseMove:
                HandleMove(packet);
                break;
            case (byte)PacketType.MouseButton:
                HandleButton(packet);
                break;
            case (byte)PacketType.MouseScroll:
                HandleScroll(packet);
                break;
            case (byte)PacketType.MouseNav:
                HandleNav(packet);
                break;
            case (byte)PacketType.Disconnect:
                Log("Phone requested disconnect.");
                _ble.Disconnect(); // event path (OnLinkDisconnected) handles cleanup + release
                break;
            default:
                Log($"Ignored packet type 0x{packet.Type:X2} (reserved/unknown)");
                break;
        }
    }

    private void OnHandshake()
    {
        if (_haveSession)
        {
            Log("Duplicate HELLO ignored.");
            return;
        }
        _haveSession = true;
        Send(PacketCodec.Encode((byte)PacketType.HelloAck, 0, NextSequence()));
        SetState(ReceiverState.Connected, _seenName);
        Log($"Connected to {_seenName}. Mouse input active.");
    }

    private void HandleMove(Packet p)
    {
        var dx = PacketCodec.ReadI16(p.Payload, 0);
        var dy = PacketCodec.ReadI16(p.Payload, 2);
        var buttons = p.Payload.Length >= 5 ? p.Payload[4] : 0;
        _state.Sync(buttons);
        if (dx != 0 || dy != 0) _sink.Move(dx, dy);
    }

    private void HandleButton(Packet p)
    {
        if (p.Payload.Length < 2) return;
        _state.Apply((MouseButtonId)p.Payload[0], p.Payload[1] != 0);
    }

    private void HandleScroll(Packet p)
    {
        var dx = PacketCodec.ReadI16(p.Payload, 0);
        var dy = PacketCodec.ReadI16(p.Payload, 2);
        if (dx != 0 || dy != 0) _sink.Scroll(dx, dy);
    }

    private void HandleNav(Packet p)
    {
        if (p.Payload.Length < 1) return;
        var action = (NavAction)p.Payload[0];
        if (Enum.IsDefined(typeof(NavAction), action))
            _sink.Navigate(action);
    }

    private bool IsCurrent(byte sequence)
    {
        if (!_haveSession) return true; // pre-handshake packets are transcripts, not stale
        if (sequence == _inSequence) return false;
        var delta = (sbyte)(sequence - _inSequence);
        if (delta <= 0) return false;
        _inSequence = sequence;
        return true;
    }

    private byte NextSequence()
    {
        _outSequence++;
        return _outSequence;
    }

    private void Send(byte[] bytes)
    {
        _ = _ble.WriteAsync(bytes);
    }

    /// <summary>User action: forcible disconnect and scratch the remembered device.</summary>
    public void UserDisconnect()
    {
        _ble.Disconnect();
        lock (_lock)
        {
            _seenAddress = 0;
            _settings.LastAddress = null;
            _settings.LastName = null;
            _settings.Save();
        }
        SetState(ReceiverState.Disconnected, string.Empty);
        Log("Disconnected by user.");
        _ble.StartScanning();
    }

    /// <summary>User action: forget nothing, just reconnect to the last device.</summary>
    public void Reconnect()
    {
        _ble.Disconnect();
        if (_settings.LastAddress is { } address)
        {
            _seenAddress = address;
            _seenName = _settings.LastName ?? string.Empty;
            _ = Task.Run(() => ConnectLoop(address, _seenName));
        }
        else
        {
            _ble.StartScanning();
        }
    }

    private void SetState(ReceiverState state, string name)
    {
        State = state;
        DeviceName = name;
        StateChanged?.Invoke(state, name);
    }

    private void Log(string line)
    {
        LogLine?.Invoke(line);
    }

    public void Dispose()
    {
        if (_disposed) return;
        _disposed = true;
        _state.Reset();
        _ble.Dispose();
    }
}