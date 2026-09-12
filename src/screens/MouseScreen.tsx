import { useMemo, useRef, useState } from 'react';
import { useDtcon } from '../state/DtconProvider';
import { GestureEngine } from '../gestures/GestureEngine';
import { InputController } from '../input/InputController';
import { Button } from '../protocol/codec';
import ControlRail from '../components/ControlRail';
import ScrollZone from '../components/ScrollZone';
import DemoHost from '../components/DemoHost';
import './mouse.css';

export default function MouseScreen() {
  const { go, prefs, setDpi, transport, transportStatus } = useDtcon();
  const surfaceRef = useRef<HTMLDivElement | null>(null);
  const [scrollMode, setScrollMode] = useState(false);
  const [demosVisible, setDemosVisible] = useState(true);
  const settingsRef = useRef({ dpi: prefs.dpi, scrollSensitivity: prefs.scrollSensitivity });
  settingsRef.current = { dpi: prefs.dpi, scrollSensitivity: prefs.scrollSensitivity };

  const controller = useMemo(() => new InputController(transport, () => settingsRef.current), [transport]);

  const engine = useMemo(
    () =>
      new GestureEngine((event) => controller.handleEvent(event), {
        onScrollModeChange: setScrollMode,
      }),
    [controller],
  );

  const rel = (e: React.PointerEvent): [number, number] => {
    const rect = surfaceRef.current?.getBoundingClientRect();
    if (rect) return [e.clientX - rect.left, e.clientY - rect.top];
    return [0, 0];
  };

  const cycleDpi = () => {
    const dpiList = [800, 1200, 1600, 2400, 3200];
    const idx = Math.max(0, dpiList.indexOf(prefs.dpi));
    const next = dpiList[(idx + 1) % dpiList.length];
    setDpi(next);
  };

  return (
    <div className="mouse screen">
      <ControlRail
        dpi={prefs.dpi}
        onHome={() => go('home')}
        onCycleDpi={cycleDpi}
        onNav={(action) => controller.nav(action)}
      />

      <div className="touchpad" data-scroll={scrollMode ? '1' : '0'}>
        {scrollMode && <div className="touchpad__scrolltag">SCROLL</div>}
        <div
          className="touchpad__surface"
          ref={surfaceRef}
          onPointerDown={(e) => {
            const [x, y] = rel(e);
            engine.pointerDown(e.pointerId, x, y);
          }}
          onPointerMove={(e) => {
            const [x, y] = rel(e);
            engine.pointerMove(e.pointerId, x, y);
          }}
          onPointerUp={(e) => engine.pointerUp(e.pointerId)}
          onPointerCancel={() => engine.pointerCancel()}
        >
          <div className="touchpad__corner--tl" />
          <div className="touchpad__corner--tr" />
          <div className="touchpad__corner--bl" />
          <div className="touchpad__corner--br" />
          {!scrollMode && <p className="touchpad__hint">1 finger: move · 2 fingers: scroll · tap: click</p>}
        </div>
        <div className="clickzones">
          <button className="clickzone" onClick={() => controller.click(Button.Left)}>
            LEFT
          </button>
          <button className="clickzone" onClick={() => controller.click(Button.Right)}>
            RIGHT
          </button>
        </div>
      </div>

      <div className="side">
        <div className="scrollstrip">
          <ScrollZone
            onEnter={() => engine.setScrollMode(true)}
            onExit={() => engine.setScrollMode(false)}
            onPointerDown={(e) => {
              const [x, y] = rel(e);
              engine.pointerDown(e.pointerId, x, y);
            }}
            onPointerMove={(e) => {
              const [x, y] = rel(e);
              engine.pointerMove(e.pointerId, x, y);
            }}
            onPointerUp={(e) => engine.pointerUp(e.pointerId)}
            onPointerCancel={() => engine.pointerCancel()}
          />
        </div>
        {demosVisible ? (
          <>
            <DemoHost transport={transport} />
            <button className="side__toggle" onClick={() => setDemosVisible(false)}>
              Hide demo
            </button>
          </>
        ) : (
          <button className="side__toggle" onClick={() => setDemosVisible(true)}>
            Show demo
          </button>
        )}
        <div className="side__status">
          <span>{transportStatus.isDemo ? 'Demo transport' : 'Connected'}</span>
          <span className="side__status-dots" />
        </div>
      </div>
    </div>
  );
}