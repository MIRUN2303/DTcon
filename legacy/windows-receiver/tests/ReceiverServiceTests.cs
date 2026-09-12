using Dtcon.Receiver.Input;
using Dtcon.Receiver.Services;
using Xunit;

namespace Dtcon.Receiver.Tests;

public class ReceiverServiceTests
{
    private readonly FakeTransport _transport = new();
    private readonly FakeSink _sink = new();

    private ReceiverService CreateConnectedService()
    {
        var service = new ReceiverService(new ReceiverSettings(), _sink, _transport);
        service.Start();
        // Phone connects (subscribes) and completes handshake.
        _transport.ConnectAsync(0x1234u, "Phone");
        _transport.EmitPacket(Packets.Hello());
        Assert.Equal(ReceiverState.Connected, service.State);
        return service;
    }

    [Fact]
    public void HandshakeSendsHelloAckAndEntersConnected()
    {
        var service = CreateConnectedService();
        Assert.Contains(_transport.Writes, w => w.Length == 6 && w[1] == (byte)PacketType.HelloAck);
        service.Dispose();
    }

    [Fact]
    public void MouseMoveDispatchesToSinkAndSyncsButtons()
    {
        var service = CreateConnectedService();
        _transport.EmitPacket(Packets.Move(-40, 25, (int)MouseButtonId.Left));

        Assert.Contains(_sink.Calls, c => c.Kind == "move" && c.A == -40 && c.B == 25);
        Assert.Equal(1, _sink.ButtonEvents(MouseButtonId.Left));
        service.Dispose();
    }

    [Fact]
    public void ButtonDownThenDisconnectReleasesHeldButtons()
    {
        var service = CreateConnectedService();
        _transport.EmitPacket(Packets.Button(MouseButtonId.Left, true));
        _transport.EmitPacket(Packets.Button(MouseButtonId.Forward, true));
        Assert.Equal(1, _sink.ButtonEvents(MouseButtonId.Left));
        Assert.Equal(1, _sink.ButtonEvents(MouseButtonId.Forward));

        _transport.Disconnect(); // link dropped e.g. phone killed

        Assert.Equal(2, _sink.ButtonEvents(MouseButtonId.Left));  // down + release
        Assert.Equal(2, _sink.ButtonEvents(MouseButtonId.Forward));
        Assert.Equal(ReceiverState.Disconnected, service.State);
        service.Dispose();
    }

    [Fact]
    public void StaleOrDuplicatePacketsAreIgnored()
    {
        var service = CreateConnectedService();
        _transport.EmitPacket(Packets.Button(MouseButtonId.Right, true, seq: 10));
        _transport.EmitPacket(Packets.Button(MouseButtonId.Right, true, seq: 10)); // duplicate seq
        _transport.EmitPacket(Packets.Button(MouseButtonId.Right, false, seq: 9)); // older seq

        // Only the seq=10 press was real; duplicate and the older packet were dropped.
        Assert.Equal(1, _sink.ButtonEvents(MouseButtonId.Right));
        service.Dispose();
    }

    [Fact]
    public void InvalidPacketIsDroppedWithoutEffect()
    {
        var service = CreateConnectedService();
        var callsBefore = _sink.Calls.Count;

        _transport.EmitPacket(Packets.Raw(0xFF, 0x10, 0x00, 0x01, 0x00, 0x00)); // bad version
        _transport.EmitPacket(Packets.Raw(0x01, 0x2A, 0x00, 0x01, 0x00, 0x00)); // unknown type

        Assert.Equal(callsBefore, _sink.Calls.Count);
        service.Dispose();
    }

    [Fact]
    public void ScrollAndNavigationDispatch()
    {
        var service = CreateConnectedService();

        _transport.EmitPacket(Packets.Scroll(0, -120));
        _transport.EmitPacket(Packets.Nav(NavAction.Back));
        _transport.EmitPacket(Packets.Nav(NavAction.Next));

        Assert.Contains(_sink.Calls, c => c.Kind == "scroll" && c.B == -120);
        Assert.Contains(_sink.Calls, c => c.Kind == "nav" && c.A == (int)NavAction.Back);
        Assert.Contains(_sink.Calls, c => c.Kind == "nav" && c.A == (int)NavAction.Next);
        service.Dispose();
    }
}