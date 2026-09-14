import { useRef, useState } from 'react';
import { useDtcon } from '../state/DtconProvider';
import { ModeId } from '../storage/preferences';
import ModeCard from '../components/ModeCard';
import ConnectionPill from '../components/ConnectionPill';
import ConnectModal from '../components/ConnectModal';
import Ferrofluid from '../components/Ferrofluid';
import './home.css';

const LONG_PRESS_MS = 300;

export default function HomeScreen() {
  const { go, prefs, reorderModes, transportStatus, transport, attachTransport } = useDtcon();
  const [dragging, setDragging] = useState<ModeId | null>(null);
  const [connectOpen, setConnectOpen] = useState(false);
  const slotRef = useRef<HTMLDivElement | null>(null);
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const startIndex = useRef(0);
  const dragOrigin = useRef(0);
  const hasMoved = useRef(false);

  const clearTimer = () => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  };

  const beginGrip = (mode: ModeId, e: React.PointerEvent) => {
    e.stopPropagation();
    const index = prefs.modeOrder.indexOf(mode);
    if (index < 0) return;
    startIndex.current = index;
    dragOrigin.current = e.clientX;
    hasMoved.current = false;
    clearTimer();
    longPressTimer.current = setTimeout(() => {
      setDragging(mode);
      hasMoved.current = true;
    }, LONG_PRESS_MS);
  };

  const onGripMove = (e: React.PointerEvent) => {
    if (!dragging) {
      if (longPressTimer.current && Math.abs(e.clientX - dragOrigin.current) > 6) {
        clearTimer();
      }
      return;
    }
    const slots = slotRef.current?.querySelectorAll('.mode-card__slot');
    if (!slots) return;
    let target = startIndex.current;
    slots.forEach((slot, i) => {
      const rect = slot.getBoundingClientRect();
      if (e.clientX > rect.left + rect.width / 2) target = i;
    });
    if (target !== prefs.modeOrder.indexOf(dragging)) {
      reorderModes(prefs.modeOrder.indexOf(dragging), target);
      startIndex.current = target;
    }
  };

  const endGrip = () => {
    clearTimer();
    setDragging(null);
    hasMoved.current = false;
  };

  return (
    <div className="home screen">
      <div className="home__bg" aria-hidden="true">
        <Ferrofluid
          colors={['#39FF14', '#A6FF00', '#E9FFD6']}
          speed={0.6}
          scale={1.2}
          turbulence={1.3}
          fluidity={0.1}
          rimWidth={0.2}
          sharpness={2.2}
          shimmer={1.7}
          glow={2.4}
          flowDirection="up"
          opacity={0.8}
          mouseDampening={0.1}
        />
      </div>
      <ConnectionPill status={transportStatus} />
      <div className="home__device">
        <div className="home__device-notch" />
        <header className="home__header">
          <h1 className="home__title">DTcon</h1>
          <p className="home__subtitle">choose a mode</p>
        </header>
        <div className="home__modes" ref={slotRef} onPointerMove={onGripMove}>
          {prefs.modeOrder.map((mode) => (
            <ModeCard
              key={mode}
              mode={mode}
              order={prefs.modeOrder.indexOf(mode)}
              dragging={dragging === mode}
              onSelect={(m) => {
                if (m === 'mouse') go('mouse');
                else if (m === 'joystick') go('joystick');
              }}
              onGripStart={(e) => beginGrip(mode, e)}
              onGripEnd={endGrip}
            />
          ))}
        </div>
        <p className="home__hint">hold and drag a mode to reorder · tap to open</p>
        <footer className="home__ble">
          <button className="home__ble-btn" onClick={() => setConnectOpen(true)}>
            {transportStatus.status === 'CONNECTED' ? (
              <>
                <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M20 6 9 17l-5-5" />
                </svg>
                Connected via {transport.displayName}
              </>
            ) : (
              <>
                <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M12 3v13" />
                  <path d="m9 12 3 3 3-3" />
                  <path d="M5 21h14" />
                </svg>
                Connect
              </>
            )}
          </button>
        </footer>
      </div>
      {connectOpen && <ConnectModal onClose={() => setConnectOpen(false)} onAttach={attachTransport} />}
    </div>
  );
}