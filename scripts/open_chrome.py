#!/usr/bin/env python3
"""open_chrome.py — Abre la UI web de UltraIa en Google Chrome.

Uso:
  python scripts/open_chrome.py                 # abre http://localhost:3000 en Chrome
  python scripts/open_chrome.py --url URL       # abre otra URL
  python scripts/open_chrome.py --serve         # arranca `npm run dev` si :3000 no responde, espera y abre
  python scripts/open_chrome.py --app           # modo app (sin chrome UI)

Determinista y fail-soft: si no encuentra Chrome, sugiere la ruta y sale 2.
"""
from __future__ import annotations

import argparse
import os
import shutil
import socket
import subprocess
import sys
import time
from urllib.parse import urlparse

DEFAULT_URL = "http://localhost:3000"
POLL_TIMEOUT = 60  # segundos esperando a que el server responda


def find_chrome() -> str | None:
    # 1) en PATH
    for name in ("chrome", "google-chrome", "google-chrome-stable", "chromium", "chromium-browser"):
        path = shutil.which(name)
        if path:
            return path
    # 2) rutas conocidas Windows
    candidates = [
        r"C:\Program Files\Google\Chrome\Application\chrome.exe",
        r"C:\Program Files (x86)\Google\Chrome\Application\chrome.exe",
        os.path.expandvars(r"%LOCALAPPDATA%\Google\Chrome\Application\chrome.exe"),
        r"C:\Program Files\Google\Chrome Beta\Application\chrome.exe",
        r"C:\Program Files\Google\Chrome Dev\Application\chrome.exe",
    ]
    for c in candidates:
        if c and os.path.isfile(c):
            return c
    # 3) macOS
    mac = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
    if os.path.isfile(mac):
        return mac
    # 4) linux common
    for l in ("/usr/bin/google-chrome", "/usr/bin/chromium", "/usr/bin/chromium-browser", "/snap/bin/chromium"):
        if os.path.isfile(l):
            return l
    return None


def is_up(url: str, timeout: float = 2.0) -> bool:
    try:
        p = urlparse(url)
        host = p.hostname or "localhost"
        port = p.port or (443 if p.scheme == "https" else 80)
        with socket.create_connection((host, port), timeout=timeout):
            return True
    except OSError:
        return False


def start_dev_server() -> subprocess.Popen | None:
    # arranca `npm run dev` (web) en background; asume node/npm en PATH
    root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    try:
        if os.name == "nt":
            return subprocess.Popen(["npm.cmd", "run", "dev"], cwd=root)
        return subprocess.Popen(["npm", "run", "dev"], cwd=root)
    except Exception as e:  # noqa: BLE001
        print(f"[open_chrome] No se pudo arrancar el dev server: {e}", file=sys.stderr)
        return None


def wait_for(url: str, timeout: int = POLL_TIMEOUT) -> bool:
    deadline = time.time() + timeout
    while time.time() < deadline:
        if is_up(url):
            return True
        time.sleep(1.0)
    return False


def open_in_chrome(chrome: str, url: str, app_mode: bool) -> bool:
    args = [chrome]
    if app_mode:
        args += ["--app=%s" % url]
    else:
        args += ["--new-window", url]
    try:
        subprocess.Popen(args)
        return True
    except Exception as e:  # noqa: BLE001
        print(f"[open_chrome] No se pudo abrir Chrome: {e}", file=sys.stderr)
        return False


def main() -> int:
    ap = argparse.ArgumentParser(description="Abre UltraIa en Google Chrome.")
    ap.add_argument("--url", default=DEFAULT_URL, help="URL a abrir (default %(default)s)")
    ap.add_argument("--serve", action="store_true", help="arranca el dev server si no responde")
    ap.add_argument("--app", action="store_true", help="modo app (sin chrome UI)")
    args = ap.parse_args()

    if args.serve and not is_up(args.url):
        print("[open_chrome] :3000 no responde; arrancando dev server...")
        start_dev_server()
        if not wait_for(args.url):
            print("[open_chrome] El dev server no respondió a tiempo. Abro la URL de todos modos.", file=sys.stderr)

    chrome = find_chrome()
    if not chrome:
        print("[open_chrome] Google Chrome no encontrado.", file=sys.stderr)
        print("[open_chrome] Instala Chrome o define CHROME_BIN con la ruta del ejecutable.", file=sys.stderr)
        return 2

    if not open_in_chrome(chrome, args.url, args.app):
        return 1

    print(f"[open_chrome] Abierto {args.url} en {chrome}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
