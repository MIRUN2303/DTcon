import { useCallback, useEffect, useRef, useState } from 'react';

const TRIPLE_TAP_WINDOW_MS = 500;

/** Fullscreen toggle: tap to enter, triple-tap to unlock the minimize control, tap to exit. */
export default function FullscreenToggle() {
  const [fullscreen, setFullscreen] = useState(false);
  const [unlocked, setUnlocked] = useState(false);
  const taps = useRef<number[]>([]);

  useEffect(() => {
    const sync = () => setFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener('fullscreenchange', sync);
    return () => document.removeEventListener('fullscreenchange', sync);
  }, []);

  const enter = useCallback(() => {
    void document.documentElement.requestFullscreen();
  }, []);

  const exit = useCallback(() => {
    void document.exitFullscreen();
  }, []);

  const handleTap = useCallback(() => {
    if (!fullscreen) {
      setUnlocked(false);
      enter();
      return;
    }
    if (unlocked) {
      exit();
      return;
    }
    const now = Date.now();
    taps.current = taps.current.filter((t) => now - t <= TRIPLE_TAP_WINDOW_MS);
    taps.current.push(now);
    if (taps.current.length >= 3) {
      taps.current = [];
      setUnlocked(true);
    }
  }, [fullscreen, unlocked, enter, exit]);

  const icon = !fullscreen ? 'expand' : unlocked ? 'collapse' : 'lock';

  return (
    <button className="fs-toggle" onClick={handleTap} aria-label="Fullscreen">
      <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        {icon === 'expand' && (
          <>
            <path d="M8 3H3v5" />
            <path d="M16 3h5v5" />
            <path d="M8 21H3v-5" />
            <path d="M16 21h5v-5" />
          </>
        )}
        {icon === 'collapse' && (
          <>
            <path d="M8 8H3v3" />
            <path d="M16 8h5v3" />
            <path d="M8 16H3v-3" />
            <path d="M16 16h5v-3" />
          </>
        )}
        {icon === 'lock' && (
          <g>
            <rect x="5" y="10" width="14" height="10" rx="2" />
            <path d="M8 10V7a4 4 0 0 1 8 0v3" />
          </g>
        )}
      </svg>
    </button>
  );
}