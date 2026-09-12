import { describe, expect, it } from 'vitest';
import { GestureEngine, GestureEvent } from '../gestures/GestureEngine';

function run() {
  const events: GestureEvent[] = [];
  const engine = new GestureEngine((e) => events.push(e));
  return { engine, events };
}

async function flush() {
  await new Promise((r) => setTimeout(r, 0));
}

describe('GestureEngine', () => {
  it('emits move after slop exceeded', async () => {
    const { engine, events } = run();
    engine.pointerDown(1, 10, 10);
    engine.pointerMove(1, 20, 10);
    await flush();
    expect(events.some((e) => e.kind === 'move')).toBe(true);
  });

  it('emits tap on quick release without movement', async () => {
    const { engine, events } = run();
    engine.pointerDown(1, 10, 10);
    engine.pointerUp(1);
    expect(events).toContainEqual({ kind: 'tap', dx: 0, dy: 0 });
  });

  it('emits doubleTap on two quick taps', async () => {
    const { engine, events } = run();
    engine.pointerDown(1, 10, 10);
    engine.pointerUp(1);
    engine.pointerDown(1, 10, 10);
    engine.pointerUp(1);
    expect(events.map((e) => e.kind)).toContain('doubleTap');
  });

  it('emits rightClick on two-finger tap', async () => {
    const { engine, events } = run();
    engine.pointerDown(1, 10, 10);
    engine.pointerDown(2, 30, 10);
    engine.pointerUp(1);
    engine.pointerUp(2);
    expect(events.map((e) => e.kind)).toContain('rightClick');
  });

  it('emits dragStart after hold, then dragMove, then dragEnd', async () => {
    const events: GestureEvent[] = [];
    const engine = new GestureEngine((e) => events.push(e), { holdMs: 10, doubleTapMs: 350 });
    engine.pointerDown(1, 10, 10);
    await new Promise((r) => setTimeout(r, 30));
    expect(events.map((e) => e.kind)).toContain('dragStart');
    engine.pointerMove(1, 30, 10);
    expect(events.map((e) => e.kind)).toContain('dragMove');
    engine.pointerUp(1);
    expect(events.map((e) => e.kind)).toContain('dragEnd');
  });

  it('emits scroll with two fingers', async () => {
    const { engine, events } = run();
    engine.pointerDown(1, 10, 10);
    engine.pointerDown(2, 30, 10);
    engine.pointerMove(1, 10, 25);
    expect(events.some((e) => e.kind === 'scroll')).toBe(true);
  });

  it('cancels cleanly without emitting drag start', async () => {
    const { engine, events } = run();
    engine.pointerDown(1, 10, 10);
    engine.pointerCancel();
    expect(events).toHaveLength(0);
  });
});