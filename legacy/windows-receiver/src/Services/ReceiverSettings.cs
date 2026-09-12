using System.Text.Json;

namespace Dtcon.Receiver.Services;

/// <summary>Persists the last-connected device so the receiver can reconnect on launch.</summary>
public sealed class ReceiverSettings
{
    public ulong? LastAddress { get; set; }
    public string? LastName { get; set; }

    public static string SettingsPath { get; } = Path.Combine(
        Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData),
        "DtconReceiver", "settings.json");

    public static ReceiverSettings Load()
    {
        try
        {
            if (File.Exists(SettingsPath))
            {
                var json = File.ReadAllText(SettingsPath);
                return JsonSerializer.Deserialize<ReceiverSettings>(json) ?? new ReceiverSettings();
            }
        }
        catch
        {
            // corrupt settings file: start fresh
        }
        return new ReceiverSettings();
    }

    public void Save()
    {
        try
        {
            var dir = Path.GetDirectoryName(SettingsPath)!;
            Directory.CreateDirectory(dir);
            File.WriteAllText(SettingsPath, JsonSerializer.Serialize(this));
        }
        catch
        {
            // persistence is best-effort; never crash the receiver over it
        }
    }
}