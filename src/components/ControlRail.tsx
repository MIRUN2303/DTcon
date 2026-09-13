import { NavAction } from '../protocol/codec';

interface ControlRailProps {
  dpi: number;
  onHome: () => void;
  onDpi: (delta: 1 | -1) => void;
  onNav: (action: NavAction) => void;
  onToggleFullscreen: () => void;
}

const NAV_ITEMS = [
  { icon: '←', label: 'BACK', action: NavAction.Back },
  { icon: '→', label: 'FWD', action: NavAction.Forward },
  { icon: '◀', label: 'PREV', action: NavAction.PrevTrack },
  { icon: '▶', label: 'NEXT', action: NavAction.NextTrack },
];

export default function ControlRail({ dpi, onHome, onDpi, onNav, onToggleFullscreen }: ControlRailProps) {
  return (
    <aside className="rail" aria-label="Control rail">
      <button className="rail__btn rail__btn--home" onClick={onHome} aria-label="Home">
        <span className="rail__icon">⌂</span>
      </button>
      <div className="rail__sep" />
      <div className="rail__dpi">
        <span className="rail__dpi-label">DPI</span>
        <span className="rail__dpi-value">{dpi}</span>
        <div className="rail__dpi-ctls">
          <button
            className="rail__dpi-ctl"
            onClick={() => onDpi(-1)}
            aria-label="Decrease DPI"
          >
            −
          </button>
          <button
            className="rail__dpi-ctl"
            onClick={() => onDpi(1)}
            aria-label="Increase DPI"
          >
            +
          </button>
        </div>
      </div>
      <div className="rail__sep" />
      {NAV_ITEMS.map((item) => (
        <button
          key={item.action}
          className="rail__btn rail__btn--nav"
          onClick={() => onNav(item.action)}
          aria-label={item.label}
        >
          <span className="rail__icon">{item.icon}</span>
          <span className="rail__label">{item.label}</span>
        </button>
      ))}
      <div className="rail__grow" />
      <div className="rail__sep" />
      <button className="rail__btn" onClick={onToggleFullscreen} aria-label="Toggle fullscreen">
        <span className="rail__icon">⛶</span>
      </button>
    </aside>
  );
}