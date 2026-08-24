#!/usr/bin/env python3
"""UltraIa — one command to setup, start, and deploy everything.

Usage:
    python start.py            # full setup (install, .env, migrate) + web + webhooks
    python start.py --web      # only the Next.js app (http://localhost:3000)
    python start.py --hooks    # only the webhook server (http://localhost:8000)
    python start.py --validate # only validate the Arabic pipeline (no servers)
    python start.py --install  # only setup (deps, .env, migrate) — no servers
    python start.py --skip-setup   # skip install/.env/migrate, just start services
    python start.py --deploy   # production build + instructions for free hosting
    python start.py --check-connections  # env keys, tools and ports report
    python start.py --gen-engine  # only the local Gen-Engine (http://localhost:8100)
    python start.py --host 0.0.0.0     # listen on all interfaces (LAN/mobile)
    python start.py --browser brave    # open Brave (or chrome) when web is UP
    python start.py --no-open          # do NOT auto-open the browser

Checks prerequisites (node >= 20, npm, python >= 3.10, ffmpeg), installs deps if
missing or outdated, creates .env files from .env.example, runs the DB migration
if needed, then starts the services. Aborts early if a target port is already in
use, and polls each service until it responds (or fails with exit 1). Health
checks always use 127.0.0.1 (IPv4 explicit) so localhost/::1 resolution never
causes false negatives. When the web is up, the browser opens automatically
(Chrome/Brave detected or the OS default; --no-open disables it). Services that
die are restarted up to 2 times with backoff. Ctrl+C stops everything — on
Windows the whole process tree is killed (taskkill /T), so no orphan `next
dev`/node processes survive.
"""

from __future__ import annotations

import argparse
import functools
import os
import re
import shutil
import socket
import subprocess
import sys
import threading
import time
import urllib.error
import urllib.request
import webbrowser
from pathlib import Path
from urllib.parse import urlsplit, urlunsplit

ROOT = Path(__file__).resolve().parent
PIPE_DIR = ROOT / "ULTRAIA" / "integracionesImplementacion"
WEBHOOK_SERVER = PIPE_DIR / "webhook_server.py"
GEN_ENGINE_DIR = ROOT / "gen-engine"
DB_FILE = ROOT / "packages" / "core" / "prisma" / "dev.db"
LOCK_FILE = ROOT / "package-lock.json"
NODE_MODULES = ROOT / "node_modules"
NM_LOCK = NODE_MODULES / ".package-lock.json"
ENV_SOURCES = [
    ROOT / ".env.example",
    ROOT / "apps" / "web" / ".env.example",
    PIPE_DIR / ".env.example",
]
ENV_TARGETS = [
    ROOT / ".env",
    ROOT / "apps" / "web" / ".env",
    PIPE_DIR / ".env",
]
WEB_PORT = 3000
HOOKS_PORT = 8000
GEN_ENGINE_PORT = 8100

DEPLOY_DOC = """UltraIa — deploy gratuito (2026)

Tu app Next.js puede publicarse gratis en varias plataformas. Eliges una:

1. Vercel (recomendado para Next.js, gratis)
   npx vercel            # login una vez, luego cada cambio: npx vercel --prod
   - Panel: https://vercel.com (conecta tu repo GitHub para auto-deploy)

2. Netlify (gratis, muy fácil)
   npx netlify deploy    # preview; usa --prod para producción
   - Build command: npm run build | Publish dir: apps/web/.next

3. Render (gratis, con sleep en free tier)
   - Nuevo Web Service -> repo -> Build: npm run build | Start: npm start

4. Cloudflare Pages (gratis, CDN global)
   npx wrangler pages deploy apps/web/out --project-name ultraia

5. GitHub Pages (gratis, solo estático)
   - Exporta estático (next export) y súbelo al branch gh-pages.

Notas: pega tus API keys (OPENAI/ELEVENLABS/RUNWAY/FAL) en el panel de
la plataforma elegida (Variables de entorno). El webhook server NO se
despliega gratis con facilidad — usa un host siempre-on como Railway,
o https://localhosttunnel/ para pruebas locales."""


def log(msg: str) -> None:
    """Print a message with the standard [ultraia] prefix, flushing immediately."""
    print(f"[ultraia] {msg}", flush=True)


def npm_exec() -> str:
    """Return the npm executable name; npm.cmd on Windows (Popen needs it)."""
    if os.name == "nt":
        return shutil.which("npm.cmd") or "npm"
    return "npm"


@functools.lru_cache(maxsize=1)
def python_exec() -> list[str]:
    """Resolve a Python interpreter that can run the Python services.

    Returns the argv (e.g. ["python"] or ["py", "-3.12"]) of the first
    candidate able to import fastapi+uvicorn (needed by the webhook server
    and the gen-engine). Prefers the interpreter running this script, then
    `python`, then the Windows launcher with common 3.11/3.12 minors, then
    the launcher default. Falls back to the first candidate so setup and
    validate still run even without the web deps. Cached: probing costs
    ~seconds per candidate, and several callers use it per run.
    """
    candidates: list[list[str]] = [[sys.executable]] if sys.executable else []
    if os.name == "nt":
        candidates += [["python"], ["py", "-3.12"], ["py", "-3.11"], ["py"]]
    else:
        candidates += [["python3"], ["python"]]
    for cmd in candidates:
        try:
            probe = subprocess.run(
                [*cmd, "-c", "import fastapi, uvicorn"],
                capture_output=True,
                timeout=8,
                check=False,
            )
        except (OSError, subprocess.SubprocessError):
            continue
        if probe.returncode == 0:
            return cmd
    return candidates[0] if candidates else ["python"]


def run(cmd: list[str], cwd: Path = ROOT, check: bool = True) -> int:
    """Run a command, log it, and (optionally) fail hard on non-zero exit."""
    log("> " + " ".join(cmd))
    try:
        proc = subprocess.run(cmd, cwd=cwd, check=False)
    except FileNotFoundError:
        print(f"[ultraia] ERROR: comando no encontrado: {cmd[0]}", file=sys.stderr)
        return 1
    if check and proc.returncode != 0:
        sys.exit(f"[ultraia] Fallo: {' '.join(cmd)} (exit {proc.returncode})")
    return proc.returncode


def tool_version(tool: str | list[str]) -> str:
    """Return the --version output of a tool, or '?' when it cannot run."""
    cmd = [tool] if isinstance(tool, str) else tool
    try:
        out = subprocess.run(
            cmd + ["--version"], capture_output=True, text=True, timeout=10, check=False
        )
        return (out.stdout or out.stderr).strip()
    except (OSError, subprocess.SubprocessError, ValueError):
        return "?"


def check_prereqs() -> None:
    """Verify node >= 20, npm and python >= 3.10 exist; warn about ffmpeg."""
    log("Verificando prerequisitos...")
    missing: list[str] = []
    if shutil.which("node") is None:
        missing.append("node (instala Node.js >= 20: https://nodejs.org)")
    else:
        raw = tool_version("node")
        m = re.search(r"v?(\d+)\.", raw)
        major = int(m.group(1)) if m else 0
        if major < 20:
            missing.append(f"node {raw} — se requiere >= 20")
    if shutil.which(npm_exec()) is None:
        missing.append("npm (viene con Node.js)")
    if shutil.which(python_exec()[0]) is None:
        missing.append("python >= 3.10 (https://python.org)")
    else:
        raw = tool_version(python_exec())
        m = re.search(r"(\d+)\.(\d+)", raw)
        if m:
            ver = tuple(int(x) for x in m.groups())
            if ver < (3, 10):
                missing.append(f"python {raw} — se requiere >= 3.10")
    if missing:
        print(f"[ultraia] ERROR: faltan: {'; '.join(missing)}", file=sys.stderr)
        sys.exit(1)
    if shutil.which("ffmpeg") is None:
        print(
            "[ultraia] AVISO: ffmpeg no está en PATH — render/assembly de video "
            "no funcionará. Instálalo con: winget install Gyan.FFmpeg",
            file=sys.stderr,
        )
    log(f"Prerequisitos OK (node {tool_version('node').split()[0]}, {tool_version(python_exec())})")


def setup_env() -> None:
    """Copy .env.example -> .env for the three locations that lack them."""
    for target, source in zip(ENV_TARGETS, ENV_SOURCES):
        if target.exists():
            continue
        if not source.exists():
            print(
                f"[ultraia] AVISO: {source} no existe; no puedo crear {target}",
                file=sys.stderr,
            )
            continue
        shutil.copyfile(source, target)
        log(f"Creando {target.relative_to(ROOT)} desde .env.example (revisa tus API keys)")


def deps_outdated() -> bool:
    """Return True when npm install is needed (missing or stale node_modules)."""
    if not NODE_MODULES.exists():
        return True
    if not LOCK_FILE.exists() or not NM_LOCK.exists():
        return False
    return NM_LOCK.stat().st_mtime < LOCK_FILE.stat().st_mtime


def setup() -> None:
    """Run prereq checks, npm install if needed, .env creation and DB migrate."""
    check_prereqs()
    if deps_outdated():
        log("Dependencias ausentes o desactualizadas — npm install...")
        run([npm_exec(), "install"])
    else:
        log("Dependencias al día — omitiendo npm install")
    setup_env()
    if DB_FILE.exists():
        log(f"DB ya existe ({DB_FILE.relative_to(ROOT)}) — omitiendo migrate")
    else:
        log("DB ausente — npm run db:migrate...")
        run([npm_exec(), "run", "db:migrate"])


def _ipv4_url(url: str) -> str:
    """Rewrite localhost/::1 hosts to 127.0.0.1 (IPv4 explicit).

    On Windows, Python's urllib may resolve `localhost` to ::1 (IPv6) while
    the local servers (next dev / uvicorn) listen on IPv4 only. That makes
    health checks fail with a false negative even when the server is UP.
    Brackets from IPv6 literals ([::1]) are dropped: the result is a plain
    IPv4 host[:port] netloc.
    """
    parts = urlsplit(url)
    host = parts.hostname or ""
    if host.lower() not in ("localhost", "::1"):
        return url
    port = ""
    try:
        if parts.port is not None:
            port = f":{parts.port}"
    except ValueError:
        pass
    return urlunsplit(
        (parts.scheme, f"127.0.0.1{port}", parts.path, parts.query, parts.fragment)
    )


def http_ok(url: str, timeout: float = 2.0) -> bool:
    """Return True when the server responds, even with a 404.

    The webhook server has no `/` route, so a 404 still means the process is
    alive and accepting connections. localhost is rewritten to 127.0.0.1 so
    the probe never depends on IPv6 resolution.
    """
    url = _ipv4_url(url)
    try:
        with urllib.request.urlopen(url, timeout=timeout) as resp:
            return resp.status < 500
    except urllib.error.HTTPError as e:
        return e.code < 500
    except (OSError, ValueError):
        return False


def port_free(port: int) -> bool:
    """Return True when nothing is listening on the given port."""
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        s.settimeout(0.5)
        return s.connect_ex(("127.0.0.1", port)) != 0


def preflight_ports(ports: list[tuple[int, str]]) -> None:
    """Abort with exit 1 when any of the target ports is already in use."""
    busy = [(p, s) for p, s in ports if not port_free(p)]
    if busy:
        for port, svc in busy:
            print(
                f"[ultraia] ERROR: puerto {port} ya está en uso ({svc}). "
                f"Ciérralo, o usa --skip-setup si el servicio ya está corriendo.",
                file=sys.stderr,
            )
        sys.exit(1)


def wait_healthy(
    url: str,
    service: str,
    proc: subprocess.Popen | None = None,
    timeout: float = 90.0,
) -> None:
    """Poll the service URL until it responds; exit 1 on timeout or early death."""
    log(f"Esperando a que {service} responda ({url})...")
    deadline = time.monotonic() + timeout
    while time.monotonic() < deadline:
        if http_ok(url):
            log(f"{service} UP en {url}")
            return
        if proc is not None and proc.poll() is not None:
            print(
                f"[ultraia] ERROR: {service} murió antes de responder (exit {proc.returncode}). "
                f"Revisa los logs arriba.",
                file=sys.stderr,
            )
            sys.exit(1)
        time.sleep(2)
    print(
        f"[ultraia] ERROR: {service} no respondió en {int(timeout)}s ({url}). "
        f"Revisa los logs arriba.",
        file=sys.stderr,
    )
    sys.exit(1)


def env_keys_with_values(path: Path) -> dict[str, str | None]:
    """Return {VARIABLE: value} for KEY/SECRET/TOKEN/PASSWORD/CLIENT entries."""
    if not path.exists():
        return {}
    out: dict[str, str | None] = {}
    for line in path.read_text(encoding="utf-8", errors="ignore").splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        name, _, value = line.partition("=")
        name = name.strip()
        value = value.strip().strip('"').strip("'")
        if any(t in name.upper() for t in ("KEY", "SECRET", "TOKEN", "PASSWORD", "CLIENT")):
            out[name] = value or None
    return out


def env_report_row(label: str, name: str, keys: dict[str, str | None]) -> None:
    """Print one env key row with its status: OK / VACIA / FALTA."""
    value = keys.get(name)
    if value:
        masked = value[:4] + "****" if len(value) > 4 else "****"
        print(f"  [ENV]   {label}: {name} = {masked} (OK)")
    else:
        status = "VACIA" if name in keys else "FALTA"
        print(f"  [ENV]   {label}: {name} ({status})")


def report_tools() -> None:
    """Print the ffmpeg / ollama / LM Studio / npm status rows."""
    ffmpeg = shutil.which("ffmpeg")
    if ffmpeg:
        print(f"  [TOOL]  ffmpeg: OK ({ffmpeg})")
    else:
        print("  [TOOL]  ffmpeg: FALTA (winget install Gyan.FFmpeg)")
    if http_ok("http://localhost:11434/api/version"):
        print("  [TOOL]  ollama: OK (http://localhost:11434)")
    else:
        print("  [TOOL]  ollama: NO responde (arranca Ollama)")
    if http_ok("http://localhost:1234/v1/models"):
        print("  [TOOL]  LM Studio: OK (http://localhost:1234)")
    else:
        print("  [TOOL]  LM Studio: NO responde (opcional: arranca LM Studio)")
    if http_ok("https://registry.npmjs.org", 4.0):
        print("  [NET]   registry npm: OK")
    else:
        print("  [NET]   registry npm: NO alcanzable (sin red/proxy)")
    report_browser()


def report_gen_engine() -> None:
    """Print the Gen-Engine status row (local launch vs remote health)."""
    ge_url = gen_engine_url()
    if is_local_url(ge_url):
        print(f"  [GEN]   {ge_url} — local (start.py lo lanza con --gen-engine o en el full run)")
        return
    ok = http_ok(f"{ge_url}/health", 3.0)
    print(f"  [GEN]   {ge_url} — remoto: {'OK' if ok else 'NO responde'}")


def check_connections() -> None:
    """Print a report of env keys, tools, network and ports (no changes)."""
    log("=== CONEXIONES ===")
    for target, source in zip(ENV_TARGETS, ENV_SOURCES):
        label = str(target.relative_to(ROOT))
        if not target.exists():
            print(f"  [ENV]   {label}: NO EXISTE (crea con: python start.py)")
            continue
        keys = env_keys_with_values(target)
        example = env_keys_with_values(source) if source.exists() else {}
        for name in sorted(example):
            env_report_row(label, name, keys)
    report_tools()
    for port, svc in (
        (WEB_PORT, "web (Next.js)"),
        (HOOKS_PORT, "webhooks (FastAPI)"),
        (gen_engine_port(gen_engine_url()), "gen-engine (FastAPI)"),
    ):
        state = "LIBRE" if port_free(port) else "EN USO"
        print(f"  [PORT]  {port} ({svc}): {state}")
    report_gen_engine()
    log("check-connections: listo. Las claves reales (OPENAI/ELEVENLABS/RUNWAY/FAL)")
    log("debes pegarlas tú en los .env.")


def validate_pipeline() -> None:
    """Run the Arabic pipeline validator (main.py --validate) in PIPE_DIR."""
    if not PIPE_DIR.exists():
        print(f"[ultraia] ERROR: {PIPE_DIR} no existe", file=sys.stderr)
        sys.exit(1)
    run(python_exec() + ["main.py", "--validate"], cwd=PIPE_DIR)


def start_web(host: str = "127.0.0.1") -> subprocess.Popen:
    """Start the Next.js dev server on port 3000, bound to `host`.

    Runs the hoisted `next` binary directly (node_modules/.bin/next.cmd on
    Windows) with cwd=apps/web instead of `npm run dev`: the root script is
    itself a nested `npm run -w` and npm would eat `-H` as its own flag
    (prints npm help and dies). Falls back to npm when the binary is not
    hoisted.
    """
    log(f"Next.js web app -> http://localhost:{WEB_PORT} (host {host})")
    next_bin = ROOT / "node_modules" / ".bin" / ("next.cmd" if os.name == "nt" else "next")
    if next_bin.exists():
        return subprocess.Popen(
            [str(next_bin), "dev", "-H", host],
            cwd=ROOT / "apps" / "web",
        )
    return subprocess.Popen(
        [npm_exec(), "run", "dev", "-w", "@ultraia/web", "--", "-H", host],
        cwd=ROOT,
    )


def start_hooks(host: str = "127.0.0.1") -> subprocess.Popen | None:
    """Start the FastAPI webhook server on port 8000 (None if missing)."""
    if not WEBHOOK_SERVER.exists():
        print(
            f"[ultraia] AVISO: {WEBHOOK_SERVER} no existe — omitiendo webhooks",
            file=sys.stderr,
        )
        return None
    log(f"Webhook server (Runway/Fal) -> http://localhost:{HOOKS_PORT} (host {host})")
    return subprocess.Popen(
        python_exec() + ["webhook_server.py", "--host", host, "--port", str(HOOKS_PORT)],
        cwd=PIPE_DIR,
    )


def gen_engine_url() -> str:
    """Return the configured Gen-Engine URL (ROOT/.env) or the local default."""
    env = ROOT / ".env"
    if env.exists():
        for line in env.read_text(encoding="utf-8", errors="ignore").splitlines():
            line = line.strip()
            if line.startswith("GEN_ENGINE_URL="):
                value = line.partition("=")[2].strip().strip('"').strip("'")
                if value:
                    return value
    return f"http://localhost:{GEN_ENGINE_PORT}"


def gen_engine_port(url: str) -> int:
    """Extract the port from a Gen-Engine URL (http://host:port/...)."""
    match = re.search(r":(\d+)", url)
    return int(match.group(1)) if match else GEN_ENGINE_PORT


def is_local_url(url: str) -> bool:
    """Return True when the URL points to this machine (localhost/127.0.0.1)."""
    return "localhost" in url or "127.0.0.1" in url


def write_gen_engine_env(url: str) -> None:
    """Ensure apps/web/.env advertises GEN_ENGINE_URL so Next.js registers the
    providers at boot (instrumentation.ts). No-op when a real URL is configured.
    An empty GEN_ENGINE_URL="" (from .env.example) is replaced by the local one.
    """
    target = ROOT / "apps" / "web" / ".env"
    if not target.exists():
        return
    text = target.read_text(encoding="utf-8", errors="ignore")
    if re.search(r"^\s*GEN_ENGINE_URL=\"?[^\"]+\"?\s*$", text, re.MULTILINE):
        return
    if re.search(r"^\s*GEN_ENGINE_URL=\"\"\s*$", text, re.MULTILINE):
        text = re.sub(
            r"^\s*GEN_ENGINE_URL=\"\"\s*$",
            f'GEN_ENGINE_URL="{url}"',
            text,
            count=1,
            flags=re.MULTILINE,
        )
        target.write_text(text, encoding="utf-8")
        log(f"GEN_ENGINE_URL={url} actualizado en {target.relative_to(ROOT)}")
        return
    with target.open("a", encoding="utf-8") as f:
        f.write(f'\nGEN_ENGINE_URL="{url}"\n')
    log(f"GEN_ENGINE_URL={url} añadido a {target.relative_to(ROOT)}")


def start_gen_engine(host: str = "127.0.0.1") -> subprocess.Popen | None:
    """Start the local Gen-Engine (FastAPI) on the configured port (None if missing).

    Uses :8100 by default so it never collides with the webhook server (:8000).
    The web app must know the URL: GEN_ENGINE_URL is written to apps/web/.env
    when absent (the instrumentation then health-checks and registers providers).
    """
    if not GEN_ENGINE_DIR.exists():
        print(
            f"[ultraia] AVISO: {GEN_ENGINE_DIR} no existe — omitiendo gen-engine",
            file=sys.stderr,
        )
        return None
    url = gen_engine_url()
    port = gen_engine_port(url)
    write_gen_engine_env(url)
    log(f"Gen-Engine (FastAPI) -> {url} (host {host})")
    return subprocess.Popen(
        python_exec()
        + ["-m", "uvicorn", "app.main:app", "--host", host, "--port", str(port)],
        cwd=GEN_ENGINE_DIR,
    )


def terminate(proc: subprocess.Popen, _name: str) -> None:
    """Kill a service and its whole process tree.

    Critical on Windows: npm.cmd spawns `next dev` as a child — a plain
    terminate() orphans it, which is why stray dev servers used to survive.
    """
    if os.name == "nt":
        subprocess.run(
            ["taskkill", "/PID", str(proc.pid), "/T", "/F"],
            capture_output=True,
            text=True,
            timeout=15,
            check=False,
        )
        return
    proc.terminate()
    try:
        proc.wait(timeout=10)
    except subprocess.TimeoutExpired:
        proc.kill()


def shutdown(procs: list[tuple[subprocess.Popen, str]]) -> None:
    """Gracefully stop every running service."""
    log("Deteniendo servicios...")
    for p, _name in procs:
        if p.poll() is None:
            terminate(p, _name)


def service_url(name: str) -> str:
    """Return the health URL for a service name (127.0.0.1 — IPv4 explicit)."""
    if name == "web":
        return f"http://127.0.0.1:{WEB_PORT}"
    if name == "gen-engine":
        return f"{_ipv4_url(gen_engine_url())}/health"
    return f"http://127.0.0.1:{HOOKS_PORT}"


def public_url(name: str) -> str:
    """Return the human-facing URL for a service (localhost, readable)."""
    if name == "web":
        return f"http://localhost:{WEB_PORT}"
    if name == "gen-engine":
        return f"{gen_engine_url()}/health"
    return f"http://localhost:{HOOKS_PORT}"


def print_urls() -> None:
    """Tell the user both URL forms — Chrome/Brave usually resolves localhost,
    but 127.0.0.1 always works even when IPv6 resolution misbehaves."""
    log(
        f"Web lista: {public_url('web')}  "
        f"(alternativa si falla: http://127.0.0.1:{WEB_PORT})"
    )
    if WEBHOOK_SERVER.exists():
        log(
            f"Webhooks: {public_url('hooks')}  "
            f"(alternativa: http://127.0.0.1:{HOOKS_PORT})"
        )
    if GEN_ENGINE_DIR.exists():
        log(f"Gen-Engine: {public_url('gen-engine')}")


# ----------------------------------------------------------------- browser

BROWSER_CANDIDATES: dict[str, list[str]] = {
    "chrome": [
        r"%ProgramFiles%\Google\Chrome\Application\chrome.exe",
        r"%LOCALAPPDATA%\Google\Chrome\Application\chrome.exe",
        r"%ProgramFiles(x86)%\Google\Chrome\Application\chrome.exe",
    ],
    "brave": [
        r"%ProgramFiles%\BraveSoftware\Brave-Browser\Application\brave.exe",
        r"%LOCALAPPDATA%\BraveSoftware\Brave-Browser\Application\brave.exe",
        r"%ProgramFiles(x86)%\BraveSoftware\Brave-Browser\Application\brave.exe",
    ],
}


def find_browser(browser: str | None) -> str | None:
    """Return the path of the requested browser (chrome|brave), or None.

    The BROWSER env var (a real executable path) always wins; otherwise the
    well-known Windows install paths are checked.
    """
    env_browser = os.environ.get("BROWSER", "").strip()
    if env_browser and os.path.isfile(env_browser):
        return env_browser
    if browser in BROWSER_CANDIDATES:
        for pattern in BROWSER_CANDIDATES[browser]:
            path = os.path.expandvars(pattern)
            if os.path.isfile(path):
                return path
    return None


def open_browser(url: str, browser: str | None) -> None:
    """Open the URL in the requested browser (chrome/brave/default)."""
    exe = find_browser(browser)
    if exe:
        log(f"Abriendo navegador: {exe}")
        subprocess.Popen([exe, "--new-window", url])
    else:
        log(f"Abriendo navegador por defecto con {url}")
        webbrowser.open(url)


def open_browser_when_ready(
    name: str, url: str, browser: str | None, timeout: float = 240.0
) -> None:
    """Poll the service health (soft, no exit) and open the browser once UP."""
    deadline = time.monotonic() + timeout
    while time.monotonic() < deadline:
        if http_ok(service_url(name)):
            open_browser(url, browser)
            return
        time.sleep(2)


def report_browser() -> None:
    """Print the browser row for --check-connections."""
    for name in ("chrome", "brave"):
        exe = find_browser(name)
        if exe:
            print(f"  [BROWSER] {name}: OK ({exe})")
            return
    print("  [BROWSER] Chrome/Brave no detectado — se usará el navegador por defecto")


def monitor_loop(
    procs: list[tuple[subprocess.Popen, str]],
    start_fns: list[object],
    restart_limit: int = 2,
) -> None:
    """Wait for Ctrl+C; restart a dead service up to `restart_limit` times.

    A service that keeps dying after the limit (or that cannot be restarted)
    fails the run: everything is shut down and exit 1 is returned, so the
    user never keeps a half-dead stack.
    """
    log("Todo arriba. Ctrl+C para detener todo.")
    attempts = {name: 0 for _, name in procs}
    try:
        while True:
            for i, (p, name) in enumerate(procs):
                if p.poll() is None:
                    continue
                if attempts[name] < restart_limit:
                    attempts[name] += 1
                    log(
                        f"{name} terminó (exit {p.returncode}); reiniciando "
                        f"(intento {attempts[name]}/{restart_limit})..."
                    )
                    time.sleep(2 * attempts[name])
                    new_proc = start_fns[i]()  # type: ignore[operator]
                    if new_proc is None:
                        print(
                            f"[ultraia] ERROR: {name} no se pudo reiniciar",
                            file=sys.stderr,
                        )
                        shutdown(procs)
                        sys.exit(1)
                    procs[i] = (new_proc, name)
                    t = threading.Thread(
                        target=wait_healthy,
                        args=(service_url(name), name, new_proc),
                        kwargs={"timeout": 90.0},
                        daemon=True,
                    )
                    t.start()
                else:
                    print(
                        f"[ultraia] ERROR: {name} terminó con exit {p.returncode} "
                        f"tras {restart_limit} reinicios.",
                        file=sys.stderr,
                    )
                    shutdown(procs)
                    sys.exit(1)
            time.sleep(1)
    except KeyboardInterrupt:
        log("Ctrl+C recibido.")
    finally:
        shutdown(procs)


def spawn_and_watch(
    start_fn,
    name: str,
    watch: bool = True,
    timeout: float = 90.0,
    restart_limit: int = 2,
) -> subprocess.Popen | None:
    """Start one service, watch its health + lifetime, and auto-restart it.

    Returns the (last) process handle. When the service keeps dying, exits 1
    after `restart_limit` attempts instead of leaving the terminal hanging.
    """
    last_proc: subprocess.Popen | None = None
    for attempt in range(restart_limit + 1):
        proc = start_fn()
        if proc is None:
            return None
        last_proc = proc
        if not watch:
            return proc
        t = threading.Thread(
            target=wait_healthy,
            args=(service_url(name), name, proc),
            kwargs={"timeout": timeout},
            daemon=True,
        )
        t.start()
        code = proc.wait()
        if attempt < restart_limit:
            log(
                f"{name} terminó (exit {code}); reiniciando "
                f"(intento {attempt + 1}/{restart_limit})..."
            )
            time.sleep(2 * (attempt + 1))
            continue
        sys.exit(1)
    return last_proc


def cmd_validate() -> None:
    """Handle --validate: pipeline validation only."""
    validate_pipeline()
    log("Validación OK")


def cmd_install() -> None:
    """Handle --install: setup only, then tell the user how to start."""
    setup()
    log("Setup completo. Arranca con: python start.py")


def cmd_deploy() -> None:
    """Handle --deploy: production build plus free-hosting instructions."""
    check_prereqs()
    if deps_outdated():
        run([npm_exec(), "install"])
    run([npm_exec(), "run", "build"])
    print(f"\n{DEPLOY_DOC}\n")


LITE_DEFAULT_RAM_MB = 512


def apply_lite_env(ram_mb: int) -> None:
    """Cap the Node.js heap for low-RAM machines (--lite).

    Sets NODE_OPTIONS=--max-old-space-size=<ram_mb> so `next dev` stays within
    a tight budget. NEVER clobbers a --max-old-space-size already present in
    NODE_OPTIONS (user config wins). Called AFTER setup() so npm install runs
    with the default heap (native installs can need more than the cap).
    """
    current = os.environ.get("NODE_OPTIONS", "").strip()
    if "--max-old-space-size" in current:
        log(f"NODE_OPTIONS ya define el heap de Node — respetado ({current})")
        return
    merged = f"{current} --max-old-space-size={ram_mb}".strip()
    os.environ["NODE_OPTIONS"] = merged
    log(f"Modo LITE: heap de Node limitado a {ram_mb} MB (NODE_OPTIONS={merged})")


def print_lite_tips(ram_mb: int) -> None:
    """Print low-RAM operating tips (--lite)."""
    print(
        "\n[ultraia] Modo LITE (<8 GB RAM): consejos\n"
        "  - Solo se arranca la web; webhooks/gen-engine omitidos "
        "(activalos sin --lite).\n"
        f"  - Heap de Node capped a {ram_mb} MB; si la web tarda en compilar, "
        "es normal.\n"
        "  - Cierra pestañas de Chrome mientras desarrollas (~100-300 MB c/u).\n"
        "  - NUNCA corras 'npm run build' local en esta máquina: el build "
        "pica 1.5-2+ GB.\n"
        "    Deja ese trabajo a Vercel (docs/INICIO-LOCAL-Y-NUBE.md §Nube).\n"
        "  - UI ultra-ligera alternativa: WebView2 launcher (~111 MB), ver "
        "desktopFase/launcher/.\n"
        "  - Guía completa: docs/INICIO-LOCAL-Y-NUBE.md\n"
    )


def cmd_single(flag: str, host: str, browser: str | None, open_web: bool) -> None:
    """Handle --web / --hooks / --gen-engine: one service, watched + restarted."""
    if flag == "--web":
        preflight_ports([(WEB_PORT, "web (Next.js)")])
        proc = None
        try:
            if open_web:
                t = threading.Thread(
                    target=open_browser_when_ready,
                    args=("web", public_url("web"), browser),
                    daemon=True,
                )
                t.start()
            proc = spawn_and_watch(
                functools.partial(start_web, host), "web", timeout=240.0
            )
            print_urls()
        except KeyboardInterrupt:
            log("Ctrl+C recibido.")
        finally:
            if proc is not None:
                terminate(proc, "web")
        return
    if flag == "--hooks":
        preflight_ports([(HOOKS_PORT, "webhooks (FastAPI)")])
        proc = None
        try:
            proc = spawn_and_watch(
                functools.partial(start_hooks, host), "hooks", timeout=90.0
            )
            print_urls()
        except KeyboardInterrupt:
            log("Ctrl+C recibido.")
        finally:
            if proc is not None:
                terminate(proc, "hooks")
        return
    if flag == "--gen-engine":
        if not GEN_ENGINE_DIR.exists():
            print(f"[ultraia] ERROR: {GEN_ENGINE_DIR} no existe", file=sys.stderr)
            sys.exit(1)
        port = gen_engine_port(gen_engine_url())
        preflight_ports([(port, "gen-engine (FastAPI)")])
        proc = None
        try:
            proc = spawn_and_watch(
                functools.partial(start_gen_engine, host), "gen-engine", timeout=90.0
            )
        except KeyboardInterrupt:
            log("Ctrl+C recibido.")
        finally:
            if proc is not None:
                terminate(proc, "gen-engine")
        return
    raise ValueError(f"flag desconocido: {flag}")


def cmd_full(
    host: str,
    browser: str | None,
    open_web: bool,
    lite: bool = False,
    ram_mb: int = LITE_DEFAULT_RAM_MB,
) -> None:
    """Handle the default run: web + webhooks + (local) gen-engine in parallel.

    With lite=True only the web app starts (low-RAM machines): hooks and
    gen-engine are skipped and a RAM tips block is printed.
    """
    services: list[tuple[int, str, str, object]] = [
        (WEB_PORT, "web (Next.js)", "web", functools.partial(start_web, host)),
    ]
    if not lite:
        if WEBHOOK_SERVER.exists():
            services.append(
                (HOOKS_PORT, "webhooks (FastAPI)", "hooks",
                 functools.partial(start_hooks, host))
            )
        if GEN_ENGINE_DIR.exists():
            services.append(
                (gen_engine_port(gen_engine_url()),
                 "gen-engine (FastAPI)", "gen-engine",
                 functools.partial(start_gen_engine, host))
            )
    preflight_ports([(port, label) for port, label, _, _ in services])
    procs: list[tuple[subprocess.Popen, str]] = []
    for port, label, name, start_fn in services:
        log(f"Puerto {port} libre ({label})")
        proc = start_fn()  # type: ignore[operator]
        if proc is not None:
            procs.append((proc, name))

    for p, name in procs:
        t = threading.Thread(
            target=wait_healthy,
            args=(service_url(name), name, p),
            kwargs={"timeout": 240.0 if name == "web" else 90.0},
            daemon=True,
        )
        t.start()
    if open_web:
        t = threading.Thread(
            target=open_browser_when_ready,
            args=("web", public_url("web"), browser),
            daemon=True,
        )
        t.start()
    print_urls()
    if lite:
        print_lite_tips(ram_mb)
    monitor_loop(procs, [fn for _, _, _, fn in services])


def main() -> None:
    """Parse arguments and dispatch to the requested mode."""
    parser = argparse.ArgumentParser(description="UltraIa one-command start")
    parser.add_argument("--web", action="store_true", help="solo web app")
    parser.add_argument("--hooks", action="store_true", help="solo webhooks")
    parser.add_argument("--gen-engine", action="store_true", help="solo gen-engine local")
    parser.add_argument("--validate", action="store_true", help="solo validar pipeline ar-SA")
    parser.add_argument(
        "--install",
        action="store_true",
        help="solo setup (deps, .env, migrate)",
    )
    parser.add_argument(
        "--deploy",
        action="store_true",
        help="build de producción + instrucciones de hosting gratuito",
    )
    parser.add_argument(
        "--check-connections",
        action="store_true",
        help="reporte de claves, herramientas y puertos",
    )
    parser.add_argument(
        "--skip-setup", action="store_true", help="no instalar/migrar; solo arrancar"
    )
    parser.add_argument(
        "--host",
        default="127.0.0.1",
        help="host de escucha de los servicios: 127.0.0.1 (local, default), "
        "0.0.0.0 (LAN/móvil) o :: (IPv6 dual-stack)",
    )
    parser.add_argument(
        "--browser",
        default="default",
        choices=["chrome", "brave", "default"],
        help="navegador para abrir la web al estar UP (default: Chrome/Brave "
        "detectados o el navegador del sistema)",
    )
    parser.add_argument(
        "--no-open",
        action="store_true",
        help="no abrir el navegador automáticamente al arrancar la web",
    )
    parser.add_argument(
        "--lite",
        action="store_true",
        help="modo PC con poca RAM (<8 GB): heap de Node limitado y solo la "
        "web (sin webhooks/gen-engine). Ver docs/INICIO-LOCAL-Y-NUBE.md",
    )
    parser.add_argument(
        "--ram-mb",
        type=int,
        default=LITE_DEFAULT_RAM_MB,
        help="heap máximo de Node en MB para --lite (default 512; usa 384 "
        "si el equipo tiene 4 GB o menos)",
    )
    args = parser.parse_args()
    browser: str | None = None if args.browser == "default" else args.browser
    open_web = not args.no_open

    if args.check_connections:
        check_connections()
        return
    if args.validate:
        cmd_validate()
        return
    if args.install:
        cmd_install()
        return
    if args.deploy:
        cmd_deploy()
        return
    if not args.skip_setup:
        setup()
    if args.lite:
        apply_lite_env(args.ram_mb)
    if args.web or args.hooks or args.gen_engine:
        flag = "--web" if args.web else ("--hooks" if args.hooks else "--gen-engine")
        cmd_single(flag, args.host, browser, open_web)
        return
    cmd_full(args.host, browser, open_web, lite=args.lite, ram_mb=args.ram_mb)


if __name__ == "__main__":
    main()
