import { NavAction } from '../protocol/codec';

interface ControlRailProps {
  dpi: number;
  onHome: () => void;
  onCycleDpi: () => void;
  onNav: (action: NavAction) => void;
  onToggleFullscreen: () => void;
}

const NAV_ITEMS = [
  { label: 'Back', action: NavAction.Back },
  { label: 'Forward', action: NavAction.Forward },
  { label: 'Prev', action: NavAction.PrevTrack },
  { label: 'Next', action: NavAction.NextTrack },
];

export default function ControlRail({ dpi, onHome, onCycleDpi, onNav, onToggleFullscreen }: ControlRailProps) {
  return (
    <aside className="rail" aria-label="Control rail">
      <button className="rail__btn rail__btn--primary" onClick={onHome} aria-label="Home">
        ⌂
      </button>
      <DpiChip dpi={dpi} onCycle={onCycleDpi} />
      <div className="rail__divider" />
      {NAV_ITEMS.map((item) => (
        <button key={item.action} className="rail__btn" onClick={() => onNav(item.action)} aria-label={item.label}>
          {item.label}
        </button>
      ))}
      <div className="rail__divider" />
      <button className="rail__btn" onClick={onToggleFullscreen} aria-label="Toggle fullscreen">
        ⛶
      </button>
    </aside>
  );
}

function DpiChip({ dpi, onCycle }: { dpi: number; onCycle: () => void }) {
  return (
    <button className="rail__btn rail__btn--chars" onClick={() => onCycle()} aria-label="Cycles DPI">
      <span className="rail__dpi-label">DPI</span>
      <span className="rail__dpi-value">{dpi}</span>
    </button>
  );
}