import { FormEvent, useEffect, useRef, useState } from 'react';
import { useDtcon } from '../state/DtconProvider';
import { IDtconTransport, TransportStatus } from '../bluetooth/transport';
import { SocketTransport } from '../bluetooth/SocketTransport';
import SpotlightCard from './SpotlightCard';

const SUBNET = '192.168.42';
const WS_PORT = 8222;
const PROBE_BATCH = 20;
const PROBE_TIMEOUT_MS = 300;

function probeWs(url: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(url);
    const timer = setTimeout(() => { ws.close(); reject(new Error('timeout')); }, PROBE_TIMEOUT_MS);
    ws.binaryType = 'arraybuffer';
    ws.onopen = () => { clearTimeout(timer); ws.close(); resolve(url); };
    ws.onerror = () => { clearTimeout(timer); reject(new Error('fail')); };
  });
}

function raceToFirst<T>(promises: Promise<T>[]): Promise<T | null> {
  return new Promise((resolve) => {
    let left = promises.length;
    if (left === 0) { resolve(null); return; }
    for (const p of promises) {
      p.then((v) => { left = -1; resolve(v); }).catch(() => { if (--left === 0) resolve(null); });
    }
  });
}

async function discoverReceiver(onProgress: (msg: string) => void, signal: AbortSignal): Promise<string | null> {
  for (let start = 1; start <= 254; start += PROBE_BATCH) {
    if (signal.aborted) return null;
    const end = Math.min(start + PROBE_BATCH - 1, 254);
    onProgress(`Scanning ${SUBNET}.${start}–${end}…`);
    const batch: Promise<string>[] = [];
    for (let i = start; i <= end; i++) {
      batch.push(probeWs(`ws://${SUBNET}.${i}:${WS_PORT}`));
    }
    const result = await raceToFirst(batch);
    if (result) {
      const m = result.match(/([\d.]+):\d+$/);
      return m ? m[1] : null;
    }
  }
  return null;
}

interface WiredModalProps {
  onClose: () => void;
  onAttach: (transport: IDtconTransport) => void;
}

export default function WiredModal({ onClose, onAttach }: WiredModalProps) {
  const { prefs, setWiredAddress } = useDtcon();
  const [address, setAddress] = useState(prefs.wiredAddress || '');
  const [transport, setTransport] = useState<SocketTransport | null>(null);
  const [status, setStatus] = useState<TransportStatus | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [connecting, setConnecting] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [scanMsg, setScanMsg] = useState('');
  const abortRef = useRef<AbortController | null>(null);
  const unsubRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    return () => unsubRef.current?.();
  }, []);

  const refresh = (t: SocketTransport) => {
    setStatus(t.getStatus());
    return t.onStatusChange(setStatus);
  };

  const doConnect = async (addr: string) => {
    // Unsubscribe from the previous transport so its late events don't leak in.
    unsubRef.current?.();
    const url = addr.startsWith('ws://') || addr.startsWith('wss://') ? addr : `ws://${addr}`;
    setWiredAddress(url);
    const t = new SocketTransport(url);
    setTransport(t);
    setError(null);
    unsubRef.current = refresh(t);
    await t.connect();
  };

  useEffect(() => {
    // Drive UI purely from live transport status; keep listening the whole time
    // the modal is open (do NOT unsubscribe right after connect() resolves).
    if (status?.status === 'CONNECTED' && transport) {
      setConnecting(false);
      onAttach(transport);
    } else if (status?.status === 'ERROR' || status?.status === 'RECONNECTING' || status?.status === 'DISCONNECTED') {
      setConnecting(false);
    } else if (status?.status === 'CONNECTING') {
      setConnecting(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, transport]);

  const connect = async (event: FormEvent) => {
    event.preventDefault();
    void doConnect(address);
  };

  const disconnect = () => {
    void transport?.disconnect();
  };

  useEffect(() => {
    if (prefs.wiredAddress || abortRef.current) return;
    const ac = new AbortController();
    abortRef.current = ac;
    setScanning(true);
    discoverReceiver(setScanMsg, ac.signal).then((found) => {
      if (ac.signal.aborted) return;
      setScanning(false);
      setScanMsg('');
      abortRef.current = null;
      if (found) {
        setAddress(found);
        void doConnect(found);
      }
    });
    return () => { ac.abort(); abortRef.current = null; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

        {scanning && (
          <p className="ble-modal__sub wired-modal__scan">{scanMsg || 'Scanning…'}</p>
        )}

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
            Enable USB tethering, keep the laptop receiver running. The app scans automatically, or enter the address manually.
          </p>

          {status && status.status === 'CONNECTED' && (
            <p className="ble-modal__sub">
              Connected to <strong>{transport?.getAddress()}</strong>
            </p>
          )}
          {(error || status?.lastError) && (
            <p className="ble-modal__error">{error ?? status?.lastError}</p>
          )}

          <div className="wired-modal__actions">
            {status?.status === 'CONNECTED' ? (
              <button type="button" className="ble-modal__done" onClick={disconnect}>
                Disconnect
              </button>
            ) : (
              <button type="submit" className="ble-modal__done" disabled={connecting || !address}>
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