export interface Packet {
  version: number;
  type: number;
  flags: number;
  sequence: number;
  length: number;
  payload: Uint8Array;
}

export class ProtocolError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ProtocolError';
  }
}

export function int16LE(value: number): [number, number] {
  const low = value & 0xff;
  const high = (value >> 8) & 0xff;
  return [low, high];
}