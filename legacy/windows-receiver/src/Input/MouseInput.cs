namespace Dtcon.Receiver.Input;

/// <summary>
/// Receives protocol-level input and converts it to <see cref="WindowsInput"/>
/// calls. Kept separate from <see cref="InputState"/> (the safety bookkeeping)
/// so both stay small and testable.
/// </summary>
public sealed class MouseInput : IInputSink
{
    public void Move(int dx, int dy)
    {
        if (dx == 0 && dy == 0) return;
        WindowsInput.Mouse(dx, dy, 0, WindowsInput.MouseEventfMove);
    }

    public void Button(MouseButtonId button, bool pressed)
    {
        switch (button)
        {
            case MouseButtonId.Left:
                WindowsInput.Mouse(0, 0, 0, pressed ? WindowsInput.MouseEventfLeftDown : WindowsInput.MouseEventfLeftUp);
                break;
            case MouseButtonId.Right:
                WindowsInput.Mouse(0, 0, 0, pressed ? WindowsInput.MouseEventfRightDown : WindowsInput.MouseEventfRightUp);
                break;
            case MouseButtonId.Middle:
                WindowsInput.Mouse(0, 0, 0, pressed ? WindowsInput.MouseEventfMiddleDown : WindowsInput.MouseEventfMiddleUp);
                break;
            case MouseButtonId.Back:
                WindowsInput.Mouse(0, 0, WindowsInput.Xbutton1, pressed ? WindowsInput.MouseEventfXDown : WindowsInput.MouseEventfXUp);
                break;
            case MouseButtonId.Forward:
                WindowsInput.Mouse(0, 0, WindowsInput.Xbutton2, pressed ? WindowsInput.MouseEventfXDown : WindowsInput.MouseEventfXUp);
                break;
        }
    }

    public void Scroll(int dx, int dy)
    {
        if (dy != 0)
            WindowsInput.Mouse(0, 0, (uint)(dy & 0xFFFF), WindowsInput.MouseEventfWheel);
        if (dx != 0)
            WindowsInput.Mouse(0, 0, (uint)(dx & 0xFFFF), WindowsInput.MouseEventfHwheel);
    }

    public void Navigate(NavAction action)
    {
        switch (action)
        {
            case NavAction.Back:
                WindowsInput.Mouse(0, 0, WindowsInput.Xbutton1, WindowsInput.MouseEventfXDown);
                WindowsInput.Mouse(0, 0, WindowsInput.Xbutton1, WindowsInput.MouseEventfXUp);
                break;
            case NavAction.Forward:
                WindowsInput.Mouse(0, 0, WindowsInput.Xbutton2, WindowsInput.MouseEventfXDown);
                WindowsInput.Mouse(0, 0, WindowsInput.Xbutton2, WindowsInput.MouseEventfXUp);
                break;
            case NavAction.Previous:
                WindowsInput.Key(WindowsInput.VkMediaPrevTrack, false);
                WindowsInput.Key(WindowsInput.VkMediaPrevTrack, true);
                break;
            case NavAction.Next:
                WindowsInput.Key(WindowsInput.VkMediaNextTrack, false);
                WindowsInput.Key(WindowsInput.VkMediaNextTrack, true);
                break;
        }
    }
}