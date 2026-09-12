import { describe, expect, it } from 'vitest';
import { InputController } from '../input/InputController';
import { DemoTransport } from '../bluetooth/DemoTransport';
import { PacketCodec, NavAction } from '../protocol/codec';

async function capture() {
  const transport = new DemoTransport();
  await transport.connect();
  const packets: Uint8Array[] = [];
  transport.onPacket((p) => packets.push(p));
  const codec = new PacketCodec();
  return { controller: new InputController(transport, () => ({ dpi: 800, scrollSensitivity: 1 })), transport, packets, codec };
}

describe('InputController', () => {
  it('emits a button press+release pair for a tap', async () => {
    const { controller, packets, codec } = await capture();
    controller.handleEvent({ kind: 'tap', dx: 0, dy: 0 });
    await new Promise((r) => setTimeout(r, 20));
    expect(packets).toHaveLength(2);
    const pressed = codec.decodeButton(codec.decode(packets[0]));
    const released = codec.decodeButton(codec.decode(packets[1]));
    expect(pressed).toEqual({ button: 1, pressed: true });
    expect(released.pressed).toBe(false);
  });

  it('scales motion by dpi relative to 800', async () => {
    const { controller, packets, codec } = await capture();
    controller.handleEvent({ kind: 'move', dx: 100, dy: -50 });
    await new Promise((r) => setTimeout(r, 20));
    const move = codec.decodeMove(codec.decode(packets[0]));
    expect(move.dx).toBe(100);
    expect(move.dy).toBe(-50);
  });

  it('sends nav actions', async () => {
    const { controller, packets } = await capture();
    controller.nav(NavAction.Back);
    await new Promise((r) => setTimeout(r, 20));
    expect(packets).toHaveLength(1);
  });

  it('holds left button across drag start→move→end', async () => {
    const { controller, packets, codec } = await capture();
    controller.handleEvent({ kind: 'dragStart', dx: 0, dy: 0 });
    controller.handleEvent({ kind: 'dragMove', dx: 10, dy: 0 });
    controller.handleEvent({ kind: 'dragEnd', dx: 0, dy: 0 });
    await new Promise((r) => setTimeout(r, 30));
    const decoded = packets.map((p) => codec.decode(p));
    expect(decoded).toHaveLength(4);
    expect(decoded[0].type).toBe(0x11); // press
    expect(codec.decodeMove(decoded[1]).buttons).toBe(1); // dragStart zero move, held
    expect(codec.decodeMove(decoded[2])).toEqual({ dx: 10, dy: 0, buttons: 1, flags: 0 }); // held move
    expect(decoded[3].type).toBe(0x11); // release
  });
});