const KEY = 'dtcon.hints.v1';

export function hasSeenMouseHints(): boolean {
  try {
    return localStorage.getItem(KEY) === '1';
  } catch {
    return true;
  }
}

export function markMouseHintsSeen(): void {
  try {
    localStorage.setItem(KEY, '1');
  } catch {
    // storage unavailable; hint will just show again next session
  }
}