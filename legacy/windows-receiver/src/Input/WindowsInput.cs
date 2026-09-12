using System.Runtime.InteropServices;

namespace Dtcon.Receiver.Input;

/// <summary>Minimum SendInput interop. Mouse move/buttons/wheel and media keys.</summary>
public static class WindowsInput
{
    private const uint INPUT_MOUSE = 0;
    private const uint INPUT_KEYBOARD = 1;
    private const uint KEYEVENTF_KEYUP = 0x0002;

    public const uint MouseEventfMove = 0x0001;
    public const uint MouseEventfLeftDown = 0x0002;
    public const uint MouseEventfLeftUp = 0x0004;
    public const uint MouseEventfRightDown = 0x0008;
    public const uint MouseEventfRightUp = 0x0010;
    public const uint MouseEventfMiddleDown = 0x0020;
    public const uint MouseEventfMiddleUp = 0x0040;
    public const uint MouseEventfXDown = 0x0080;
    public const uint MouseEventfXUp = 0x0100;
    public const uint MouseEventfWheel = 0x0800;
    public const uint MouseEventfHwheel = 0x1000;

    public const uint Xbutton1 = 0x0001;
    public const uint Xbutton2 = 0x0002;
    public const ushort VkMediaPrevTrack = 0xB1;
    public const ushort VkMediaNextTrack = 0xB0;

    [StructLayout(LayoutKind.Sequential)]
    private struct MOUSEINPUT
    {
        public int dx;
        public int dy;
        public uint mouseData;
        public uint dwFlags;
        public uint time;
        public IntPtr dwExtraInfo;
    }

    [StructLayout(LayoutKind.Sequential)]
    private struct KEYBDINPUT
    {
        public ushort wVk;
        public ushort wScan;
        public uint dwFlags;
        public uint time;
        public IntPtr dwExtraInfo;
    }

    [StructLayout(LayoutKind.Explicit)]
    private struct INPUTUNION
    {
        [FieldOffset(0)] public MOUSEINPUT mi;
        [FieldOffset(0)] public KEYBDINPUT ki;
    }

    [StructLayout(LayoutKind.Sequential)]
    private struct INPUT
    {
        public uint type;
        public INPUTUNION U;
    }

    [DllImport("user32.dll", SetLastError = true)]
    private static extern uint SendInput(uint nInputs, INPUT[] pInputs, int cbSize);

    public static void Mouse(int dx, int dy, uint mouseData, uint flags)
    {
        var input = new INPUT
        {
            type = INPUT_MOUSE,
            U = new INPUTUNION
            {
                mi = new MOUSEINPUT
                {
                    dx = dx,
                    dy = dy,
                    mouseData = mouseData,
                    dwFlags = flags,
                    time = 0,
                    dwExtraInfo = IntPtr.Zero,
                },
            },
        };
        SendInput(1, new[] { input }, Marshal.SizeOf<INPUT>());
    }

    public static void Key(ushort virtualKey, bool keyUp)
    {
        var input = new INPUT
        {
            type = INPUT_KEYBOARD,
            U = new INPUTUNION
            {
                ki = new KEYBDINPUT
                {
                    wVk = virtualKey,
                    wScan = 0,
                    dwFlags = keyUp ? KEYEVENTF_KEYUP : 0,
                    time = 0,
                    dwExtraInfo = IntPtr.Zero,
                },
            },
        };
        SendInput(1, new[] { input }, Marshal.SizeOf<INPUT>());
    }
}