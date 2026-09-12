import { useRef } from 'react';

interface ScrollZoneProps {
  onPointerDown: (e: React.PointerEvent) => void;
  onPointerMove: (e: React.PointerEvent) => void;
  onPointerUp: (e: React.PointerEvent) => void;
  onPointerCancel: (e: React.PointerEvent) => void;
  onEnter: () => void;
  onExit: () => void;
}

export default function ScrollZone({ onEnter, onExit, ...handlers }: ScrollZoneProps) {
  const active = useRef(false);

  return (
    <div
      className="scrollzone"
      aria-label="Scroll strip"
      onPointerDown={(e) => {
        active.current = true;
        onEnter();
        handlers.onPointerDown(e);
      }}
      onPointerMove={(e) => {
        handlers.onPointerMove(e);
      }}
      onPointerUp={(e) => {
        if (active.current) onExit();
        active.current = false;
        handlers.onPointerUp(e);
      }}
      onPointerCancel={(e) => {
        if (active.current) onExit();
        active.current = false;
        handlers.onPointerCancel(e);
      }}
    >
      <div className="scrollzone__rail" />
      <span className="scrollzone__label">SCROLL</span>
    </div>
  );
}