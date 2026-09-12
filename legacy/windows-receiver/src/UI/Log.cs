namespace Dtcon.Receiver.UI;

/// <summary>Thread-safe diagnostic log; the UI subscribes and marshals itself.</summary>
public static class Log
{
    public static event Action<string>? LineAdded;

    public static void Info(string line)
    {
        var stamped = $"{DateTime.Now:HH:mm:ss}  {line}";
        System.Diagnostics.Trace.WriteLine(stamped);
        LineAdded?.Invoke(stamped);
    }
}