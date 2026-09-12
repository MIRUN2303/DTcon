export function parseI16(bytes: Uint8Array, offset: number): number {
  return new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength).getInt16(offset, true);
}

export function readI16(bytes: Uint8Array, offset: number): number {
  return parseI16(bytes, offset);
}