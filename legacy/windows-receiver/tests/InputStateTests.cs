using Dtcon.Receiver.Input;
using Xunit;

namespace Dtcon.Receiver.Tests;

public class InputStateTests
{
    private readonly FakeSink _sink = new();
    private InputState NewState() => new(_sink);

    [Fact]
    public void PressAndReleaseEmitsOnceEach()
    {
        var state = NewState();

        state.Apply(MouseButtonId.Left, true);
        state.Apply(MouseButtonId.Left, false);

        Assert.Equal(1, _sink.ButtonEvents(MouseButtonId.Left));
        Assert.Equal(2, _sink.Calls.Count);
    }

    [Fact]
    public void DuplicatePressIsDeduped()
    {
        var state = NewState();

        state.Apply(MouseButtonId.Left, true);
        state.Apply(MouseButtonId.Left, true); // replay / duplicate packet
        state.Apply(MouseButtonId.Left, false);

        Assert.Equal(1, _sink.ButtonEvents(MouseButtonId.Left));
    }

    [Fact]
    public void RepeatReleaseIsIgnored()
    {
        var state = NewState();

        state.Apply(MouseButtonId.Left, false);
        state.Apply(MouseButtonId.Left, false);

        Assert.Equal(0, _sink.ButtonEvents(MouseButtonId.Left));
    }

    [Fact]
    public void ResetReleasesEverythingStillHeld()
    {
        var state = NewState();
        state.Apply(MouseButtonId.Left, true);
        state.Apply(MouseButtonId.Right, true);

        state.Reset();

        Assert.Equal(1, _sink.ButtonEvents(MouseButtonId.Left));
        Assert.Equal(1, _sink.ButtonEvents(MouseButtonId.Right));
        Assert.Equal(1, _sink.ButtonEvents(MouseButtonId.Left));
        Assert.Empty(state.Held);
    }

    [Fact]
    public void ResetIsIdempotent()
    {
        var state = NewState();
        state.Apply(MouseButtonId.Left, true);

        state.Reset();
        state.Reset();

        Assert.Equal(1, _sink.ButtonEvents(MouseButtonId.Left));
    }

    [Fact]
    public void SyncPressesAndReleasesToMatchMoveMask()
    {
        var state = NewState();

        state.Sync((int)MouseButtonId.Left | (int)MouseButtonId.Forward);

        Assert.Equal(1, _sink.ButtonEvents(MouseButtonId.Left));
        Assert.Equal(1, _sink.ButtonEvents(MouseButtonId.Forward));

        state.Sync((int)MouseButtonId.Left); // forward bit dropped → released

        Assert.Equal(2, _sink.ButtonEvents(MouseButtonId.Forward)); // press + release
        Assert.True(state.Held.Contains(MouseButtonId.Left));
        Assert.False(state.Held.Contains(MouseButtonId.Forward));
    }
}