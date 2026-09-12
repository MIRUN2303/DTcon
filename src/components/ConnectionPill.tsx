import { TransportStatus } from '../bluetooth/transport';

export default function ConnectionPill({ status }: { status: TransportStatus }) {
  const cls = `connection-pill connection-pill--${status.status.toLowerCase()}${status.isDemo ? ' connection-pill--demo' : ''}`;
  const label =
    status.status === 'CONNECTING'
      ? 'Connecting…'
      : status.status === 'CONNECTED'
        ? status.isDemo
          ? 'Demo connected'
          : 'Connected'
        : status.status === 'ERROR'
          ? status.lastError ?? 'Connection error'
          : status.status === 'RECONNECTING'
            ? 'Reconnecting…'
            : 'Demo ready';

  return (
    <div className={cls} role="status">
      <span className="connection-pill__dot" />
      <span>{label}</span>
    </div>
  );
}