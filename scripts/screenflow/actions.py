#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
ScreenFlow actions — ejecutor del ActionScript declarativo de la capability
`screenflow` (UltraIa). Determinist a keyless: pyautogui para acciones de
escritorio; Playwright/patchright (si están instalados) para selectores web.

Uso:
  python scripts/screenflow/actions.py script.json            # ejecutar
  python scripts/screenflow/actions.py script.json --dry-run  # solo validar
  python scripts/screenflow/actions.py script.json --steps 0-2  # solo pasos

Reglas: fail-soft por acción (error -> se registra y continúa hasta 'end'),
retry máximo 3 con backoff 1s, nunca inyecta secretos en los logs.
"""

from __future__ import annotations

import argparse
import json
import subprocess
import sys
import time
from pathlib import Path
from typing import Any

MAX_RETRIES = 3
RETRY_BACKOFF_S = 1.0

SUPPORTED = {
    "sleep", "click", "type", "key", "scroll", "move",
    "open_url", "exec", "screenshot", "wait_selector", "end",
}


def log(step: int, msg: str) -> None:
    print(f"[step {step}] {msg}", flush=True)


def load_script(path: Path) -> Any:
    with path.open("r", encoding="utf-8") as fh:
        return json.load(fh)


def validate(script: Any) -> list[str]:
    errors: list[str] = []
    if not isinstance(script, dict):
        return ["script debe ser un objeto JSON"]
    if "name" not in script or not isinstance(script["name"], str):
        errors.append("falta 'name' (str)")
    actions = script.get("actions")
    if not isinstance(actions, list) or len(actions) == 0:
        errors.append("falta 'actions' (lista no vacía)")
        return errors
    for i, a in enumerate(actions):
        if not isinstance(a, dict) or a.get("type") not in SUPPORTED:
            errors.append(f"acción {i}: type desconocido ({a.get('type') if isinstance(a, dict) else a})")
    return errors


def exec_action(i: int, a: dict[str, Any], pyautogui: Any, pw: Any) -> None:
    t = a["type"]
    if t == "sleep":
        time.sleep(a["ms"] / 1000)
    elif t == "click":
        pyautogui.click(a["x"], a["y"])
    elif t == "type":
        pyautogui.write(a["text"], interval=a.get("intervalMs", 0) / 1000)
    elif t == "key":
        pyautogui.hotkey(*[k.strip() for k in a["combo"].split("+")])
    elif t == "scroll":
        dy = {"up": 1, "down": -1, "left": -1, "right": 1}[a["direction"]]
        amount = a.get("amount", 3)
        if a["direction"] in ("left", "right"):
            pyautogui.hscroll(dy * amount)
        else:
            pyautogui.scroll(dy * amount)
    elif t == "move":
        pyautogui.moveTo(a["x"], a["y"], duration=0.3)
    elif t == "open_url":
        subprocess.run(["cmd", "/c", "start", a["url"]], check=True)
    elif t == "exec":
        subprocess.run(a["cmd"], shell=True, check=False)
    elif t == "screenshot":
        name = a.get("name", f"step_{i}")
        pyautogui.screenshot(f"screenshots/{name}.png")
    elif t == "wait_selector":
        if pw is None:
            log(i, "wait_selector requiere Playwright — omitido (fail-soft)")
            return
        page = pw
        page.wait_for_selector(a["selector"], timeout=a.get("timeoutMs", 15000))
    elif t == "end":
        log(i, "fin del script")
    else:  # pragma: no cover
        raise ValueError(f"acción no soportada: {t}")


def run(script: Any, dry_run: bool, steps: str | None) -> int:
    actions = script.get("actions", [])
    if steps:
        start_s, end_s = (int(x) for x in steps.split("-"))
        actions = actions[start_s : end_s + 1]
    ok = 0
    for i, a in enumerate(actions):
        if dry_run:
            log(i, f"(dry-run) {a['type']} {json.dumps({k: v for k, v in a.items() if k != 'type'})}")
            ok += 1
            continue
        for attempt in range(1, MAX_RETRIES + 1):
            try:
                exec_action(i, a, _pyautogui(), _playwright_page())
                ok += 1
                break
            except Exception as exc:  # noqa: BLE001 — fail-soft por acción
                log(i, f"error (intento {attempt}/{MAX_RETRIES}): {exc}")
                if attempt < MAX_RETRIES:
                    time.sleep(RETRY_BACKOFF_S)
        else:
            log(i, "AGOTADOS los reintentos — continúa con la siguiente acción")
    return ok


_pg: Any = None
_pw: Any = None


def _pyautogui() -> Any:
    global _pg
    if _pg is None:
        try:
            import pyautogui  # type: ignore
            _pg = pyautogui
        except ImportError as exc:
            raise RuntimeError("pyautogui no instalado: pip install pyautogui") from exc
    return _pg


def _playwright_page() -> Any:
    """Devuelve la página activa de Playwright si hay navegador con sesión (opcional)."""
    global _pw
    if _pw is not None:
        return _pw
    try:
        from playwright.sync_api import sync_playwright  # type: ignore
    except ImportError:
        return None
    with sync_playwright() as p:
        browser = p.chromium.launch_persistent_context(user_data_dir=".ultraia/pw-profile")
        _pw = browser.new_page()
    return _pw


def main() -> int:
    ap = argparse.ArgumentParser(description="ScreenFlow actions executor")
    ap.add_argument("script", type=Path)
    ap.add_argument("--dry-run", action="store_true")
    ap.add_argument("--steps", type=str, default=None, help="rango '0-2' (inclusive)")
    args = ap.parse_args()

    script = load_script(args.script)
    errors = validate(script)
    if errors:
        print("VALIDATION FAILED:")
        for e in errors:
            print(f"  - {e}")
        return 1

    mode = "dry-run" if args.dry_run else "ejecución real"
    print(f"[ScreenFlow] {script.get('name')} — {mode}")
    ok = run(script, args.dry_run, args.steps)
    print(f"[ScreenFlow] {ok}/{len(script.get('actions', []))} acciones OK")
    return 0


if __name__ == "__main__":
    sys.exit(main())
