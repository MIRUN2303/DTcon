# DTcon

Your phone as a wireless touchpad (and, soon, game controller) for a laptop — over Bluetooth Low Energy. This repository now contains the **web-first** controller app (React + TypeScript + Vite), the direct successor to the original Flutter phone app.

Phone / browser (any device with a browser) `──BLE GATT──▶` receiver application `──SendInput──▶` laptop mouse input

## Current build: web-first controller (local)

A single-page app that runs entirely in the browser. It ships in **Demo Mode**: all gestures, DPI, scroll and navigation are wired to a virtual demo host so the whole touchpad experience can be used and tested today. Real Bluetooth transport is implemented as a reserved skeleton (`WebBluetoothTransport`); the actual BLE receiver comes in the next phase.

```text
Browser ──┤ DemoTransport (active)          ─▶ demo host preview
          └ WebBluetoothTransport (reserved) ─▶ BLE receiver (next phase)
```

## Features

- **Intro** splash (1.4s, skippable)
- **Home**: reorderable mode cards (hold & drag), tap to open, order persisted
- **Mouse mode**: touchpad with gestures, expandable scroll strip, LEFT/RIGHT click zones, left control rail (Home · DPI · Back · Forward · Previous · Next), live demo-host preview showing the cursor moving, clicking and scrolling
- **Joystick mode**: polished "Coming Soon" card in the UI
- **Persisted preferences**: DPI (400–3200), scroll sensitivity (0.5–4.0), mode order

## Gestures (mouse mode)

| Gesture | Action |
| --- | --- |
| Tap | Left click |
| Double tap | Double click |
| Two-finger tap | Right click |
| Hold (320ms) + drag | Drag |
| One-finger move | Mouse move (accelerated, DPI-scaled) |
| Two-finger move | Scroll |

## Run

```powershell
npm install
npm run dev        # http://localhost:5173 (hosted on LAN: host:true)
```

## Test & build

```powershell
npm test           # vitest (unit tests for codec, gestures, prefs, transport, input)
npm run build      # tsc --noEmit && vite build → dist/
```

## Repository layout

```text
src/theme/       design tokens + global CSS
src/protocol/    wire protocol (codec, constants, types)
src/storage/     persisted preferences
src/gestures/    gesture engine (tap/drag/scroll/accelerate)
src/input/       gesture events → protocol packets
src/bluetooth/   transport interface, DemoTransport, WebBluetooth reservation
src/state/       React context (navigation, transport, prefs)
src/screens/     intro · home · mouse · joystick
src/components/  mode card, control rail, scroll zone, demo host, connection pill
legacy/          original Flutter app + .NET receiver (preserved, not built)
shared/protocol/ protocol constants reference
docs/            architecture · protocol · bluetooth · testing
```

## Status

- ✅ Mouse / touchpad mode end-to-end in Demo Mode (move, left/right click, double-click, drag, scroll, DPI, back/forward/previous/next, persisted prefs)
- 🟦 Web Bluetooth transport — reserved skeleton, wired next
- 🟧 Joystick mode — UI card + Coming Soon screen; input engine next
- 🟧 Windows receiver (.NET) — preserved under `legacy/`; this web build targets a future BLE receiver

## Docs

- [`docs/architecture.md`](docs/architecture.md)
- [`docs/protocol.md`](docs/protocol.md)
- [`docs/bluetooth.md`](docs/bluetooth.md)
- [`docs/testing.md`](docs/testing.md)