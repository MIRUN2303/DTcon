export type GestureKind =
  | 'move'
  | 'tap'
  | 'doubleTap'
  | 'rightClick'
  | 'dragStart'
  | 'dragMove'
  | 'dragEnd'
  | 'scroll'
  | 'zoom'
  | 'swipeUp'
  | 'swipeDown'
  | 'swipeLeft'
  | 'swipeRight'
  | 'tap3'
  | 'tap4';

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
const PINCH_SLOP_PX = 10;
const ZOOM_STEP_SPAN = 14;
const SWIPE_SLOP_PX = 30;

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
  private groupMulti = false;
  private consumed = false;
  private pinchActive = false;
  private emittedZoomStep = 0;
  private baseCentroidX = 0;
  private baseCentroidY = 0;
  private baseSpan = 0;
  private prevCentroidX = 0;
  private prevCentroidY = 0;
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
    this.fingers.set(id, { id, x, y, startX: x, startY: y, downAt: this.now(), moved: false });
    this.pointerCount += 1;

    if (this.pointerCount >= 2) {
      this.multiFinger = true;
      this.groupMulti = true;
      this.consumed = false;
      this.pinchActive = false;
      this.emittedZoomStep = 0;
      const c = this.centroid();
      this.baseCentroidX = c.x;
      this.baseCentroidY = c.y;
      this.prevCentroidX = c.x;
      this.prevCentroidY = c.y;
      this.baseSpan = this.span();
      this.clearHoldTimer();
      return;
    }

    if (this.groupMulti) {
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

    if (this.fingers.size === 1) {
      if (this.groupMulti) return;
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
      return;
    }

    if (this.consumed) return;

    if (this.fingers.size === 2) {
      const s = this.span();
      const dSpan = s - this.baseSpan;
      if (!this.pinchActive && Math.abs(dSpan) > PINCH_SLOP_PX) {
        this.pinchActive = true;
        this.emittedZoomStep = 0;
      }
      if (this.pinchActive) {
        const step = Math.trunc(dSpan / ZOOM_STEP_SPAN);
        if (step !== this.emittedZoomStep) {
          this.emittedZoomStep = step;
          this.emit({ kind: 'zoom', dx: 0, dy: step });
        }
      } else {
        const c = this.centroid();
        const cx = c.x - this.prevCentroidX;
        const cy = c.y - this.prevCentroidY;
        if (cx !== 0 || cy !== 0) {
          this.emit({ kind: 'scroll', dx: cx, dy: cy });
        }
      }
      const c = this.centroid();
      this.prevCentroidX = c.x;
      this.prevCentroidY = c.y;
      return;
    }

    const c = this.centroid();
    const sx = c.x - this.baseCentroidX;
    const sy = c.y - this.baseCentroidY;
    if (Math.hypot(sx, sy) > SWIPE_SLOP_PX) {
      const kind =
        Math.abs(sx) > Math.abs(sy)
          ? sx < 0
            ? 'swipeLeft'
            : 'swipeRight'
          : sy < 0
            ? 'swipeUp'
            : 'swipeDown';
      this.consumed = true;
      this.emit({ kind, dx: 0, dy: 0 });
    }
    this.prevCentroidX = c.x;
    this.prevCentroidY = c.y;
  }

  private centroid(): { x: number; y: number } {
    let x = 0;
    let y = 0;
    let n = 0;
    this.fingers.forEach((f) => {
      x += f.x;
      y += f.y;
      n += 1;
    });
    return { x: x / n, y: y / n };
  }

  private span(): number {
    const f = Array.from(this.fingers.values());
    let max = 0;
    for (let i = 0; i < f.length; i += 1) {
      for (let j = i + 1; j < f.length; j += 1) {
        const d = Math.hypot(f[i].x - f[j].x, f[i].y - f[j].y);
        if (d > max) max = d;
      }
    }
    return max;
  }

  pointerUp(id: number): void {
    const finger = this.fingers.get(id);
    if (!finger) return;
    const now = this.now();
    const heldMs = now - finger.downAt;
    const countBefore = this.pointerCount;
    this.fingers.delete(id);
    this.pointerCount -= 1;

    if (this.dragging) {
      this.dragging = false;
      this.emit({ kind: 'dragEnd', dx: 0, dy: 0 });
      this.clearHoldTimer();
      return;
    }

    this.clearHoldTimer();

    if (this.groupMulti) {
      if (!this.consumed && countBefore >= 2 && !finger.moved && heldMs <= this.doubleTapMs) {
        if (countBefore === 2) this.emit({ kind: 'rightClick', dx: 0, dy: 0 });
        else if (countBefore === 3) this.emit({ kind: 'tap3', dx: 0, dy: 0 });
        else if (countBefore === 4) this.emit({ kind: 'tap4', dx: 0, dy: 0 });
      }
      if (this.pointerCount === 0) {
        this.groupMulti = false;
        this.multiFinger = false;
        this.consumed = false;
        this.pinchActive = false;
        this.emittedZoomStep = 0;
      }
      return;
    }

    if (this.scrollMode) return;

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
    this.groupMulti = false;
    this.consumed = false;
    this.pinchActive = false;
    this.emittedZoomStep = 0;
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