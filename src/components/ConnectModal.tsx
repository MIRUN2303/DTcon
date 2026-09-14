import { useState } from 'react';
import { IDtconTransport } from '../bluetooth/transport';
import BluetoothModal from './BluetoothModal';
import WiredModal from './WiredModal';
import SpotlightCard from './SpotlightCard';

interface ConnectModalProps {
  onClose: () => void;
  onAttach: (transport: IDtconTransport) => void;
}

export default function ConnectModal({ onClose, onAttach }: ConnectModalProps) {
  const [kind, setKind] = useState<'choose' | 'bluetooth' | 'wired'>('choose');

  if (kind === 'bluetooth') {
    return <BluetoothModal onClose={onClose} onAttach={onAttach} />;
  }
  if (kind === 'wired') {
    return <WiredModal onClose={onClose} onAttach={onAttach} />;
  }

  return (
    <div className="ble-overlay">
      <SpotlightCard className="ble-modal connect-modal" spotlightColor="rgba(138, 255, 60, 0.16)">
        <button className="ble-modal__close" onClick={onClose} aria-label="Close">
          ×
        </button>
        <header className="ble-modal__header">
          <div>
            <h2>Connect</h2>
            <p className="ble-modal__sub">choose how to link your receiver</p>
          </div>
        </header>

        <div className="connect-modal__options">
          <button className="connect-modal__option" onClick={() => setKind('bluetooth')}>
            <span className="connect-modal__icon" aria-hidden="true">
              <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="m7 7 10 10-5 4V3l5 4L7 17" />
              </svg>
            </span>
            <span className="connect-modal__copy">
              <b>Bluetooth</b>
              <small>wireless · phone &amp; laptop within range</small>
            </span>
          </button>

          <button className="connect-modal__option" onClick={() => setKind('wired')}>
            <span className="connect-modal__icon" aria-hidden="true">
              <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <rect x="2" y="15" width="7" height="6" rx="1" />
                <path d="M5 15V6h9" />
                <path d="m13 9 6 6-4 0" />
                <path d="m17 8 4 4-4 4" />
              </svg>
            </span>
            <span className="connect-modal__copy">
              <b>Wired</b>
              <small>USB-C cable · phone to laptop</small>
            </span>
          </button>
        </div>
      </SpotlightCard>
    </div>
  );
}