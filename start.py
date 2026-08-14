#!/usr/bin/env python3
"""UltraIa — one command to setup and start everything.

Usage:
    python start.py            # full setup (install, .env, migrate) + web + webhooks
    python start.py --web      # only the Next.js app (http://localhost:3000)
    python start.py --hooks    # only the webhook server (http://localhost:8000)
    python start.py --validate # only validate the Arabic pipeline (no servers)
    python start.py --install  # only setup (deps, .env, migrate) — no servers
    python start.py --skip-setup   # skip install/.env/migrate, just start services

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
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parent
PIPE_DIR = ROOT / "ULTRAIA" / "integracionesImplementacion"
WEBHOOK_SERVER = PIPE_DIR / "webhook_server.py"
DB_FILE = ROOT / "packages" / "core" / "prisma" / "dev.db"
LOCK_FILE = ROOT / "package-lock.json"
NODE_MODULES = ROOT / "node_modules"
NM_LOCK = NODE_MODULES / ".package-lock.json"
ENV_SOURCES = [ROOT / ".env.example", ROOT / "apps" / "web" / ".env.example", PIPE_DIR / ".env.example"]
ENV_TARGETS = [ROOT / ".env", ROOT / "apps" / "web" / ".env", PIPE_DIR / ".env"]
WEB_PORT = 3000
HOOKS_PORT = 8000


def log(msg: str) -> None:
    print(f"[ultraia] {msg}", flush=True)


def npm_exec() -> str:
    """'npm' is npm.cmd on Windows; Popen needs the real executable."""
    if os.name == "nt":
        return shutil.which("npm.cmd") or "npm"
    return "npm"


def python_exec() -> str:
    """Resolve the Python interpreter consistently: prefer the `python` that
    runs this script (3.12 here) over the Windows `py` launcher (may point to a
    different 3.x and is NOT where fastapi/uvicorn are installed)."""
    if os.name == "nt":
        for c in ("python", "py"):
            if shutil.which(c):
                return c
    for c in ("python3", "python"):
        if shutil.which(c):
            return c
    return "python" if os.name == "nt" else "python3"


def run(cmd: list[str], cwd: Path = ROOT, check: bool = True) -> int:
    log("> " + " ".join(cmd))
    try:
        proc = subprocess.run(cmd, cwd=cwd)
    except FileNotFoundError:
        print(f"[ultraia] ERROR: comando no encontrado: {cmd[0]}", file=sys.stderr)
        return 1
    if check and proc.returncode != 0:
        sys.exit(f"[ultraia] Fallo: {' '.join(cmd)} (exit {proc.returncode})")
    return proc.returncode


def tool_version(tool: str) -> str:
    try:
        out = subprocess.run(
            [tool, "--version"], capture_output=True, text=True, timeout=10
        )
        return (out.stdout or out.stderr).strip()
    except Exception:
        return "?"


def check_prereqs() -> None:
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
    if shutil.which(python_exec()) is None:
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
        print("[ultraia] AVISO: ffmpeg no está en PATH — render/assembly de video no funcionará. Instálalo con: winget install Gyan.FFmpeg")
    log(f"Prerequisitos OK (node {tool_version('node').split()[0]}, {tool_version(python_exec())})")


def setup_env() -> None:
    for target, source in zip(ENV_TARGETS, ENV_SOURCES):
        if target.exists():
            continue
        if not source.exists():
            print(f"[ultraia] AVISO: {source} no existe; no puedo crear {target}", file=sys.stderr)
            continue
        shutil.copyfile(source, target)
        log(f"Creando {target.relative_to(ROOT)} desde .env.example (revisa tus API keys)")


def deps_outdated() -> bool:
    """npm install es necesario si node_modules falta o si package-lock es más nuevo."""
    if not NODE_MODULES.exists():
        return True
    if not LOCK_FILE.exists() or not NM_LOCK.exists():
        return False
    return NM_LOCK.stat().st_mtime < LOCK_FILE.stat().st_mtime


def setup() -> None:
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
    """True si el servidor responde HTTP, aunque sea 404 (los health checks de
    servicios como el webhook server no tienen ruta `/` — un 404 significa que
    el proceso está vivo y aceptando conexiones)."""
    try:
        with urllib.request.urlopen(url, timeout=timeout) as resp:
            return resp.status < 500
    except urllib.error.HTTPError as e:
        return e.code < 500
    except Exception:
        return False


def port_free(port: int) -> bool:
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        s.settimeout(0.5)
        return s.connect_ex(("127.0.0.1", port)) != 0


def preflight_ports(ports: list[tuple[int, str]]) -> None:
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
    """Devuelve {VARIABLE: valor} para claves tipo KEY/SECRET/TOKEN/CLIENT del .env."""
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


def check_connections() -> None:
    log("=== CONEXIONES ===")
    for target, source in zip(ENV_TARGETS, ENV_SOURCES):
        label = str(target.relative_to(ROOT))
        if not target.exists():
            print(f"  [ENV]   {label}: NO EXISTE (crea con: python start.py)")
            continue
        keys = env_keys_with_values(target)
        example = env_keys_with_values(source) if source.exists() else {}
        for name in sorted(example):
            value = keys.get(name)
            status = "OK" if value else ("VACIA" if name in keys else "FALTA")
            if value:
                masked = value[:4] + "****" if len(value) > 4 else "****"
                print(f"  [ENV]   {label}: {name} = {masked} ({status})")
            else:
                print(f"  [ENV]   {label}: {name} ({status})")
    print(f"  [TOOL]  ffmpeg: {'OK (' + (shutil.which('ffmpeg') or '') + ')' if shutil.which('ffmpeg') else 'FALTA (winget install Gyan.FFmpeg)'}")
    print(f"  [TOOL]  ollama: {'OK (http://localhost:11434)' if http_ok('http://localhost:11434/api/version') else 'NO responde (arranca Ollama)'}")
    print(f"  [TOOL]  LM Studio: {'OK (http://localhost:1234)' if http_ok('http://localhost:1234/v1/models') else 'NO responde (opcional: arranca LM Studio)'}")
    print(f"  [NET]   registry npm: {'OK' if http_ok('https://registry.npmjs.org', 4.0) else 'NO alcanzable (sin red/proxy)'}")
    for port, svc in [(WEB_PORT, "web (Next.js)"), (HOOKS_PORT, "webhooks (FastAPI)")]:
        print(f"  [PORT]  {port} ({svc}): {'LIBRE' if port_free(port) else 'EN USO'}")
    log("check-connections: listo. Las claves reales (OPENAI/ELEVENLABS/RUNWAY/FAL) debes pegarlas tú en los .env.")


def validate_pipeline() -> None:
    if not PIPE_DIR.exists():
        print(f"[ultraia] ERROR: {PIPE_DIR} no existe", file=sys.stderr)
        sys.exit(1)
    run([python_exec(), "main.py", "--validate"], cwd=PIPE_DIR)


def start_web() -> subprocess.Popen:
    log("Next.js web app -> http://localhost:3000")
    return subprocess.Popen([npm_exec(), "run", "dev"], cwd=ROOT)


def start_hooks() -> subprocess.Popen | None:
    if not WEBHOOK_SERVER.exists():
        print(f"[ultraia] AVISO: {WEBHOOK_SERVER} no existe — omitiendo webhooks", file=sys.stderr)
        return None
    log("Webhook server (Runway/Fal) -> http://localhost:8000")
    return subprocess.Popen([python_exec(), "webhook_server.py"], cwd=PIPE_DIR)


def terminate(proc: subprocess.Popen, name: str) -> None:
    """Kill a service and its whole process tree (critical on Windows: npm.cmd
    spawns `next dev` as a child — a plain terminate() orphans it, which is why
    stray dev servers used to survive)."""
    if os.name == "nt":
        subprocess.run(
            ["taskkill", "/PID", str(proc.pid), "/T", "/F"],
            capture_output=True,
            text=True,
            timeout=15,
        )
        return
    proc.terminate()
    try:
        proc.wait(timeout=10)
    except subprocess.TimeoutExpired:
        proc.kill()


def shutdown(procs: list[tuple[subprocess.Popen, str]]) -> None:
    log("Deteniendo servicios...")
    for p, name in procs:
        if p.poll() is None:
            terminate(p, name)


def main() -> None:
    parser = argparse.ArgumentParser(description="UltraIa one-command start")
    parser.add_argument("--web", action="store_true", help="solo web app")
    parser.add_argument("--hooks", action="store_true", help="solo webhooks")
    parser.add_argument("--validate", action="store_true", help="solo validar pipeline ar-SA")
    parser.add_argument("--install", action="store_true", help="solo setup (deps, .env, migrate)")
    parser.add_argument("--check-connections", action="store_true", help="reporte de claves, herramientas y puertos")
    parser.add_argument("--skip-setup", action="store_true", help="no instalar/migrar; solo arrancar")
    args = parser.parse_args()

    if args.check_connections:
        check_connections()
        return

    if args.validate:
        validate_pipeline()
        log("Validación OK")
        return

    if args.install:
        setup()
        log("Setup completo. Arranca con: python start.py")
        return

    if not args.skip_setup:
        setup()

    if args.web:
        preflight_ports([(WEB_PORT, "web (Next.js)")])
        web = start_web()
        try:
            wait_healthy(f"http://localhost:{WEB_PORT}", "web", proc=web)
            web.wait()
        except KeyboardInterrupt:
            shutdown([(web, "web")])
        return
    if args.hooks:
        preflight_ports([(HOOKS_PORT, "webhooks (FastAPI)")])
        hooks = start_hooks()
        if hooks:
            try:
                wait_healthy(f"http://localhost:{HOOKS_PORT}", "webhooks", proc=hooks)
                hooks.wait()
            except KeyboardInterrupt:
                shutdown([(hooks, "hooks")])
        return

    preflight_ports([(WEB_PORT, "web (Next.js)"), (HOOKS_PORT, "webhooks (FastAPI)")])
    procs: list[tuple[subprocess.Popen, str]] = []
    web = start_web()
    procs.append((web, "web"))
    hooks = start_hooks()
    if hooks:
        procs.append((hooks, "hooks"))

    health_threads = []
    for p, name in procs:
        url = f"http://localhost:{WEB_PORT if name == 'web' else HOOKS_PORT}"
        t = threading.Thread(target=wait_healthy, args=(url, name, p), daemon=True)
        health_threads.append(t)
        t.start()

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


if __name__ == "__main__":
    main()
