# DTCON Protocol

Authoritative protocol definition and UUID registry.

The durable contract lives in [`/docs/protocol.md`](../../docs/protocol.md). This folder is the canonical constants reference both the Flutter app and the Windows receiver mirror in code (`https://github.com/...` not yet — constants are duplicated intentionally in each client for offline builds).

## UUID registry

| Role | UUID |
|------|------|
| Service | `d8e6f9a0-4000-4000-8000-000000000001` |
| TX (phone → PC, notify) | `d8e6f9a0-4000-4000-8000-000000000101` |
| RX (PC → phone, write) | `d8e6f9a0-4000-4000-8000-000000000102` |

## Packet registry

| Hex | Name | Payload |
|-----|------|---------|
| `0x01` | `HELLO` | none |
| `0x02` | `HELLO_ACK` | none |
| `0x03` | `PING` | none |
| `0x04` | `PONG` | none |
| `0x05` | `DISCONNECT` | reason u8 |
| `0x10` | `MOUSE_MOVE` | dx i16, dy i16, buttons u8, flags u8 |
| `0x11` | `MOUSE_BUTTON` | button u8, pressed u8 |
| `0x12` | `MOUSE_SCROLL` | dx i16, dy i16, flags u8 |
| `0x13` | `MOUSE_NAV` | action u8 |

Reserved for joystick: `0x30` `JOYSTICK_AXIS`, `0x31` `JOYSTICK_BUTTON`.

## Wire layout

Header (6 bytes, little-endian): `version`(1) `type`(1) `flags`(1) `sequence`(1) `length`(2 LE) → payload.

Any packet with an unknown version, mismatched length, or unknown type is invalid and must be rejected without side effects.

See [`/docs/protocol.md`](../../docs/protocol.md) for the full spec (button masks, scroll semantics, navigation mapping, handshake and keepalive flow).