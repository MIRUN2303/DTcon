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

## Web Bluetooth (reserved)

`src/bluetooth/WebBluetoothTransport.ts` is a skeleton implementing `IDtconTransport`. It detects `navigator.bluetooth` support and reports an honest error (`"Web Bluetooth receiver is reserved for the next phase"`) on connect/send — it never pretends to be connected.

Next-phase wiring sketch:

```ts
const device = await navigator.bluetooth.requestDevice({
  filters: [{ services: [SERVICE_UUID] }],
});
const server = await device.gatt?.connect();
const service = await server?.getPrimaryService(SERVICE_UUID);
const tx = await service?.getCharacteristic(TX_UUID);
await tx?.writeValue(packet);   // Map<Uint8Array>, max ~512B enforces our 14B cap anyway
```

Keep the `IDtconTransport` contract so swapping `DemoTransport` → `WebBluetoothTransport` in `DtconProvider` is the only change.

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