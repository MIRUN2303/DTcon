import { useEffect, useRef } from 'react';
import { JoystickController, JoystickState, AX, BUTTONS, DPADS } from './commands';

const fmt = (v: number) => (v === 0 ? '.00' : v > 0 ? `+${v.toFixed(2)}` : v.toFixed(2));

function line(state: JoystickState): string {
  const { axes } = state;
  const on = (id: (typeof BUTTONS)[number]) => (state.buttons[id] ? '■' : '□');
  const dir = (id: (typeof DPADS)[number]) => (state.dpad[id] ? 'I' : '·');
  return (
    `LS ${fmt(axes[AX.LX])} ${fmt(axes[AX.LY])}  ` +
    `RS ${fmt(axes[AX.RX])} ${fmt(axes[AX.RY])}  ` +
    `L2 ${fmt(axes[AX.L2])} R2 ${fmt(axes[AX.R2])}  ` +
    `L1${on(BUTTONS[4])} R1${on(BUTTONS[5])}  ` +
    `XY: X${on(BUTTONS[2])} Y${on(BUTTONS[3])}  ` +
    `AB: A${on(BUTTONS[0])} B${on(BUTTONS[1])}  ` +
    `${dir(DPADS[0])}${dir(DPADS[1])}${dir(DPADS[2])}${dir(DPADS[3])}  ` +
    `SEL${on(BUTTONS[8])} STA${on(BUTTONS[9])}`
  );
}

/** Subtle live readout of the controller state for demo mode. */
export default function JoystickDemo({ controller }: { controller: JoystickController }) {
  const ref = useRef<HTMLSpanElement | null>(null);

  useEffect(() => {
    return controller.subscribe((state) => {
      const el = ref.current;
      if (el) el.textContent = line(state);
    });
  }, [controller]);

  return (
    <span className="joy-demo" aria-hidden="true">
      <span ref={ref}>{line(controller.getState())}</span>
    </span>
  );
}