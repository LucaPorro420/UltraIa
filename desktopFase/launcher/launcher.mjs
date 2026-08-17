#!/usr/bin/env node
/**
 * UltraIa Desktop — MVP launcher (Fase D paso 2, spike).
 *
 * CERO dependencias nuevas: solo Node builtins. El runtime y core se compilan a
 * dist CJS con el tsc ya hoisted del repo (desktopFase/launcher/tsconfig.build.json).
 *
 * Arquitectura del spike:
 *   - Arranca UltraRuntime + Local API (127.0.0.1, token de sesión).
 *   - Un proxy HTTP propio (node:http) sirve la UI en la MISMA base URL:
 *       GET  /            → dashboard embebido (Dark Obsidian, fetch a /api/*)
 *       /api/*            → reenvío a la Local API con `Authorization: Bearer <token>`
 *                           inyectado por el launcher (el token NUNCA llega al renderer).
 *   - Abre la ventana con `msedge.exe --app=<url>` (Edge = WebView2 Runtime de Windows;
 *     modo --app = ventana sin chrome). Con --no-window no abre (CI/headless).
 *
 * Flags:
 *   --check        arranca, ejecuta los health-checks, imprime JSON resumen y sale 0.
 *   --no-window    no abre msedge (útil en CI).
 *   --port N       puerto público del proxy (default 0 = ephemeral).
 *   --no-build     no recompilar dist (usa el existente).
 *   --web-dir <ruta>  modo prototipo: arranca la web standalone (server.js) como child y
 *                     la ventana abre la app REAL en http://127.0.0.1:<web-port>.
 *   --web-port N   puerto de la web standalone (default 3000).
 *
 * El token de la Local API vive solo en este proceso; el proxy lo inyecta.
 * El renderer (WebView2/Edge) solo ve http://127.0.0.1:<port>/ — sin secretos.
 */
import { createServer, request } from 'node:http';
import { createRequire } from 'node:module';
import { spawn, spawnSync } from 'node:child_process';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(HERE, '../..');
const DIST = path.join(HERE, 'dist');
const TSC = path.join(REPO_ROOT, 'node_modules', 'typescript', 'bin', 'tsc');
const TSCONFIG = path.join(HERE, 'tsconfig.build.json');
const VENDOR = path.join(HERE, 'vendor');
const WV2_NUPKG_URL = 'https://www.nuget.org/api/v2/package/Microsoft.Web.WebView2/1.0.2903.40';
const CSC = 'C:\\Windows\\Microsoft.NET\\Framework64\\v4.0.30319\\csc.exe';
const HOST_CS = path.join(HERE, 'webview2-host.cs');
const HOST_EXE = path.join(DIST, 'webview2-host.exe');
const TAR = 'C:\\Windows\\System32\\tar.exe';

const args = process.argv.slice(2);
const CHECK = args.includes('--check');
const NO_WINDOW = args.includes('--no-window');
const NO_BUILD = args.includes('--no-build');
const HOST_CHECK = args.includes('--host-check');
const portArg = args.find((a) => a.startsWith('--port='));
const PUBLIC_PORT = portArg ? Number(portArg.slice('--port='.length)) : 0;
// --web-dir <ruta>|--web-dir=<ruta>: modo prototipo — arranca la web standalone
// (server.js) como child process y la ventana navega a la app REAL
// (http://127.0.0.1:<web-port>), no al dashboard. Acepta ambas formas (espacio o =).
function argValue(flag) {
  const eq = args.find((a) => a.startsWith(`${flag}=`));
  if (eq) return eq.slice(flag.length + 1);
  const idx = args.indexOf(flag);
  if (idx !== -1 && args[idx + 1]) return args[idx + 1];
  return null;
}
const WEB_DIR = argValue('--web-dir') ? path.resolve(process.cwd(), argValue('--web-dir')) : null;
const WEB_PORT = argValue('--web-port') ? Number(argValue('--web-port')) : 3000;

function log(msg) {
  process.stdout.write(`[launcher] ${msg}\n`);
}

function build() {
  if (NO_BUILD) return;
  log(`compiling runtime+core to dist (tsc)…`);
  const res = spawnSync(process.execPath, [TSC, '-p', TSCONFIG], { cwd: REPO_ROOT, stdio: 'inherit' });
  if (res.status !== 0) {
    throw new Error(`tsc build failed (exit ${res.status})`);
  }
}

/**
 * npm aisló @ai-sdk/google en packages/core/node_modules (conflicto de versión con
 * apps/web). El dist del launcher vive en desktopFase/ → Node no lo resolvería.
 * Junction (puntero, sin privilegios en Windows): dist/node_modules/@ai-sdk →
 * packages/core/node_modules/@ai-sdk. El resto de deps de core están hoisted en root.
 * Idempotente; se llama siempre (no solo tras compilar).
 */
function ensureJunction() {
  const junction = path.join(DIST, 'node_modules', '@ai-sdk');
  const target = path.join(REPO_ROOT, 'packages', 'core', 'node_modules', '@ai-sdk');
  if (!fs.existsSync(target) || fs.existsSync(junction)) return;
  fs.mkdirSync(path.dirname(junction), { recursive: true });
  try {
    fs.symlinkSync(target, junction, 'junction');
    log('junction dist/node_modules/@ai-sdk → packages/core/node_modules/@ai-sdk');
  } catch (err) {
    log(`warning: junction @ai-sdk falló (${err.message}); core puede quedar configured:false`);
  }
}

/**
 * El dist del runtime emite require("@ultraia/core") (el specifier original, no se
 * reescribe). Para que Node lo resuelva al core COMPILADO (no al TS original), se
 * monta dist/node_modules/@ultraia/core como junction al dist de core + un
 * package.json propio con main → src/index.js (CJS).
 */
function ensureCoreAlias() {
  const aliasDir = path.join(DIST, 'node_modules', '@ultraia');
  const junction = path.join(aliasDir, 'core');
  const coreDist = path.join(DIST, 'packages', 'core');
  const pkgFile = path.join(coreDist, 'package.json');
  if (!fs.existsSync(coreDist) || fs.existsSync(junction)) return;
  if (!fs.existsSync(pkgFile)) {
    fs.writeFileSync(pkgFile, JSON.stringify({ name: '@ultraia/core', version: '0.1.0', type: 'commonjs', main: 'src/index.js' }, null, 2));
  }
  fs.mkdirSync(aliasDir, { recursive: true });
  try {
    fs.symlinkSync(coreDist, junction, 'junction');
    log('junction dist/node_modules/@ultraia/core → dist/packages/core (CJS)');
  } catch (err) {
    log(`warning: junction @ultraia/core falló (${err.message}); core puede quedar configured:false`);
  }
}

function edgePath() {
  const candidates = [
    'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
    'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
  ];
  return candidates.find((p) => fs.existsSync(p));
}

/**
 * Descarga + extrae los binarios WebView2 (WebView2Loader.dll + ensamblados .NET)
 * a `desktopFase/launcher/vendor/` (idempotente). Sin red → log + false (el
 * launcher degrada a msedge --app). Usa tar.exe de Windows (System32) o
 * Expand-Archive de PowerShell como fallback.
 */
async function ensureVendor() {
  const needed = [
    path.join(VENDOR, 'WebView2Loader.dll'),
    path.join(VENDOR, 'Microsoft.Web.WebView2.Core.dll'),
    path.join(VENDOR, 'Microsoft.Web.WebView2.WinForms.dll'),
  ];
  if (needed.every((f) => fs.existsSync(f))) return true;
  fs.mkdirSync(VENDOR, { recursive: true });
  log('vendor WebView2 incompleto — descargando Microsoft.Web.WebView2 1.0.2903.40…');
  const nupkg = path.join(os.tmpdir(), `wv2-${Date.now()}.nupkg`);
  try {
    const res = await fetch(WV2_NUPKG_URL);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const buf = Buffer.from(await res.arrayBuffer());
    fs.writeFileSync(nupkg, buf);
    const extract = (entry, dest) => {
      // Extrae un único entry del nupkg (zip) leyendo el EOCD central directory.
      const zip = buf;
      const eocd = zip.lastIndexOf(Buffer.from([0x50, 0x4b, 0x05, 0x06]));
      if (eocd < 0) throw new Error('no EOCD');
      const count = zip.readUInt16LE(eocd + 10);
      const cdStart = zip.readUInt32LE(eocd + 16);
      let off = cdStart;
      for (let i = 0; i < count; i++) {
        if (zip.readUInt32LE(off) !== 0x02014b50) throw new Error('bad CD entry');
        const nameLen = zip.readUInt16LE(off + 28);
        const extraLen = zip.readUInt16LE(off + 30);
        const commentLen = zip.readUInt16LE(off + 32);
        const localOff = zip.readUInt32LE(off + 42);
        const name = zip.toString('utf8', off + 46, off + 46 + nameLen);
        if (name === entry) {
          const method = zip.readUInt16LE(localOff + 8);
          const compSize = zip.readUInt32LE(localOff + 20);
          const dataStart = localOff + 30 + zip.readUInt16LE(localOff + 26) + zip.readUInt16LE(localOff + 28);
          const raw = zip.subarray(dataStart, dataStart + compSize);
          let data = raw;
          if (method === 8) {
            // deflate — sin zlib de Node: usa tar.exe si está, si no Expand-Archive.
            throw new Error('deflate sin zlib');
          }
          fs.mkdirSync(path.dirname(dest), { recursive: true });
          fs.writeFileSync(dest, data);
          return;
        }
        off += 46 + nameLen + extraLen + commentLen;
      }
      throw new Error(`entry no encontrada: ${entry}`);
    };
    // Preferimos tar.exe (descomprime zip nativo en Windows 10+); si falta,
    // Expand-Archive de PowerShell 5.1. Ambos preservan subdirectorios → luego
    // se aplana: los DLLs buscados por nombre se copian a la raíz de vendor/.
    let ok = false;
    if (fs.existsSync(TAR)) {
      const r = spawnSync(TAR, ['-xf', nupkg, '-C', VENDOR, 'runtimes/win-x64/native/WebView2Loader.dll', 'lib/net462/Microsoft.Web.WebView2.Core.dll', 'lib/net462/Microsoft.Web.WebView2.WinForms.dll'], { stdio: 'ignore' });
      ok = r.status === 0;
    }
    if (!ok) {
      const ps = spawnSync('powershell.exe', ['-NoProfile', '-Command',
        `Add-Type -AssemblyName System.IO.Compression.FileSystem; $z=[IO.Compression.ZipFile]::OpenRead('${nupkg}'); $names=@('runtimes/win-x64/native/WebView2Loader.dll','lib/net462/Microsoft.Web.WebView2.Core.dll','lib/net462/Microsoft.Web.WebView2.WinForms.dll'); foreach($n in $names){ $e=$z.GetEntry($n); $dest=Join-Path '${VENDOR}' (Split-Path $n -Leaf); [IO.Compression.ZipFileExtensions]::ExtractToFile($e, $dest, $true) }; $z.Dispose()`,
      ], { stdio: 'ignore' });
      ok = ps.status === 0;
    }
    if (!ok) throw new Error('extracción falló');
    // Aplanar: mover los DLLs desde los subdirectorios del nupkg a la raíz de vendor/.
    for (const dll of ['WebView2Loader.dll', 'Microsoft.Web.WebView2.Core.dll', 'Microsoft.Web.WebView2.WinForms.dll']) {
      const found = findFile(VENDOR, dll);
      const dest = path.join(VENDOR, dll);
      if (found && !fs.existsSync(dest)) fs.copyFileSync(found, dest);
    }
    const missing = needed.filter((f) => !fs.existsSync(f));
    if (missing.length) throw new Error(`faltan: ${missing.map((f) => path.basename(f)).join(', ')}`);
    log('vendor WebView2 listo (WebView2Loader.dll + ensamblados .NET)');
    return true;
  } catch (err) {
    log(`warning: vendor WebView2 no disponible (${err.message}); fallback a msedge --app`);
    return false;
  } finally {
    try { fs.unlinkSync(nupkg); } catch { /* ignore */ }
  }
}

/** Busca un archivo por nombre bajo un directorio (recursivo, no sigue junctions). */
function findFile(dir, name) {
  const stack = [dir];
  while (stack.length) {
    const cur = stack.pop();
    let entries;
    try { entries = fs.readdirSync(cur, { withFileTypes: true }); } catch { continue; }
    for (const e of entries) {
      const full = path.join(cur, e.name);
      if (e.isDirectory()) stack.push(full);
      else if (e.name === name) return full;
    }
  }
  return undefined;
}

/** Compila webview2-host.cs con csc del .NET Framework (presente en todo Windows). */
function buildHost() {
  if (!fs.existsSync(CSC)) {
    log('warning: csc.exe no encontrado; host WebView2 no disponible (fallback msedge --app)');
    return false;
  }
  if (fs.existsSync(HOST_EXE) && fs.statSync(HOST_EXE).mtimeMs > fs.statSync(HOST_CS).mtimeMs) return true;
  const refs = [
    'System.dll', 'System.Core.dll', 'System.Drawing.dll', 'System.Windows.Forms.dll',
    path.join(VENDOR, 'Microsoft.Web.WebView2.Core.dll'),
    path.join(VENDOR, 'Microsoft.Web.WebView2.WinForms.dll'),
  ].map((r) => `/reference:${r}`);
  const out = spawnSync(CSC, ['/nologo', '/target:winexe', '/optimize+', ...refs, `/out:${HOST_EXE}`, HOST_CS], { stdio: 'ignore' });
  if (out.status !== 0) {
    log(`warning: csc falló (exit ${out.status}); host WebView2 no disponible (fallback msedge --app)`);
    return false;
  }
  // Los ensamblados de vendor deben estar junto al exe (CLR los resuelve localmente).
  for (const dll of ['WebView2Loader.dll', 'Microsoft.Web.WebView2.Core.dll', 'Microsoft.Web.WebView2.WinForms.dll']) {
    const src = path.join(VENDOR, dll);
    const dst = path.join(DIST, dll);
    if (fs.existsSync(src) && !fs.existsSync(dst)) fs.copyFileSync(src, dst);
  }
  log('host WebView2 compilado (webview2-host.exe)');
  return true;
}

function openWindow(url) {
  // 1) Host WebView2 nativo (Fase D paso 3): ventana WinForms con el control WebView2.
  const hostOk = buildHost();
  if (hostOk && fs.existsSync(HOST_EXE)) {
    const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'ultraia-wv2-'));
    const child = spawn(HOST_EXE, [`--url=${url}`, '--title=UltraIa Desktop', `--user-data-dir=${profile}`], { detached: true, stdio: 'ignore' });
    child.unref();
    log(`ventana WebView2 abierta: ${url}`);
    return;
  }
  // 2) Fallback: msedge --app (Edge ES el WebView2 Runtime; comportamiento previo).
  const exe = edgePath();
  if (!exe) {
    log('msedge.exe no encontrado; usa el navegador manualmente.');
    return;
  }
  const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'ultraia-shell-'));
  const child = spawn(exe, [`--app=${url}`, `--user-data-dir=${profile}`], { detached: true, stdio: 'ignore' });
  child.unref();
  log(`ventana abierta (fallback msedge --app): ${url}`);
}

function dashboardHtml() {
  return `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>UltraIa Desktop — Health</title>
<style>
  :root { color-scheme: dark; }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    background: #08080a; color: #e5e5ea; font-family: "Segoe UI", system-ui, sans-serif;
    padding: 32px; min-height: 100vh;
  }
  h1 { font-size: 22px; font-weight: 650; letter-spacing: -0.02em; margin-bottom: 4px; }
  .sub { color: #8b8b95; font-size: 13px; margin-bottom: 24px; }
  .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 14px; }
  .card {
    background: #111115; border: 1px solid #1f1f2a; border-radius: 12px; padding: 16px;
  }
  .card h2 { font-size: 12px; text-transform: uppercase; letter-spacing: 0.08em; color: #8b8b95; margin-bottom: 10px; }
  .row { display: flex; justify-content: space-between; font-size: 13px; padding: 3px 0; font-family: "Cascadia Code", Consolas, monospace; }
  .ok { color: #34d399; } .bad { color: #f87171; } .dim { color: #8b8b95; }
  .btn { margin-top: 14px; background: #1f1f2a; color: #e5e5ea; border: 1px solid #2a2a38; border-radius: 8px; padding: 6px 14px; font-size: 13px; cursor: pointer; }
  .btn:hover { background: #2a2a38; }
  .status-pill { display:inline-block; padding: 2px 10px; border-radius: 999px; font-size: 12px; font-weight: 600; }
  .pill-green { background: rgba(52,211,153,.15); color: #34d399; }
  .pill-red { background: rgba(248,113,113,.15); color: #f87171; }
  .pill-dim { background: rgba(139,139,149,.15); color: #8b8b95; }
</style>
</head>
<body>
  <h1>UltraIa Desktop — Local API</h1>
  <div class="sub">MVP WebView2 spike · token inyectado por el launcher (nunca en el renderer)</div>
  <div class="grid" id="grid">
    <div class="card"><h2>Runtime</h2><div class="row"><span class="dim">state</span><span id="state">…</span></div>
      <div class="row"><span class="dim">uptime</span><span id="uptime">…</span></div>
      <div class="row"><span class="dim">modules</span><span id="modules">…</span></div></div>
    <div class="card"><h2>system.health</h2><div id="syshealth">…</div></div>
    <div class="card"><h2>core.health</h2><div id="corehealth">…</div></div>
    <div class="card"><h2>core.ports</h2><div id="coreports">…</div></div>
    <div class="card"><h2>core.tools</h2><div id="coretools">…</div></div>
  </div>
  <button class="btn" onclick="refresh()">Refresh</button>
<script>
async function api(path, body) {
  const res = await fetch(path, body ? {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
  } : undefined);
  const data = await res.json();
  if (!res.ok) throw new Error((data && data.error) || res.status);
  return data;
}
function pill(ok) { return ok ? '<span class="status-pill pill-green">OK</span>' : '<span class="status-pill pill-red">FAIL</span>'; }
function kv(list) { return list.map(([k, v]) => '<div class="row"><span class="dim">' + k + '</span><span>' + v + '</span></div>').join(''); }
async function refresh() {
  try {
    const st = await api('/api/status');
    document.getElementById('state').innerHTML = pill(st.state === 'running');
    document.getElementById('uptime').textContent = (st.uptimeMs / 1000).toFixed(1) + 's';
    document.getElementById('modules').textContent = st.modules.length + ' modules';
    const sh = await api('/api/commands/execute', { command: 'system.health' });
    document.getElementById('syshealth').innerHTML = pill(sh.status === 'healthy') + kv(Object.entries(sh.checks).map(([k, v]) => [k, v.ok ? 'ok' : 'FAIL']));
    const ch = await api('/api/commands/execute', { command: 'core.health' });
    document.getElementById('corehealth').innerHTML = ch.configured ? pill(ch.healthy) : '<span class="dim">not configured</span>';
    const cp = await api('/api/commands/execute', { command: 'core.ports' });
    document.getElementById('coreports').innerHTML = cp.configured ? cp.adapters.join(', ') : '<span class="dim">not configured</span>';
    const ct = await api('/api/commands/execute', { command: 'core.tools' });
    document.getElementById('coretools').innerHTML = ct.configured ? ct.capabilities.length + ' capabilities' : '<span class="dim">not configured</span>';
  } catch (err) {
    document.getElementById('syshealth').textContent = 'error: ' + err.message;
  }
}
refresh();
setInterval(refresh, 3000);
</script>
</body>
</html>`;
}

async function main() {
  if (!NO_BUILD && (!fs.existsSync(path.join(DIST, 'packages', 'runtime', 'src', 'runtime.js')) || fs.existsSync(TSCONFIG) && isStale(DIST, TSCONFIG))) {
    build();
  }
  ensureJunction();
  ensureCoreAlias();
  await ensureVendor(); // fail-soft: sin red → openWindow degrada a msedge --app

  let runtimeMod;
  let corePorts;
  try {
    runtimeMod = require(path.join(DIST, 'packages', 'runtime', 'src', 'runtime.js'));
  } catch (err) {
    log(`FATAL: no se pudo cargar el runtime compilado: ${err.message}`);
    log('Ejecuta: node desktopFase/launcher/launcher.mjs (compila automáticamente). Si persiste, revisa tsconfig.build.json.');
    process.exit(1);
  }

  // Core ports: keyless (tools + omag). Si core no carga (p.ej. dependencia ESM
  // incompatible), el runtime degrada a configured:false — fail-soft por diseño.
  try {
    const coreMod = require(path.join(DIST, 'packages', 'core', 'src', 'index.js'));
    const toolsMod = require(path.join(DIST, 'packages', 'runtime', 'src', 'adapters', 'tools.js'));
    const omagMod = require(path.join(DIST, 'packages', 'runtime', 'src', 'adapters', 'omag.js'));
    const portsMod = require(path.join(DIST, 'packages', 'runtime', 'src', 'adapters', 'core.js'));
    const tools = toolsMod.createToolsAdapter();
    const omag = omagMod.createOmagAdapter();
    corePorts = () => portsMod.createCorePorts({ tools, omag });
    log('core adapters (tools + omag) cargados — keyless');
  } catch (err) {
    corePorts = undefined;
    log(`core no disponible (fail-soft a configured:false): ${err.message}`);
  }

  const { UltraRuntime } = runtimeMod;
  const runtime = UltraRuntime.create({
    projectRoot: REPO_ROOT,
    root: path.join(REPO_ROOT, '.ultraia'),
    corePorts,
  });

  await runtime.start();
  const apiUrl = await runtime.startLocalApi({ port: 0 });
  const apiPort = Number(new URL(apiUrl).port);
  log(`runtime started · Local API en ${apiUrl}`);

  // Proxy: sirve la UI y reenvía /api/* a la Local API con el token inyectado.
  const token = runtime.apiToken;
  const proxy = createServer((req, res) => {
    const urlPath = (req.url ?? '/').split('?')[0];
    if (req.method === 'GET' && (urlPath === '/' || urlPath === '/index.html')) {
      const html = dashboardHtml();
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Content-Length': Buffer.byteLength(html) });
      res.end(html);
      return;
    }
    if (urlPath.startsWith('/api/')) {
      const targetPath = urlPath.slice('/api'.length) + ((req.url ?? '').split('?')[1] ? '?' + (req.url ?? '').split('?')[1] : '');
      const headers = { ...req.headers, authorization: `Bearer ${token}`, host: `127.0.0.1:${apiPort}` };
      delete headers.origin;
      const chunks = [];
      req.on('data', (c) => chunks.push(c));
      req.on('end', () => {
        const upstream = request(
          { host: '127.0.0.1', port: apiPort, path: targetPath, method: req.method, headers, agent: false },
          (up) => {
            const body = [];
            up.on('data', (c) => body.push(c));
            up.on('end', () => {
              res.writeHead(up.statusCode ?? 500, { 'Content-Type': up.headers['content-type'] ?? 'application/json; charset=utf-8' });
              res.end(Buffer.concat(body));
            });
          },
        );
        upstream.on('error', () => {
          res.writeHead(502, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'local api unreachable' }));
        });
        if (chunks.length) upstream.write(Buffer.concat(chunks));
        upstream.end();
      });
      return;
    }
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'not found' }));
  });

  const publicUrl = await new Promise((resolve, reject) => {
    proxy.once('error', reject);
    proxy.listen(PUBLIC_PORT, '127.0.0.1', () => {
      const addr = proxy.address();
      resolve(`http://127.0.0.1:${addr.port}`);
    });
  });
  log(`proxy UI en ${publicUrl}`);

  if (CHECK) {
    // Usa node:http (no fetch/undici) para que el cierre del proceso no choque
    // con sockets keep-alive de undici (assert de libuv en Windows).
    const httpCall = (path_, body) =>
      new Promise((resolve, reject) => {
        const payload = body ? Buffer.from(JSON.stringify(body)) : undefined;
        const req = request(
          {
            host: '127.0.0.1',
            port: new URL(publicUrl).port,
            path: `/api${path_}`,
            method: body ? 'POST' : 'GET',
            agent: false,
            headers: payload ? { 'Content-Type': 'application/json', 'Content-Length': payload.length } : {},
          },
          (res) => {
            const chunks = [];
            res.on('data', (c) => chunks.push(c));
            res.on('end', () => {
              try {
                resolve({ status: res.statusCode, body: JSON.parse(Buffer.concat(chunks).toString('utf8')) });
              } catch {
                resolve({ status: res.statusCode, body: {} });
              }
            });
          },
        );
        req.on('error', reject);
        if (payload) req.write(payload);
        req.end();
      });
    const [status, health, coreHealth, corePortsResp, coreTools] = await Promise.all([
      httpCall('/status'), httpCall('/commands/execute', { command: 'system.health' }),
      httpCall('/commands/execute', { command: 'core.health' }),
      httpCall('/commands/execute', { command: 'core.ports' }),
      httpCall('/commands/execute', { command: 'core.tools' }),
    ]);
    const result = {
      ok: status.status === 200 && health.body.status === 'healthy',
      state: status.body.state,
      healthStatus: health.body.status,
      core: {
        configured: Boolean(coreHealth.body.configured),
        healthy: coreHealth.body.healthy ?? null,
        adapters: corePortsResp.body.adapters ?? [],
        tools: coreTools.body.capabilities?.length ?? 0,
      },
      apiUrl,
      publicUrl,
    };
    log(JSON.stringify(result));
    // Cierre ordenado SIN process.exit() inmediato (en Windows, salir con sockets
    // en cierre dispara un assert de libuv en src\win\async.c). El proxy corta sus
    // conexiones, la API se cierra vía runtime.stop(); el proceso sale solo al drenar.
    proxy.closeAllConnections?.();
    await new Promise((r) => proxy.close(r));
    await runtime.stop();
    process.exitCode = result.ok ? 0 : 1;
    setTimeout(() => process.exit(process.exitCode), 100);
    return;
  }

  if (HOST_CHECK) {
    // Verificación end-to-end del host WebView2 (paso 3): arranca el runtime + proxy
    // (ya arriba) y lanza webview2-host.exe --check contra el dashboard real.
    const hostBuilt = buildHost();
    let hostResult = { ok: false, built: hostBuilt, error: hostBuilt ? 'host exe no presente' : 'no csc/vendor' };
    if (hostBuilt && fs.existsSync(HOST_EXE)) {
      const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'ultraia-wv2-check-'));
      hostResult = await new Promise((resolve) => {
        const child = spawn(HOST_EXE, [`--url=${publicUrl}`, `--user-data-dir=${profile}`, '--check'], { windowsHide: true });
        let out = '';
        child.stdout.on('data', (c) => (out += c.toString()));
        child.stderr.on('data', (c) => (out += c.toString()));
        child.on('close', (code) => {
          let parsed = {};
          const line = out.split('\n').find((l) => l.includes('"ok"'));
          if (line) { try { parsed = JSON.parse(line); } catch { /* ignore */ } }
          resolve({ ok: code === 0 && parsed.ok === true, exit: code, built: hostBuilt, ...parsed, stdout: out.trim().slice(0, 400) });
        });
      });
    }
    log(`host-check: ${JSON.stringify({ ok: hostResult.ok, webview2: hostResult.version ?? null, exit: hostResult.exit ?? null, built: hostResult.built, error: hostResult.error ?? null })}`);
    proxy.closeAllConnections?.();
    await new Promise((r) => proxy.close(r));
    await runtime.stop();
    process.exitCode = hostResult.ok ? 0 : 1;
    setTimeout(() => process.exit(process.exitCode), 100);
    return;
  }

  let webChild = null;
  if (WEB_DIR) {
    // Modo prototipo: arranca la web standalone y la ventana abre la app real.
    const serverJs = path.join(WEB_DIR, 'server.js');
    if (!fs.existsSync(serverJs)) {
      log(`FATAL: --web-dir no contiene server.js: ${WEB_DIR}`);
      await runtime.stop();
      process.exit(1);
    }
    webChild = spawn(process.execPath, ['server.js'], {
      cwd: WEB_DIR,
      windowsHide: true,
      env: {
        ...process.env,
        PORT: String(WEB_PORT),
        HOSTNAME: '127.0.0.1',
        // Prisma 6 resuelve `file:` contra el schema del build (roto al mover el
        // árbol); ruta ABSOLUTA en runtime para que la dev.db embebida abra.
        DATABASE_URL: `file:${path.resolve(WEB_DIR, 'prisma', 'dev.db').replace(/\\/g, '/')}`,
      },
    });
    webChild.stdout?.on('data', (c) => log(`[web] ${c.toString().trim()}`));
    webChild.stderr?.on('data', (c) => log(`[web:err] ${c.toString().trim()}`));
    webChild.on('exit', (code) => {
      if (code !== 0 && code !== null) log(`[web] salió con código ${code}`);
    });
    const webOk = await waitWeb(`http://127.0.0.1:${WEB_PORT}`, 45_000);
    if (!webOk) {
      log(`FATAL: la web no respondió en http://127.0.0.1:${WEB_PORT}`);
      killTree(webChild);
      await runtime.stop();
      process.exit(1);
    }
    log(`web standalone listo en http://127.0.0.1:${WEB_PORT}`);
  }

  if (!NO_WINDOW) openWindow(WEB_DIR ? `http://127.0.0.1:${WEB_PORT}` : publicUrl);

  const shutdown = async () => {
    log('shutting down…');
    killTree(webChild);
    await new Promise((r) => proxy.close(r));
    await runtime.stop();
    process.exit(0);
  };
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

/**
 * Poll de salud HTTP (node:http, agent:false — sin sockets keep-alive que choquen
 * con libuv al cerrar en Windows). Resuelve true cuando la URL responde < 500.
 */
function waitWeb(url, timeoutMs) {
  return new Promise((resolve) => {
    const started = Date.now();
    let done = false;
    const finish = (ok) => { if (!done) { done = true; resolve(ok); } };
    const poll = () => {
      const req = request(url, { agent: false, method: 'GET' }, (res) => {
        res.resume();
        if (res.statusCode && res.statusCode < 500) finish(true);
        else retry();
      });
      req.on('error', () => retry());
      req.setTimeout(2500, () => { req.destroy(); retry(); });
    };
    const retry = () => {
      if (Date.now() - started > timeoutMs) finish(false);
      else setTimeout(poll, 700);
    };
    poll();
  });
}

/** Mata el árbol completo del child (taskkill /T /F en Windows — patrón del repo). */
function killTree(child) {
  if (!child || child.exitCode !== null) return;
  try {
    if (process.platform === 'win32') {
      spawnSync('taskkill', ['/PID', String(child.pid), '/T', '/F']);
    } else {
      child.kill('SIGTERM');
    }
  } catch (err) {
    log(`warning: no se pudo matar el child: ${err.message}`);
  }
}

function isStale(distDir, srcFile) {
  const distFile = path.join(distDir, 'packages', 'runtime', 'src', 'runtime.js');
  if (!fs.existsSync(distFile)) return true;
  return fs.statSync(srcFile).mtimeMs > fs.statSync(distFile).mtimeMs;
}

main().catch((err) => {
  log(`FATAL: ${err.stack ?? err.message}`);
  process.exit(1);
});