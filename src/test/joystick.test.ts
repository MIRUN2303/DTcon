import { describe, expect, it } from 'vitest';
import { JoystickController, B, D, AX } from '../joystick/commands';
import { VirtualStickController } from '../joystick/VirtualStickController';
import { DPadEngine } from '../joystick/DPadEngine';

describe('JoystickController', () => {
  it('starts with a fully released state', () => {
    const c = new JoystickController();
    const s = c.getState();
    expect(Object.values(s.buttons).every((v) => v === false)).toBe(true);
    expect(Object.values(s.dpad).every((v) => v === false)).toBe(true);
    expect(s.axes[AX.LX]).toBe(0);
    expect(s.axes[AX.LY]).toBe(0);
    expect(s.axes[AX.L2]).toBe(0);
  });

  it('tracks button down/up edges', () => {
    const c = new JoystickController();
    c.buttonDown(B.A);
    expect(c.getState().buttons[B.A]).toBe(true);
    c.buttonUp(B.A);
    expect(c.getState().buttons[B.A]).toBe(false);
  });

  it('tracks dpad directions independently', () => {
    const c = new JoystickController();
    c.dpad(D.LEFT, true);
    c.dpad(D.UP, true);
    expect(c.getState().dpad[D.LEFT]).toBe(true);
    expect(c.getState().dpad[D.UP]).toBe(true);
    expect(c.getState().dpad[D.RIGHT]).toBe(false);
  });

  it('tracks analog axes in normalized space', () => {
    const c = new JoystickController();
    c.leftStick(0.5, -1);
    c.trigger(AX.R2, 0.4);
    const s = c.getState();
    expect(s.axes[AX.LX]).toBeCloseTo(0.5);
    expect(s.axes[AX.LY]).toBeCloseTo(-1);
    expect(s.axes[AX.R2]).toBeCloseTo(0.4);
  });

  it('releaseAll resets everything', () => {
    const c = new JoystickController();
    c.buttonDown(B.B);
    c.dpad(D.DOWN, true);
    c.leftStick(1, 1);
    c.trigger(AX.L2, 1);
    c.releaseAll();
    const s = c.getState();
    expect(Object.values(s.buttons).every((v) => v === false)).toBe(true);
    expect(Object.values(s.dpad).every((v) => v === false)).toBe(true);
    expect(s.axes[AX.LX]).toBe(0);
    expect(s.axes[AX.L2]).toBe(0);
  });

  it('notifies subscribers with the new snapshot, captures in and out-change screenshots', () => {
    const c = new JoystickController();
    const seen: boolean[] = [];
    c.subscribe((s) => seen.push(s.buttons[B.X]));
    c.buttonDown(B.X);
    c.buttonUp(B.X);
    expect(seen).toEqual([true, false]);
  });

  it('subscribe returns an unsubscribe function', () => {
    const c = new JoystickController();
    const seen: boolean[] = [];
    const unsub = c.subscribe((s) => seen.push(s.buttons[B.A]));
    c.buttonDown(B.A);
    unsub();
    c.buttonUp(B.A);
    expect(seen).toEqual([true]);
  });
});

describe('VirtualStickController', () => {
  it('normalizes position relative to the centre, capped at the radius', () => {
    const s = new VirtualStickController({ deadzone: 0 });
    // centre 100,100, radius 50; pointer at 100,150 -> straight down, full
    expect(s.down(7, 50, 100, 100, 100, 150)).toEqual({ x: 0, y: 1 });
    // half way
    expect(s.move(100, 125)).toEqual({ x: 0, y: 0.5 });
  });

  it('clamps beyond-radius positions to the rim', () => {
    const s = new VirtualStickController({ deadzone: 0 });
    s.down(1, 50, 100, 100, 100, 300);
    const v = s.move(100, 300);
    expect(Math.hypot(v.x, v.y)).toBeCloseTo(1);
  });

  it('applies the deadzone near the centre', () => {
    const s = new VirtualStickController({ deadzone: 0.2 });
    s.down(1, 50, 100, 100, 100, 104); // 8% diverted
    expect(s.move(100, 104)).toEqual({ x: 0, y: 0 });
    // 30% travel is outside the deadzone
    const v = s.move(100, 115);
    expect(Math.hypot(v.x, v.y)).toBeGreaterThan(0);
  });

  it('ignores move while unowned and releases on up/cancel', () => {
    const s = new VirtualStickController({ deadzone: 0 });
    expect(s.move(200, 200)).toEqual({ x: 0, y: 0 });
    s.down(9, 50, 100, 100, 100, 150);
    expect(s.active).toBe(true);
    s.up(9);
    expect(s.active).toBe(false);
    expect(s.move(100, 150)).toEqual({ x: 0, y: 0 });
  });

  it('up only releases the owning pointer', () => {
    const s = new VirtualStickController({ deadzone: 0 });
    s.down(5, 50, 100, 100, 100, 150);
    s.up(42);
    expect(s.active).toBe(true);
  });
});

describe('DPadEngine', () => {
  it('engages a single direction for a clear press', () => {
    const e = new DPadEngine();
    const m = e.down(1, 50, 50, 50, 50, 20); // up
    expect(m).toEqual({ up: true, down: false, left: false, right: false });
  });

  it('engages two arms at a diagonal corner', () => {
    const e = new DPadEngine();
    const m = e.down(1, 50, 50, 50, 20, 20); // up-left
    expect(m).toEqual({ up: true, down: false, left: true, right: false });
  });

  it('releases in the centre zone or outside the pad', () => {
    const e = new DPadEngine();
    e.down(1, 50, 50, 50, 50, 20);
    expect(e.move(50, 50).up).toBe(false); // centre
    expect(e.active).toBe(true);
    e.move(200, 200);
    expect(e.mask).toEqual({ up: false, down: false, left: false, right: false });
  });

  it('up ignores a foreign pointer, cancel clears everything', () => {
    const e = new DPadEngine();
    e.down(1, 50, 50, 50, 50, 20);
    e.up(2);
    expect(e.active).toBe(true);
    e.cancel();
    expect(e.active).toBe(false);
  });
});