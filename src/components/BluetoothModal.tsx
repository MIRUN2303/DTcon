import { useCallback, useEffect, useMemo, useState } from 'react';
import { ScannedDevice, WebBluetoothTransport } from '../bluetooth/WebBluetoothTransport';
import SpotlightCard from './SpotlightCard';

interface BluetoothModalProps {
  onClose: () => void;
  onAttach: (transport: WebBluetoothTransport) => void;
}

export default function BluetoothModal({ onClose, onAttach }: BluetoothModalProps) {
  const transport = useMemo(() => new WebBluetoothTransport(), []);
  const [supported] = useState(() => transport.isSupported());
  const [saved, setSaved] = useState<ScannedDevice[]>([]);
  const [connecting, setConnecting] = useState<string | null>(null);
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshSaved = useCallback(async () => {
    setSaved(await transport.listSavedDevices());
    setLoading(false);
  }, [transport]);

  useEffect(() => {
    void refreshSaved();
  }, [refreshSaved]);

  const pair = useCallback(async () => {
    setError(null);
    setConnecting('__pair__');
    try {
      const device = await transport.pairNewDevice();
      if (!device) return;
      const result = await transport.connectToDevice(device.device);
      if (result.ok) {
        setConnected(true);
        onAttach(transport);
      } else {
        setError(result.error ?? 'Connection failed');
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setConnecting(null);
      void refreshSaved();
    }
  }, [transport, onAttach, refreshSaved]);

  const connectSaved = useCallback(
    async (device: ScannedDevice) => {
      setConnecting(device.id);
      setError(null);
      const result = await transport.connectToDevice(device.device);
      setConnecting(null);
      if (result.ok) {
        setConnected(true);
        onAttach(transport);
      } else {
        setError(result.error ?? 'Connection failed');
      }
    },
    [transport, onAttach],
  );

  return (
    <div className="ble-overlay">
      <SpotlightCard className="ble-modal" spotlightColor="rgba(138, 255, 60, 0.16)">
        <button className="ble-modal__close" onClick={onClose} aria-label="Close">
          ×
        </button>
        <header className="ble-modal__header">
          <svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="m7 7 10 10-5 4V3l5 4L7 17" />
          </svg>
          <div>
            <h2>Bluetooth</h2>
            <p className="ble-modal__sub">connect to a DTcon receiver</p>
          </div>
        </header>

        {!supported ? (
          <p className="ble-modal__error">
            Web Bluetooth is not supported in this browser. Use Chrome (Android or desktop).
          </p>
        ) : connected ? (
          <div className="ble-modal__connected">
            <p>
              Connected to <strong>{transport.getDeviceName()}</strong>
            </p>
            <p className="ble-modal__sub">
              If the connection drops it will reconnect automatically.
            </p>
            <button className="ble-modal__done" onClick={onClose}>
              Done
            </button>
          </div>
        ) : (
          <>
            <button className="ble-modal__scan" disabled={connecting === '__pair__'} onClick={pair}>
              {connecting === '__pair__' ? 'Selecting…' : 'Add a DTcon receiver'}
            </button>

            {saved.length > 0 && (
              <div className="ble-modal__saved">
                <p className="ble-modal__saved-title">Saved receivers</p>
                <ul className="ble-modal__list">
                  {saved.map((device) => (
                    <li key={device.id} className="ble-modal__row">
                      <div className="ble-modal__row-info">
                        <span className="ble-modal__row-name">{device.name}</span>
                      </div>
                      <button
                        className="ble-modal__connect"
                        disabled={connecting === device.id}
                        onClick={() => connectSaved(device)}
                      >
                        {connecting === device.id ? '…' : 'Connect'}
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {!loading && saved.length === 0 && (
              <p className="ble-modal__sub">
                Tip: once a receiver is paired, it appears here for one-tap reconnect.
              </p>
            )}
          </>
        )}

        {error && <p className="ble-modal__error">{error}</p>}
      </SpotlightCard>
    </div>
  );
}