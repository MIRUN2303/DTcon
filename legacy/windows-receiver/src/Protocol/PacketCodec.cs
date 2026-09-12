namespace Dtcon.Receiver.Protocol;

public enum PacketError
{
    None,
    Truncated,
    BadVersion,
    BadLength,
    UnknownType,
    PayloadTooLong,
}

/// <summary>A decoded DTCON packet. The 6-byte header minus payload.</summary>
public sealed class Packet
{
    public Packet(byte type, byte flags, byte sequence, byte[] payload)
    {
        Type = type;
        Flags = flags;
        Sequence = sequence;
        Payload = payload;
    }

    public byte Type { get; }
    public byte Flags { get; }
    public byte Sequence { get; }
    public byte[] Payload { get; }

    public bool AckRequested => (Flags & ProtocolConstants.FlagAckRequested) != 0;
}

public static class PacketCodec
{
    /// <summary>Encodes <paramref name="payload"/> with the fixed header, little-endian length.</summary>
    public static byte[] Encode(byte type, byte flags, byte sequence, ReadOnlySpan<byte> payload)
    {
        if (payload.Length > ProtocolConstants.MaxPayload)
            throw new ArgumentOutOfRangeException(nameof(payload), $"payload > {ProtocolConstants.MaxPayload} bytes");

        var buf = new byte[ProtocolConstants.HeaderSize + payload.Length];
        buf[0] = ProtocolConstants.Version;
        buf[1] = type;
        buf[2] = flags;
        buf[3] = sequence;
        buf[4] = (byte)(payload.Length & 0xFF);
        buf[5] = (byte)(payload.Length >> 8);
        payload.CopyTo(buf.AsSpan(ProtocolConstants.HeaderSize));
        return buf;
    }

    public static byte[] Encode(byte type, byte flags, byte sequence) =>
        Encode(type, flags, sequence, ReadOnlySpan<byte>.Empty);

    /// <summary>
    /// Decodes and validates one packet. Rejects bad version, truncated bodies,
    /// length mismatches and unknown types. Never throws.
    /// </summary>
    public static bool TryDecode(byte[] bytes, out Packet? packet, out PacketError error)
    {
        packet = null;
        error = PacketError.None;

        if (bytes.Length < ProtocolConstants.HeaderSize)
        {
            error = PacketError.Truncated;
            return false;
        }
        if (bytes[0] != ProtocolConstants.Version)
        {
            error = PacketError.BadVersion;
            return false;
        }

        var length = bytes[4] | (bytes[5] << 8);
        if (length != bytes.Length - ProtocolConstants.HeaderSize)
        {
            error = PacketError.BadLength;
            return false;
        }

        var type = bytes[1];
        if (!Enum.IsDefined(typeof(PacketType), type))
        {
            error = PacketError.UnknownType;
            return false;
        }

        packet = new Packet(type, bytes[2], bytes[3], bytes.AsSpan(ProtocolConstants.HeaderSize).ToArray());
        return true;
    }

    /// <summary>Reads a little-endian int16 from the payload at <paramref name="offset"/>.</summary>
    public static short ReadI16(byte[] payload, int offset)
    {
        if (offset + 1 >= payload.Length) return 0;
        return (short)(payload[offset] | (payload[offset + 1] << 8));
    }

    public static byte[] WriteI16(short value)
    {
        return new[] { (byte)(value & 0xFF), (byte)((value >> 8) & 0xFF) };
    }
}