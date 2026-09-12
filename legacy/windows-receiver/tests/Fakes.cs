using Dtcon.Receiver.Bluetooth;
using Dtcon.Receiver.Input;

namespace Dtcon.Receiver.Tests;

public sealed class FakeTransport : IBleTransport
{
    public event Action<ulong, string>? DeviceDiscovered;
    public event Action<string>? Connected;
    public event Action? Disconnected;
    public event Action<byte[]>? PacketReceived;

    public List<byte[]> Writes { get; } = new();
    public bool ConnectedDevice { get; private set; }

    public void StartScanning() { }

    public Task<bool> ConnectAsync(ulong address, string deviceName, CancellationToken ct = default)
    {
        ConnectedDevice = true;
        Connected?.Invoke(deviceName);
        return Task.FromResult(true);
    }

    public Task<bool> WriteAsync(byte[] payload)
    {
        Writes.Add(payload);
        return Task.FromResult(true);
    }

    public void Disconnect()
    {
        ConnectedDevice = false;
        Disconnected?.Invoke();
    }

    public void EmitPacket(byte[] bytes) => PacketReceived?.Invoke(bytes);

    public void Dispose() { }
}

public sealed class FakeSink : IInputSink
{
    public record Call(string Kind, int A, int B);

    public List<Call> Calls { get; } = new();

    public void Move(int dx, int dy) => Calls.Add(new Call("move", dx, dy));
    public void Button(MouseButtonId button, bool pressed) => Calls.Add(new Call("btn", (int)button, pressed ? 1 : 0));
    public void Scroll(int dx, int dy) => Calls.Add(new Call("scroll", dx, dy));
    public void Navigate(NavAction action) => Calls.Add(new Call("nav", (int)action, 0));

    public int ButtonEvents(MouseButtonId id) => Calls.Count(c => c.Kind == "btn" && c.A == (int)id);
}

public static class Packets
{
    public static byte[] Hello(byte seq = 1) => PacketCodec.Encode((byte)PacketType.Hello, 0, seq);
    public static byte[] Ping(byte seq = 2) => PacketCodec.Encode((byte)PacketType.Ping, 0, seq);
    public static byte[] Move(short dx, short dy, byte buttons = 0, byte seq = 3) =>
        PacketCodec.Encode((byte)PacketType.MouseMove, 0, seq, new byte[]
        {
            (byte)(dx & 0xFF), (byte)((dx >> 8) & 0xFF),
            (byte)(dy & 0xFF), (byte)((dy >> 8) & 0xFF),
            buttons, 0,
        });
    public static byte[] Button(MouseButtonId id, bool pressed, byte seq = 4) =>
        PacketCodec.Encode((byte)PacketType.MouseButton, 0, seq, new[] { (byte)id, (byte)(pressed ? 1 : 0) });
    public static byte[] Scroll(short dx, short dy, byte seq = 5) =>
        PacketCodec.Encode((byte)PacketType.MouseScroll, 0, seq, new byte[]
        {
            (byte)(dx & 0xFF), (byte)((dx >> 8) & 0xFF),
            (byte)(dy & 0xFF), (byte)((dy >> 8) & 0xFF), 0,
        });
    public static byte[] Nav(NavAction action, byte seq = 6) =>
        PacketCodec.Encode((byte)PacketType.MouseNav, 0, seq, new[] { (byte)action });

    public static byte[] Raw(params byte[] bytes) => bytes;
}