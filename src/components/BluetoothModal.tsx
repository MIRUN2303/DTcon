import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ScannedDevice, WebBluetoothTransport } from '../bluetooth/WebBluetoothTransport';

interface BluetoothModalProps {
  onClose: () => void;
  onAttach: (transport: WebBluetoothTransport) => void;
}

function rssiLabel(rssi?: number): string {
  if (rssi === undefined) return '';
  if (rssi > -60) return 'strong';
  if (rssi > -75) return 'ok';
  return 'weak';
}

export default function BluetoothModal({ onClose, onAttach }: BluetoothModalProps) {
  const transport = useMemo(() => new WebBluetoothTransport(), []);
  const [supported] = useState(() => transport.isSupported());
  const [scanning, setScanning] = useState(false);
  const [devices, setDevices] = useState<ScannedDevice[]>([]);
  const [connecting, setConnecting] = useState<string | null>(null);
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const stopScanRef = useRef<() => void>(() => undefined);

  useEffect(() => () => stopScanRef.current(), []);

  const startScan = useCallback(async () => {
    setError(null);
    setDevices([]);
    setScanning(true);
    const stop = await transport.startScan(
      (device) =>
        setDevices((list) => {
          const seen = new Map(list.map((d) => [d.id, d]));
          seen.set(device.id, device);
          return [...seen.values()].sort((a, b) => (b.rssi ?? -200) - (a.rssi ?? -200));
        }),
      (message) => {
        setError(message);
        setScanning(false);
      },
    );
    stopScanRef.current = stop;
  }, [transport]);

  const connect = useCallback(
    async (device: ScannedDevice) => {
      stopScanRef.current();
      setScanning(false);
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
      <div className="ble-modal">
        <button className="ble-modal__close" onClick={onClose} aria-label="Close">
          ×
        </button>
        <header className="ble-modal__header">
          <svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="m7 7 10 10-5 4V3l5 4L7 17" />
          </svg>
          <div>
            <h2>Bluetooth</h2>
            <p className="ble-modal__sub">scan for a DTcon receiver</p>
          </div>
        </header>

        {!supported ? (
          <p className="ble-modal__error">Web Bluetooth is not supported in this browser. Use Chrome (Android or desktop).</p>
        ) : connected ? (
          <div className="ble-modal__connected">
            <p>Connected to <strong>{transport.getDeviceName()}</strong></p>
            <button className="ble-modal__done" onClick={onClose}>
              Done
            </button>
          </div>
        ) : (
          <>
            {!scanning && devices.length === 0 && (
              <button className="ble-modal__scan" onClick={startScan}>
                Scan for devices
              </button>
            )}
            {scanning && (
              <p className="ble-modal__scanning">
                <span className="ble-modal__spinner" />
                Scanning for devices…
              </p>
            )}
            {devices.length > 0 && (
              <ul className="ble-modal__list">
                {devices.map((device) => (
                  <li key={device.id} className="ble-modal__row">
                    <div className="ble-modal__row-info">
                      <span className="ble-modal__row-name">{device.name}</span>
                      {device.rssi !== undefined && (
                        <span className={`ble-modal__signal ble-modal__signal--${rssiLabel(device.rssi)}`}>
                          {device.rssi} dBm
                        </span>
                      )}
                    </div>
                    <button
                      className="ble-modal__connect"
                      disabled={connecting === device.id}
                      onClick={() => connect(device)}
                    >
                      {connecting === device.id ? '…' : 'Connect'}
                    </button>
                  </li>
                ))}
              </ul>
            )}
            {!scanning && devices.length > 0 && (
              <button className="ble-modal__scan ble-modal__scan--again" onClick={startScan}>
                Rescan
              </button>
            )}
          </>
        )}

        {error && <p className="ble-modal__error">{error}</p>}
      </div>
    </div>
  );
}