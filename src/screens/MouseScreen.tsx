import { useEffect, useMemo, useRef, useState } from 'react';
import { useDtcon } from '../state/DtconProvider';
import { GestureEngine } from '../gestures/GestureEngine';
import { InputController } from '../input/InputController';
import { Button } from '../protocol/codec';
import { nextDpi, prevDpi } from '../storage/preferences';
import { hasSeenMouseHints, markMouseHintsSeen } from '../storage/hints';
import ControlRail from '../components/ControlRail';
import DemoHost from '../components/DemoHost';
import FullscreenToggle from '../components/FullscreenToggle';
import RippleDistortion from '../components/RippleDistortion';
import padSurface from '../assets/pad-surface.svg';
import './mouse.css';

const SCROLL_SLOP_PX = 8;

export default function MouseScreen() {
  const { go, prefs, setDpi, transport, transportStatus } = useDtcon();
  const leftRef = useRef<HTMLDivElement | null>(null);
  const rightRef = useRef<HTMLDivElement | null>(null);
  const [pressed, setPressed] = useState<{ left: boolean; right: boolean }>({ left: false, right: false });
  const [scrollActive, setScrollActive] = useState(false);
  const [handlePulse, setHandlePulse] = useState(false);
  const [showHints, setShowHints] = useState(() => !hasSeenMouseHints());
  const scrollSession = useRef<{ startY: number; lastY: number; scrolling: boolean } | null>(null);
  const pulseTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const settingsRef = useRef({ dpi: prefs.dpi, scrollSensitivity: prefs.scrollSensitivity });
  settingsRef.current = { dpi: prefs.dpi, scrollSensitivity: prefs.scrollSensitivity };

  useEffect(() => {
    let wakeLock: { release: () => Promise<void> } | null = null;
    const nav = navigator as Navigator & {
      wakeLock?: { request(type: string): Promise<{ release: () => Promise<void> }> };
    };
    if (nav.wakeLock) {
      void nav.wakeLock.request('screen').then(
        (lock) => {
          wakeLock = lock;
        },
        () => undefined,
      );
    }
    return () => {
      if (wakeLock) void wakeLock.release();
      if (pulseTimer.current) clearTimeout(pulseTimer.current);
    };
  }, []);

  const controller = useMemo(() => new InputController(transport, () => settingsRef.current), [transport]);

  const makeEngine = useMemo(
    () =>
      (tapButton: Button) =>
        new GestureEngine((event) => {
          if (event.kind === 'tap') void controller.click(tapButton);
          else controller.handleEvent(event);
        }),
    [controller],
  );

  const leftEngine = useMemo(() => makeEngine(Button.Left), [makeEngine]);
  const rightEngine = useMemo(() => makeEngine(Button.Right), [makeEngine]);

  const padRel = (ref: React.RefObject<HTMLDivElement | null>, e: React.PointerEvent): [number, number] => {
    const rect = ref.current?.getBoundingClientRect();
    return rect ? [e.clientX - rect.left, e.clientY - rect.top] : [0, 0];
  };

  const adjustDpi = (delta: 1 | -1) => setDpi(delta < 0 ? prevDpi(prefs.dpi) : nextDpi(prefs.dpi));

  const handleScrollDown = (e: React.PointerEvent<HTMLElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    scrollSession.current = { startY: e.clientY, lastY: e.clientY, scrolling: false };
  };

  const handleScrollMove = (e: React.PointerEvent<HTMLElement>) => {
    const s = scrollSession.current;
    if (!s) return;
    if (!s.scrolling && Math.abs(e.clientY - s.startY) > SCROLL_SLOP_PX) {
      s.scrolling = true;
      setScrollActive(true);
    }
    if (s.scrolling) {
      const dy = e.clientY - s.lastY;
      s.lastY = e.clientY;
      if (dy !== 0) controller.handleEvent({ kind: 'scroll', dx: 0, dy });
    }
  };

  const finishScroll = (asTap: boolean) => {
    if (asTap) {
      void controller.click(Button.Middle);
      setHandlePulse(true);
      if (pulseTimer.current) clearTimeout(pulseTimer.current);
      pulseTimer.current = setTimeout(() => setHandlePulse(false), 350);
    }
    setScrollActive(false);
    scrollSession.current = null;
  };

  const handleScrollUp = () => {
    const s = scrollSession.current;
    finishScroll(s ? !s.scrolling : false);
  };
  const handleScrollCancel = () => finishScroll(false);

  const dismissHints = () => {
    markMouseHintsSeen();
    setShowHints(false);
  };

  const statusLabel = transportStatus.isDemo
    ? 'DEMO'
    : transportStatus.status === 'CONNECTED'
      ? 'CONNECTED'
      : transportStatus.status === 'CONNECTING'
        ? 'CONNECTING…'
        : transportStatus.status === 'RECONNECTING'
          ? 'RECONNECTING'
          : transportStatus.status === 'ERROR'
            ? 'ERROR'
            : 'READY';

  return (
    <div className="mouse screen">
      <ControlRail
        dpi={prefs.dpi}
        connected={transportStatus.status === 'CONNECTED'}
        onHome={() => go('home')}
        onDpi={adjustDpi}
        onNav={(action) => controller.nav(action)}
      />

      <RippleDistortion
        className="pad-water"
        src={padSurface}
        brushSize={140}
        strength={0.25}
        swirl={1.2}
        rings={3}
        spread={4}
        fade={2.5}
        spacing={10}
        dispersion={0.03}
        glint={0.35}
        tint="#5ec9e4"
        tintAmount={0.5}
        highlightColor="#ffffff"
        grayscale
        trigger="both"
        clickStrength={2.2}
        quality="medium"
      />

      <FullscreenToggle />

      <section
        ref={leftRef}
        className={`pane pane--left${pressed.left ? ' pane--touched' : ''}`}
        aria-label="Left trackpad: move cursor, tap to left-click, hold and move to drag, two fingers to scroll or zoom, three fingers for system actions"
        onPointerDown={(e) => {
          setPressed((p) => ({ ...p, left: true }));
          const [x, y] = padRel(leftRef, e);
          leftEngine.pointerDown(e.pointerId, x, y);
        }}
        onPointerMove={(e) => {
          const [x, y] = padRel(leftRef, e);
          leftEngine.pointerMove(e.pointerId, x, y);
        }}
        onPointerUp={(e) => {
          setPressed((p) => ({ ...p, left: false }));
          leftEngine.pointerUp(e.pointerId);
        }}
        onPointerCancel={() => {
          setPressed((p) => ({ ...p, left: false }));
          leftEngine.pointerCancel();
          controller.releaseAll();
        }}
      >
        <span className="pane__corner pane__corner--tl" />
        <span className="pane__corner pane__corner--br" />
      </section>

      <section
        className={`scroll-column${scrollActive ? ' scroll-column--active' : ''}${handlePulse ? ' scroll-column--pulsed' : ''}`}
        aria-label="Scroll control: tap for middle click, drag to scroll"
        onPointerDown={handleScrollDown}
        onPointerMove={handleScrollMove}
        onPointerUp={handleScrollUp}
        onPointerCancel={handleScrollCancel}
      >
        <div className="scroll-column__handle">
          <span className="scroll-column__knob" />
        </div>
        <div className="scroll-column__rail" />
      </section>

      <section
        ref={rightRef}
        className={`pane pane--right${pressed.right ? ' pane--touched' : ''}`}
        aria-label="Right trackpad: move cursor, tap to right-click, hold and move to drag, two fingers to scroll or zoom, three fingers for system actions"
        onPointerDown={(e) => {
          setPressed((p) => ({ ...p, right: true }));
          const [x, y] = padRel(rightRef, e);
          rightEngine.pointerDown(e.pointerId, x, y);
        }}
        onPointerMove={(e) => {
          const [x, y] = padRel(rightRef, e);
          rightEngine.pointerMove(e.pointerId, x, y);
        }}
        onPointerUp={(e) => {
          setPressed((p) => ({ ...p, right: false }));
          rightEngine.pointerUp(e.pointerId);
        }}
        onPointerCancel={() => {
          setPressed((p) => ({ ...p, right: false }));
          rightEngine.pointerCancel();
          controller.releaseAll();
        }}
      >
        <span className="pane__corner pane__corner--tl" />
        <span className="pane__corner pane__corner--br" />
      </section>

      <DemoHost transport={transport} active={transportStatus.isDemo} />

      <span
        className={`status${transportStatus.isDemo ? ' status--demo' : ` status--${transportStatus.status.toLowerCase()}`}`}
        role="status"
      >
        <span className="status__dot" />
        {statusLabel}
      </span>

      {showHints && (
        <div className="hints" role="dialog" aria-modal="true" aria-label="How to use the trackpads">
          <div className="hints__card">
            <h2 className="hints__title">DTcon</h2>
            <p className="hints__sub">trackpads · mouse</p>
            <ul className="hints__list">
              <li>
                <span>Move cursor</span>
                <b>slide on either pad</b>
              </li>
              <li>
                <span>Left click</span>
                <b>tap the left pad</b>
              </li>
              <li>
                <span>Right click</span>
                <b>tap the right pad, or two fingers</b>
              </li>
              <li>
                <span>Double click</span>
                <b>tap twice</b>
              </li>
              <li>
                <span>Drag</span>
                <b>hold, then move</b>
              </li>
              <li>
                <span>Scroll</span>
                <b>two fingers, or the center handle</b>
              </li>
              <li>
                <span>Zoom</span>
                <b>pinch two fingers</b>
              </li>
              <li>
                <span>Apps / desktop</span>
                <b>three fingers up / down</b>
              </li>
            </ul>
            <button className="hints__got" onClick={dismissHints}>
              GOT IT
            </button>
          </div>
        </div>
      )}
    </div>
  );
}