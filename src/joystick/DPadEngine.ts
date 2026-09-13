export type PadDirection = 'up' | 'down' | 'left' | 'right';

export type PadMask = Record<PadDirection, boolean>;

export const EMPTY_PAD: PadMask = { up: false, down: false, left: false, right: false };

export const DIRS: PadDirection[] = ['up', 'down', 'left', 'right'];

export function maskEqual(a: PadMask, b: PadMask): boolean {
  return DIRS.every((d) => a[d] === b[d]);
}

/**
 * Pure d-pad engine. A single pointer resolves its position relative to the
 * pad centre into a direction mask. Points close to a pad corner engage two
 * adjacent arms (diagonal); the centre zone and outside the pad engage none.
 */
export class DPadEngine {
  private pointerId: number | null = null;
  private radius = 1;
  private centreX = 0;
  private centreY = 0;
  private current: PadMask = { ...EMPTY_PAD };

  get active(): boolean {
    return this.pointerId !== null;
  }

  get mask(): PadMask {
    return { ...this.current };
  }

  down(pointerId: number, radius: number, centreX: number, centreY: number, x: number, y: number): PadMask {
    this.pointerId = pointerId;
    this.radius = radius;
    this.centreX = centreX;
    this.centreY = centreY;
    this.current = { ...EMPTY_PAD };
    return this.resolve(x, y);
  }

  move(x: number, y: number): PadMask {
    if (!this.active) return { ...EMPTY_PAD };
    return this.resolve(x, y);
  }

  up(pointerId: number): void {
    if (this.pointerId === pointerId) {
      this.pointerId = null;
      this.current = { ...EMPTY_PAD };
    }
  }

  cancel(): void {
    this.pointerId = null;
    this.current = { ...EMPTY_PAD };
  }

  private resolve(x: number, y: number): PadMask {
    const dx = x - this.centreX;
    const dy = y - this.centreY;
    const dist = Math.hypot(dx, dy);
    if (dist < this.radius * 0.18 || dist > this.radius) {
      this.current = { ...EMPTY_PAD };
      return this.mask;
    }
    const nx = dx / this.radius;
    const ny = dy / this.radius;
    const horiz = Math.abs(nx) > Math.abs(ny) * 0.75;
    const vert = Math.abs(ny) > Math.abs(nx) * 0.75;
    this.current = {
      up: vert && ny < 0,
      down: vert && ny > 0,
      left: horiz && nx < 0,
      right: horiz && nx > 0,
    };
    return this.mask;
  }
}