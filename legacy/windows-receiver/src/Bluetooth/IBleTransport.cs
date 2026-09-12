namespace Dtcon.Receiver.Bluetooth;

/// <summary>
/// Transport seam used by <see cref="Services.ReceiverService"/>. The real
/// implementation is <see cref="BleCenter"/> (WinRT); tests substitute a fake.
/// All events may fire on arbitrary threads.
/// </summary>
public interface IBleTransport : IDisposable
{
    event Action<ulong, string>? DeviceDiscovered;
    event Action<string>? Connected;
    event Action? Disconnected;
    event Action<byte[]>? PacketReceived;

    void StartScanning();
    Task<bool> ConnectAsync(ulong address, string deviceName, CancellationToken ct = default);
    Task<bool> WriteAsync(byte[] payload);
    void Disconnect();
}