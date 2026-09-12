using System.Windows;
using Dtcon.Receiver.Input;
using Dtcon.Receiver.Services;
using Dtcon.Receiver.UI;

namespace Dtcon.Receiver;

public partial class App : Application
{
    private ReceiverService? _service;
    private TrayIcon? _tray;
    private MainWindow? _window;

    protected override void OnStartup(StartupEventArgs e)
    {
        base.OnStartup(e);
        DispatcherUnhandledException += (_, args) =>
        {
            Log.Info($"Unexpected error: {args.Exception.Message}");
            args.Handled = true;
        };

        // Stop BLE input from leaking into the tray popup etc.; the whole point
        // is SendInput works regardless of focus.
        _service = new ReceiverService(ReceiverSettings.Load(), new MouseInput());
        _tray = new TrayIcon();
        _tray.OpenRequested += () =>
        {
            _window?.Show();
            if (_window is not null)
            {
                _window.WindowState = WindowState.Normal;
                _window.Activate();
            }
        };
        _tray.ExitRequested += OnExit;

        _window = new MainWindow(_service);
        _window.Show();

        _service.Start();
    }

    private void OnExit()
    {
        _service?.Dispose();
        _tray?.Dispose();
        Shutdown();
    }

    protected override void OnExit(ExitEventArgs e)
    {
        _service?.Dispose();
        _tray?.Dispose();
        base.OnExit(e);
    }
}