import { GestureEvent } from '../gestures/GestureEngine';
import { PacketCodec, NavAction, Button } from '../protocol/codec';
import { IDtconTransport } from '../bluetooth/transport';
import { clampInt16 } from '../utils/math';

export interface InputSettings {
  dpi: number;
  scrollSensitivity: number;
}

const REFERENCE_DPI = 800;

export class InputController {
  private codec = new PacketCodec();
  private heldButtons = 0;

  constructor(
    private readonly transport: IDtconTransport,
    private readonly getSettings: () => InputSettings,
  ) {}

  handleEvent(event: GestureEvent): void {
    const settings = this.getSettings();
    const dpiFactor = settings.dpi / REFERENCE_DPI;

    switch (event.kind) {
      case 'move':
        void this.transport.send(this.codec.encodeMove(
          clampInt16(event.dx * dpiFactor),
          clampInt16(event.dy * dpiFactor),
          this.heldButtons,
        ));
        break;
      case 'tap':
        void this.click(Button.Left);
        break;
      case 'doubleTap':
        void this.click(Button.Left);
        void this.click(Button.Left);
        break;
      case 'rightClick':
        void this.click(Button.Right);
        break;
      case 'dragStart':
        this.heldButtons |= Button.Left;
        void this.transport.send(this.codec.encodeButton(Button.Left, true));
        void this.transport.send(this.codec.encodeMove(0, 0, this.heldButtons));
        break;
      case 'dragMove':
        void this.transport.send(this.codec.encodeMove(
          clampInt16(event.dx * dpiFactor),
          clampInt16(event.dy * dpiFactor),
          this.heldButtons,
        ));
        break;
      case 'dragEnd':
        this.heldButtons &= ~Button.Left;
        void this.transport.send(this.codec.encodeButton(Button.Left, false));
        break;
      case 'scroll':
        void this.transport.send(this.codec.encodeScroll(
          clampInt16(event.dx * settings.scrollSensitivity),
          clampInt16(-event.dy * settings.scrollSensitivity),
        ));
        break;
    }
  }

  async click(button: Button): Promise<void> {
    await this.transport.send(this.codec.encodeButton(button, true));
    await this.transport.send(this.codec.encodeButton(button, false));
  }

  nav(action: NavAction): void {
    void this.transport.send(this.codec.encodeNav(action));
  }

  releaseAll(): void {
    this.heldButtons = 0;
  }
}

export { NavAction, Button };