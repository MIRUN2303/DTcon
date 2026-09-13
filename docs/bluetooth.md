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

Connection flow:

- Scan (Android `requestLEScan`) lists every BLE advertisement (`acceptAllAdvertisements: true`).
- `connectToDevice` runs `gatt.connect()` then `getPrimaryService(DTconSERVICE_UUID)`.
- Chrome Android only exposes a service when it is **advertised** by the peripheral OR granted via `optionalServices` at `requestDevice` time. A scan-list device grants nothing, so an unadvertised service fails with `NotFoundError: No service matching UUID`. `connectToDevice` then falls back to `requestDevice({ acceptAllDevices: true, optionalServices: [DTconSERVICE_UUID] })`, which grants access to the UUID and reconnects.

Therefore the receiver's GATT server must offer:

| | UUID |
| --- | --- |
| Service | `d8e6f9a0-4000-4000-8000-000000000001` |
| TX characteristic (controller → receiver) | `...0101` |
| RX characteristic (receiver → controller) | `...0102` |

and should **advertise the service UUID** so background-scan connection works without the chooser fallback. Characteristics require no bonding for phase 1. Keep the `IDtconTransport` contract so swapping `DemoTransport` → `WebBluetoothTransport` in `DtconProvider` is the only change.

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
2. Implement `WebBluetoothTransport` against the sketch above.
3. Swap the transport in `DtconProvider`.
4. Add reconnection handling for the `RECONNECTING` state.