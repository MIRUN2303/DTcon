#!/usr/bin/env python3
"""DTcon wired receiver — zero dependencies (Python 3.10+ stdlib only).

Listens for WebSocket connections from the phone app and injects
real mouse input on this PC via Win32 SendInput (USB-C tethering).

Run:  python wired_receiver.py
Then open Wired in the app — it auto-discovers the receiver.
"""
import asyncio
import base64
import ctypes
import hashlib
import struct
import sys
from ctypes import wintypes

HOST = "0.0.0.0"
PORT = 8222

# ── DTcon protocol ──────────────────────────────────────────────────────────

VERSION = 0x01
HEADER_LEN = 6

P_HELLO = 0x01
P_HELLO_ACK = 0x02
P_PING = 0x03
P_PONG = 0x04
P_DISCONNECT = 0x05
P_MOUSE_MOVE = 0x10
P_MOUSE_BUTTON = 0x11
P_MOUSE_SCROLL = 0x12
P_MOUSE_NAV = 0x13
P_SYSTEM = 0x14
P_RELEASE_ALL = 0x70

BTN_LEFT = 0x01
BTN_RIGHT = 0x02
BTN_MIDDLE = 0x04
BTN_BACK = 0x08
BTN_FORWARD = 0x10

# ── Win32 SendInput ─────────────────────────────────────────────────────────

MOUSEEVENTF_MOVE = 0x0001
MOUSEEVENTF_LEFTDOWN = 0x0002
MOUSEEVENTF_LEFTUP = 0x0004
MOUSEEVENTF_RIGHTDOWN = 0x0008
MOUSEEVENTF_RIGHTUP = 0x0010
MOUSEEVENTF_MIDDLEDOWN = 0x0020
MOUSEEVENTF_MIDDLEUP = 0x0040
MOUSEEVENTF_WHEEL = 0x0800
MOUSEEVENTF_HWHEEL = 0x1000
MOUSEEVENTF_XDOWN = 0x0080
MOUSEEVENTF_XUP = 0x0100
XBUTTON1 = 0x0001
XBUTTON2 = 0x0002
WHEEL_DELTA = 120
KEYEVENTF_KEYUP = 0x0002


class MOUSEINPUT(ctypes.Structure):
    _fields_ = [
        ("dx", wintypes.LONG), ("dy", wintypes.LONG),
        ("mouseData", wintypes.DWORD), ("dwFlags", wintypes.DWORD),
        ("time", wintypes.DWORD), ("dwExtraInfo", ctypes.c_ulong),
    ]


class KEYBDINPUT(ctypes.Structure):
    _fields_ = [
        ("wVk", wintypes.WORD), ("wScan", wintypes.WORD),
        ("dwFlags", wintypes.DWORD), ("time", wintypes.DWORD),
        ("dwExtraInfo", ctypes.c_ulong),
    ]


class INPUT(ctypes.Structure):
    class _I(ctypes.Union):
        _fields_ = [("mi", MOUSEINPUT), ("ki", KEYBDINPUT)]
    _anonymous_ = ("_i",)
    _fields_ = [("type", wintypes.DWORD), ("_i", _I)]


def _send(*inputs):
    arr = (INPUT * len(inputs))(*inputs)
    ctypes.windll.user32.SendInput(len(inputs), arr, ctypes.sizeof(INPUT))


def _mouse(flags, data=0, dx=0, dy=0):
    _send(INPUT(type=0, mi=MOUSEINPUT(dx=dx, dy=dy, mouseData=data, dwFlags=flags)))


def _key(vk, down):
    _send(INPUT(type=1, ki=KEYBDINPUT(wVk=vk, dwFlags=0 if down else KEYEVENTF_KEYUP)))


# ── Minimal WebSocket server (stdlib only) ──────────────────────────────────

WS_GUID = b"258EAFA5-E914-47DA-95CA-C5AB0DC85B11"


def _ws_accept_key(key: str) -> str:
    return base64.b64encode(hashlib.sha1(key.encode() + WS_GUID).digest()).decode()


def _ws_read_frame(buf: bytearray) -> tuple[int, bytes] | None:
    """Parse one WebSocket frame from buf. Returns (opcode, payload) or None."""
    if len(buf) < 2:
        return None
    b0, b1 = buf[0], buf[1]
    masked = bool(b1 & 0x80)
    length = b1 & 0x7F
    offset = 2
    if length == 126:
        if len(buf) < 4:
            return None
        length = struct.unpack("!H", buf[2:4])[0]
        offset = 4
    elif length == 127:
        if len(buf) < 10:
            return None
        length = struct.unpack("!Q", buf[2:10])[0]
        offset = 10
    if masked:
        if len(buf) < offset + 4:
            return None
        mask = buf[offset:offset + 4]
        offset += 4
    if len(buf) < offset + length:
        return None
    payload = bytearray(buf[offset:offset + length])
    if masked:
        for i in range(length):
            payload[i] ^= mask[i % 4]
    del buf[:offset + length]
    return (b0 & 0x0F, bytes(payload))


def _ws_write_frame(opcode: int, payload: bytes) -> bytes:
    header = bytearray([0x80 | opcode])
    n = len(payload)
    if n < 126:
        header.append(n)
    elif n < 65536:
        header.extend(struct.pack("!H", n))
    else:
        header.extend(struct.pack("!Q", n))
    return bytes(header) + payload


WS_OPCODE_BINARY = 0x02
WS_OPCODE_CLOSE = 0x08
WS_OPCODE_PING = 0x09


# ── Receiver logic ──────────────────────────────────────────────────────────

class Receiver:
    def __init__(self):
        self.held = set()

    def handle(self, data: bytes):
        if len(data) < HEADER_LEN:
            return
        ver, ptype = data[0], data[1]
        if ver != VERSION:
            return
        payload = data[HEADER_LEN:HEADER_LEN + data[4] | (data[5] << 8)]
        if ptype == P_MOUSE_MOVE:
            self.move(payload)
        elif ptype == P_MOUSE_BUTTON:
            self.button(payload)
        elif ptype == P_MOUSE_SCROLL:
            self.scroll(payload)
        elif ptype == P_MOUSE_NAV:
            self.nav(payload)
        elif ptype == P_SYSTEM:
            self.system(payload)
        elif ptype == P_RELEASE_ALL:
            self.release_all()
        return ptype

    def move(self, p):
        if len(p) < 6:
            return
        dx, dy = struct.unpack("<hh", p[:4])
        if dx or dy:
            _mouse(MOUSEEVENTF_MOVE, dx=dx, dy=dy)
        self._sync_held(p[4])

    def button(self, p):
        if len(p) < 2:
            return
        down = p[1] == 1
        ev = {
            BTN_LEFT: (MOUSEEVENTF_LEFTDOWN, MOUSEEVENTF_LEFTUP),
            BTN_RIGHT: (MOUSEEVENTF_RIGHTDOWN, MOUSEEVENTF_RIGHTUP),
            BTN_MIDDLE: (MOUSEEVENTF_MIDDLEDOWN, MOUSEEVENTF_MIDDLEUP),
            BTN_BACK: (MOUSEEVENTF_XDOWN | (XBUTTON1 << 16), MOUSEEVENTF_XUP | (XBUTTON1 << 16)),
            BTN_FORWARD: (MOUSEEVENTF_XDOWN | (XBUTTON2 << 16), MOUSEEVENTF_XUP | (XBUTTON2 << 16)),
        }.get(p[0])
        if ev:
            _mouse(ev[0] if down else ev[1])
            (self.held.add if down else self.held.discard)(p[0])

    def scroll(self, p):
        if len(p) < 4:
            return
        dx, dy = struct.unpack("<hh", p[:4])
        if dy:
            _mouse(MOUSEEVENTF_WHEEL, data=-dy * WHEEL_DELTA)
        if dx:
            _mouse(MOUSEEVENTF_HWHEEL, data=dx * WHEEL_DELTA)

    def nav(self, p):
        if not p:
            return
        a = p[0]
        if a == 0:
            self.button(bytes([BTN_BACK, 1])); self.button(bytes([BTN_BACK, 0]))
        elif a == 1:
            self.button(bytes([BTN_FORWARD, 1])); self.button(bytes([BTN_FORWARD, 0]))
        elif a == 2:
            _key(0xB1, True); _key(0xB1, False)
        elif a == 3:
            _key(0xB0, True); _key(0xB0, False)

    def system(self, p):
        if not p:
            return
        a = p[0]
        if a == 0:
            _key(0x11, True); _mouse(MOUSEEVENTF_WHEEL, data=WHEEL_DELTA); _key(0x11, False)
        elif a == 1:
            self._chord(0x5B, 0x09)
        elif a == 2:
            self._chord(0x5B, 0x44)
        elif a == 3:
            _key(0x12, True); _key(0x09, True); _key(0x09, False); _key(0x12, False)
        elif a == 4:
            self._chord(0x5B, 0x53)
        elif a == 5:
            self._chord(0x5B, 0x41)

    def _chord(self, mod, key):
        _key(mod, True); _key(key, True); _key(key, False); _key(mod, False)

    def _sync_held(self, buttons):
        want = {b for b in (BTN_LEFT, BTN_RIGHT, BTN_MIDDLE, BTN_BACK, BTN_FORWARD) if buttons & b}
        for b in want - self.held:
            self.button(bytes([b, 1]))
        for b in self.held - want:
            self.button(bytes([b, 0]))

    def release_all(self):
        for b in list(self.held):
            self.held.discard(b)
            self.button(bytes([b, 0]))


def _dtcon_packet(ptype: int) -> bytes:
    return struct.pack("<BBBBH", VERSION, ptype, 0, 0, 0)


# ── WebSocket handshake + event loop ────────────────────────────────────────

async def _handle(reader: asyncio.StreamReader, writer: asyncio.StreamWriter):
    # HTTP upgrade handshake
    request = await reader.readline()
    headers: dict[str, str] = {}
    while True:
        line = await reader.readline()
        if line == b"\r\n" or line == b"\n" or not line:
            break
        if b":" in line:
            k, v = line.split(b":", 1)
            headers[k.strip().lower().decode()] = v.strip().decode()
    ws_key = headers.get("sec-websocket-key", "")
    if not ws_key:
        writer.close()
        return
    accept = _ws_accept_key(ws_key)
    writer.write(
        f"HTTP/1.1 101 Switching Protocols\r\n"
        f"Upgrade: websocket\r\n"
        f"Connection: Upgrade\r\n"
        f"Sec-WebSocket-Accept: {accept}\r\n\r\n".encode()
    )
    await writer.drain()

    buf = bytearray()
    receiver = Receiver()
    writer.write(_ws_write_frame(WS_OPCODE_BINARY, _dtcon_packet(P_HELLO_ACK)))
    await writer.drain()

    try:
        while True:
            chunk = await reader.read(4096)
            if not chunk:
                break
            buf.extend(chunk)
            while True:
                frame = _ws_read_frame(buf)
                if frame is None:
                    break
                opcode, payload = frame
                if opcode == WS_OPCODE_CLOSE:
                    return
                if opcode == WS_OPCODE_PING:
                    writer.write(_ws_write_frame(0x0A, payload))
                    await writer.drain()
                    continue
                if opcode != WS_OPCODE_BINARY or len(payload) < HEADER_LEN:
                    continue
                ptype = receiver.handle(payload)
                if ptype == P_PING:
                    writer.write(_ws_write_frame(WS_OPCODE_BINARY, _dtcon_packet(P_PONG)))
                    await writer.drain()
    except (ConnectionResetError, asyncio.CancelledError):
        pass
    finally:
        receiver.release_all()
        try:
            writer.close()
        except Exception:
            pass


async def main():
    # Print local IPs so the user knows what to enter (if auto-discover fails)
    try:
        import socket
        ips = [a[4][0] for a in socket.getaddrinfo(socket.gethostname(), None, socket.AF_INET)]
    except Exception:
        ips = []
    print(f"DTcon receiver listening on ws://0.0.0.0:{PORT}")
    if ips:
        print(f"  USB tether IP: {', '.join(ips)}")
    print("  Press Ctrl+C to stop.\n")
    server = await asyncio.start_server(_handle, HOST, PORT)
    async with server:
        await server.serve_forever()


if __name__ == "__main__":
    if "--self-test" in sys.argv:
        # Verify WS frame parse/write round-trips and DTcon header decode.
        masked = bytearray([0x82, 0x85, 0x01, 0x02, 0x03, 0x04])
        masked += bytes([b ^ masked[2 + i % 4] for i, b in enumerate(b"hello")])
        buf = bytearray(masked)
        opcode, payload = _ws_read_frame(buf)
        assert opcode == 0x02 and payload == b"hello" and len(buf) == 0, "binary frame round-trip"
        want = bytes([0x80 | 0x02, 0x02]) + b"hi"
        assert _ws_write_frame(0x02, b"hi") == want, "server frame encoding"
        assert _ws_accept_key("dGhlIHNhbXBsZSBub25jZQ==") == "s3pPLMBiTxaQ9kYGzzhZRbK+xOo=", "RFC6455 handshake"
        r = Receiver()
        pkt = bytes([0x01, 0x10, 0, 0, 2, 0, 0, 1])
        assert r.handle(pkt) == P_MOUSE_MOVE, "mouse move dispatch"
        print("self-test OK")
        sys.exit(0)
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        pass
