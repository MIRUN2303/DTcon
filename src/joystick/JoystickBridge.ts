import { PacketCodec } from '../protocol/codec';
import { GamepadAxis, GamepadButton } from '../protocol/constants';
import { IDtconTransport } from '../bluetooth/transport';
import { AX, B, D, AXES, BUTTONS, DPADS, JoystickController, JoystickState } from './commands';

const BUTTON_CODE: Record<string, number> = {
  [B.A]: GamepadButton.A,
  [B.B]: GamepadButton.B,
  [B.X]: GamepadButton.X,
  [B.Y]: GamepadButton.Y,
  [B.L1]: GamepadButton.L1,
  [B.R1]: GamepadButton.R1,
  [B.L2]: GamepadButton.L2,
  [B.R2]: GamepadButton.R2,
  [B.SELECT]: GamepadButton.Select,
  [B.START]: GamepadButton.Start,
};

const DPAD_CODE: Record<string, number> = {
  [D.UP]: GamepadButton.DpadUp,
  [D.DOWN]: GamepadButton.DpadDown,
  [D.LEFT]: GamepadButton.DpadLeft,
  [D.RIGHT]: GamepadButton.DpadRight,
};

const AXIS_CODE: Record<string, number> = {
  [AX.LX]: GamepadAxis.LeftX,
  [AX.LY]: GamepadAxis.LeftY,
  [AX.RX]: GamepadAxis.RightX,
  [AX.RY]: GamepadAxis.RightY,
  [AX.L2]: GamepadAxis.L2,
  [AX.R2]: GamepadAxis.R2,
};

/**
 * Bridges a JoystickController to a transport. Subscribes to state changes
 * and sends only the diffs as JOYSTICK_BUTTON / JOYSTICK_AXIS packets so
 * wireless stays low-bandwidth.
 */
export class JoystickBridge {
  private readonly codec = new PacketCodec();
  private lastState: JoystickState | null = null;
  private unsubscribe: (() => void) | null = null;

  constructor(
    private readonly controller: JoystickController,
    private readonly transport: IDtconTransport,
  ) {}

  start(): void {
    if (this.unsubscribe) return;
    this.unsubscribe = this.controller.subscribe((state) => this.onState(state));
  }

  stop(): void {
    this.unsubscribe?.();
    this.unsubscribe = null;
  }

  private onState(state: JoystickState): void {
    const prev = this.lastState ?? this.controller.getState();
    this.lastState = state;

    const send = (packet: Uint8Array) => void this.transport.send(packet);

    for (const id of AXES) {
      const before = prev.axes[id];
      const now = state.axes[id];
      if (before !== now && now !== undefined) {
        send(this.codec.encodeJoystickAxis(AXIS_CODE[id], now));
      }
    }

    for (const id of BUTTONS) {
      const before = prev.buttons[id];
      const now = state.buttons[id];
      if (before !== now) {
        send(this.codec.encodeJoystickButton(BUTTON_CODE[id], now));
      }
    }

    for (const id of DPADS) {
      const before = prev.dpad[id];
      const now = state.dpad[id];
      if (before !== now) {
        send(this.codec.encodeJoystickButton(DPAD_CODE[id], now));
      }
    }
  }
}