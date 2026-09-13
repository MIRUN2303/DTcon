import { describe, expect, it, vi } from 'vitest';
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

function fakeDevice(serviceFound: boolean, connects: { n: number }) {
  return {
    name: 'DTcon',
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
  it('connects when the service is exposed', async () => {
    const connects = { n: 0 };
    const t = new WebBluetoothTransport();
    (t as unknown as { bt: unknown }).bt = { requestDevice: vi.fn() };
    const result = await t.connectToDevice(fakeDevice(true, connects));
    expect(result.ok).toBe(true);
    expect(connects.n).toBe(1);
    expect(t.getStatus().status).toBe('CONNECTED');
  });

  it('rebinds via requestDevice when the service is not advertised', async () => {
    const connects = { n: 0 };
    const t = new WebBluetoothTransport();
    let granted = false;
    (t as unknown as { bt: unknown }).bt = {
      requestDevice: vi.fn().mockImplementation(async () => {
        granted = true;
        return fakeDevice(true, connects);
      }),
    };
    const result = await t.connectToDevice(fakeDevice(false, connects));
    expect(result.ok).toBe(true);
    expect(connects.n).toBe(2);
    expect(granted).toBe(true);
    expect(t.getStatus().status).toBe('CONNECTED');
  });

  it('fails with a clear error when rebinding is cancelled', async () => {
    const connects = { n: 0 };
    const t = new WebBluetoothTransport();
    (t as unknown as { bt: unknown }).bt = { requestDevice: vi.fn().mockResolvedValue(undefined) };
    const result = await t.connectToDevice(fakeDevice(false, connects));
    expect(result.ok).toBe(false);
    expect(result.error).toContain(DTconSERVICE_UUID);
    expect(t.getStatus().status).toBe('ERROR');
  });
});