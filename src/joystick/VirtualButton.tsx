import { useCallback, useRef, useState } from 'react';

interface VirtualButtonProps {
  label: string;
  sub?: string;
  className?: string;
  ariaLabel: string;
  variant?: 'round' | 'pill' | 'square';
  disabled?: boolean;
  onDown?: () => void;
  onUp?: () => void;
}

/**
 * Glassmorphism press button. Owns its pointer, toggles a pressed class
 * (drives the CSS press animation) and reports down/up edges.
 */
export default function VirtualButton({
  label,
  sub,
  className = '',
  ariaLabel,
  variant = 'round',
  disabled = false,
  onDown,
  onUp,
}: VirtualButtonProps) {
  const [pressed, setPressed] = useState(false);
  const ref = useRef<HTMLButtonElement | null>(null);

  const press = useCallback(() => {
    setPressed(true);
    onDown?.();
  }, [onDown]);

  const release = useCallback(() => {
    setPressed(false);
    onUp?.();
  }, [onUp]);

  const cancel = useCallback(() => {
    setPressed(false);
    onUp?.();
  }, [onUp]);

  return (
    <button
      ref={ref}
      type="button"
      className={`jk-btn jk-btn--${variant} ${pressed ? 'jk-btn--pressed' : ''} ${className}`}
      aria-label={ariaLabel}
      aria-pressed={pressed}
      disabled={disabled}
      onPointerDown={(e) => {
        e.preventDefault();
        e.currentTarget.setPointerCapture(e.pointerId);
        press();
      }}
      onPointerUp={(e) => {
        e.currentTarget.releasePointerCapture(e.pointerId);
        release();
      }}
      onPointerCancel={cancel}
      onPointerLeave={(e) => {
        if (e.currentTarget.hasPointerCapture(e.pointerId)) cancel();
      }}
    >
      <span className="jk-btn__label">{label}</span>
      {sub && <span className="jk-btn__sub">{sub}</span>}
    </button>
  );
}