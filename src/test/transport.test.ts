import { describe, expect, it } from 'vitest';
import { DemoTransport } from '../bluetooth/DemoTransport';
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