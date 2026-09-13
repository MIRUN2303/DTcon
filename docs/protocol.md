# Protocol v1

Binary protocol between the controller (phone / browser) and the receiver (laptop). Reused from the original Flutter app — see `shared/protocol/protocol.md` for the canonical reference.

## Frame layout

Every packet has a fixed 6-byte little-endian header:

| Byte | Field | Meaning |
| --- | --- | --- |
| 0 | version | `0x01` |
| 1 | type | packet type (below) |
| 2 | flags | e.g. `0x01` ack requested |
| 3 | sequence | 0–255, incremented per packet |
| 4–5 | length | unsigned 16-bit LE payload length |

Max payload: **14 bytes** (`MAX_PAYLOAD`).

## Packet types

| Value | Name | Payload |
| --- | --- | --- |
| 0x01 | Hello | — |
| 0x02 | HelloAck | — |
| 0x03 | Ping | — |
| 0x04 | Pong | — |
| 0x05 | Disconnect | 1 byte reason (0 user, 1 transport, 2 timeout) |
| 0x70 | ReleaseAll | — |
| 0x10 | MouseMove | dx i16 LE, dy i16 LE, buttons u8, flags u8 |
| 0x11 | MouseButton | button u8 (0x01..0x10), pressed u8 (0/1) |
| 0x12 | MouseScroll | dx i16 LE, dy i16 LE, flags u8 (bit0 horizontal) |
| 0x13 | MouseNav | action u8 |
| 0x30 | JoystickAxis | reserved |
| 0x31 | JoystickButton | reserved |

## Button bits

| Bit | Button |
| --- | --- |
| 0x01 | Left |
| 0x02 | Right |
| 0x04 | Middle |
| 0x08 | Back |
| 0x10 | Forward |

## Nav actions

| Value | Action |
| --- | --- |
| 0 | Back |
| 1 | Forward |
| 2 | Previous track |
| 3 | Next track |

## Codec

`src/protocol/codec.ts` (`PacketCodec`) encodes/decodes this format. Encode calls enforce `MAX_PAYLOAD`; decode rejects packets with wrong version, mismatched length, or unknown type — all via `ProtocolError`. `int16LE` packing is in `src/protocol/types.ts`.

```ts
const codec = new PacketCodec();
codec.encodeMove(12, -34, Button.Left);   // → Uint8Array
codec.decode(bytes);                      // → { version, type, flags, sequence, length, payload }
codec.decodeMove(packet);                 // → { dx, dy, buttons, flags }
```

## Constants

Mirrored in `src/protocol/constants.ts`: `PROTOCOL_VERSION`, `HEADER_LENGTH`, `MAX_PAYLOAD`, `PacketType`, `Button`, `NavAction`, `DisconnectReason`, `SCROLL_HORIZONTAL`, `FLAG_ACK_REQUESTED`, `KNOWN_TYPES`, `NAV_ACTIONS`.