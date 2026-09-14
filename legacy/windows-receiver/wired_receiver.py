#!/usr/bin/env python3
"""DTcon wired receiver.

Listens for WebSocket connections from the phone app and turns the
DTcon packets into real mouse input on this PC (USB-C tethering).

Run:  python wired_receiver.py          # listens on 0.0.0.0:8222
Then in the app: Wired -> ws://<this-PC-ip>:8222 (e.g. 192.168.42.x)
"""
import asyncio
import ctypes
import struct
import sys
from ctypes import wintypes

try:
    import websockets
except ImportError:
    sys.exit("websockets is required:  pip install websockets")

HOST = "0.0.0.0"
PORT = 8222

VERSION = 0x01

P_MOUSE_MOVE = 0x10
P_MOUSE_BUTTON = 0x11
P_MOUSE_SCROLL = 0x12
P_MOUSE_NAV = 0x13
P_SYSTEM = 0x14
P_DISCONNECT = 0x05
P_RELEASE_ALL = 0x70
P_HELLO = 0x01
P_HELLO_ACK = 0x02
P_PING = 0x03
P_PONG = 0x04

BTN_LEFT = 0x01
BTN_RIGHT = 0x02
BTN_MIDDLE = 0x04
BTN_BACK = 0x08
BTN_FORWARD = 0x10

# Win32 input constants
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

ULTRAULONG = ctypes.c_ulong


class MOUSEINPUT(ctypes.Structure):
    _fields_ = [
        ("dx", wintypes.LONG),
        ("dy", wintypes.LONG),
        ("mouseData", wintypes.DWORD),
        ("dwFlags", wintypes.DWORD),
        ("time", wintypes.DWORD),
        ("dwExtraInfo", ULTRAULONG),
    ]


class KEYBDINPUT(ctypes.Structure):
    _fields_ = [
        ("wVk", wintypes.WORD),
        ("wScan", wintypes.WORD),
        ("dwFlags", wintypes.DWORD),
        ("time", wintypes.DWORD),
        ("dwExtraInfo", ULTRAULONG),
    ]


class INPUT(ctypes.Structure):
    class _I(ctypes.Union):
        _fields_ = [("mi", MOUSEINPUT), ("ki", KEYBDINPUT)]

    _anonymous_ = ("_i",)
    _fields_ = [("type", wintypes.DWORD), ("_i", _I)]


_ULONG_PTR = ctypes.POINTER(ctypes.c_ulong)


def _send_input(*inputs):
    a = (INPUT * len(inputs))(*inputs)
    ctypes.windll.user32.SendInput(len(inputs), a, ctypes.sizeof(INPUT))


def _mouse(flags, data=0, dx=0, dy=0):
    _send_input(
        INPUT(
            type=0,
            mi=MOUSEINPUT(dx=dx, dy=dy, mouseData=data, dwFlags=flags, time=0, dwExtraInfo=0),
        )
    )


def _key(vk, down):
    _send_input(INPUT(type=1, ki=KEYBDINPUT(wVk=vk, wScan=0, dwFlags=0 if down else KEYEVENTF_KEYUP, time=0, dwExtraInfo=0)))


class Receiver:
    def __init__(self):
        self.held = set()

    def handle(self, data: bytes):
        if len(data) < 6:
            return
        version, ptype, _flags, _seq, length = struct.unpack("<BBBBH", data[:6])
        if version != VERSION:
            return
        payload = data[6 : 6 + length]
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

    def move(self, payload):
        if len(payload) < 6:
            return
        dx, dy = struct.unpack("<hh", payload[:4])
        buttons = payload[4]
        if dx or dy:
            _mouse(MOUSEEVENTF_MOVE, dx=dx, dy=dy)
        self._sync_held(buttons)

    def button(self, payload):
        if len(payload) < 2:
            return
        button, pressed = payload[0], payload[1] == 1
        ev = {
            BTN_LEFT: (MOUSEEVENTF_LEFTDOWN, MOUSEEVENTF_LEFTUP),
            BTN_RIGHT: (MOUSEEVENTF_RIGHTDOWN, MOUSEEVENTF_RIGHTUP),
            BTN_MIDDLE: (MOUSEEVENTF_MIDDLEDOWN, MOUSEEVENTF_MIDDLEUP),
            BTN_BACK: (MOUSEEVENTF_XDOWN | (XBUTTON1 << 16), MOUSEEVENTF_XUP | (XBUTTON1 << 16)),
            BTN_FORWARD: (MOUSEEVENTF_XDOWN | (XBUTTON2 << 16), MOUSEEVENTF_XUP | (XBUTTON2 << 16)),
        }.get(button)
        if not ev:
            return
        _mouse(ev[0] if pressed else ev[1])
        if pressed:
            self.held.add(button)
        else:
            self.held.discard(button)

    def scroll(self, payload):
        if len(payload) < 5:
            return
        dx, dy = struct.unpack("<hh", payload[:4])
        if dy:
            _mouse(MOUSEEVENTF_WHEEL, data=-dy * WHEEL_DELTA)
        if dx:
            _mouse(MOUSEEVENTF_HWHEEL, data=dx * WHEEL_DELTA)

    def nav(self, payload):
        if not payload:
            return
        # NavAction: Back/Forward map to X buttons, tracks to media keys
        action = payload[0]
        if action == 0:
            self.button(bytes([BTN_BACK, 1]))
            self.button(bytes([BTN_BACK, 0]))
        elif action == 1:
            self.button(bytes([BTN_FORWARD, 1]))
            self.button(bytes([BTN_FORWARD, 0]))
        elif action == 2:
            _key(0xB1, True); _key(0xB1, False)  # VK_MEDIA_PREV_TRACK
        elif action == 3:
            _key(0xB0, True); _key(0xB0, False)  # VK_MEDIA_NEXT_TRACK

    def system(self, payload):
        if not payload:
            return
        action = payload[0]
        # Zoom / TaskView / ShowDesktop / SwitchApp / Search / ActionCenter
        if action == 0:
            # Ctrl + wheel up/down
            _key(0x11, True)
            _mouse(MOUSEEVENTF_WHEEL, data=WHEEL_DELTA)
            _key(0x11, False)
        elif action == 1:
            self._chord(0x51, 0x09)  # Win+Tab
        elif action == 2:
            self._chord(0x51, 0x44)  # Win+D
        elif action == 3:
            self._chord(0x12, 0x09, shift=True)  # Alt+Tab / Alt+Shift+Tab
        elif action == 4:
            self._chord(0x51, 0x53)  # Win+S
        elif action == 5:
            self._chord(0x51, 0x41)  # Win+A

    def _chord(self, mod, key, shift=False):
        _key(mod, True)
        if shift:
            _key(0x10, True)
        _key(key, True)
        _key(key, False)
        if shift:
            _key(0x10, False)
        _key(mod, False)

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


async def bound(websocket):
    receiver = Receiver()
    await websocket.send(bytes([VERSION, P_HELLO_ACK, 0, 0, 0, 0]))
    try:
        async for raw in websocket:
            if isinstance(raw, str):
                continue
            ptype = receiver.handle(raw)
            if ptype == P_PING:
                await websocket.send(bytes([VERSION, P_PONG, 0, 0, 0, 0]))
    finally:
        receiver.release_all()


async def main():
    print(f"DTcon wired receiver on ws://{HOST}:{PORT}  (press Ctrl+C to stop)")
    async with websockets.serve(bound, HOST, PORT, max_size=256):
        await asyncio.Future()


if __name__ == "__main__":
    asyncio.run(main())