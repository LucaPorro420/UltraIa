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

Checks prerequisites (node >= 20, npm, python >= 3.10, ffmpeg), installs deps if
missing or outdated, creates .env files from .env.example, runs the DB migration
if needed, then starts the services. Aborts early if a target port is already in
use, and polls each service until it responds (or fails with exit 1). Ctrl+C
stops everything — on Windows the whole process tree is killed (taskkill /T), so
no orphan `next dev`/node processes survive.
"""

from __future__ import annotations

import argparse
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
from pathlib import Path

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


def python_exec() -> list[str]:
    """Resolve a Python interpreter that can run the Python services.

    Returns the argv (e.g. ["python"] or ["py", "-3.12"]) of the first
    candidate able to import fastapi+uvicorn (needed by the webhook server
    and the gen-engine). Prefers the interpreter running this script, then
    `python`, then the Windows launcher with common 3.11/3.12 minors, then
    the launcher default. Falls back to the first candidate so setup and
    validate still run even without the web deps.
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
                timeout=15,
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


def http_ok(url: str, timeout: float = 2.0) -> bool:
    """Return True when the server responds, even with a 404.

    The webhook server has no `/` route, so a 404 still means the process is
    alive and accepting connections.
    """
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


def start_web() -> subprocess.Popen:
    """Start the Next.js dev server on port 3000."""
    log("Next.js web app -> http://localhost:3000")
    return subprocess.Popen([npm_exec(), "run", "dev"], cwd=ROOT)


def start_hooks() -> subprocess.Popen | None:
    """Start the FastAPI webhook server on port 8000 (None if missing)."""
    if not WEBHOOK_SERVER.exists():
        print(
            f"[ultraia] AVISO: {WEBHOOK_SERVER} no existe — omitiendo webhooks",
            file=sys.stderr,
        )
        return None
    log("Webhook server (Runway/Fal) -> http://localhost:8000")
    return subprocess.Popen(python_exec() + ["webhook_server.py"], cwd=PIPE_DIR)


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


def start_gen_engine() -> subprocess.Popen | None:
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
    log(f"Gen-Engine (FastAPI) -> {url}")
    return subprocess.Popen(
        python_exec() + ["-m", "uvicorn", "app.main:app", "--port", str(port)],
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
    """Return the health URL for a service name."""
    if name == "web":
        return f"http://localhost:{WEB_PORT}"
    if name == "gen-engine":
        return f"{gen_engine_url()}/health"
    return f"http://localhost:{HOOKS_PORT}"


def monitor_loop(procs: list[tuple[subprocess.Popen, str]]) -> None:
    """Wait for Ctrl+C; exit 1 if any service dies unexpectedly."""
    log("Todo arriba. Ctrl+C para detener todo.")
    try:
        while True:
            for p, name in procs:
                if p.poll() is not None:
                    print(
                        f"[ultraia] ERROR: {name} terminó con exit {p.returncode}. ",
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
    start_fn, name: str, watch: bool = True, timeout: float = 90.0
) -> subprocess.Popen | None:
    """Start one service and (optionally) watch its health + lifetime."""
    proc = start_fn()
    if proc is None:
        return None
    if watch:
        t = threading.Thread(
            target=wait_healthy,
            args=(service_url(name), name, proc),
            kwargs={"timeout": timeout},
            daemon=True,
        )
        t.start()
        proc.wait()
    return proc


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


def cmd_single(flag: str) -> None:
    """Handle --web / --hooks / --gen-engine: one service, watched."""
    if flag == "--web":
        preflight_ports([(WEB_PORT, "web (Next.js)")])
        spawn_and_watch(start_web, "web", timeout=240.0)
        return
    if flag == "--hooks":
        preflight_ports([(HOOKS_PORT, "webhooks (FastAPI)")])
        spawn_and_watch(start_hooks, "hooks", timeout=90.0)
        return
    if flag == "--gen-engine":
        if not GEN_ENGINE_DIR.exists():
            print(f"[ultraia] ERROR: {GEN_ENGINE_DIR} no existe", file=sys.stderr)
            sys.exit(1)
        port = gen_engine_port(gen_engine_url())
        preflight_ports([(port, "gen-engine (FastAPI)")])
        spawn_and_watch(start_gen_engine, "gen-engine", timeout=90.0)
        return
    raise ValueError(f"flag desconocido: {flag}")


def cmd_full() -> None:
    """Handle the default run: web + webhooks + (local) gen-engine in parallel."""
    services: list[tuple[int, str, str, object]] = [
        (WEB_PORT, "web (Next.js)", "web", start_web),
    ]
    if WEBHOOK_SERVER.exists():
        services.append((HOOKS_PORT, "webhooks (FastAPI)", "hooks", start_hooks))
    if GEN_ENGINE_DIR.exists():
        services.append(
            (gen_engine_port(gen_engine_url()),
             "gen-engine (FastAPI)", "gen-engine", start_gen_engine)
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
    monitor_loop(procs)


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
    args = parser.parse_args()

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
    if args.web or args.hooks or args.gen_engine:
        flag = "--web" if args.web else ("--hooks" if args.hooks else "--gen-engine")
        cmd_single(flag)
        return
    cmd_full()


if __name__ == "__main__":
    main()
