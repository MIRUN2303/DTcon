export interface StickVec {
  x: number;
  y: number;
}

export interface VirtualStickOptions {
  deadzone?: number;
}

const DEFAULT_DEADZONE = 0.1;

/**
 * Pure analog stick engine. Owns a single pointer, resolves raw cursor
 * positions (relative to the stick centre) into normalized -1..1 values,
 * applies the deadzone and clamps travel to the stick radius.
 */
export class VirtualStickController {
  private readonly deadzone: number;
  private pointerId: number | null = null;
  private radius = 1;
  private originX = 0;
  private originY = 0;

  constructor(options: VirtualStickOptions = {}) {
    this.deadzone = options.deadzone ?? DEFAULT_DEADZONE;
  }

  get active(): boolean {
    return this.pointerId !== null;
  }

  /** Claim the stick for this pointer. centre + radius in element-relative px. */
  down(pointerId: number, radius: number, centreX: number, centreY: number, x: number, y: number): StickVec {
    this.pointerId = pointerId;
    this.radius = radius;
    this.originX = centreX;
    this.originY = centreY;
    return this.resolve(x, y);
  }

  move(x: number, y: number): StickVec {
    if (!this.active) return { x: 0, y: 0 };
    return this.resolve(x, y);
  }

  up(pointerId: number): void {
    if (this.pointerId === pointerId) this.pointerId = null;
  }

  cancel(): void {
    this.pointerId = null;
  }

  private resolve(x: number, y: number): StickVec {
    let dx = x - this.originX;
    let dy = y - this.originY;
    const dist = Math.hypot(dx, dy);
    if (dist > this.radius) {
      dx = (dx / dist) * this.radius;
      dy = (dy / dist) * this.radius;
    }
    const nx = this.radius > 0 ? dx / this.radius : 0;
    const ny = this.radius > 0 ? dy / this.radius : 0;
    if (Math.hypot(nx, ny) < this.deadzone) return { x: 0, y: 0 };
    return { x: nx, y: ny };
  }
}