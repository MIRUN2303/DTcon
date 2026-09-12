namespace Dtcon.Receiver.Input;

/// <summary>
/// The seam where input actually lands. <see cref="WindowsInput"/> is the real
/// SendInput-backed implementation; tests substitute a fake.
/// </summary>
public interface IInputSink
{
    void Move(int dx, int dy);
    void Button(MouseButtonId button, bool pressed);
    void Scroll(int dx, int dy);
    void Navigate(NavAction action);
}