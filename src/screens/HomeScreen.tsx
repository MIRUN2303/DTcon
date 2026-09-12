import { useRef, useState } from 'react';
import { useDtcon } from '../state/DtconProvider';
import { ModeId } from '../storage/preferences';
import ModeCard from '../components/ModeCard';
import ConnectionPill from '../components/ConnectionPill';
import './home.css';

const LONG_PRESS_MS = 300;

export default function HomeScreen() {
  const { go, prefs, reorderModes, transportStatus } = useDtcon();
  const [dragging, setDragging] = useState<ModeId | null>(null);
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
              comingSoon={mode === 'joystick'}
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
      </div>
    </div>
  );
}