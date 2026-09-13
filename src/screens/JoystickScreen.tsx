import { useCallback, useEffect, useRef, useState } from 'react';
import { useDtcon } from '../state/DtconProvider';
import { JoystickController, B, AX, DpadId } from '../joystick/commands';
import { PadDirection, PadMask } from '../joystick/DPadEngine';
import AnalogStick from '../joystick/AnalogStick';
import DPadScreen from '../joystick/DPad';
import VirtualButton from '../joystick/VirtualButton';
import JoystickDemo from '../joystick/JoystickDemo';
import './joystick.css';

const toDpadId: Record<PadDirection, DpadId> = {
  up: 'DPAD_UP',
  down: 'DPAD_DOWN',
  left: 'DPAD_LEFT',
  right: 'DPAD_RIGHT',
};

export default function JoystickScreen() {
  const { go, transportStatus } = useDtcon();
  const controller = useRef(new JoystickController()).current;
  const [menuOpen, setMenuOpen] = useState(false);

  const handleDpad = useCallback(
    (mask: PadMask) => {
      (Object.keys(mask) as PadDirection[]).forEach((dir) => {
        controller.dpad(toDpadId[dir], mask[dir]);
      });
    },
    [controller],
  );

  useEffect(() => {
    const release = () => controller.releaseAll();
    const onVisible = () => {
      if (document.hidden) release();
    };
    window.addEventListener('blur', release);
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('pagehide', release);
    return () => {
      window.removeEventListener('blur', release);
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('pagehide', release);
      release();
    };
  }, [controller]);

  const statusCls = transportStatus.isDemo
    ? 'joy-status--demo'
    : `joy-status--${transportStatus.status.toLowerCase()}`;
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
    <div className="joy screen">
      <button
        className={`joy-menu-btn${menuOpen ? ' joy-menu-btn--open' : ''}`}
        onClick={() => setMenuOpen((v) => !v)}
        aria-label="Menu"
        aria-expanded={menuOpen}
      >
        <span className="joy-menu-btn__dot" />
        <span className="joy-menu-btn__dot" />
        <span className="joy-menu-btn__dot" />
      </button>

      {menuOpen && (
        <div className="joy-menu" role="dialog" aria-label="Menu">
          <button className="joy-menu__backdrop" onClick={() => setMenuOpen(false)} aria-label="Close menu" />
          <div className="joy-menu__panel">
            <button className="joy-menu__home" onClick={() => go('home')}>
              <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="m3 9 9-7 9 7v11a1 1 0 0 1-1 1h-5v-7h-6v7H4a1 1 0 0 1-1-1Z" />
              </svg>
              Home
            </button>
            <span className={`joy-status ${statusCls}`} role="status">
              <span className="joy-status__dot" />
              {statusLabel}
            </span>
          </div>
        </div>
      )}

      <section className="joy-cluster joy-cluster--left" aria-label="Left controls: L1 trigger, d-pad, left stick, L2 trigger">
        <VirtualButton
          label="L1"
          variant="pill"
          className="joy-shoulder"
          ariaLabel="L1 shoulder button"
          onDown={() => controller.buttonDown(B.L1)}
          onUp={() => controller.buttonUp(B.L1)}
        />
        <DPadScreen
          ariaLabel="D-pad: move a single direction by pressing one arm, a diagonal by pressing between two arms"
          onDpad={handleDpad}
        />
        <AnalogStick
          label="LS"
          ariaLabel="Left analog stick: press and drag to move"
          onInput={(v) => controller.leftStick(v.x, v.y)}
        />
        <VirtualButton
          label="L2"
          variant="pill"
          className="joy-shoulder joy-shoulder--trigger"
          ariaLabel="L2 trigger button"
          onDown={() => controller.trigger(AX.L2, 1)}
          onUp={() => controller.trigger(AX.L2, 0)}
        />
      </section>

      <section className="joy-cluster joy-cluster--center">
        <div className="joy-selectrow" role="group" aria-label="Select and start buttons">
          <VirtualButton
            label="SEL"
            variant="square"
            className="joy-select"
            ariaLabel="Select button"
            onDown={() => controller.buttonDown(B.SELECT)}
            onUp={() => controller.buttonUp(B.SELECT)}
          />
          <VirtualButton
            label="STA"
            variant="square"
            className="joy-select"
            ariaLabel="Start button"
            onDown={() => controller.buttonDown(B.START)}
            onUp={() => controller.buttonUp(B.START)}
          />
        </div>
      </section>

      <section className="joy-cluster joy-cluster--right" aria-label="Right controls: R1 trigger, face buttons, right stick, R2 trigger">
        <VirtualButton
          label="R1"
          variant="pill"
          className="joy-shoulder"
          ariaLabel="R1 shoulder button"
          onDown={() => controller.buttonDown(B.R1)}
          onUp={() => controller.buttonUp(B.R1)}
        />
        <div className="abxy" role="group" aria-label="Face buttons: Y top, X left, A right, B bottom">
          <VirtualButton label="Y" className="abxy__btn abxy__btn--y" ariaLabel="Y button" onDown={() => controller.buttonDown(B.Y)} onUp={() => controller.buttonUp(B.Y)} />
          <VirtualButton label="X" className="abxy__btn abxy__btn--x" ariaLabel="X button" onDown={() => controller.buttonDown(B.X)} onUp={() => controller.buttonUp(B.X)} />
          <VirtualButton label="A" className="abxy__btn abxy__btn--a" ariaLabel="A button" onDown={() => controller.buttonDown(B.A)} onUp={() => controller.buttonUp(B.A)} />
          <VirtualButton label="B" className="abxy__btn abxy__btn--b" ariaLabel="B button" onDown={() => controller.buttonDown(B.B)} onUp={() => controller.buttonUp(B.B)} />
        </div>
        <AnalogStick
          label="RS"
          ariaLabel="Right analog stick: press and drag to move"
          onInput={(v) => controller.rightStick(v.x, v.y)}
        />
        <VirtualButton
          label="R2"
          variant="pill"
          className="joy-shoulder joy-shoulder--trigger"
          ariaLabel="R2 trigger button"
          onDown={() => controller.trigger(AX.R2, 1)}
          onUp={() => controller.trigger(AX.R2, 0)}
        />
      </section>

      <div className="joy-demo-wrap" aria-hidden="true">
        <JoystickDemo controller={controller} />
      </div>
    </div>
  );
}