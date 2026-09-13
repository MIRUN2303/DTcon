import { IDtconTransport, TransportListener, TransportResult, TransportStatus } from './transport';

export const DTconSERVICE_UUID = 'd8e6f9a0-4000-4000-8000-000000000001';
export const DTconTX_UUID = 'd8e6f9a0-4000-4000-8000-000000000101';
export const DTconRX_UUID = 'd8e6f9a0-4000-4000-8000-000000000102';

export interface ScannedDevice {
  id: string;
  name: string;
  rssi?: number;
  device: unknown;
}

function deviceLabel(name: string | null | undefined): string {
  return (name && name.trim()) || 'DTcon device';
}

type Bt = any;

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
  private server: Bt = null;
  private txChar: Bt = null;
  private deviceName = '';

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

  async startScan(onDevice: (device: ScannedDevice) => void, onError: (message: string) => void): Promise<() => void> {
    if (!this.bt) {
      onError('Web Bluetooth is not supported in this browser');
      return () => undefined;
    }

    if (typeof this.bt.requestLEScan === 'function') {
      try {
        const scan: Bt = await this.bt.requestLEScan({ acceptAllAdvertisements: true, keepRepeatedDevices: false });
        const onAdvertisement = (event: { device?: { id: string; name?: string }; name?: string; rssi?: number }) => {
          const device = event.device;
          onDevice({
            id: device?.id ?? Math.random().toString(36).slice(2),
            name: deviceLabel(device?.name ?? event.name),
            rssi: event.rssi,
            device,
          });
        };
        this.bt.addEventListener('advertisementreceived', onAdvertisement);
        return () => {
          this.bt.removeEventListener('advertisementreceived', onAdvertisement);
          if (scan && typeof scan.stop === 'function') scan.stop();
        };
      } catch {
        return this.scanViaPicker(onDevice, onError);
      }
    }

    return this.scanViaPicker(onDevice, onError);
  }

  private async scanViaPicker(
    onDevice: (device: ScannedDevice) => void,
    onError: (message: string) => void,
  ): Promise<() => void> {
    try {
      const device: Bt = await this.bt.requestDevice({
        acceptAllDevices: true,
        optionalServices: [DTconSERVICE_UUID],
      });
      onDevice({ id: device.id, name: deviceLabel(device.name), device });
    } catch (error) {
      onError(error instanceof Error ? error.message : 'No device selected');
    }
    return () => undefined;
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
      if (await this.openService(device)) return { ok: true };
      if (typeof this.bt?.requestDevice === 'function') {
        const picked: Bt = await this.bt.requestDevice({
          acceptAllDevices: true,
          optionalServices: [DTconSERVICE_UUID],
        });
        if (picked && (await this.openService(picked))) return { ok: true };
        const message = picked
          ? 'Device refused connection'
          : `No service matching UUID ${DTconSERVICE_UUID}; the receiver must advertise it or be re-picked from the chooser`;
        this.setStatus('ERROR', message);
        return { ok: false, error: message };
      }
      const message = `No service matching UUID ${DTconSERVICE_UUID}; the receiver must advertise the service`;
      this.setStatus('ERROR', message);
      return { ok: false, error: message };
    } catch (error) {
      this.setStatus('ERROR', error instanceof Error ? error.message : 'Connection failed');
      return { ok: false, error: error instanceof Error ? error.message : 'Connection failed' };
    }
  }

  private async openService(device: unknown): Promise<boolean> {
    const d = device as { gatt?: { connect(): Promise<Bt> } };
    const server: Bt = await d.gatt?.connect();
    if (!server) throw new Error('Device refused connection');
    try {
      const service = await server.getPrimaryService(DTconSERVICE_UUID);
      this.txChar = await service.getCharacteristic(DTconTX_UUID);
      this.server = server;
      this.deviceName = deviceLabel((device as Bt).name);
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

  async connect(): Promise<TransportResult> {
    const scan = await this.startScan(
      (device) => void this.connectToDevice(device.device),
      () => undefined,
    );
    scan();
    return { ok: false, error: 'Use the device list to connect' };
  }

  async disconnect(): Promise<void> {
    if (this.server) {
      try {
        this.server.disconnect();
      } catch {
        // ignore
      }
    }
    this.server = null;
    this.txChar = null;
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