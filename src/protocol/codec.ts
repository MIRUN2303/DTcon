import { Packet, ProtocolError, int16LE } from './types';
import {
  Button,
  FLAG_ACK_REQUESTED,
  HEADER_LENGTH,
  KNOWN_TYPES,
  MAX_PAYLOAD,
  NavAction,
  NAV_ACTIONS,
  PROTOCOL_VERSION,
  SystemAction,
  SYSTEM_ACTIONS,
} from './constants';

export interface CodecOptions {
  sequence?: number;
  flags?: number;
}

export class PacketCodec {
  private sequence = 0;

  reset(): void {
    this.sequence = 0;
  }

  private nextSequence(): number {
    const seq = this.sequence;
    this.sequence = (this.sequence + 1) % 256;
    return seq;
  }

  encode(type: number, payload: Uint8Array = new Uint8Array(0), options: CodecOptions = {}): Uint8Array {
    if (payload.length > MAX_PAYLOAD) {
      throw new ProtocolError(`payload too large: ${payload.length} > ${MAX_PAYLOAD}`);
    }
    const packet = new Uint8Array(HEADER_LENGTH + payload.length);
    packet[0] = PROTOCOL_VERSION;
    packet[1] = type;
    packet[2] = options.flags ?? 0;
    packet[3] = options.sequence ?? this.nextSequence();
    new DataView(packet.buffer).setUint16(4, payload.length, true);
    packet.set(payload, HEADER_LENGTH);
    return packet;
  }

  encodeControl(type: number, options: CodecOptions = {}): Uint8Array {
    return this.encode(type, new Uint8Array(0), options);
  }

  encodeMove(dx: number, dy: number, buttons = 0, flags = 0, options: CodecOptions = {}): Uint8Array {
    const payload = new Uint8Array(6);
    payload.set(int16LE(dx), 0);
    payload.set(int16LE(dy), 2);
    payload[4] = buttons;
    payload[5] = flags;
    return this.encode(0x10, payload, options);
  }

  encodeButton(button: number, pressed: boolean, options: CodecOptions = {}): Uint8Array {
    const payload = new Uint8Array(2);
    payload[0] = button;
    payload[1] = pressed ? 1 : 0;
    return this.encode(0x11, payload, options);
  }

  encodeScroll(dx: number, dy: number, flags = 0, options: CodecOptions = {}): Uint8Array {
    const payload = new Uint8Array(5);
    payload.set(int16LE(dx), 0);
    payload.set(int16LE(dy), 2);
    payload[4] = flags;
    return this.encode(0x12, payload, options);
  }

  encodeNav(action: number, options: CodecOptions = {}): Uint8Array {
    if (!NAV_ACTIONS.has(action)) {
      throw new ProtocolError(`unknown nav action: ${action}`);
    }
    const payload = new Uint8Array(1);
    payload[0] = action;
    return this.encode(0x13, payload, options);
  }

  encodeSystem(action: number, value = 0, options: CodecOptions = {}): Uint8Array {
    if (!SYSTEM_ACTIONS.has(action)) {
      throw new ProtocolError(`unknown system action: ${action}`);
    }
    const payload = new Uint8Array(2);
    payload[0] = action;
    payload[1] = value & 0xff;
    return this.encode(0x14, payload, options);
  }

  encodeJoystickButton(button: number, pressed: boolean, options: CodecOptions = {}): Uint8Array {
    const payload = new Uint8Array(2);
    payload[0] = button;
    payload[1] = pressed ? 1 : 0;
    return this.encode(0x31, payload, options);
  }

  encodeJoystickAxis(axis: number, value: number, options: CodecOptions = {}): Uint8Array {
    const payload = new Uint8Array(3);
    payload[0] = axis;
    payload.set(int16LE(Math.round(Math.min(1, Math.max(-1, value)) * 1024)), 1);
    return this.encode(0x30, payload, options);
  }

  encodeDisconnect(reason: number, options: CodecOptions = {}): Uint8Array {
    const payload = new Uint8Array(1);
    payload[0] = reason;
    return this.encode(0x05, payload, options);
  }

  decode(bytes: Uint8Array): Packet {
    if (bytes.length < HEADER_LENGTH) {
      throw new ProtocolError(`packet too short: ${bytes.length}`);
    }
    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    const version = bytes[0];
    const type = bytes[1];
    const flags = bytes[2];
    const sequence = bytes[3];
    const length = view.getUint16(4, true);
    if (version !== PROTOCOL_VERSION) {
      throw new ProtocolError(`unsupported version: ${version}`);
    }
    if (length !== bytes.length - HEADER_LENGTH) {
      throw new ProtocolError(`length mismatch: header says ${length}, got ${bytes.length - HEADER_LENGTH}`);
    }
    if (!KNOWN_TYPES.has(type)) {
      throw new ProtocolError(`unknown packet type: ${type}`);
    }
    return { version, type, flags, sequence, length, payload: bytes.slice(HEADER_LENGTH) };
  }

  decodeMove(packet: Packet): { dx: number; dy: number; buttons: number; flags: number } {
    if (packet.length < 6) throw new ProtocolError('MOUSE_MOVE payload shorter than 6');
    const view = new DataView(packet.payload.buffer, packet.payload.byteOffset, packet.payload.byteLength);
    return {
      dx: view.getInt16(0, true),
      dy: view.getInt16(2, true),
      buttons: packet.payload[4],
      flags: packet.payload[5],
    };
  }

  decodeButton(packet: Packet): { button: number; pressed: boolean } {
    if (packet.length < 2) throw new ProtocolError('MOUSE_BUTTON payload shorter than 2');
    return { button: packet.payload[0], pressed: packet.payload[1] === 1 };
  }

  decodeJoystickButton(packet: Packet): { button: number; pressed: boolean } {
    if (packet.length < 2) throw new ProtocolError('JOYSTICK_BUTTON payload shorter than 2');
    return { button: packet.payload[0], pressed: packet.payload[1] === 1 };
  }

  decodeJoystickAxis(packet: Packet): { axis: number; value: number } {
    if (packet.length < 3) throw new ProtocolError('JOYSTICK_AXIS payload shorter than 3');
    const view = new DataView(packet.payload.buffer, packet.payload.byteOffset, packet.payload.byteLength);
    return { axis: packet.payload[0], value: view.getInt16(1, true) / 1024 };
  }

  decodeScroll(packet: Packet): { dx: number; dy: number; flags: number } {
    if (packet.length < 5) throw new ProtocolError('MOUSE_SCROLL payload shorter than 5');
    const view = new DataView(packet.payload.buffer, packet.payload.byteOffset, packet.payload.byteLength);
    return {
      dx: view.getInt16(0, true),
      dy: view.getInt16(2, true),
      flags: packet.payload[4],
    };
  }

  decodeSystem(packet: Packet): { action: number; value: number } {
    if (packet.length < 2) throw new ProtocolError('SYSTEM_GESTURE payload shorter than 2');
    const view = new DataView(packet.payload.buffer, packet.payload.byteOffset, packet.payload.byteLength);
    return { action: packet.payload[0], value: view.getInt8(1) };
  }
}

export { Button, FLAG_ACK_REQUESTED, NavAction, SystemAction };