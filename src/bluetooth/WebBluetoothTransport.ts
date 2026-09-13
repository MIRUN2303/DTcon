import { IDtconTransport, TransportListener, TransportResult, TransportStatus } from './transport';

export const DTconSERVICE_UUID = 'd8e6f9a0-4000-4000-8000-000000000001';
export const DTconTX_UUID = 'd8e6f9a0-4000-4000-8000-000000000101';
export const DTconRX_UUID = 'd8e6f9a0-4000-4000-8000-000000000102';

export interface ScannedDevice {
  id: string;
  name: string;
  device: unknown;
}

function deviceLabel(name: string | null | undefined): string {
  return (name && name.trim()) || 'DTcon device';
}

type Bt = any;

const RECONNECT_DELAY_MS = 1500;

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
  private bt: Bt = null;
  private device: Bt = null;
  private server: Bt = null;
  private txChar: Bt = null;
  private deviceName = '';
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private intentionalDisconnect = false;

  constructor() {
    if (typeof navigator !== 'undefined') {
      this.bt = (navigator as unknown as { bluetooth?: Bt }).bluetooth ?? null;
    }
  }

  isSupported(): boolean {
    return !!this.bt;
  }

  getDeviceName(): string {
    return this.deviceName;
  }

  /** Receivers this origin was previously granted access to; one-tap reconnect, no chooser. */
  async listSavedDevices(): Promise<ScannedDevice[]> {
    if (!this.bt?.getDevices) return [];
    try {
      const devices: Bt[] = await this.bt.getDevices();
      return devices.map((d) => ({ id: d.id, name: deviceLabel(d.name), device: d }));
    } catch {
      return [];
    }
  }

  /** Opens the OS chooser filtered to devices advertising the DTcon service. */
  async pairNewDevice(): Promise<ScannedDevice | null> {
    if (!this.bt) throw new Error('Web Bluetooth is not supported in this browser');
    try {
      const device: Bt = await this.bt.requestDevice({
        filters: [{ services: [DTconSERVICE_UUID] }],
        optionalServices: [DTconSERVICE_UUID],
      });
      return device ? { id: device.id, name: deviceLabel(device.name), device } : null;
    } catch (error) {
      if (error instanceof Error && error.name === 'NotFoundError') return null;
      throw error;
    }
  }

  async connectToDevice(device: unknown): Promise<TransportResult> {
    try {
      if (this.server) {
        try {
          this.server.disconnect();
        } catch {
          // ignore
        }
        this.server = null;
        this.txChar = null;
      }
      const opened = await this.openService(device);
      if (opened) return { ok: true };
      this.setStatus('ERROR', `Receiver does not expose service ${DTconSERVICE_UUID}; forget it and pair again`);
      return {
        ok: false,
        error: `Receiver does not expose service ${DTconSERVICE_UUID}`,
      };
    } catch (error) {
      this.setStatus('ERROR', error instanceof Error ? error.message : 'Connection failed');
      return { ok: false, error: error instanceof Error ? error.message : 'Connection failed' };
    }
  }

  private async openService(device: unknown): Promise<boolean> {
    const d = device as Bt;
    this.device = d;
    if (d && typeof d.addEventListener === 'function') {
      d.removeEventListener?.('gattserverdisconnected', this.onDisconnected);
      d.addEventListener('gattserverdisconnected', this.onDisconnected);
    }
    this.setStatus('CONNECTING');
    const server: Bt = await d.gatt?.connect();
    if (!server) throw new Error('Device refused connection');
    try {
      const service = await server.getPrimaryService(DTconSERVICE_UUID);
      this.txChar = await service.getCharacteristic(DTconTX_UUID);
      this.server = server;
      this.deviceName = deviceLabel(d?.name);
      this.setStatus('CONNECTED');
      return true;
    } catch (error) {
      try {
        server.disconnect();
      } catch {
        // ignore
      }
      if (error instanceof Error && /No service matching UUID/.test(error.message)) return false;
      throw error;
    }
  }

  private onDisconnected = (): void => {
    if (this.intentionalDisconnect || !this.device) return;
    this.server = null;
    this.txChar = null;
    this.setStatus('RECONNECTING');
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    this.reconnectTimer = setTimeout(() => {
      if (this.intentionalDisconnect || !this.device) return;
      void this.connectToDevice(this.device).then((result) => {
        if (!result.ok) this.setStatus('ERROR', result.error);
      });
    }, RECONNECT_DELAY_MS);
  };

  async connect(): Promise<TransportResult> {
    const saved = await this.listSavedDevices();
    if (saved.length > 0) {
      const result = await this.connectToDevice(saved[0].device);
      if (result.ok) return result;
    }
    this.setStatus('ERROR', 'No receiver saved; use the pairing flow to connect');
    return { ok: false, error: 'No receiver saved; use the pairing flow to connect' };
  }

  async disconnect(): Promise<void> {
    this.intentionalDisconnect = true;
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.device && typeof this.device.removeEventListener === 'function') {
      this.device.removeEventListener('gattserverdisconnected', this.onDisconnected);
    }
    if (this.server) {
      try {
        this.server.disconnect();
      } catch {
        // ignore
      }
    }
    this.server = null;
    this.txChar = null;
    this.device = null;
    this.intentionalDisconnect = false;
    this.setStatus('DISCONNECTED');
  }

  async send(packet: Uint8Array): Promise<TransportResult> {
    if (!this.txChar || this.status.status !== 'CONNECTED') {
      return { ok: false, error: 'Not connected' };
    }
    try {
      if (typeof this.txChar.writeValueWithoutResponse === 'function') {
        await this.txChar.writeValueWithoutResponse(packet);
      } else {
        await this.txChar.writeValue(packet);
      }
      this.status = {
        ...this.status,
        packetsSent: this.status.packetsSent + 1,
        bytesSent: this.status.bytesSent + packet.byteLength,
      };
      this.emitStatus();
      return { ok: true };
    } catch (error) {
      return { ok: false, error: error instanceof Error ? error.message : 'Write failed' };
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