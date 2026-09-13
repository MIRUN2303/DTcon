import { describe, expect, it } from 'vitest';
import { PacketCodec, Button, NavAction, SystemAction } from '../protocol/codec';
import { HEADER_LENGTH, PacketType, GamepadButton, GamepadAxis } from '../protocol/constants';
import { ProtocolError } from '../protocol/types';

const codec = new PacketCodec();

function decodeMove(packet: Uint8Array) {
  return codec.decodeMove(codec.decode(packet));
}

describe('PacketCodec', () => {
  it('encodes mouse move with correct header and payload', () => {
    const packet = codec.encodeMove(12, -34, Button.Left);
    const decoded = codec.decode(packet);
    expect(decoded.type).toBe(0x10);
    expect(decoded.length).toBe(6);
    expect(packet.length).toBe(HEADER_LENGTH + 6);
    expect(decoded.payload[4]).toBe(Button.Left);
  });

  it('round-trips mouse move', () => {
    const move = decodeMove(codec.encodeMove(320, -12, 0));
    expect(move).toEqual({ dx: 320, dy: -12, buttons: 0, flags: 0 });
  });

  it('rejects packets with unknown type', () => {
    const packet = codec.encode(0x99, new Uint8Array(0));
    expect(() => codec.decode(packet)).toThrow(ProtocolError);
  });

  it('accepts only known types', () => {
    for (const type of [0x01, 0x02, 0x03, 0x04, 0x05, 0x70, 0x10, 0x11, 0x12, 0x13, 0x14, 0x30, 0x31]) {
      expect(() => codec.decode(codec.encodeControl(type))).not.toThrow();
    }
  });

  it('round-trips button press and release', () => {
    const press = codec.decodeButton(codec.decode(codec.encodeButton(Button.Right, true)));
    expect(press).toEqual({ button: Button.Right, pressed: true });
    const release = codec.decodeButton(codec.decode(codec.encodeButton(Button.Right, false)));
    expect(release.pressed).toBe(false);
  });

  it('round-trips scroll with negative dy', () => {
    const scroll = codec.decodeScroll(codec.decode(codec.encodeScroll(0, -5)));
    expect(scroll).toEqual({ dx: 0, dy: -5, flags: 0 });
  });

  it('round-trips nav actions', () => {
    const nav = codec.decode(codec.encodeNav(NavAction.NextTrack));
    expect(nav.payload[0]).toBe(NavAction.NextTrack);
  });

  it('round-trips system gestures with a negative value', () => {
    const sys = codec.decodeSystem(codec.decode(codec.encodeSystem(SystemAction.Zoom, -2)));
    expect(sys).toEqual({ action: SystemAction.Zoom, value: -2 });
    const app = codec.decodeSystem(codec.decode(codec.encodeSystem(SystemAction.SwitchApp, 1)));
    expect(app.value).toBe(1);
  });

  it('rejects unknown system actions', () => {
    expect(() => codec.encodeSystem(0x63)).toThrow(ProtocolError);
  });

  it('round-trips joystick button', () => {
    const packet = codec.decode(codec.encodeJoystickButton(GamepadButton.L1, true));
    expect(packet.type).toBe(0x31);
    const decoded = codec.decodeJoystickButton(packet);
    expect(decoded).toEqual({ button: GamepadButton.L1, pressed: true });
  });

  it('round-trips joystick axis', () => {
    const packet = codec.decode(codec.encodeJoystickAxis(GamepadAxis.RightY, -0.5));
    expect(packet.type).toBe(0x30);
    const decoded = codec.decodeJoystickAxis(packet);
    expect(decoded.axis).toBe(GamepadAxis.RightY);
    expect(decoded.value).toBeCloseTo(-0.5, 3);
  });

  it('round-trips ReleaseAll control packet', () => {
    const packet = codec.decode(codec.encodeControl(PacketType.ReleaseAll));
    expect(packet.type).toBe(0x70);
    expect(packet.length).toBe(0);
  });

  it('throws on payload larger than max', () => {
    expect(() => codec.encode(0x10, new Uint8Array(15))).toThrow(ProtocolError);
  });

  it('increments sequence per packet when no explicit sequence', () => {
    const codec2 = new PacketCodec();
    const a = codec2.encodeControl(0x03);
    const b = codec2.encodeControl(0x03);
    expect(codec2.decode(a).sequence).toBe(0);
    expect(codec2.decode(b).sequence).toBe(1);
  });
});