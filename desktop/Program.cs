using System.Diagnostics;
using System.Drawing;
using System.Net;
using System.Net.Http;
using System.Windows.Forms;
using Microsoft.Web.WebView2.Core;
using Microsoft.Web.WebView2.WinForms;

namespace UltraIa.Desktop;

/// <summary>
/// Shell desktop de UltraIa (Fase D, paso 3).
/// Hospeda la app web local (o una URL desplegada) en una ventana WebView2 nativa de Windows.
/// WebView2 es "evergreen": se actualiza solo con el runtime de Microsoft Edge, por lo que la
/// ventana no quedra obsoleta ni arrastra un Chromium propio (a diferencia de Electron).
/// </summary>
internal static class Program
{
    [STAThread]
    private static void Main()
    {
        Application.EnableVisualStyles();
        Application.SetCompatibleTextRenderingDefault(false);
        Application.Run(new ShellForm());
    }
}

internal sealed class ShellForm : Form
{
    private readonly WebView2 _webView = new() { Dock = DockStyle.Fill };
    private Process? _serverProcess;

    private const string DefaultUrl = "http://localhost:3000";
    private const int MaxWaitMs = 90_000;
    private const int PollMs = 1_000;

    public ShellForm()
    {
        Text = "UltraIa";
        Width = 1280;
        Height = 800;
        BackColor = Color.FromArgb(8, 8, 10); // Dark Obsidian (#08080a)
        Controls.Add(_webView);
        _webView.CoreWebView2InitializationCompleted += OnInitCompleted;
        Load += async (_, _) => await BootAsync();
    }

    private async Task BootAsync()
    {
        var url = Environment.GetEnvironmentVariable("ULTRAIA_URL");
        if (string.IsNullOrWhiteSpace(url))
        {
            if (!await IsReachable(DefaultUrl))
            {
                StartServer();
                await WaitUntilReachable(DefaultUrl);
            }
            url = DefaultUrl;
        }

        try
        {
            await _webView.EnsureCoreWebView2Async(null);
            _webView.CoreWebView2.NewWindowRequested += OnNewWindow;
            _webView.CoreWebView2.Navigate(url);
        }
        catch (Exception ex)
        {
            ShowFatal(
                "No se pudo iniciar WebView2.\n\n" +
                "Instala el runtime de Microsoft Edge WebView2:\n" +
                "https://developer.microsoft.com/microsoft-edge/webview2/\n\n" +
                ex.Message);
        }
    }

    private void OnInitCompleted(object? sender, CoreWebView2InitializationCompletedEventArgs e)
    {
        if (e.InitializationException != null)
        {
            ShowFatal(
                "WebView2 no está disponible.\n\n" +
                "Instala el runtime de Microsoft Edge WebView2 y vuelve a abrir UltraIa.\n\n" +
                e.InitializationException.Message);
        }
    }

    private void OnNewWindow(object? sender, CoreWebView2NewWindowRequestedEventArgs e)
    {
        // Las ventanas externas se abren en el navegador del sistema, no dentro del shell.
        e.Handled = true;
        try
        {
            Process.Start(new ProcessStartInfo(e.Uri) { UseShellExecute = true });
        }
        catch
        {
            /* sin navegador por defecto: ignorar */
        }
    }

    private static async Task<bool> IsReachable(string url)
    {
        try
        {
            using var client = new HttpClient { Timeout = TimeSpan.FromSeconds(2) };
            var resp = await client.GetAsync(url);
            return resp.StatusCode is HttpStatusCode.OK or HttpStatusCode.Found or HttpStatusCode.NotFound;
        }
        catch
        {
            return false;
        }
    }

    private async Task WaitUntilReachable(string url)
    {
        var waited = 0;
        while (waited < MaxWaitMs)
        {
            if (await IsReachable(url)) return;
            await Task.Delay(PollMs);
            waited += PollMs;
        }
        ShowFatal("El servidor local no respondió tras 90s. Arranca manualmente con `python start.py`.");
    }

    private void StartServer()
    {
        try
        {
            var root = FindRepoRoot(AppContext.BaseDirectory) ?? Directory.GetCurrentDirectory();
            _serverProcess = new Process
            {
                StartInfo = new ProcessStartInfo
                {
                    FileName = "python",
                    Arguments = "start.py",
                    WorkingDirectory = root,
                    CreateNoWindow = true,
                    UseShellExecute = false,
                    RedirectStandardOutput = true,
                    RedirectStandardError = true,
                }
            };
            _serverProcess.Start();
        }
        catch (Exception ex)
        {
            ShowFatal("No se pudo arrancar el servidor local (python start.py):\n" + ex.Message);
        }
    }

    private static string? FindRepoRoot(string startDir)
    {
        var dir = new DirectoryInfo(startDir);
        for (var i = 0; i < 6 && dir != null; i++)
        {
            if (File.Exists(Path.Combine(dir.FullName, "start.py"))) return dir.FullName;
            dir = dir.Parent;
        }
        return null;
    }

    private void ShowFatal(string msg)
    {
        MessageBox.Show(msg, "UltraIa", MessageBoxButtons.OK, MessageBoxIcon.Error);
    }

    protected override void OnFormClosed(FormClosedEventArgs e)
    {
        try { _serverProcess?.Kill(); } catch { /* ignore */ }
        base.OnFormClosed(e);
    }
}
