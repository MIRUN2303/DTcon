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
}

const DPI_FACTOR = 2;
const SCREEN_W = 320;
const SCREEN_H = 200;

export default function DemoHost({ transport }: DemoHostProps) {
  const [cursor, setCursor] = useState<CursorState>({ x: SCREEN_W / 2, y: SCREEN_H / 2, left: false, right: false });
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
            x: Math.min(SCREEN_W - 2, Math.max(2, c.x + dx * DPI_FACTOR)),
            y: Math.min(SCREEN_H - 2, Math.max(2, c.y + dy * DPI_FACTOR)),
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
          setScrollY((s) => Math.min(SCREEN_H * 3, Math.max(0, s + dy * 4)));
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

  return (
    <div className="demohost">
      <div className="demohost__bar">
        <span className="badge badge-demo">Demo</span>
        <span className="demohost__screen-label">host preview</span>
      </div>
      <div
        className="demohost__screen"
        style={{ width: SCREEN_W, height: SCREEN_H }}
        aria-hidden="true"
      >
        <div className="demohost__fade" />
        <div className="demohost__scrollbar" style={{ top: (scrollY % (SCREEN_H - 24)) * 1 }} />
        {ripple && <span className={`demohost__ripple demohost__ripple--${ripple.kind}`} style={{ left: ripple.x, top: ripple.y }} />}
        {navFlash && <span className="demohost__navflash">{navFlash}</span>}
        <div
          className="demohost__cursor"
          style={{ transform: `translate(${cursor.x}px, ${cursor.y}px)` }}
        >
          <span className="demohost__cursor-core" />
          {cursor.left && <span className="demohost__cursor-press demohost__cursor-press--left" />}
          {cursor.right && <span className="demohost__cursor-press demohost__cursor-press--right" />}
        </div>
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