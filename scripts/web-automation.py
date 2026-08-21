# Nombre CLI con guiones (precedente: build-prototipo.py) -> disable de naming.
# pylint: disable=invalid-name
"""F2 Media Automation — CLI web-automation (keyless, sin ejecución real).

Modela la automatización de navegador del bloque "Media Automation" de
enlaces.txt (repos: Argo Video, Playwright Recast, Pagecast, OBS Auto
Recorder): un ActionScript JSON declarativo -> plan de pasos verificable.

TRES VÍAS (documentadas en docs/AUTOMATION-WEB.md):
  A) Playwright (npm, driver real): ejecuta el ActionScript en Chromium.
     El script SOLO valida/planifica; la ejecución real es del runner.
  B) Python keyless (este script, solo stdlib): valida, estima duración,
     imprime el plan y escribe plan.json — degradación elegante si no hay
     playwright (nunca crashea, nunca ejecuta en --dry-run).
  C) Tool TS `automation_run` (packages/core/src/tools/automation.ts):
     orquesta el ciclo de 10 fases (PLAN..ARCHIVE) en el core.

Uso:
    python scripts/web-automation.py --dry-run                # plan de ejemplo a stdout
    python scripts/web-automation.py --dry-run -s script.json # valida + planifica un script
    python scripts/web-automation.py --validate -s script.json
    python scripts/web-automation.py --dry-run --out plan.json
    python scripts/web-automation.py --driver playwright -s script.json   # (sin --dry-run) ejecuta

Reglas aprendidas aplicadas: JSON UTF-8 sin BOM; degradación elegante;
validación anti-runaway (duración estimada <= 90 min); cero red en --dry-run.
"""
from __future__ import annotations

import argparse
import json
import sys
import urllib.parse
from datetime import datetime, timezone
from typing import Any

# Acciones del ActionScript (coherentes con screenflow actions.py)
KNOWN_ACTIONS = {"goto", "click", "type", "select", "wait", "screenshot", "scroll", "extract"}

ACTIONS_NEEDING_SELECTOR = {"click", "type", "select"}

# Presupuesto de tiempo por acción (ms) — base para anti-runaway
TIME_BUDGET_MS = {
    "goto": 3_000,
    "click": 800,
    "type": 600,
    "select": 800,
    "wait": 0,  # depende del campo ms
    "screenshot": 1_500,
    "scroll": 900,
    "extract": 500,
}

MAX_TOTAL_MS = 90 * 60 * 1000  # 90 min, mismo límite que screenflow

EXAMPLE_SCRIPT = {
    "id": "demo-01",
    "name": "Demo: grabar página y extraer datos",
    "url": "https://example.com",
    "steps": [
        {"action": "goto", "url": "https://example.com"},
        {"action": "wait", "ms": 500},
        {"action": "click", "selector": "#start"},
        {"action": "type", "selector": "input[name='q']", "value": "ultraia"},
        {"action": "screenshot", "path": "shot-01.png"},
        {"action": "extract", "selector": "main", "as": "content"},
    ],
}


def _validate_step(step: Any, index: int) -> list[str]:
    """Errores de un paso del ActionScript (determinista)."""
    if not isinstance(step, dict):
        return [f"steps[{index}]: debe ser un objeto"]
    errors: list[str] = []
    action = step.get("action")
    if action not in KNOWN_ACTIONS:
        validas = ", ".join(sorted(KNOWN_ACTIONS))
        errors.append(f"steps[{index}]: acción desconocida '{action}' (válidas: {validas})")
    if action in ACTIONS_NEEDING_SELECTOR and not step.get("selector"):
        errors.append(f"steps[{index}]: '{action}' requiere 'selector'")
    if action == "goto" and not urllib.parse.urlparse(str(step.get("url", ""))).scheme:
        errors.append(f"steps[{index}]: 'goto' requiere 'url' http/https")
    if action == "type" and "value" not in step:
        errors.append(f"steps[{index}]: 'type' requiere 'value'")
    if action == "wait":
        ms = step.get("ms")
        if not isinstance(ms, (int, float)) or ms < 0 or ms > 60_000:
            errors.append(f"steps[{index}]: 'wait' requiere 'ms' entre 0 y 60000")
    return errors


def validate_script(script: Any) -> list[str]:
    """Devuelve lista de errores (vacía => válido)."""
    errors: list[str] = []
    if not isinstance(script, dict):
        return ["el script debe ser un objeto JSON"]
    if not script.get("id"):
        errors.append("falta 'id'")
    url_raw = script.get("url", "")
    url_ok = isinstance(url_raw, str) and urllib.parse.urlparse(url_raw).scheme
    if not url_ok:
        errors.append("'url' inválida (debe ser http/https)")
    steps = script.get("steps")
    if not isinstance(steps, list) or not steps:
        return errors + ["'steps' debe ser una lista no vacía"]
    for i, step in enumerate(steps):
        errors.extend(_validate_step(step, i))
    duration = estimate_duration_ms(script)
    if duration > MAX_TOTAL_MS:
        limit_min = MAX_TOTAL_MS // 60000
        msg = f"duracion estimada {duration // 1000}s supera el limite anti-runaway"
        errors.append(f"{msg} de {limit_min}min")
    return errors


def estimate_duration_ms(script: Any) -> int:
    """Duración estimada (ms) del script — determinista, sin ejecutar nada."""
    if not isinstance(script, dict) or not isinstance(script.get("steps"), list):
        return 0
    total = 0
    for step in script["steps"]:
        if not isinstance(step, dict):
            continue
        action = str(step.get("action", ""))
        total += TIME_BUDGET_MS.get(action, 500)
        if action == "wait":
            total += int(step.get("ms", 0))
    return total


def plan_steps(script: Any) -> list[dict[str, Any]]:
    """Pasos humanamente legibles + coste — el plan que EJECUTARÍA el driver."""
    steps = script.get("steps", []) if isinstance(script, dict) else []
    plan: list[dict[str, Any]] = []
    for i, step in enumerate(steps, start=1):
        action = step.get("action", "?")
        detail = _describe(step)
        cost_ms = TIME_BUDGET_MS.get(str(action), 500)
        plan.append({"step": i, "action": action, "detail": detail, "costMs": cost_ms})
    return plan


_DESCRIBERS: dict[str, str] = {
    "goto": "navegar a {url}",
    "click": "click en {selector}",
    "select": "select en {selector}",
    "type": "escribir '{value}' en {selector}",
    "wait": "esperar {ms}ms",
    "screenshot": "capturar {path}",
    "scroll": "scroll {direction}",
    "extract": "extraer {selector} -> {as_}",
}


def _describe(step: dict[str, Any]) -> str:
    """Descripción humana de un paso del ActionScript (determinista)."""
    a = step.get("action")
    if not isinstance(a, str) or a not in _DESCRIBERS:
        return str(step)
    defaults = {"as_": "texto", "path": "shot.png", "direction": "down"}
    fields = {**defaults, **step}
    if "as" in step:
        fields["as_"] = step["as"]
    return _DESCRIBERS[a].format(**fields)


def render_report(script: Any, plan: list[dict[str, Any]]) -> dict[str, Any]:
    """Reporte determinista — MISMO esquema que automation_run (tools/automation.ts)."""
    total = estimate_duration_ms(script)
    return {
        "id": script.get("id", "?"),
        "name": script.get("name", ""),
        "url": script.get("url", ""),
        "status": "valid" if not validate_script(script) else "invalid",
        "errors": validate_script(script),
        "totalSteps": len(plan),
        "estimatedMs": total,
        "estimatedHuman": f"{total // 1000}s (~{(total / 1000 / 60):.1f} min)",
        "antiRunawayLimitMs": MAX_TOTAL_MS,
        "steps": plan,
        "drivers": ["playwright (npm, driver real)", "python stdlib (validacion)",
                "automation_run TS (ciclo 10 fases)"],
        "generatedAt": datetime.now(timezone.utc).isoformat(),
    }


def run_playwright(script: dict[str, Any]) -> int:
    """Vía A — ejecución REAL (sin --dry-run). Requiere playwright instalado."""
    try:
        from playwright.sync_api import (  # type: ignore  # pylint: disable=import-outside-toplevel
            sync_playwright,
        )
    except ImportError:
        msg = "ERROR: playwright no está instalado. npm i -D playwright && "
        print(msg + "npx playwright install chromium", file=sys.stderr)
        return 1

    errors = validate_script(script)
    if errors:
        print("ERROR: script inválido:" + "\n  - " + "\n  - ".join(errors), file=sys.stderr)
        return 1
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        try:
            for step in script["steps"]:
                a = step["action"]
                if a == "goto":
                    page.goto(step["url"], timeout=30_000)
                elif a == "click":
                    page.click(step["selector"])
                elif a == "type":
                    page.fill(step["selector"], step["value"])
                elif a == "select":
                    page.select_option(step["selector"], step["value"])
                elif a == "wait":
                    page.wait_for_timeout(int(step["ms"]))
                elif a == "screenshot":
                    page.screenshot(path=step.get("path", "shot.png"))
                elif a == "scroll":
                    page.mouse.wheel(0, 1200 if step.get("direction", "down") == "down" else -1200)
                elif a == "extract":
                    text = page.inner_text(step["selector"])
                    print(f"[extract:{step.get('as', 'texto')}] {text[:200]}")
        finally:
            browser.close()
    print(f"OK: {len(script['steps'])} pasos ejecutados en {script.get('url')}")
    return 0


def main() -> int:
    """Punto de entrada CLI: valida/planifica (dry-run) o ejecuta con playwright."""
    parser = argparse.ArgumentParser(description="Web automation planificador/validador (keyless)")
    parser.add_argument("--dry-run", action="store_true",
                        help="solo planifica/valida, no ejecuta (default)")
    parser.add_argument("--validate", action="store_true", help="solo validar el script")
    parser.add_argument("-s", "--script", help="ruta a ActionScript JSON (default: ejemplo)")
    parser.add_argument("--out", help="escribir plan.json (UTF-8 sin BOM)")
    parser.add_argument("--driver", choices=["playwright"], default=None,
                        help="ejecutar con driver real (sin --dry-run)")
    args = parser.parse_args()

    if args.script:
        try:
            with open(args.script, encoding="utf-8-sig") as f:
                script = json.load(f)
        except (OSError, json.JSONDecodeError) as e:
            print(f"ERROR leyendo {args.script}: {e}", file=sys.stderr)
            return 1
    else:
        script = EXAMPLE_SCRIPT

    if args.driver and not args.dry_run and not args.validate:
        return run_playwright(script)

    errors = validate_script(script)
    if args.validate:
        if errors:
            print("INVALIDO:" + "\n  - " + "\n  - ".join(errors))
            return 1
        seconds = estimate_duration_ms(script) // 1000
        print(f"VALIDO: {script.get('id')} — {len(script.get('steps', []))} pasos, ~{seconds}s")
        return 0

    report = render_report(script, plan_steps(script))
    if errors:
        print("INVALIDO (plan informativo):" + "\n  - " + "\n  - ".join(errors), file=sys.stderr)
    print(json.dumps(report, indent=2, ensure_ascii=False))
    if args.out:
        with open(args.out, "w", encoding="utf-8", newline="\n") as f:
            json.dump(report, f, indent=2, ensure_ascii=False)
        print(f"-> {args.out} (UTF-8 sin BOM)")
    return 0 if not errors else 1


if __name__ == "__main__":
    sys.exit(main())
