import { IDtconTransport, PacketListener, TransportListener, TransportResult, TransportStatus } from './transport';

export class DemoTransport implements IDtconTransport {
  readonly id = 'demo';
  readonly displayName = 'Demo';
  readonly isDemo = true;

  private status: TransportStatus = {
    status: 'DISCONNECTED',
    isDemo: true,
    packetsSent: 0,
    bytesSent: 0,
  };

  private statusListeners = new Set<TransportListener>();
  private packetListeners = new Set<PacketListener>();

  async connect(): Promise<TransportResult> {
    this.setStatus('CONNECTING');
    await new Promise((resolve) => setTimeout(resolve, 600));
    this.setStatus('CONNECTED');
    return { ok: true };
  }

  async disconnect(): Promise<void> {
    this.setStatus('DISCONNECTED');
  }

  async send(packet: Uint8Array): Promise<TransportResult> {
    if (this.getStatus().status !== 'CONNECTED') {
      return { ok: false, error: 'Not connected' };
    }
    await new Promise((resolve) => setTimeout(resolve, 4));
    this.status = {
      ...this.status,
      packetsSent: this.status.packetsSent + 1,
      bytesSent: this.status.bytesSent + packet.byteLength,
    };
    this.packetListeners.forEach((cb) => cb(packet));
    this.emitStatus();
    return { ok: true };
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

  onPacket(cb: PacketListener): () => void {
    this.packetListeners.add(cb);
    return () => {
      this.packetListeners.delete(cb);
    };
  }

  private setStatus(status: TransportStatus['status']): void {
    this.status = { ...this.status, status };
    this.emitStatus();
  }

  private emitStatus(): void {
    this.statusListeners.forEach((cb) => cb({ ...this.status }));
  }
}