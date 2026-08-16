// UltraIa Desktop — host WebView2 nativo (Fase D paso 3).
//
// Ventana WinForms mínima que embebe el control WebView2 (runtime Evergreen de
// Windows) y navega a la URL del proxy UI del launcher. CERO toolchain nueva:
// se compila con csc.exe del .NET Framework 4.8 (presente en todo Windows, C# 5)
// y se referencian los ensamblados de vendor/ (Microsoft.Web.WebView2.*.dll) +
// WebView2Loader.dll junto al exe.
//
// Uso:
//   webview2-host.exe --url=<http://127.0.0.1:PORT/> [--title=<t>]
//                     [--user-data-dir=<dir>] [--check]
//
// --check: inicializa WebView2, navega, espera NavigationCompleted (timeout 35s)
// e imprime {"ok":true|false,"version":"..."} + exit 0/1. Pensado para CI/test.

using System;
using System.Drawing;
using System.Threading;
using System.Threading.Tasks;
using System.Windows.Forms;
using Microsoft.Web.WebView2.Core;
using Microsoft.Web.WebView2.WinForms;

public class WebView2Host : Form
{
    private readonly string _url;
    private readonly string _userDataDir;
    private readonly bool _check;
    private WebView2 _web;

    public WebView2Host(string url, string title, string userDataDir, bool check)
    {
        _url = url;
        _userDataDir = userDataDir;
        _check = check;

        Text = title ?? "UltraIa Desktop";
        StartPosition = FormStartPosition.CenterScreen;
        ClientSize = new Size(1280, 800);
        BackColor = Color.FromArgb(0x08, 0x08, 0x0A); // Dark Obsidian canvas
        ForeColor = Color.FromArgb(0xE5, 0xE5, 0xEA);

        _web = new WebView2();
        _web.Dock = DockStyle.Fill;
        Controls.Add(_web);
    }

    protected override void OnShown(EventArgs e)
    {
        base.OnShown(e);
        var creation = new CoreWebView2CreationProperties();
        if (!string.IsNullOrEmpty(_userDataDir))
        {
            creation.UserDataFolder = _userDataDir;
        }
        _web.CreationProperties = creation;

        if (_check)
        {
            _web.NavigationCompleted += OnCheckNavigationCompleted;
        }

        _web.EnsureCoreWebView2Async().ContinueWith(t =>
        {
            if (t.IsFaulted)
            {
                if (_check)
                {
                    Exception inner = null;
                    if (t.Exception != null) inner = t.Exception.GetBaseException();
                    FailCheck("init:" + (inner != null ? inner.Message : "unknown"));
                }
                return;
            }
            BeginInvoke(new Action(() =>
            {
                try { _web.CoreWebView2.Navigate(_url); }
                catch (Exception ex) { if (_check) FailCheck("navigate:" + ex.Message); }
            }));
        }, TaskScheduler.FromCurrentSynchronizationContext());
    }

    private void OnCheckNavigationCompleted(object sender, CoreWebView2NavigationCompletedEventArgs e)
    {
        bool ok = e.IsSuccess;
        string version = "";
        if (_web.CoreWebView2 != null && _web.CoreWebView2.Environment != null)
        {
            version = _web.CoreWebView2.Environment.BrowserVersionString;
        }
        Console.WriteLine("{\"ok\":" + (ok ? "true" : "false") +
            ",\"version\":\"" + version + "\"," +
            "\"status\":" + (int)e.WebErrorStatus + "}");
        if (ok)
        {
            BeginInvoke(new Action(() => { Close(); }));
            Application.ExitThread();
        }
        else
        {
            Environment.Exit(1);
        }
    }

    private void FailCheck(string reason)
    {
        Console.WriteLine("{\"ok\":false,\"error\":\"" + reason.Replace("\"", "'") + "\"}");
        Environment.Exit(1);
    }

    [STAThread]
    public static int Main(string[] args)
    {
        string url = null;
        string title = null;
        string userDataDir = null;
        bool check = false;
        foreach (var a in args)
        {
            if (a.StartsWith("--url=")) url = a.Substring("--url=".Length);
            else if (a.StartsWith("--title=")) title = a.Substring("--title=".Length);
            else if (a.StartsWith("--user-data-dir=")) userDataDir = a.Substring("--user-data-dir=".Length);
            else if (a == "--check") check = true;
        }
        if (string.IsNullOrEmpty(url))
        {
            Console.Error.WriteLine("webview2-host: --url required");
            return 2;
        }
        // Timeout global para --check: si NavigationCompleted no llega en 35s, salir 1.
        if (check)
        {
            var t = new System.Threading.Timer(new TimerCallback(delegate { Console.WriteLine("{\"ok\":false,\"error\":\"timeout\"}"); Environment.Exit(1); }), null, 35000, Timeout.Infinite);
        }
        Application.EnableVisualStyles();
        Application.SetCompatibleTextRenderingDefault(false);
        Application.Run(new WebView2Host(url, title, userDataDir, check));
        return 0;
    }
}