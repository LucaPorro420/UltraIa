#!/usr/bin/env python3
"""UltraIa — one command to setup and start everything.

Usage:
    python start.py            # full setup (install, .env, migrate) + web + webhooks
    python start.py --web      # only the Next.js app (http://localhost:3000)
    python start.py --hooks    # only the webhook server (http://localhost:8000)
    python start.py --validate # only validate the Arabic pipeline (no servers)
    python start.py --skip-setup   # skip install/.env/migrate, just start services

Checks prerequisites (node, npm, python, ffmpeg), installs deps if missing,
creates .env files from .env.example, runs the DB migration if needed, then
starts the services. Ctrl+C stops everything.
"""

from __future__ import annotations

import argparse
import os
import shutil
import subprocess
import sys
import threading
from pathlib import Path

ROOT = Path(__file__).resolve().parent
PIPE_DIR = ROOT / "ULTRAIA" / "integracionesImplementacion"
WEBHOOK_SERVER = PIPE_DIR / "webhook_server.py"
DB_FILE = ROOT / "packages" / "core" / "prisma" / "dev.db"
ENV_SOURCES = [ROOT / ".env.example", ROOT / "apps" / "web" / ".env.example"]


def log(msg: str) -> None:
    print(f"[ultraia] {msg}", flush=True)


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
    targets = [ROOT / ".env", ROOT / "apps" / "web" / ".env"]
    for target in targets:
        if target.exists():
            continue
        source = ENV_SOURCES[0] if target == ROOT / ".env" else ENV_SOURCES[1]
        if not source.exists():
            print(f"[ultraia] AVISO: {source} no existe; no puedo crear {target}", file=sys.stderr)
            continue
        shutil.copyfile(source, target)
        log(f"Creando {target.relative_to(ROOT)} desde .env.example (revisa tus API keys)")
    key_file = targets[1]
    if key_file.exists() and "OPENAI_API_KEY" in key_file.read_text(encoding="utf-8"):
        log("apps/web/.env listo (puede que necesites poner OPENAI_API_KEY real para generación de agentes)")


def setup() -> None:
    check_prereqs()
    if not (ROOT / "node_modules").exists():
        log("node_modules ausente — npm install...")
        run(["npm", "install"])
    else:
        log("node_modules presente — omitiendo npm install")
    setup_env()
    if DB_FILE.exists():
        log(f"DB ya existe ({DB_FILE.relative_to(ROOT)}) — omitiendo migrate")
    else:
        log("DB ausente — npm run db:migrate...")
        run(["npm", "run", "db:migrate"])


def validate_pipeline() -> None:
    if not PIPE_DIR.exists():
        print(f"[ultraia] ERROR: {PIPE_DIR} no existe", file=sys.stderr)
        sys.exit(1)
    run(["python", "main.py", "--validate"], cwd=PIPE_DIR)


def start_web() -> subprocess.Popen:
    log("Next.js web app -> http://localhost:3000")
    return subprocess.Popen(["npm", "run", "dev"], cwd=ROOT)


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
    parser.add_argument("--skip-setup", action="store_true", help="no instalar/migrar; solo arrancar")
    args = parser.parse_args()

    if args.validate:
        validate_pipeline()
        log("Validación OK")
        return

    if not args.skip_setup:
        setup()

    if args.web:
        start_web().wait()
        return
    if args.hooks:
        proc = start_hooks()
        if proc:
            proc.wait()
        return

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