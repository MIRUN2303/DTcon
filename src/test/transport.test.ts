import { describe, expect, it, vi, beforeEach } from 'vitest';
import { DemoTransport } from '../bluetooth/DemoTransport';
import { DTconSERVICE_UUID, WebBluetoothTransport } from '../bluetooth/WebBluetoothTransport';
import { PacketCodec } from '../protocol/codec';

const codec = new PacketCodec();

describe('DemoTransport', () => {
  it('starts disconnected and demo', () => {
    const t = new DemoTransport();
    expect(t.getStatus()).toMatchObject({ status: 'DISCONNECTED', isDemo: true });
  });

  it('moves through CONNECTING then CONNECTED', async () => {
    const t = new DemoTransport();
    const statuses: string[] = [];
    t.onStatusChange((s) => statuses.push(s.status));
    const result = await t.connect();
    expect(result.ok).toBe(true);
    expect(statuses).toEqual(['CONNECTING', 'CONNECTED']);
  });

  it('emits packets sent through demo to listeners', async () => {
    const t = new DemoTransport();
    const received: Uint8Array[] = [];
    t.onPacket((p) => received.push(p));
    await t.connect();
    const packet = codec.encodeControl(0x03);
    await t.send(packet);
    expect(received).toHaveLength(1);
    expect(received[0]).toEqual(packet);
    expect(t.getStatus().packetsSent).toBe(1);
    expect(t.getStatus().bytesSent).toBe(packet.byteLength);
  });

  it('refuses send when disconnected', async () => {
    const t = new DemoTransport();
    const result = await t.send(codec.encodeControl(0x03));
    expect(result.ok).toBe(false);
  });

  it('returns to DISCONNECTED after disconnect', async () => {
    const t = new DemoTransport();
    await t.connect();
    await t.disconnect();
    expect(t.getStatus().status).toBe('DISCONNECTED');
  });
});

function fakeDevice(serviceFound: boolean, connects = { n: 0 }) {
  return {
    name: 'DTcon',
    id: 'fake-id',
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    gatt: {
      connect: async () => {
        connects.n += 1;
        return {
          disconnect: async () => undefined,
          getPrimaryService: async () => {
            if (!serviceFound) throw new Error('No service matching UUID ' + DTconSERVICE_UUID);
            return { getCharacteristic: async () => ({}) };
          },
        };
      },
    },
  };
}

describe('WebBluetoothTransport', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('connects when the service is exposed', async () => {
    const connects = { n: 0 };
    const t = new WebBluetoothTransport();
    const result = await t.connectToDevice(fakeDevice(true, connects));
    expect(result.ok).toBe(true);
    expect(connects.n).toBe(1);
    expect(t.getStatus().status).toBe('CONNECTED');
  });

  it('fails clearly when the service is missing (no silent re-pick)', async () => {
    const connects = { n: 0 };
    const t = new WebBluetoothTransport();
    const result = await t.connectToDevice(fakeDevice(false, connects));
    expect(result.ok).toBe(false);
    expect(result.error).toContain(DTconSERVICE_UUID);
    expect(t.getStatus().status).toBe('ERROR');
  });

  it('listSavedDevices delegates to navigator.bluetooth.getDevices()', async () => {
    const t = new WebBluetoothTransport();
    const fakeDevices = [{ id: '1', name: 'My Receiver' }];
    (t as unknown as { bt: unknown }).bt = { getDevices: vi.fn().mockResolvedValue(fakeDevices) };
    const saved = await t.listSavedDevices();
    expect(saved).toHaveLength(1);
    expect(saved[0].name).toBe('My Receiver');
  });

  it('listSavedDevices returns empty when getDevices unavailable', async () => {
    const t = new WebBluetoothTransport();
    (t as unknown as { bt: unknown }).bt = {};
    expect(await t.listSavedDevices()).toEqual([]);
  });

  it('pairNewDevice requests the service-filtered chooser', async () => {
    const t = new WebBluetoothTransport();
    const mockDevice = { id: 'p1', name: 'Pair Me' };
    const requestDevice = vi.fn().mockResolvedValue(mockDevice);
    (t as unknown as { bt: unknown }).bt = { requestDevice };
    const result = await t.pairNewDevice();
    expect(requestDevice).toHaveBeenCalledWith({
      filters: [{ services: [DTconSERVICE_UUID] }],
      optionalServices: [DTconSERVICE_UUID],
    });
    expect(result).toEqual({ id: 'p1', name: 'Pair Me', device: mockDevice });
  });

  it('pairNewDevice returns null when the user cancels', async () => {
    const t = new WebBluetoothTransport();
    (t as unknown as { bt: unknown }).bt = {
      requestDevice: vi.fn().mockRejectedValue(Object.assign(new Error(), { name: 'NotFoundError' })),
    };
    const result = await t.pairNewDevice();
    expect(result).toBeNull();
  });

  it('connect() auto-connects to a saved device', async () => {
    const t = new WebBluetoothTransport();
    const connects = { n: 0 };
    const savedDevice = fakeDevice(true, connects);
    (t as unknown as { bt: unknown }).bt = {
      getDevices: vi.fn().mockResolvedValue([savedDevice]),
    };
    const result = await t.connect();
    expect(result.ok).toBe(true);
    expect(connects.n).toBe(1);
  });

  it('connect() returns error when no devices saved', async () => {
    const t = new WebBluetoothTransport();
    (t as unknown as { bt: unknown }).bt = { getDevices: vi.fn().mockResolvedValue([]) };
    const result = await t.connect();
    expect(result.ok).toBe(false);
    expect(t.getStatus().status).toBe('ERROR');
  });

  it('sets RECONNECTING when the receiver disconnects unexpectedly', async () => {
    const t = new WebBluetoothTransport();
    const savedDevice = fakeDevice(true);
    let disconnectHandler: (() => void) | undefined;
    savedDevice.addEventListener.mockImplementation((ev: string, cb: () => void) => {
      if (ev === 'gattserverdisconnected') disconnectHandler = cb;
    });
    await t.connectToDevice(savedDevice);
    expect(t.getStatus().status).toBe('CONNECTED');
    disconnectHandler?.();
    expect(t.getStatus().status).toBe('RECONNECTING');
  });

  it('ignores gattserverdisconnected after intentional disconnect', async () => {
    const t = new WebBluetoothTransport();
    const savedDevice = fakeDevice(true);
    let disconnectHandler: (() => void) | undefined;
    savedDevice.addEventListener.mockImplementation((ev: string, cb: () => void) => {
      if (ev === 'gattserverdisconnected') disconnectHandler = cb;
    });
    await t.connectToDevice(savedDevice);
    await t.disconnect();
    disconnectHandler?.();
    expect(t.getStatus().status).toBe('DISCONNECTED');
  });
});