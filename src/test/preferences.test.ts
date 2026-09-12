import { describe, expect, it, vi } from 'vitest';
import { DEFAULT_PREFERENCES, loadPreferences, savePreferences, nextDpi } from '../storage/preferences';

const KEY = 'dtcon.prefs.v1';

function mockStorage(initial?: string) {
  const store = new Map<string, string>();
  if (initial) store.set(KEY, initial);
  vi.stubGlobal('localStorage', {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => void store.set(k, v),
    removeItem: (k: string) => void store.delete(k),
    clear: () => store.clear(),
    key: () => undefined,
    get length() {
      return store.size;
    },
  });
}

describe('preferences', () => {
  it('loads defaults when storage is empty', () => {
    mockStorage();
    expect(loadPreferences()).toEqual(DEFAULT_PREFERENCES);
  });

  it('round-trips saved preferences', () => {
    mockStorage();
    savePreferences({ dpi: 1600, scrollSensitivity: 2.0, modeOrder: ['joystick', 'mouse'], lastMode: 'joystick' });
    expect(loadPreferences()).toEqual({
      dpi: 1600,
      scrollSensitivity: 2.0,
      modeOrder: ['joystick', 'mouse'],
      lastMode: 'joystick',
    });
  });

  it('clamps dpi to nearest known value', () => {
    mockStorage();
    savePreferences({ ...DEFAULT_PREFERENCES, dpi: 790 });
    expect(loadPreferences().dpi).toBe(800);
  });

  it('clamps scrollSensitivity to 0.5..4.0', () => {
    mockStorage();
    savePreferences({ ...DEFAULT_PREFERENCES, scrollSensitivity: 99 });
    expect(loadPreferences().scrollSensitivity).toBe(4);
    savePreferences({ ...DEFAULT_PREFERENCES, scrollSensitivity: 0.1 });
    expect(loadPreferences().scrollSensitivity).toBe(0.5);
  });

  it('normalizes corrupt mode order and fills missing modes', () => {
    mockStorage('{"modeOrder":["marble","joystick"],"dpi":"bad"}');
    const prefs = loadPreferences();
    expect(prefs.modeOrder).toEqual(['joystick', 'mouse']);
    expect(prefs.dpi).toBe(DEFAULT_PREFERENCES.dpi);
  });

  it('returns default on corrupt JSON', () => {
    mockStorage('{not json');
    expect(loadPreferences()).toEqual(DEFAULT_PREFERENCES);
  });

  it('nextDpi cycles through known values', () => {
    expect(nextDpi(800)).toBe(1000);
  });
});