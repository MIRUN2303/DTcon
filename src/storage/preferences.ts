import { clamp } from '../utils/math';

export const MODES = ['mouse', 'joystick'] as const;
export type ModeId = (typeof MODES)[number];

export interface Preferences {
  dpi: number;
  scrollSensitivity: number;
  modeOrder: ModeId[];
  lastMode: ModeId;
}

export const DPI_VALUES = [
  400, 600, 800, 1000, 1200, 1400, 1600, 1800, 2000, 2200, 2400, 2600, 2800, 3000, 3200,
];

export const DEFAULT_PREFERENCES: Preferences = {
  dpi: 800,
  scrollSensitivity: 1.0,
  modeOrder: ['mouse', 'joystick'],
  lastMode: 'mouse',
};

const STORAGE_KEY = 'dtcon.prefs.v1';

function clampDpi(dpi: unknown): number {
  if (typeof dpi !== 'number' || !Number.isFinite(dpi)) return DEFAULT_PREFERENCES.dpi;
  return DPI_VALUES.reduce((prev, curr) => (Math.abs(curr - dpi) < Math.abs(prev - dpi) ? curr : prev));
}

function clampSensitivity(value: unknown): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) return DEFAULT_PREFERENCES.scrollSensitivity;
  return Math.round(clamp(value, 0.5, 4.0) * 100) / 100;
}

function normalizeModeOrder(value: unknown): ModeId[] {
  const seen = new Set<ModeId>();
  const order: ModeId[] = [];
  if (Array.isArray(value)) {
    for (const mode of value) {
      if ((MODES as readonly string[]).includes(mode as string)) {
        const id = mode as ModeId;
        if (!seen.has(id)) {
          seen.add(id);
          order.push(id);
        }
      }
    }
  }
  for (const mode of MODES) {
    if (!seen.has(mode)) order.push(mode);
  }
  return order;
}

export function loadPreferences(): Preferences {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULT_PREFERENCES };
    const parsed = JSON.parse(raw) as Partial<Preferences>;
    const modeOrder = normalizeModeOrder(parsed.modeOrder);
    const lastMode = (MODES as readonly string[]).includes(parsed.lastMode as string)
      ? (parsed.lastMode as ModeId)
      : DEFAULT_PREFERENCES.lastMode;
    return {
      dpi: clampDpi(parsed.dpi),
      scrollSensitivity: clampSensitivity(parsed.scrollSensitivity),
      modeOrder,
      lastMode,
    };
  } catch {
    return { ...DEFAULT_PREFERENCES };
  }
}

export function savePreferences(prefs: Preferences): void {
  const normalized = {
    dpi: clampDpi(prefs.dpi),
    scrollSensitivity: clampSensitivity(prefs.scrollSensitivity),
    modeOrder: normalizeModeOrder(prefs.modeOrder),
    lastMode: (MODES as readonly string[]).includes(prefs.lastMode as string)
      ? prefs.lastMode
      : DEFAULT_PREFERENCES.lastMode,
  };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(normalized));
}

export function nextDpi(current: number): number {
  const idx = DPI_VALUES.indexOf(clampDpi(current));
  const next = idx >= 0 ? (idx + 1) % DPI_VALUES.length : 0;
  return DPI_VALUES[next];
}

export function prevDpi(current: number): number {
  const idx = DPI_VALUES.indexOf(clampDpi(current));
  const prev = idx > 0 ? idx - 1 : DPI_VALUES.length - 1;
  return DPI_VALUES[prev];
}