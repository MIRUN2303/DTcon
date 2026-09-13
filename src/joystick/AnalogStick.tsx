import { useCallback, useRef, useState } from 'react';
import { VirtualStickController, StickVec } from './VirtualStickController';

interface AnalogStickProps {
  label: string;
  ariaLabel: string;
  /** Normalized input callback fired on every resolved position. */
  onInput: (value: StickVec) => void;
}

/**
 * Physical analog stick. The cap tracks the pointer in real time via a CSS
 * transform on a ref (no React re-render per move); the engine only emits
 * normalized values. Release springs the cap home via the CSS transition.
 */
export default function AnalogStick({ label, ariaLabel, onInput }: AnalogStickProps) {
  const wellRef = useRef<HTMLDivElement | null>(null);
  const capRef = useRef<HTMLDivElement | null>(null);
  const [active, setActive] = useState(false);
  const controller = useRef(new VirtualStickController());

  const posInWell = useCallback((e: React.PointerEvent) => {
    const rect = wellRef.current?.getBoundingClientRect();
    return rect ? [e.clientX - rect.left, e.clientY - rect.top] : [0, 0];
  }, []);

  const apply = useCallback(
    (value: StickVec) => {
      const cap = capRef.current;
      const well = wellRef.current;
      if (!cap || !well) return;
      const range = Math.min(well.clientWidth, well.clientHeight) / 2;
      const travel = range * 0.72;
      cap.style.transform = `translate(calc(-50% + ${value.x * travel}px), calc(-50% + ${value.y * travel}px))`;
      onInput(value);
    },
    [onInput],
  );

  const handleDown = (e: React.PointerEvent) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    setActive(true);
    const well = wellRef.current;
    if (!well) return;
    const [x, y] = posInWell(e);
    const range = Math.min(well.clientWidth, well.clientHeight) / 2;
    const value = controller.current.down(e.pointerId, range, range, range, x, y);
    apply({ x: value.x || 0, y: value.y || 0 });
  };

  const handleMove = (e: React.PointerEvent) => {
    if (!controller.current.active) return;
    const [x, y] = posInWell(e);
    apply(controller.current.move(x, y));
  };

  const handleUp = (e: React.PointerEvent) => {
    controller.current.up(e.pointerId);
    setActive(false);
    apply({ x: 0, y: 0 });
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId);
    }
  };

  const handleCancel = () => {
    controller.current.cancel();
    setActive(false);
    apply({ x: 0, y: 0 });
  };

  return (
    <div
      ref={wellRef}
      className={`stick${active ? ' stick--active' : ''}`}
      aria-label={ariaLabel}
      onPointerDown={handleDown}
      onPointerMove={handleMove}
      onPointerUp={handleUp}
      onPointerCancel={handleCancel}
    >
      <div className="stick__reticle" aria-hidden="true">
        <span className="stick__cross stick__cross--h" />
        <span className="stick__cross stick__cross--v" />
      </div>
      <div ref={capRef} className="stick__cap" aria-hidden="true">
        <span className="stick__cap-ring" />
        <span className="stick__cap-gloss" />
      </div>
      <span className="stick__label">{label}</span>
    </div>
  );
}