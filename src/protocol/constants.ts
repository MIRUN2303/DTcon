export const PROTOCOL_VERSION = 0x01;
export const HEADER_LENGTH = 6;
export const MAX_PAYLOAD = 14;

export const FLAG_ACK_REQUESTED = 0x01;

export enum PacketType {
  Hello = 0x01,
  HelloAck = 0x02,
  Ping = 0x03,
  Pong = 0x04,
  Disconnect = 0x05,
  MouseMove = 0x10,
  MouseButton = 0x11,
  MouseScroll = 0x12,
  MouseNav = 0x13,
  JoystickAxis = 0x30,
  JoystickButton = 0x31,
}

export const KNOWN_TYPES = new Set<number>(Object.values(PacketType).filter((v) => typeof v === 'number'));

export enum Button {
  Left = 0x01,
  Right = 0x02,
  Middle = 0x04,
  Back = 0x08,
  Forward = 0x10,
}

export enum NavAction {
  Back = 0,
  Forward = 1,
  PrevTrack = 2,
  NextTrack = 3,
}

export enum DisconnectReason {
  User = 0,
  TransportError = 1,
  LivenessTimeout = 2,
}

export const SCROLL_HORIZONTAL = 0x01;

export const NAV_ACTIONS = new Set<number>(
  Object.values(NavAction).filter((v): v is number => typeof v === 'number'),
);