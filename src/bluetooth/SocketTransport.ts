import { IDtconTransport, TransportListener, TransportResult, TransportStatus } from './transport';

export type SocketLike = {
  readyState: number;
  binaryType?: string;
  send: (data: ArrayBuffer | ArrayBufferView) => void;
  close: () => void;
  addEventListener: (type: 'open' | 'message' | 'close' | 'error', cb: (ev: unknown) => void) => void;
  removeEventListener: (type: 'open' | 'message' | 'close' | 'error', cb: (ev: unknown) => void) => void;
};
export type SocketFactory = (address: string) => SocketLike;

const RECONNECT_DELAY_MS = 1500;

/** Wired transport over a local socket (USB tethering creates a network over the cable). */
export class SocketTransport implements IDtconTransport {
  readonly id = 'socket';
  readonly displayName = 'USB-C Wired';
  readonly isDemo = false;

  private status: TransportStatus = {
    status: 'DISCONNECTED',
    isDemo: false,
    packetsSent: 0,
    bytesSent: 0,
  };

  private statusListeners = new Set<TransportListener>();
  private socket: SocketLike | null = null;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private intentionalDisconnect = false;
  private sendQueue: Uint8Array[] = [];

  constructor(
    private address: string,
    private createSocket: SocketFactory = (addr) => new WebSocket(addr) as unknown as SocketLike,
  ) {}

  getAddress(): string {
    return this.address;
  }

  setAddress(address: string): void {
    this.address = address.trim();
  }

  private onSocketOpen = (sock: SocketLike) => {
    if (this.socket !== sock) return;
    this.setStatus('CONNECTED');
    const queue = this.sendQueue.splice(0);
    for (const packet of queue) {
      void this.send(packet);
    }
  };

  private onSocketClose = (sock: SocketLike) => {
    if (this.socket !== sock) return;
    this.socket = null;
    if (this.intentionalDisconnect) return;
    this.setStatus('RECONNECTING');
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    this.reconnectTimer = setTimeout(() => {
      if (this.intentionalDisconnect) return;
      void this.connect();
    }, RECONNECT_DELAY_MS);
  };

  private onSocketError = (sock: SocketLike) => {
    if (this.socket !== sock) return;
    if (this.intentionalDisconnect) return;
    this.setStatus('ERROR', `Could not reach ${this.address}`);
  };

  async connect(): Promise<TransportResult> {
    if (this.status.status === 'CONNECTED' && this.socket) return { ok: true };
    if (!this.address) {
      this.setStatus('ERROR', 'Enter a receiver address');
      return { ok: false, error: 'Enter a receiver address' };
    }
    try {
      this.intentionalDisconnect = false;
      this.setStatus('CONNECTING');
      const sock: SocketLike = this.createSocket(this.address);
      this.socket = sock;
      sock.binaryType = 'arraybuffer';
      sock.addEventListener('open', () => this.onSocketOpen(sock));
      sock.addEventListener('close', () => this.onSocketClose(sock));
      sock.addEventListener('error', () => this.onSocketError(sock));
      return { ok: true };
    } catch (error) {
      this.setStatus('ERROR', error instanceof Error ? error.message : 'Connection failed');
      return { ok: false, error: error instanceof Error ? error.message : 'Connection failed' };
    }
  }

  async disconnect(): Promise<void> {
    this.intentionalDisconnect = true;
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.socket) {
      try {
        this.socket.close();
      } catch {
        // ignore
      }
    }
    this.socket = null;
    this.intentionalDisconnect = false;
    this.setStatus('DISCONNECTED');
  }

  async send(packet: Uint8Array): Promise<TransportResult> {
    if (this.status.status === 'CONNECTING') {
      this.sendQueue.push(packet);
      return { ok: true };
    }
    if (!this.socket || this.status.status !== 'CONNECTED') {
      return { ok: false, error: 'Not connected' };
    }
    try {
      const copy = packet.slice().buffer;
      this.socket.send(copy);
      this.status = {
        ...this.status,
        packetsSent: this.status.packetsSent + 1,
        bytesSent: this.status.bytesSent + packet.byteLength,
      };
      this.emitStatus();
      return { ok: true };
    } catch (error) {
      return { ok: false, error: error instanceof Error ? error.message : 'Send failed' };
    }
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

  private setStatus(status: TransportStatus['status'], lastError?: string): void {
    this.status = { ...this.status, status, ...(lastError !== undefined ? { lastError } : {}) };
    this.emitStatus();
  }

  private emitStatus(): void {
    this.statusListeners.forEach((cb) => cb({ ...this.status }));
  }
}