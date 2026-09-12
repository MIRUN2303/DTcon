import { IDtconTransport, TransportListener, TransportResult, TransportStatus } from './transport';

export class WebBluetoothTransport implements IDtconTransport {
  readonly id = 'web-bluetooth';
  readonly displayName = 'Web Bluetooth';
  readonly isDemo = false;

  private status: TransportStatus = {
    status: 'DISCONNECTED',
    isDemo: false,
    packetsSent: 0,
    bytesSent: 0,
  };

  private statusListeners = new Set<TransportListener>();

  isSupported(): boolean {
    return typeof navigator !== 'undefined' && 'bluetooth' in navigator;
  }

  async connect(): Promise<TransportResult> {
    if (!this.isSupported()) {
      this.status = { ...this.status, status: 'ERROR', lastError: 'Web Bluetooth not supported in this browser' };
      return { ok: false, error: 'Web Bluetooth not supported in this browser' };
    }
    this.status = { ...this.status, status: 'CONNECTING' };
    return { ok: false, error: 'Web Bluetooth receiver is reserved for the next phase' };
  }

  async disconnect(): Promise<void> {
    this.status = { ...this.status, status: 'DISCONNECTED' };
  }

  async send(): Promise<TransportResult> {
    return { ok: false, error: 'Web Bluetooth receiver is reserved for the next phase' };
  }

  getStatus(): TransportStatus {
    return this.status;
  }

  onStatusChange(cb: TransportListener): () => void {
    this.statusListeners.add(cb);
    return () => {
      this.statusListeners.delete(cb);
    };
  }

  onPacket(): () => void {
    return () => undefined;
  }
}