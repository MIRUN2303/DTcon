import { useEffect, useRef, useState } from 'react';
import { PacketCodec, Button, NavAction } from '../protocol/codec';
import { PacketType } from '../protocol/constants';
import { IDtconTransport } from '../bluetooth/transport';

interface CursorState {
  x: number;
  y: number;
  left: boolean;
  right: boolean;
}

interface DemoHostProps {
  transport: IDtconTransport;
  active?: boolean;
}

const WORLD_W = 320;
const WORLD_H = 200;
const DPI_FACTOR = 2;

const pct = (value: number, max: number) => `${(value / max) * 100}%`;

export default function DemoHost({ transport, active = true }: DemoHostProps) {
  const [cursor, setCursor] = useState<CursorState>({ x: WORLD_W / 2, y: WORLD_H / 2, left: false, right: false });
  const [ripple, setRipple] = useState<{ id: number; x: number; y: number; kind: 'left' | 'right' } | null>(null);
  const [scrollY, setScrollY] = useState(0);
  const [navFlash, setNavFlash] = useState<string | null>(null);
  const cursorRef = useRef(cursor);
  const codec = useRef(new PacketCodec());
  const rippleId = useRef(0);

  useEffect(() => {
    cursorRef.current = cursor;
  }, [cursor]);

  useEffect(() => {
    const unsub = transport.onPacket((packet) => {
      const decoded = codec.current.decode(packet);
      switch (decoded.type) {
        case PacketType.MouseMove: {
          const { dx, dy, buttons } = codec.current.decodeMove(decoded);
          const c = cursorRef.current;
          setCursor({
            x: Math.min(WORLD_W - 2, Math.max(2, c.x + dx * DPI_FACTOR)),
            y: Math.min(WORLD_H - 2, Math.max(2, c.y + dy * DPI_FACTOR)),
            left: (buttons & Button.Left) !== 0,
            right: (buttons & Button.Right) !== 0,
          });
          break;
        }
        case PacketType.MouseButton: {
          const { button, pressed } = codec.current.decodeButton(decoded);
          setCursor((c) => ({
            ...c,
            left: button === Button.Left ? pressed : c.left,
            right: button === Button.Right ? pressed : c.right,
          }));
          if (pressed) {
            const c = cursorRef.current;
            const id = ++rippleId.current;
            const kind = button === Button.Right ? 'right' : 'left';
            setRipple({ id, x: c.x, y: c.y, kind });
            setTimeout(() => setRipple((r) => (r?.id === id ? null : r)), 350);
          }
          break;
        }
        case PacketType.MouseScroll: {
          const { dy } = codec.current.decodeScroll(decoded);
          setScrollY((s) => Math.min(WORLD_H * 3, Math.max(0, s + dy * 4)));
          break;
        }
        case PacketType.MouseNav: {
          const action = decoded.payload[0];
          setNavFlash(ActionLabel[action] ?? 'Nav');
          setTimeout(() => setNavFlash(null), 600);
          break;
        }
      }
    });
    return unsub;
  }, [transport]);

  if (!active) return null;

  return (
    <div className="demohost" aria-hidden="true">
      <div className="demohost__scrollbar" style={{ top: pct(scrollY % (WORLD_H - 24), WORLD_H) }} />
      {navFlash && <span className="demohost__navflash">{navFlash}</span>}
      {ripple && (
        <span
          className={`demohost__ripple demohost__ripple--${ripple.kind}`}
          style={{ left: pct(ripple.x, WORLD_W), top: pct(ripple.y, WORLD_H) }}
        />
      )}
      <div
        className="demohost__cursor"
        style={{ left: pct(cursor.x, WORLD_W), top: pct(cursor.y, WORLD_H) }}
      >
        <span className="demohost__cursor-core" />
        {cursor.left && <span className="demohost__cursor-press demohost__cursor-press--left" />}
        {cursor.right && <span className="demohost__cursor-press demohost__cursor-press--right" />}
      </div>
    </div>
  );
}

const ActionLabel: Record<number, string> = {
  [NavAction.Back]: 'Back',
  [NavAction.Forward]: 'Forward',
  [NavAction.PrevTrack]: 'Prev',
  [NavAction.NextTrack]: 'Next',
};