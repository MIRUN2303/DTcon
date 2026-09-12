export type ConnectionStatus = 'DISCONNECTED' | 'CONNECTING' | 'CONNECTED' | 'RECONNECTING' | 'ERROR';

export interface TransportResult {
  ok: boolean;
  error?: string;
}

export interface TransportStatus {
  status: ConnectionStatus;
  isDemo: boolean;
  lastError?: string;
  lastSentSeq?: number;
  packetsSent: number;
  bytesSent: number;
}

export interface IDtconTransport {
  readonly id: string;
  readonly displayName: string;
  readonly isDemo: boolean;
  connect(): Promise<TransportResult>;
  disconnect(): Promise<void>;
  send(packet: Uint8Array): Promise<TransportResult>;
  getStatus(): TransportStatus;
  onStatusChange(cb: (status: TransportStatus) => void): () => void;
  onPacket(cb: (packet: Uint8Array) => void): () => void;
}

export type TransportListener = (status: TransportStatus) => void;
export type PacketListener = (packet: Uint8Array) => void;