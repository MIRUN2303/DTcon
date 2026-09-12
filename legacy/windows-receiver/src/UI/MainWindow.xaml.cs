using System.Collections.ObjectModel;
using System.ComponentModel;
using System.Windows;
using Dtcon.Receiver.Services;

namespace Dtcon.Receiver.UI;

public partial class MainWindow : Window
{
    private readonly ReceiverService _service;
    private readonly ObservableCollection<string> _lines = new();
    private const int MaxLogLines = 500;

    public MainWindow(ReceiverService service)
    {
        InitializeComponent();
        _service = service;
        LogList.ItemsSource = _lines;

        _service.StateChanged += OnStateChanged;
        _service.LogLine += OnLogLine;
        Log.LineAdded += OnLogLine;

        Log.Info("DTCON Receiver ready. Keep this window open; you can hide it to the tray.");
    }

    private void OnStateChanged(ReceiverState state, string deviceName)
    {
        Dispatcher.BeginInvoke(() =>
        {
            switch (state)
            {
                case ReceiverState.Scanning:
                    StatusDot.Fill = new System.Windows.Media.SolidColorBrush(System.Windows.Media.Colors.Orange);
                    StatusText.Text = "Scanning…";
                    DeviceText.Text = string.Empty;
                    break;
                case ReceiverState.Connecting:
                    StatusDot.Fill = new System.Windows.Media.SolidColorBrush(System.Windows.Media.Colors.Orange);
                    StatusText.Text = "Connecting…";
                    DeviceText.Text = deviceName;
                    break;
                case ReceiverState.Connected:
                    StatusDot.Fill = new System.Windows.Media.SolidColorBrush(System.Windows.Media.Colors.MediumSeaGreen);
                    StatusText.Text = "Connected";
                    DeviceText.Text = deviceName;
                    break;
                case ReceiverState.Disconnected:
                    StatusDot.Fill = new System.Windows.Media.SolidColorBrush(System.Windows.Media.Colors.Gray);
                    StatusText.Text = "Disconnected";
                    DeviceText.Text = string.Empty;
                    break;
            }
        });
    }

    private void OnLogLine(string line)
    {
        Dispatcher.BeginInvoke(() =>
        {
            _lines.Add(line);
            while (_lines.Count > MaxLogLines) _lines.RemoveAt(0);
            LogList.ScrollIntoView(_lines[^1]);
        });
    }

    private void OnReconnect(object sender, RoutedEventArgs e) => _service.Reconnect();
    private void OnDisconnect(object sender, RoutedEventArgs e) => _service.UserDisconnect();

    private void OnClearLog(object sender, RoutedEventArgs e) => _lines.Clear();

    private void OnHide(object sender, RoutedEventArgs e)
    {
        Hide();
    }

    /// <summary>Closing the window only minimizes to tray; the app lives until Exit.</summary>
    private void OnClosing(object? sender, CancelEventArgs e)
    {
        e.Cancel = true;
        Hide();
    }
}