#!/usr/bin/env python3
"""UltraIa — one command to setup and start everything.

Usage:
    python start.py            # full setup (install, .env, migrate) + web + webhooks
    python start.py --web      # only the Next.js app (http://localhost:3000)
    python start.py --hooks    # only the webhook server (http://localhost:8000)
    python start.py --validate # only validate the Arabic pipeline (no servers)
    python start.py --install  # only setup (deps, .env, migrate) — no servers
    python start.py --skip-setup   # skip install/.env/migrate, just start services

Checks prerequisites (node, npm, python, ffmpeg), installs deps if missing,
creates .env files from .env.example, runs the DB migration if needed, then
starts the services. Aborts early if a target port is already in use, and
polls each service until it responds (or times out). Ctrl+C stops everything.
"""

from __future__ import annotations

import argparse
import json
import os
import shutil
import socket
import subprocess
import sys
import threading
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parent
PIPE_DIR = ROOT / "ULTRAIA" / "integracionesImplementacion"
WEBHOOK_SERVER = PIPE_DIR / "webhook_server.py"
DB_FILE = ROOT / "packages" / "core" / "prisma" / "dev.db"
ENV_SOURCES = [ROOT / ".env.example", ROOT / "apps" / "web" / ".env.example", PIPE_DIR / ".env.example"]
ENV_TARGETS = [ROOT / ".env", ROOT / "apps" / "web" / ".env", PIPE_DIR / ".env"]


def log(msg: str) -> None:
    print(f"[ultraia] {msg}", flush=True)


def npm_exec() -> str:
    """'npm' is npm.cmd on Windows; Popen needs the real executable."""
    if os.name == "nt":
        return shutil.which("npm.cmd") or "npm"
    return "npm"


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


def check_prereqs() -> None:
    log("Verificando prerequisitos...")
    missing = []
    for tool, hint in [
        ("node", "instala Node.js >= 20: https://nodejs.org"),
        ("npm", "viene con Node.js"),
        ("python", "instala Python >= 3.10: https://python.org"),
    ]:
        if shutil.which(tool) is None:
            missing.append(f"{tool} ({hint})")
    if missing:
        print(f"[ultraia] ERROR: faltan: {'; '.join(missing)}", file=sys.stderr)
        sys.exit(1)
    if shutil.which("ffmpeg") is None:
        print("[ultraia] AVISO: ffmpeg no está en PATH — render/assembly de video no funcionará. Instálalo con: winget install Gyan.FFmpeg")
    log("Prerequisitos OK")


def setup_env() -> None:
    for target, source in zip(ENV_TARGETS, ENV_SOURCES):
        if target.exists():
            continue
        if not source.exists():
            print(f"[ultraia] AVISO: {source} no existe; no puedo crear {target}", file=sys.stderr)
            continue
        shutil.copyfile(source, target)
        log(f"Creando {target.relative_to(ROOT)} desde .env.example (revisa tus API keys)")


def setup() -> None:
    check_prereqs()
    if not (ROOT / "node_modules").exists():
        log("node_modules ausente — npm install...")
        run([npm_exec(), "install"])
    else:
        log("node_modules presente — omitiendo npm install")
    setup_env()
    if DB_FILE.exists():
        log(f"DB ya existe ({DB_FILE.relative_to(ROOT)}) — omitiendo migrate")
    else:
        log("DB ausente — npm run db:migrate...")
        run([npm_exec(), "run", "db:migrate"])


def http_ok(url: str, timeout: float = 2.0) -> bool:
    try:
        with urllib.request.urlopen(url, timeout=timeout):
            return True
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


def wait_healthy(url: str, service: str, timeout: float = 90.0) -> None:
    import time

    log(f"Esperando a que {service} responda ({url})...")
    deadline = time.monotonic() + timeout
    while time.monotonic() < deadline:
        if http_ok(url):
            log(f"{service} UP en {url}")
            return
        time.sleep(2)
    print(
        f"[ultraia] AVISO: {service} no respondió en {int(timeout)}s ({url}). "
        f"Revisa los logs arriba.",
        file=sys.stderr,
    )


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
    for port, svc in [(3000, "web (Next.js)"), (8000, "webhooks (FastAPI)")]:
        print(f"  [PORT]  {port} ({svc}): {'LIBRE' if port_free(port) else 'EN USO'}")
    log("check-connections: listo. Las claves reales (OPENAI/ELEVENLABS/RUNWAY/FAL) debes pegarlas tú en los .env.")


def validate_pipeline() -> None:
    if not PIPE_DIR.exists():
        print(f"[ultraia] ERROR: {PIPE_DIR} no existe", file=sys.stderr)
        sys.exit(1)
    run(["python", "main.py", "--validate"], cwd=PIPE_DIR)


def start_web() -> subprocess.Popen:
    log("Next.js web app -> http://localhost:3000")
    return subprocess.Popen([npm_exec(), "run", "dev"], cwd=ROOT)


def start_hooks() -> subprocess.Popen:
    if not WEBHOOK_SERVER.exists():
        print(f"[ultraia] AVISO: {WEBHOOK_SERVER} no existe — omitiendo webhooks", file=sys.stderr)
        return None
    log("Webhook server (Runway/Fal) -> http://localhost:8000")
    return subprocess.Popen(["python", "webhook_server.py"], cwd=PIPE_DIR)


def pump(stream, prefix: str) -> None:
    try:
        for line in iter(stream.readline, ""):
            if line:
                print(f"{prefix} {line.rstrip()}", flush=True)
    except Exception:
        pass


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
        preflight_ports([(3000, "web (Next.js)")])
        web = start_web()
        wait_healthy("http://localhost:3000", "web")
        web.wait()
        return
    if args.hooks:
        preflight_ports([(8000, "webhooks (FastAPI)")])
        hooks = start_hooks()
        if hooks:
            wait_healthy("http://localhost:8000", "webhooks")
            hooks.wait()
        return

    preflight_ports([(3000, "web (Next.js)"), (8000, "webhooks (FastAPI)")])
    procs = []
    web = start_web()
    procs.append((web, "[web]    "))
    hooks = start_hooks()
    if hooks:
        procs.append((hooks, "[hooks]  "))

    threads = [
        threading.Thread(target=pump, args=(p.stdout, prefix), daemon=True)
        for p, prefix in procs
        if p.stdout
    ]
    health = threading.Thread(
        target=wait_healthy, args=("http://localhost:3000", "web"), daemon=True
    )
    threads.append(health)
    if hooks:
        hooks_health = threading.Thread(
            target=wait_healthy, args=("http://localhost:8000", "webhooks"), daemon=True
        )
        threads.append(hooks_health)
    for t in threads:
        t.start()

    log("Todo arriba. Ctrl+C para detener todo.")
    try:
        while any(p.poll() is None for p, _ in procs):
            import time

            time.sleep(1)
    except KeyboardInterrupt:
        log("Deteniendo...")
    finally:
        for p, _ in procs:
            p.terminate()
        for p, _ in procs:
            try:
                p.wait(timeout=10)
            except subprocess.TimeoutExpired:
                p.kill()


if __name__ == "__main__":
    main()