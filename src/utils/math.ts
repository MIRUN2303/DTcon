export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function clampInt16(value: number): number {
  return clamp(Math.round(value), -32767, 32767);
}

export function moveItem<T>(items: readonly T[], from: number, to: number): T[] {
  if (from === to || from < 0 || from >= items.length || to < 0 || to >= items.length) {
    return [...items];
  }
  const copy = [...items];
  const [moved] = copy.splice(from, 1);
  copy.splice(to, 0, moved as T);
  return copy;
}