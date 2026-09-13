import { ModeId } from '../storage/preferences';
import SpotlightCard from './SpotlightCard';

interface ModeCardProps {
  mode: ModeId;
  order: number;
  comingSoon?: boolean;
  dragging?: boolean;
  onSelect: (mode: ModeId) => void;
  onGripStart: (e: React.PointerEvent) => void;
  onGripEnd: () => void;
}

export default function ModeCard({ mode, order, comingSoon = false, dragging = false, onSelect, onGripStart, onGripEnd }: ModeCardProps) {
  const isMouse = mode === 'mouse';

  return (
    <div
      className={`mode-card__slot ${dragging ? 'mode-card__slot--dragging' : ''}`}
      style={{ '--order': order } as React.CSSProperties}
    >
      <SpotlightCard
        className={`mode-card ${isMouse ? 'mode-card--mouse' : 'mode-card--joystick'}`}
        spotlightColor="rgba(138, 255, 60, 0.2)"
        onClick={() => onSelect(mode)}
        role="button"
        aria-label={`Open ${mode} mode`}
      >
        <div className="mode-card__content">
          <div className="mode-card__icon">{isMouse ? 'M' : 'J'}</div>
          <div className="mode-card__title">{isMouse ? 'MOUSE' : 'JOYSTICK'}</div>
          {comingSoon && <span className="mode-card__soon">coming soon</span>}
        </div>
        <span
          className="mode-card__grip"
          onPointerDown={(e) => onGripStart(e)}
          onPointerUp={onGripEnd}
          onPointerCancel={onGripEnd}
          aria-label="Drag to reorder"
        >
          <span className="mode-card__grip-dots" />
        </span>
      </SpotlightCard>
    </div>
  );
}