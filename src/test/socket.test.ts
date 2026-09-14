import { describe, expect, it, vi, beforeEach } from 'vitest';
import { SocketTransport } from '../bluetooth/SocketTransport';
import { PacketCodec } from '../protocol/codec';

const codec = new PacketCodec();

function fakeSocket() {
  const handlers: Record<string, ((ev: unknown) => void)[]> = {};
  return {
    readyState: 1,
    binaryType: 'blob',
    send: vi.fn(),
    close: vi.fn(() => {
      for (const cb of handlers.close ?? []) cb({});
    }),
    addEventListener: vi.fn((type: string, cb: (ev: unknown) => void) => {
      (handlers[type] ??= []).push(cb);
    }),
    removeEventListener: vi.fn((type: string, cb: (ev: unknown) => void) => {
      handlers[type] = (handlers[type] ?? []).filter((c) => c !== cb);
    }),
    emit: (type: string, ev?: unknown) => {
      for (const cb of handlers[type] ?? []) cb(ev);
    },
  };
}

describe('SocketTransport', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('starts disconnected', () => {
    const t = new SocketTransport('ws://localhost:8222');
    expect(t.getStatus()).toMatchObject({ status: 'DISCONNECTED', isDemo: false });
  });

  it('refuses connect with no address', async () => {
    const t = new SocketTransport('');
    const result = await t.connect();
    expect(result.ok).toBe(false);
    expect(t.getStatus().status).toBe('ERROR');
  });

  it('reaches CONNECTED after socket open', async () => {
    const socket = fakeSocket();
    const t = new SocketTransport('ws://localhost:8222', () => socket);
    const statuses: string[] = [];
    t.onStatusChange((s) => statuses.push(s.status));
    const result = await t.connect();
    expect(result.ok).toBe(true);
    socket.emit('open');
    expect(socket.binaryType).toBe('arraybuffer');
    expect(statuses).toEqual(['CONNECTING', 'CONNECTED']);
  });

  it('sends binary packets once connected', async () => {
    const socket = fakeSocket();
    const t = new SocketTransport('ws://localhost:8222', () => socket);
    await t.connect();
    socket.emit('open');
    const packet = codec.encodeControl(0x03);
    const result = await t.send(packet);
    expect(result.ok).toBe(true);
    expect(socket.send).toHaveBeenCalledTimes(1);
    expect(t.getStatus().packetsSent).toBe(1);
    expect(t.getStatus().bytesSent).toBe(packet.byteLength);
  });

  it('refuses send before connected', async () => {
    const t = new SocketTransport('ws://localhost:8222', fakeSocket);
    const result = await t.send(codec.encodeControl(0x03));
    expect(result.ok).toBe(false);
  });

  it('sets RECONNECTING on unexpected close and reconnects', async () => {
    vi.useFakeTimers();
    const socket = fakeSocket();
    const t = new SocketTransport('ws://localhost:8222', () => socket);
    const statuses: string[] = [];
    t.onStatusChange((s) => statuses.push(s.status));
    await t.connect();
    socket.emit('open');
    expect(t.getStatus().status).toBe('CONNECTED');
    socket.emit('close');
    expect(t.getStatus().status).toBe('RECONNECTING');
    await vi.advanceTimersByTimeAsync(1500);
    expect(statuses).toContain('CONNECTING');
    vi.useRealTimers();
  });

  it('ignores close after intentional disconnect', async () => {
    const socket = fakeSocket();
    const t = new SocketTransport('ws://localhost:8222', () => socket);
    await t.connect();
    socket.emit('open');
    await t.disconnect();
    socket.emit('close');
    expect(t.getStatus().status).toBe('DISCONNECTED');
    expect(socket.close).toHaveBeenCalled();
  });
});