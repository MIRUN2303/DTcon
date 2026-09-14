import { FormEvent, useState } from 'react';
import { useDtcon } from '../state/DtconProvider';
import { IDtconTransport, TransportStatus } from '../bluetooth/transport';
import { SocketTransport } from '../bluetooth/SocketTransport';
import SpotlightCard from './SpotlightCard';

interface WiredModalProps {
  onClose: () => void;
  onAttach: (transport: IDtconTransport) => void;
}

export default function WiredModal({ onClose, onAttach }: WiredModalProps) {
  const { prefs, setWiredAddress } = useDtcon();
  const [address, setAddress] = useState(prefs.wiredAddress || 'ws://192.168.42.129:8222');
  const [transport, setTransport] = useState<SocketTransport | null>(null);
  const [status, setStatus] = useState<TransportStatus | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [connecting, setConnecting] = useState(false);

  const refresh = (t: SocketTransport) => {
    setStatus(t.getStatus());
    return t.onStatusChange(setStatus);
  };

  const connect = async (event: FormEvent) => {
    event.preventDefault();
    setWiredAddress(address);
    const url = address.startsWith('ws://') || address.startsWith('wss://') ? address : `ws://${address}`;
    const t = new SocketTransport(url);
    setTransport(t);
    setError(null);
    setConnecting(true);
    const unsub = refresh(t);
    try {
      const result = await t.connect();
      if (result.ok) {
        onAttach(t);
      } else {
        setError(result.error ?? 'Connection failed');
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setConnecting(false);
      unsub();
    }
  };

  const disconnect = () => {
    void transport?.disconnect();
  };

  const label = status
    ? status.status === 'CONNECTED'
      ? 'Connected'
      : status.status === 'CONNECTING'
        ? 'Connecting…'
        : status.status === 'RECONNECTING'
          ? 'Reconnecting'
          : status.status === 'ERROR'
            ? 'Error'
            : 'Disconnected'
    : 'Disconnected';

  return (
    <div className="ble-overlay">
      <SpotlightCard className="ble-modal connect-modal" spotlightColor="rgba(138, 255, 60, 0.16)">
        <button className="ble-modal__close" onClick={onClose} aria-label="Close">
          ×
        </button>
        <header className="ble-modal__header">
          <svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <rect x="2" y="15" width="7" height="6" rx="1" />
            <path d="M5 15V6h9" />
            <path d="m13 9 6 6-4 0" />
            <path d="m17 8 4 4-4 4" />
          </svg>
          <div>
            <h2>Wired</h2>
            <p className="ble-modal__sub">USB-C cable between phone and laptop</p>
          </div>
        </header>

        <form onSubmit={connect}>
          <label className="wired-modal__field">
            Receiver address
            <input
              className="wired-modal__input"
              type="text"
              inputMode="url"
              spellCheck={false}
              autoCapitalize="none"
              autoCorrect="off"
              placeholder="ws://192.168.x.x:8222"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              disabled={connecting}
            />
          </label>
          <p className="ble-modal__sub">
            Enable USB tethering on the phone, keep the laptop receiver running, then enter its IP and port above.
          </p>

          {status && status.status === 'CONNECTED' && (
            <p className="ble-modal__sub">
              Connected to <strong>{transport?.getAddress()}</strong>
            </p>
          )}
          {error && <p className="ble-modal__error">{error}</p>}

          <div className="wired-modal__actions">
            {status?.status === 'CONNECTED' ? (
              <button type="button" className="ble-modal__done" onClick={disconnect}>
                Disconnect
              </button>
            ) : (
              <button type="submit" className="ble-modal__done" disabled={connecting}>
                {connecting ? 'Connecting…' : 'Connect'}
              </button>
            )}
          </div>
        </form>

        <p className="ble-modal__sub" style={{ marginTop: 2 }}>
          Status: {label}
        </p>
      </SpotlightCard>
    </div>
  );
}