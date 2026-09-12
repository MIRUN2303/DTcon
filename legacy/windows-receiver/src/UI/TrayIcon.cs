using System.Drawing;
using System.Drawing.Drawing2D;
using System.Windows.Forms;

namespace Dtcon.Receiver.UI;

/// <summary>System-tray presence: show/hide the window, exit the app.</summary>
public sealed class TrayIcon : IDisposable
{
    private readonly NotifyIcon _notifyIcon;

    public event Action? OpenRequested;
    public event Action? ExitRequested;

    public TrayIcon()
    {
        var menu = new ContextMenuStrip();
        var open = menu.Items.Add("Open DTCON Receiver");
        open.Click += (_, _) => OpenRequested?.Invoke();
        var exit = menu.Items.Add("Exit");
        exit.Click += (_, _) => ExitRequested?.Invoke();

        _notifyIcon = new NotifyIcon
        {
            Icon = CreateIcon(),
            Text = "DTCON Receiver",
            ContextMenuStrip = menu,
            Visible = true,
        };
        _notifyIcon.DoubleClick += (_, _) => OpenRequested?.Invoke();
    }

    public void ShowBalloon(string title, string text)
    {
        _notifyIcon.ShowBalloonTip(2500, title, text, ToolTipIcon.Info);
    }

    private static Icon CreateIcon()
    {
        using var bitmap = new Bitmap(16, 16);
        using (var g = Graphics.FromImage(bitmap))
        {
            g.SmoothingMode = SmoothingMode.AntiAlias;
            g.Clear(Color.Transparent);
            using var path = new GraphicsPath();
            var rect = new RectangleF(1, 1, 13, 13);
            using var pen = new Pen(Color.FromArgb(0, 173, 255), 2.2f);
            g.DrawEllipse(pen, rect);
            using var brush = new SolidBrush(Color.FromArgb(0, 173, 255));
            g.FillEllipse(brush, rect);
        }
        return Icon.FromHandle(bitmap.GetHicon());
    }

    public void Dispose()
    {
        _notifyIcon.Visible = false;
        _notifyIcon.Dispose();
    }
}