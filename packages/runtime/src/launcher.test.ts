import { describe, expect, it } from 'vitest';
import { spawn } from 'node:child_process';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(HERE, '..', '..', '..');
const LAUNCHER = path.join(REPO_ROOT, 'desktopFase', 'launcher', 'launcher.mjs');

/**
 * Spike Fase D paso 2(b): el launcher Node (sin deps) arranca UltraRuntime + Local
 * API, monta el proxy UI y responde health-checks vía HTTP. `--check` imprime un
 * JSON resumen y sale 0 si todo está sano.
 *
 * Nota: la primera ejecución compila runtime+core a dist (tsc hoisted del repo),
 * lo que tarda ~20-40s. Se pasa timeout explícito.
 */
function runLauncher(timeoutMs: number): Promise<{ code: number | null; stdout: string; stderr: string }> {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [LAUNCHER, '--check', '--no-window'], {
      cwd: REPO_ROOT,
      windowsHide: true,
    });
    let stdout = '';
    let stderr = '';
    const timer = setTimeout(() => {
      child.kill();
      reject(new Error('launcher timed out'));
    }, timeoutMs);
    child.stdout.on('data', (c: Buffer) => (stdout += c.toString()));
    child.stderr.on('data', (c: Buffer) => (stderr += c.toString()));
    child.on('close', (code) => {
      clearTimeout(timer);
      resolve({ code, stdout, stderr });
    });
    child.on('error', (err) => {
      clearTimeout(timer);
      reject(err);
    });
  });
}

describe('desktop launcher spike (Fase D paso 2b)', () => {
  it('--check arranca runtime + Local API + proxy, reporta core sano y sale 0', async () => {
    const { code, stdout, stderr } = await runLauncher(240_000);
    const lines = stdout.split('\n').filter((l) => l.includes('[launcher]'));
    const summaryLine = lines.find((l) => l.includes('"ok"'));
    expect(stderr).toBe('');
    expect(code).toBe(0);
    expect(summaryLine).toBeTruthy();
    const summary = JSON.parse(summaryLine!.slice('[launcher] '.length));
    expect(summary.ok).toBe(true);
    expect(summary.state).toBe('running');
    expect(summary.healthStatus).toBe('healthy');
    // Core: tools + omag keyless (10 capabilities). Si algún día el junction falla
    // en CI, esto degrada a configured:false — fail-soft por diseño.
    expect(summary.core.configured).toBe(true);
    expect(summary.core.healthy).toBe(true);
    expect(summary.core.adapters).toContain('tools');
    expect(summary.core.adapters).toContain('omag');
    expect(summary.core.tools).toBeGreaterThan(0);
    expect(summary.apiUrl).toMatch(/^http:\/\/127\.0\.0\.1:\d+$/);
    expect(summary.publicUrl).toMatch(/^http:\/\/127\.0\.0\.1:\d+$/);
  }, 240_000);

  it('--host-check: ventana WebView2 nativa navega al dashboard y reporta versión del runtime', async () => {
    // Paso 3 Fase D: el host C# (webview2-host.exe, control WebView2 WinForms)
    // inicializa el runtime Evergreen y navega al proxy UI. Requiere sesión
    // interactiva de Windows + red (para vendor/ la primera vez) + runtime Evergreen.
    const { code, stdout } = await runLauncherFlag('--host-check', 240_000);
    const lines = stdout.split('\n').filter((l) => l.includes('[launcher]'));
    const summaryLine = lines.find((l) => l.includes('host-check:'));
    expect(summaryLine).toBeTruthy();
    const summary = JSON.parse(summaryLine!.slice('[launcher] host-check: '.length));
    expect(summary.ok).toBe(true);
    expect(summary.built).toBe(true);
    expect(summary.webview2).toBeTruthy(); // ej. "151.0.4129.86"
    expect(code).toBe(0);
  }, 240_000);
});

function runLauncherFlag(flag: string, timeoutMs: number): Promise<{ code: number | null; stdout: string; stderr: string }> {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [LAUNCHER, flag], { cwd: REPO_ROOT, windowsHide: true });
    let stdout = '';
    let stderr = '';
    const timer = setTimeout(() => {
      child.kill();
      reject(new Error(`launcher ${flag} timed out`));
    }, timeoutMs);
    child.stdout.on('data', (c: Buffer) => (stdout += c.toString()));
    child.stderr.on('data', (c: Buffer) => (stderr += c.toString()));
    child.on('close', (code) => {
      clearTimeout(timer);
      resolve({ code, stdout, stderr });
    });
    child.on('error', (err) => {
      clearTimeout(timer);
      reject(err);
    });
  });
}