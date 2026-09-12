# Architecture

Web-first DTcon controller app. React (18) + TypeScript + Vite 5. Simple component tree, no state library — a single React context carries what little global state exists.

## Layering

Data flows one way: **UI → gestures → input → transport → wire**, with a demo host listening on the same transport for the preview.

```text
screens/───────────┐
components/────────┤ UI (React)
                   │
gestures/          emits move / tap / doubleTap / rightClick / dragStart / dragMove / dragEnd / scroll
   │
   ▼
input/InputController   maps gestures → protocol packets (DPI scaling, button state)
   │
   ▼
bluetooth/IDtconTransport   send(packet)
   ├─ DemoTransport          (active)      → echo to packet listeners (demo host preview)
   └─ WebBluetoothTransport  (reserved)    → BLE GATT write (next phase)
   │
   ▼
protocol/PacketCodec        v1 binary format (see protocol.md)
```

## State

`state/DtconProvider` is a React context exposing:

- `screen` + `go()` — trivial screen router (`intro | home | mouse | joystick`)
- `transport` + `transportStatus` + `connect()` / `disconnect()`
- `prefs` + setters — DPI, scroll sensitivity, last mode, mode order (persisted via `storage/preferences`)
- `reorderModes(from, to)` — reorders the persisted mode cards

Preferences live in `localStorage` under `dtcon.prefs.v1` and are normalized on load (values clamped to valid ranges, corrupt data → defaults).

## Gesture pipeline

The touchpad surface feeds raw pointer positions into `GestureEngine`:

- 1 finger: move (slop 8px, exponential-feel acceleration)
- 1 finger, no movement, quick release: tap / double tap (350ms window)
- hold 320ms + drag: drag start → drag move → drag end (left button held)
- 2 fingers: scroll (move → vertical scroll)
- 2-finger tap: right click
- Scroll strip: enters one-handed scroll mode on touch

`InputController` converts those events into packets (DPI factor = `dpi / 800`, scroll sensitivity applied) and sends them through the transport.

## Demo host

`DemoHost` subscribes to the transport's packet stream and decodes `MOUSE_MOVE`, `MOUSE_BUTTON`, `MOUSE_SCROLL`, `MOUSE_NAV` to animate a fake desktop screen (cursor, click ripples, scrollbar, nav flashes). It gives full visual feedback while running on the DemoTransport. It is always labeled Demo — it never imitates a real connection.

## Future phases

1. Web Bluetooth: implement `WebBluetoothTransport` against the GATT service in `docs/bluetooth.md`.
2. Receiver app (native, e.g. .NET `SendInput`) that advertises the same GATT service.
3. Real transport replaces demo: no UI changes needed — swap the transport instance in `DtconProvider`.
4. Joystick mode: add axis/button handling behind a second mode card.