export type GestureKind =
  | 'move'
  | 'tap'
  | 'doubleTap'
  | 'rightClick'
  | 'dragStart'
  | 'dragMove'
  | 'dragEnd'
  | 'scroll';

export interface GestureEvent {
  kind: GestureKind;
  dx: number;
  dy: number;
}

export interface GestureEngineOptions {
  holdMs?: number;
  doubleTapMs?: number;
  slopPx?: number;
  now?: () => number;
  onScrollModeChange?: (enabled: boolean) => void;
}

const DEFAULT_HOLD_MS = 320;
const DEFAULT_DOUBLE_TAP_MS = 350;
const DEFAULT_SLOP_PX = 8;

interface Finger {
  id: number;
  x: number;
  y: number;
  startX: number;
  startY: number;
  downAt: number;
  moved: boolean;
}

export class GestureEngine {
  private readonly holdMs: number;
  private readonly doubleTapMs: number;
  private readonly slopPx: number;
  private readonly now: () => number;
  private readonly emit: (event: GestureEvent) => void;

  private fingers = new Map<number, Finger>();
  private holdTimer: ReturnType<typeof setTimeout> | null = null;
  private pointerCount = 0;
  private multiFinger = false;
  private dragging = false;
  private lastTapAt = 0;
  private scrollMode = false;
  private readonly onScrollModeChange?: (enabled: boolean) => void;

  constructor(emit: (event: GestureEvent) => void, options: GestureEngineOptions = {}) {
    this.emit = emit;
    this.holdMs = options.holdMs ?? DEFAULT_HOLD_MS;
    this.doubleTapMs = options.doubleTapMs ?? DEFAULT_DOUBLE_TAP_MS;
    this.slopPx = options.slopPx ?? DEFAULT_SLOP_PX;
    this.now = options.now ?? (() => Date.now());
    this.onScrollModeChange = options.onScrollModeChange;
  }

  setScrollMode(enabled: boolean): void {
    if (this.scrollMode !== enabled) {
      this.scrollMode = enabled;
      this.onScrollModeChange?.(enabled);
    }
  }

  pointerDown(id: number, x: number, y: number): void {
    this.pointerCount += 1;
    const downAt = this.now();
    const finger: Finger = { id, x, y, startX: x, startY: y, downAt, moved: false };
    this.fingers.set(id, finger);

    if (this.pointerCount >= 2) {
      this.multiFinger = true;
      this.clearHoldTimer();
      return;
    }

    if (this.scrollMode) {
      this.scheduleScrollHold();
      return;
    }

    this.dragging = false;
    this.holdTimer = setTimeout(() => {
      const stillDown = this.fingers.get(id);
      if (stillDown && !this.multiFinger && !this.scrollMode) {
        this.dragging = true;
        this.emit({ kind: 'dragStart', dx: 0, dy: 0 });
      }
    }, this.holdMs);
  }

  private scheduleScrollHold(): void {
    this.holdTimer = setTimeout(() => {
      this.scrollMode = true;
    }, 0);
  }

  pointerMove(id: number, x: number, y: number): void {
    const finger = this.fingers.get(id);
    if (!finger) return;
    const dx = x - finger.x;
    const dy = y - finger.y;
    finger.x = x;
    finger.y = y;

    const totalDx = x - finger.startX;
    const totalDy = y - finger.startY;
    if (!finger.moved && Math.hypot(totalDx, totalDy) > this.slopPx) {
      finger.moved = true;
    }

    if (this.multiFinger) {
      this.emit({ kind: 'scroll', dx, dy });
      return;
    }

    if (this.dragging) {
      this.emit({ kind: 'dragMove', dx, dy });
      return;
    }

    if (this.scrollMode) {
      if (finger.moved) {
        this.emit({ kind: 'scroll', dx, dy });
      }
      return;
    }

    if (finger.moved) {
      const smoothDx = this.applyAcceleration(dx, dx);
      const smoothDy = this.applyAcceleration(dy, dy);
      this.emit({ kind: 'move', dx: smoothDx, dy: smoothDy });
    }
  }

  pointerUp(id: number): void {
    const finger = this.fingers.get(id);
    if (!finger) return;
    const now = this.now();
    const heldMs = now - finger.downAt;
    const wasMultiFinger = this.multiFinger;
    this.fingers.delete(id);
    this.pointerCount -= 1;

    if (this.pointerCount < 2 && this.multiFinger) {
      this.multiFinger = false;
    }

    if (this.dragging) {
      this.dragging = false;
      this.emit({ kind: 'dragEnd', dx: 0, dy: 0 });
      this.clearHoldTimer();
      return;
    }

    if (this.scrollMode) {
      this.clearHoldTimer();
      return;
    }

    this.clearHoldTimer();

    if (wasMultiFinger) {
      if (!finger.moved && heldMs <= this.doubleTapMs) {
        this.emit({ kind: 'rightClick', dx: 0, dy: 0 });
      }
      return;
    }

    if (!finger.moved) {
      if (heldMs <= this.doubleTapMs) {
        const isDoubleTap = now - this.lastTapAt <= this.doubleTapMs;
        this.lastTapAt = now;
        this.emit({ kind: isDoubleTap ? 'doubleTap' : 'tap', dx: 0, dy: 0 });
      }
      return;
    }
  }

  pointerCancel(): void {
    this.fingers.clear();
    this.pointerCount = 0;
    this.multiFinger = false;
    if (this.dragging) {
      this.dragging = false;
      this.emit({ kind: 'dragEnd', dx: 0, dy: 0 });
    }
    this.clearHoldTimer();
  }

  private clearHoldTimer(): void {
    if (this.holdTimer !== null) {
      clearTimeout(this.holdTimer);
      this.holdTimer = null;
    }
  }

  private applyAcceleration(delta: number, magnitude: number): number {
    const speed = Math.abs(magnitude);
    const accel = Math.min(1.5, Math.max(0.5, speed / 24));
    return delta * accel;
  }

  reset(): void {
    this.pointerCancel();
  }
}