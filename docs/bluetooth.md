# Bluetooth

Transport targets for DTcon clients. The web app runs on any browser; the final link to a laptop goes through a receiver app that exposes a BLE GATT service (same identity as the original mobile app).

## GATT service

Reference values (from `shared/protocol/protocol.md`):

| | UUID |
| --- | --- |
| Service | `d8e6f9a0-4000-4000-8000-000000000001` |
| TX characteristic (controller → receiver) | `...0101` |
| RX characteristic (receiver → controller) | `...0102` |

Neither characteristic requires a pairing bond; characteristic-encryption isn't used for phase 1.

## Web Bluetooth

`src/bluetooth/WebBluetoothTransport.ts` implements `IDtconTransport` against `navigator.bluetooth` (Chrome desktop / Android).

Connection flow (best-practice Web Bluetooth pattern):

- **Pair** with `pairNewDevice()` → `requestDevice({ filters: [{ services: [DTconSERVICE_UUID] }], optionalServices: [DTconSERVICE_UUID] })`. The OS chooser shows only peripherals advertising the DTcon service, and the service is granted at pick time.
- **Reconnect** with `listSavedDevices()` → `navigator.bluetooth.getDevices()`, the list of receivers this origin was previously granted. One tap re-runs `connectToDevice` — no chooser needed.
- `connectToDevice` runs `gatt.connect()` then `getPrimaryService(DTconSERVICE_UUID)`.
- **Auto-reconnect**: `gattserverdisconnected` flips status to `RECONNECTING` and re-connects for you (1.5 s delay). An intentional `disconnect()` never triggers it.

Best practices followed (per Web Bluetooth spec / WebBluetoothCG discussions):

- Filter `requestDevice` by `services:` instead of `acceptAllDevices` so the chooser isn't a firehose of unrelated BLE devices.
- Devices found via bare advertising are not connectable; every connection must go through a granted device (`requestDevice` or `getDevices`).
- Keep the granted device object in the DOM `gattserverdisconnected` listener rather than polling for reconnect.
- Preserve origin-level device permission so reloads can reuse `getDevices()`.

Therefore the receiver's GATT server must offer:

| | UUID |
| --- | --- |
| Service | `d8e6f9a0-4000-4000-8000-000000000001` |
| TX characteristic (controller → receiver) | `...0101` |
| RX characteristic (receiver → controller) | `...0102` |

and should **advertise the service UUID** so the pair-time chooser filter matches it. Characteristics require no bonding for phase 1. Keep the `IDtconTransport` contract so swapping `DemoTransport` → `WebBluetoothTransport` in `DtconProvider` is the only change.

## Transport contract

`src/bluetooth/transport.ts`:

- `connect(): Promise<TransportResult>` / `disconnect()` / `send(packet)`
- `getStatus()` → `{ status, isDemo, lastError, lastSentSeq, packetsSent, bytesSent }`
- `onStatusChange(cb)` / `onPacket(cb)` with unsubscribe functions
- Status: `DISCONNECTED | CONNECTING | CONNECTED | RECONNECTING | ERROR`

## Demo transport

`DemoTransport` simulates connect (600ms), echoes every sent packet to its `onPacket` listeners, and exposes `isDemo: true` so the UI always labels it. It is the default in `DtconProvider` — the app runs fully without hardware.

## Next steps

1. Implement the receiver app (native or WebBluetooth-peripheral-capable) advertising the service + TX/RX characteristics.
2. `WebBluetoothTransport` is implemented; swap the transport in `DtconProvider` and validate against a real receiver.