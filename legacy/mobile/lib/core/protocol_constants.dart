/// BLE/input protocol constants, mirrored from docs/protocol.md.
library;

abstract final class ProtocolConst {
  // UUIDs
  static const String serviceUuid = 'd8e6f9a0-4000-4000-8000-000000000001';
  static const String txUuid = 'd8e6f9a0-4000-4000-8000-000000000101'; // phone -> PC (notify)
  static const String rxUuid = 'd8e6f9a0-4000-4000-8000-000000000102'; // PC -> phone (write)

  static const int version = 0x01;

  // Header flags
  static const int flagAckRequested = 0x01;

  // Packet types
  static const int typeHello = 0x01;
  static const int typeHelloAck = 0x02;
  static const int typePing = 0x03;
  static const int typePong = 0x04;
  static const int typeDisconnect = 0x05;
  static const int typeMouseMove = 0x10;
  static const int typeMouseButton = 0x11;
  static const int typeMouseScroll = 0x12;
  static const int typeMouseNav = 0x13;
  static const int typeJoystickAxis = 0x30;

  // MOUSE_MOVE payload [dx i16 @0][dy i16 @2][buttons @4][flags @5]
  // MOUSE_SCROLL payload [dx i16 @0][dy i16 @2][flags @4]
  // MOUSE_BUTTON payload [button @0][pressed @1]
  // MOUSE_NAV   payload [action @0]
  // DISCONNECT  payload [reason @0]

  // Button mask
  static const int btnLeft = 0x01;
  static const int btnRight = 0x02;
  static const int btnMiddle = 0x04;
  static const int btnBack = 0x08;
  static const int btnForward = 0x10;

  // Scroll flags
  static const int scrollHorizontalAxis = 0x01;

  // Nav actions (matches receiver NavAction)
  static const int navBack = 0x00;
  static const int navForward = 0x01;
  static const int navPrevTrack = 0x02;
  static const int navNextTrack = 0x03;

  /// Max payload bytes fitting a 20-byte ATT payload with the 6-byte header.
  static const int maxPayload = 14;

  /// Peer considered lost after no PONG for this long.
  static const Duration pingTimeout = Duration(seconds: 10);

  static const Duration pingInterval = Duration(seconds: 5);
}

/// Nav actions (indices match receiver NavAction enum values 0x00..0x03).
enum NavAction { back, forward, prevTrack, nextTrack }

/// Small typed wrapper the protocol layer mints; packets themselves are
/// uint8 arrays so IO stays zero-copy-simple.
final class MouseMoveData {
  const MouseMoveData(this.dx, this.dy, this.buttons);
  final int dx;
  final int dy;
  final int buttons;
}