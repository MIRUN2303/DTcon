import { useCallback, useRef, useState } from 'react';
import { DPadEngine, PadMask, EMPTY_PAD, DIRS } from './DPadEngine';

interface DPadProps {
  ariaLabel: string;
  onDpad: (mask: PadMask) => void;
}

/**
 * Physical d-pad cross. Renders a single cross with four arms that light up
 * from the sector engine (diagonals engage two arms). Emits the full mask on
 * every change so the parent can diff discrete DPAD_* commands.
 */
export default function DPad({ ariaLabel, onDpad }: DPadProps) {
  const padRef = useRef<HTMLDivElement | null>(null);
  const engine = useRef(new DPadEngine());
  const lastMask = useRef<PadMask>({ ...EMPTY_PAD });
  const [mask, setMask] = useState<PadMask>({ ...EMPTY_PAD });

  const posInPad = useCallback((e: React.PointerEvent) => {
    const rect = padRef.current?.getBoundingClientRect();
    return rect ? [e.clientX - rect.left, e.clientY - rect.top] : [0, 0];
  }, []);

  const resolve = useCallback(
    (next: PadMask) => {
      lastMask.current = next;
      setMask({ ...next });
      onDpad(next);
    },
    [onDpad],
  );

  const handleDown = (e: React.PointerEvent) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    const rect = padRef.current?.getBoundingClientRect();
    if (!rect) return;
    const radius = Math.min(rect.width, rect.height) / 2;
    const [x, y] = posInPad(e);
    const next = engine.current.down(e.pointerId, radius, radius, radius, x, y);
    if (!sameMask(lastMask.current, next)) resolve(next);
  };

  const handleMove = (e: React.PointerEvent) => {
    if (!engine.current.active) return;
    const [x, y] = posInPad(e);
    const next = engine.current.move(x, y);
    if (!sameMask(lastMask.current, next)) resolve(next);
  };

  const handleUp = (e: React.PointerEvent) => {
    engine.current.up(e.pointerId);
    lastMask.current = { ...EMPTY_PAD };
    setMask({ ...EMPTY_PAD });
    onDpad({ ...EMPTY_PAD });
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId);
    }
  };

  const handleCancel = () => {
    engine.current.cancel();
    lastMask.current = { ...EMPTY_PAD };
    setMask({ ...EMPTY_PAD });
    onDpad({ ...EMPTY_PAD });
  };

  return (
    <div
      ref={padRef}
      className="dpad"
      role="group"
      aria-label={ariaLabel}
      onPointerDown={handleDown}
      onPointerMove={handleMove}
      onPointerUp={handleUp}
      onPointerCancel={handleCancel}
    >
      {DIRS.map((dir) => (
        <span key={dir} className={`dpad__arm dpad__arm--${dir}${mask[dir] ? ' dpad__arm--on' : ''}`} aria-hidden="true">
          <span className="dpad__chevron" />
        </span>
      ))}
      <span className="dpad__hub" aria-hidden="true" />
    </div>
  );
}

function sameMask(a: PadMask, b: PadMask): boolean {
  return DIRS.every((d) => a[d] === b[d]);
}