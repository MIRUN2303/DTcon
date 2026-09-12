# Testing

Unit tests run with [Vitest](https://vitest.dev) in a jsdom environment. No test frameworks beyond Vitest + Testing Library.

## Run

```powershell
npm test            # single run
npm run test:watch  # watch mode
```

Type checks and production build:

```powershell
npm run build       # tsc --noEmit && vite build
```

## Coverage areas

| File | What it covers |
| --- | --- |
| `src/test/codec.test.ts` | packet encode/decode round-trips, length/sequence/type validation, max-payload guard |
| `src/test/gestures.test.ts` | tap, double-tap, right-click (two-finger), hold-drag, two-finger scroll, cancel |
| `src/test/preferences.test.ts` | defaults, round-trip, DPI/sensitivity clamping, corrupt-data normalization |
| `src/test/transport.test.ts` | DemoTransport state machine, packet echo, send-guard while disconnected |
| `src/test/input.test.ts` | gesture→packet mapping, DPI scaling, button held across drag |

## Writing tests

- Keep them self-contained and fast; prefer fake clocks or short real timeouts for gesture timers.
- Follow the existing pattern: plain `describe`/`it`/`expect` with Vitest globals imported explicitly where helpful.
- No snapshot-heavy or golden-tests for UI at this stage; logic lives in plain TS classes (codec, engine, preferences, transport, input) so it stays testable without a DOM.

The gesture hold timer (320ms) and scroll-strip logic are the next places worth deeper coverage once the Bluetooth transport lands.