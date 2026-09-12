namespace Dtcon.Receiver.Protocol;

/// <summary>
/// UUID registry and numeric protocol constants. Single source of truth in code;
/// the durable spec is docs/protocol.md and shared/protocol/protocol.md.
/// </summary>
public static class ProtocolConstants
{
    public const byte Version = 0x01;

    /// <summary>Bytes of the fixed 6-byte packet header (version, type, flags, sequence, length LE).</summary>
    public const int HeaderSize = 6;

    /// <summary>Largest payload that fits in one BLE notification at the default 23-byte MTU.</summary>
    public const int MaxPayload = 14;

    // UUIDs
    public const string ServiceUuid = "d8e6f9a0-4000-4000-8000-000000000001";
    public const string TxUuid = "d8e6f9a0-4000-4000-8000-000000000101"; // phone -> PC (notify)
    public const string RxUuid = "d8e6f9a0-4000-4000-8000-000000000102"; // PC -> phone (write)

    // Flags bit 0x01 = ACK requested.
    public const byte FlagAckRequested = 0x01;
}

public enum PacketType : byte
{
    Hello = 0x01,
    HelloAck = 0x02,
    Ping = 0x03,
    Pong = 0x04,
    Disconnect = 0x05,
    MouseMove = 0x10,
    MouseButton = 0x11,
    MouseScroll = 0x12,
    MouseNav = 0x13,
    // Reserved for joystick: JoystickAxis = 0x30, JoystickButton = 0x31
}

/// <summary>Protocol button bits (wire format). Values match the spec's button mask.</summary>
public enum MouseButtonId : byte
{
    None = 0x00,
    Left = 0x01,
    Right = 0x02,
    Middle = 0x04,
    Back = 0x08,
    Forward = 0x10,
}

public enum NavAction : byte
{
    Back = 0,
    Forward = 1,
    Previous = 2,
    Next = 3,
}

public enum DisconnectReason : byte
{
    User = 0,
    TransportError = 1,
    Timeout = 2,
}