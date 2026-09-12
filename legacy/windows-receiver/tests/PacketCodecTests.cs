using Dtcon.Receiver.Protocol;
using Xunit;

namespace Dtcon.Receiver.Tests;

public class PacketCodecTests
{
    [Theory]
    [InlineData(PacketType.Hello)]
    [InlineData(PacketType.HelloAck)]
    [InlineData(PacketType.Ping)]
    [InlineData(PacketType.Pong)]
    [InlineData(PacketType.Disconnect)]
    public void RoundTripsEmptyPayloadPackets(PacketType type)
    {
        var wire = PacketCodec.Encode((byte)type, 0x00, 7);
        Assert.True(PacketCodec.TryDecode(wire, out var packet, out var error), error.ToString());
        Assert.Equal(type, (PacketType)packet!.Type);
        Assert.Equal(7, packet.Sequence);
        Assert.Empty(packet.Payload);
    }

    [Fact]
    public void RoundTripsMouseMovePayload()
    {
        short dx = -320, dy = 12345;
        var payload = new byte[]
        {
            (byte)(dx & 0xFF), (byte)((dx >> 8) & 0xFF),
            (byte)(dy & 0xFF), (byte)((dy >> 8) & 0xFF),
            0x0B, 0x00,
        };
        var wire = PacketCodec.Encode((byte)PacketType.MouseMove, 0, 9, payload);

        Assert.True(PacketCodec.TryDecode(wire, out var packet, out var error), error.ToString());
        Assert.Equal(PacketError.None, error);
        Assert.Equal(PacketType.MouseMove, (PacketType)packet!.Type);
        Assert.Equal(-320, PacketCodec.ReadI16(packet.Payload, 0));
        Assert.Equal(12345, PacketCodec.ReadI16(packet.Payload, 2));
        Assert.Equal(0x0B, packet.Payload[4]);
    }

    [Fact]
    public void RejectsBadVersion()
    {
        var wire = Packets.Raw(0xFF, 0x01, 0x00, 0x01, 0x00, 0x00);
        Assert.False(PacketCodec.TryDecode(wire, out _, out var error));
        Assert.Equal(PacketError.BadVersion, error);
    }

    [Fact]
    public void RejectsLengthMismatch()
    {
        var wire = Packets.Raw(0x01, 0x10, 0x00, 0x01, 0x05, 0x00, 0x00, 0x00); // claims 5, carries 2
        Assert.False(PacketCodec.TryDecode(wire, out _, out var error));
        Assert.Equal(PacketError.BadLength, error);
    }

    [Fact]
    public void RejectsTruncatedHeader()
    {
        var wire = Packets.Raw(0x01, 0x01, 0x00, 0x01);
        Assert.False(PacketCodec.TryDecode(wire, out _, out var error));
        Assert.Equal(PacketError.Truncated, error);
    }

    [Fact]
    public void RejectsUnknownType()
    {
        // 0x2A is not a defined type
        var wire = Packets.Raw(0x01, 0x2A, 0x00, 0x01, 0x00, 0x00);
        Assert.False(PacketCodec.TryDecode(wire, out _, out var error));
        Assert.Equal(PacketError.UnknownType, error);
    }

    [Fact]
    public void RejectsPayloadOverMtu()
    {
        Assert.Throws<ArgumentOutOfRangeException>(() =>
            PacketCodec.Encode((byte)PacketType.Hello, 0, 0, new byte[15]));
    }
}