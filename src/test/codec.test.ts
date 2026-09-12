import { describe, expect, it } from 'vitest';
import { PacketCodec, Button, NavAction } from '../protocol/codec';
import { HEADER_LENGTH } from '../protocol/constants';
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
    for (const type of [0x01, 0x02, 0x03, 0x04, 0x05, 0x10, 0x11, 0x12, 0x13, 0x30, 0x31]) {
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