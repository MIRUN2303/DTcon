export type ButtonId =
  | 'BUTTON_A'
  | 'BUTTON_B'
  | 'BUTTON_X'
  | 'BUTTON_Y'
  | 'BUTTON_L1'
  | 'BUTTON_R1'
  | 'BUTTON_L2'
  | 'BUTTON_R2'
  | 'BUTTON_SELECT'
  | 'BUTTON_START';

export type DpadId = 'DPAD_UP' | 'DPAD_DOWN' | 'DPAD_LEFT' | 'DPAD_RIGHT';

export type AxisId =
  | 'AXIS_LEFT_X'
  | 'AXIS_LEFT_Y'
  | 'AXIS_RIGHT_X'
  | 'AXIS_RIGHT_Y'
  | 'AXIS_L2'
  | 'AXIS_R2';

export const B = {
  A: 'BUTTON_A',
  B: 'BUTTON_B',
  X: 'BUTTON_X',
  Y: 'BUTTON_Y',
  L1: 'BUTTON_L1',
  R1: 'BUTTON_R1',
  L2: 'BUTTON_L2',
  R2: 'BUTTON_R2',
  SELECT: 'BUTTON_SELECT',
  START: 'BUTTON_START',
} as const satisfies Record<string, ButtonId>;

export const D = {
  UP: 'DPAD_UP',
  DOWN: 'DPAD_DOWN',
  LEFT: 'DPAD_LEFT',
  RIGHT: 'DPAD_RIGHT',
} as const satisfies Record<string, DpadId>;

export const AX = {
  LX: 'AXIS_LEFT_X',
  LY: 'AXIS_LEFT_Y',
  RX: 'AXIS_RIGHT_X',
  RY: 'AXIS_RIGHT_Y',
  L2: 'AXIS_L2',
  R2: 'AXIS_R2',
} as const satisfies Record<string, AxisId>;

export const BUTTONS: ButtonId[] = [
  B.A, B.B, B.X, B.Y, B.L1, B.R1, B.L2, B.R2, B.SELECT, B.START,
];

export const DPADS: DpadId[] = [D.UP, D.DOWN, D.LEFT, D.RIGHT];

export const AXES: AxisId[] = [AX.LX, AX.LY, AX.RX, AX.RY, AX.L2, AX.R2];

export interface JoystickState {
  buttons: Record<ButtonId, boolean>;
  dpad: Record<DpadId, boolean>;
  axes: Record<AxisId, number>;
}

export type JoystickListener = (state: JoystickState) => void;

export function clampUnit(value: number): number {
  return Math.min(1, Math.max(-1, value));
}

export function clampTrigger(value: number): number {
  return Math.min(1, Math.max(0, value));
}

function emptyButtonState(): Record<ButtonId, boolean> {
  return Object.fromEntries(BUTTONS.map((id) => [id, false])) as Record<ButtonId, boolean>;
}

function emptyDpadState(): Record<DpadId, boolean> {
  return Object.fromEntries(DPADS.map((id) => [id, false])) as Record<DpadId, boolean>;
}

function emptyAxisState(): Record<AxisId, number> {
  return Object.fromEntries(AXES.map((id) => [id, 0])) as Record<AxisId, number>;
}

/**
 * Pure joystick input model. Commands from the UI land here and are
 * broadcast to listeners (demo overlay today, a joystick packet protocol later).
 * Command vocabulary:
 *   buttonDown(button) / buttonUp(button)
 *   dpad(direction, pressed)
 *   leftStick(x, y) / rightStick(x, y)   (-1..1)
 *   trigger(axis, value)                  (0..1, L2/R2)
 *   releaseAll()
 */
export class JoystickController {
  private buttons = emptyButtonState();
  private pad = emptyDpadState();
  private axes = emptyAxisState();
  private listeners = new Set<JoystickListener>();

  getState(): JoystickState {
    return { buttons: { ...this.buttons }, dpad: { ...this.pad }, axes: { ...this.axes } };
  }

  subscribe(listener: JoystickListener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  buttonDown(id: ButtonId): void {
    if (this.buttons[id]) return;
    this.buttons[id] = true;
    this.emit();
  }

  buttonUp(id: ButtonId): void {
    if (!this.buttons[id]) return;
    this.buttons[id] = false;
    this.emit();
  }

  dpad(id: DpadId, pressed: boolean): void {
    if (this.pad[id] === pressed) return;
    this.pad[id] = pressed;
    this.emit();
  }

  leftStick(x: number, y: number): void {
    this.setAxis(AX.LX, clampUnit(x));
    this.setAxis(AX.LY, clampUnit(y));
  }

  rightStick(x: number, y: number): void {
    this.setAxis(AX.RX, clampUnit(x));
    this.setAxis(AX.RY, clampUnit(y));
  }

  trigger(axis: AxisId, value: number): void {
    this.setAxis(axis, clampTrigger(value));
  }

  releaseAll(): void {
    this.buttons = emptyButtonState();
    this.pad = emptyDpadState();
    this.axes = emptyAxisState();
    this.emit();
  }

  private setAxis(axis: AxisId, value: number): void {
    if (this.axes[axis] === value) return;
    this.axes[axis] = value;
    this.emit();
  }

  private emit(): void {
    const snapshot = this.getState();
    this.listeners.forEach((cb) => cb(snapshot));
  }
}
