namespace Dtcon.Receiver.Input;

/// <summary>
/// Tracks which mouse buttons are currently pressed so a dropped connection can
/// never leave one stuck, and idempotently dedupes repeated down/up packets.
/// </summary>
public sealed class InputState
{
    private readonly HashSet<MouseButtonId> _held = new();
    private readonly IInputSink _sink;

    public InputState(IInputSink sink)
    {
        _sink = sink;
    }

    public IReadOnlyCollection<MouseButtonId> Held => _held;

    /// <summary>
    /// Applies one MOUSE_BUTTON transition. Duplicate presses are ignored;
    /// repeated releases are ignored.
    /// </summary>
    public void Apply(MouseButtonId button, bool pressed)
    {
        if (button == MouseButtonId.None) return;

        if (pressed)
        {
            if (_held.Add(button))
                _sink.Button(button, true);
        }
        else if (_held.Remove(button))
        {
            _sink.Button(button, false);
        }
    }

    /// <summary>
    /// Reconciles tracked state with the button mask carried by a MOUSE_MOVE
    /// packet. This is the safety net if a standalone MOUSE_BUTTON packet was
    /// ever dropped: the next move self-heals.
    /// </summary>
    public void Sync(int buttonMask)
    {
        foreach (var button in (MouseButtonId[])Enum.GetValues(typeof(MouseButtonId)))
        {
            if (button == MouseButtonId.None) continue;
            var shouldHold = (buttonMask & (int)button) != 0;
            if (shouldHold && !_held.Contains(button))
            {
                _held.Add(button);
                _sink.Button(button, true);
            }
            else if (!shouldHold && _held.Remove(button))
            {
                _sink.Button(button, false);
            }
        }
    }

    /// <summary>Release everything still held, once, and clear state.</summary>
    public void Reset()
    {
        foreach (var button in _held.ToArray())
        {
            _sink.Button(button, false);
        }
        _held.Clear();
    }
}