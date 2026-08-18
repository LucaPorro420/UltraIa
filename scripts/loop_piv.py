"""Driver híbrido del loop PIVR (Plan => Implement => Verificar => Reiniciar) de UltraIa.

Ejecuta ciclos de desarrollo continuo invocando opencode en modo headless:

    P: opencode run --agent piv-plan "<tarea>"   (escribe .opencode/plans/loop-<id>-<slug>.md)
    I: opencode run --agent piv-build "<plan>"   (implementa + gates + commit;
                                                 lee el plan DEL ARCHIVO)
    V: gates npm en orden CI (scoped por iteración, FULL en commit)
    R: bitácora en loop-run-log.md + actualización de STATE.md + JSON de presupuesto

La "petición" de build la emite este driver automáticamente al terminar P
(simula la instrucción del usuario: auto-conmutación Plan->Build).

Uso:
    python scripts/loop_piv.py [--cycles N] [--gate-only] [--plan-only] [--triage]
                               [--no-commit] [--dry-run] [--timeout S]

Flags:
    --cycles N     ciclos máximos a ejecutar (default 1)
    --gate-only    solo verificación (P/I saltados); exit 1 si algún gate falla
    --plan-only    solo fase P (escribe el plan file); no implementa
    --triage       ejecuta el agente loop-triage (report-only) y termina
    --no-commit    I+V sin commit (verificación sin tocar el repo)
    --dry-run      imprime los comandos sin ejecutarlos
    --timeout S    timeout por invocación de opencode (default 3600s)
    --full-gate    legacy: gates FULL siempre (comportamiento por defecto)

Kill switch: si STATE.md o loop-run-log.md contienen "loop-pause-all", no hace nada.
Nunca hace push ni merge (gates humanos). Exit codes: 0 ok, 1 fallo.
"""

from __future__ import annotations

import argparse
import datetime as dt
import json
import os
import re
import shutil
import subprocess
import sys
import time
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
STATE = ROOT / "STATE.md"
RUN_LOG = ROOT / "loop-run-log.md"
PLANS_DIR = ROOT / ".opencode" / "plans"
LEARNINGS = ROOT / "learning" / "LEARNINGS.md"

KILL_SWITCH = "loop-pause-all"
TASK_RE = re.compile(
    r"^\|\s*(\d+)\s*\|\s*([^|]+?)\s*\|\s*([^|]+?)\s*\|\s*([^|]+?)\s*\|\s*"
    r"pendiente(?:\s*—\s*SIGUIENTE)?\s*\|",
    re.IGNORECASE,
)
PLAN_FILE_RE = re.compile(r"^loop-(\d+)-.*\.md$")
Task = tuple[int, str, str, str]

def _force_utf8() -> None:
    """Reconfigura stdout/stderr a UTF-8 (consolas Windows cp1252)."""
    for stream in (sys.stdout, sys.stderr):
        reconfigure = getattr(stream, "reconfigure", None)
        if callable(reconfigure):
            reconfigure(encoding="utf-8", errors="replace")


_force_utf8()


def npm_cmd() -> str:
    """Devuelve el ejecutable npm correcto según la plataforma."""
    return "npm.cmd" if os.name == "nt" else "npm"


def opencode_exec() -> list[str]:
    """Resuelve el binario de opencode (cmd/exe, fallback npx)."""
    for cand in ("opencode.cmd", "opencode", "opencode.exe"):
        path = shutil.which(cand)
        if path:
            return [path]
    fallback = Path(os.environ.get("APPDATA", "")) / "npm" / (
        "opencode.cmd" if os.name == "nt" else "opencode"
    )
    if fallback.exists():
        return [str(fallback)]
    return ["npx", "opencode"]


def run(argv: list[str], dry: bool, timeout: int = 3600) -> tuple[int, str]:
    """Ejecuta un comando (o lo imprime en dry-run) y devuelve (exit_code, salida)."""
    if dry:
        print("[dry-run]", " ".join(argv))
        return 0, ""
    proc = subprocess.run(
        argv,
        cwd=ROOT,
        capture_output=True,
        text=True,
        encoding="utf-8",
        errors="replace",
        timeout=timeout,
        check=False,
    )
    out = (proc.stdout or "") + "\n" + (proc.stderr or "")
    return proc.returncode, out


def gates(dry: bool, timeout: int = 3600) -> bool:
    """Corre los 4 gates npm en orden CI; True si todos pasan."""
    steps = ["typecheck", "lint", "test", "build"]
    ok = True
    for step in steps:
        code, out = run([npm_cmd(), "run", step], dry, timeout=timeout)
        if code != 0:
            ok = False
            print(f"[gate] {step}: FAIL")
            print(out[-4000:] if out else "")
        else:
            print(f"[gate] {step}: PASS")
    return ok


def kill_switch_active() -> bool:
    """True si STATE.md o loop-run-log.md contienen el kill switch."""
    for path in (STATE, RUN_LOG):
        if path.exists() and KILL_SWITCH in path.read_text(encoding="utf-8", errors="replace"):
            return True
    return False


def next_task() -> Task | None:
    """Primera tarea 'pendiente' del backlog de STATE.md, o None si no hay."""
    if not STATE.exists():
        return None
    for line in STATE.read_text(encoding="utf-8", errors="replace").splitlines():
        m = TASK_RE.match(line)
        if m:
            return int(m.group(1)), m.group(2).strip(), m.group(3).strip(), m.group(4).strip()
    return None


def mark_done(task_id: int) -> None:
    """Marca DONE (fecha actual) SOLO la fila de STATE.md cuyo ID == task_id.

    FIX 2026-08-18 (auditoria harness): la version anterior aplicaba el
    reemplazo a CUALQUIER fila que siguiera 'pendiente', sin filtrar por
    task_id (el parametro solo se usaba en el print). Con una sola fila
    pendiente a la vez es invisible; con dos sesiones concurrentes que
    dejan mas de una fila 'pendiente' simultanea (ya documentado en
    STATE.md: iteraciones 25/26/41/46), marcaba DONE tareas ajenas sin
    que nadie las hubiera hecho. Ver docs/RAZONAMIENTO-AUDITORIA-HARNESS-2026-08-18.md.
    """
    if not STATE.exists():
        return
    today = dt.datetime.now(dt.timezone.utc).date().isoformat()
    lines = STATE.read_text(encoding="utf-8", errors="replace").splitlines()
    out = []
    matched = False
    for line in lines:
        m = TASK_RE.match(line)
        if m and int(m.group(1)) == task_id:
            line = re.sub(
                r"\|\s*pendiente(?:\s*—\s*SIGUIENTE)?\s*\|",
                f"| ✅ DONE {today} |",
                line,
                flags=re.IGNORECASE,
            )
            matched = True
        out.append(line)
    STATE.write_text("\n".join(out) + "\n", encoding="utf-8")
    status = "marcada DONE" if matched else "NO encontrada (¿el ID cambió en STATE.md?)"
    print(f"[state] tarea #{task_id} {status} {today}")


def log(entry: str) -> None:
    """Append de una entrada con timestamp a loop-run-log.md."""
    stamp = dt.datetime.now(dt.timezone.utc).strftime("%Y-%m-%d %H:%M")
    RUN_LOG.parent.mkdir(parents=True, exist_ok=True)
    with RUN_LOG.open("a", encoding="utf-8") as fh:
        fh.write(f"\n## {stamp}\n{entry}\n")
    print("[log] loop-run-log.md actualizado")


def budget_json(pattern: str, duration_s: float, outcome: str, stats: dict | None = None) -> str:
    """JSON de presupuesto en el formato del skill loop-budget."""
    block = {
        "run_id": dt.datetime.now(dt.timezone.utc).isoformat(timespec="seconds"),
        "pattern": pattern,
        "duration_s": round(duration_s, 1),
        "items_found": 0,
        "actions_taken": 0,
        "escalations": 0,
        "tokens_estimate": 0,
        "outcome": outcome,
    }
    if stats:
        block.update(stats)
    return "```json\n" + json.dumps(block, ensure_ascii=False) + "\n```"


def latest_commit() -> str:
    """Último commit del repo en formato corto ('hash mensaje')."""
    code, out = run(["git", "log", "-1", "--oneline"], dry=False)
    return out.strip().splitlines()[0] if code == 0 and out.strip() else "n/a"


def working_tree_noise() -> int:
    """Número de líneas de git status --porcelain (ruido externo al loop)."""
    code, out = run(["git", "status", "--porcelain"], dry=False, timeout=120)
    if code != 0 or not out.strip():
        return 0
    return len([line for line in out.splitlines() if line.strip()])


def find_plan_file(task_id: int) -> Path | None:
    """Plan file más reciente de la tarea en .opencode/plans/, o None."""
    if not PLANS_DIR.exists():
        return None
    candidates = []
    for path in PLANS_DIR.glob("*.md"):
        m = PLAN_FILE_RE.match(path.name)
        if m and int(m.group(1)) == task_id:
            candidates.append(path)
    if not candidates:
        return None
    return max(candidates, key=lambda p: p.stat().st_mtime)


def run_triage(dry: bool, timeout: int) -> int:
    """Ejecuta el agente loop-triage (report-only) vía opencode run."""
    oc = opencode_exec()
    prompt = (
        "Ejecuta la skill .opencode/skills/loop-triage (triage report-only del loop PIVR): "
        "analiza git log/status, STATE.md y loop-run-log.md; actualiza High Priority / "
        "Watch List / Recent Noise en STATE.md y registra el JSON de presupuesto en "
        "loop-run-log.md. NO edites código fuente."
    )
    code, out = run(
        oc + ["run", "--agent", "loop-triage", prompt], dry, timeout=timeout
    )
    if code != 0:
        log(f"- Triage: **FAIL** (exit {code})\n- Salida:\n{out[-1500:]}")
        print("[triage] FAIL")
        return 1
    print("[triage] OK")
    return 0


def run_plan_phase(oc: list[str], task: Task, args: argparse.Namespace) -> tuple[bool, str]:
    """Fase P: invoca piv-plan y devuelve (ok, plan_ref)."""
    task_id, title, _priority, criteria = task
    plan_prompt = (
        "Ejecuta la fase P del loop PIVR (skill .opencode/skills/loop-piv) "
        f"para la tarea #{task_id} '{title}'. Criterios de verificación: {criteria}. "
        f"Escribe el plan en .opencode/plans/loop-{task_id}-<slug>.md (plantilla del skill). "
        "Contexto: lee learning/LEARNINGS.md si existe."
    )
    code, out = run(
        oc + ["run", "--agent", "piv-plan", plan_prompt], args.dry_run, timeout=args.timeout
    )
    if code != 0:
        log(f"- Tarea #{task_id} '{title}': **P FAIL**\n- Salida:\n{out[-1500:]}")
        print("[P] plan FAIL")
        return False, ""
    plan_file = find_plan_file(task_id) if not args.dry_run else None
    plan_ref = str(plan_file) if plan_file else "(plan vacío — usa el contexto del agente P)"
    print(f"[P] plan file: {plan_ref}")
    return True, plan_ref


def run_build_phase(
    oc: list[str], task: Task, plan_ref: str, args: argparse.Namespace
) -> tuple[bool, str]:
    """Fase I: invoca piv-build apuntando al plan file; devuelve (ok, salida)."""
    task_id, title, _priority, _criteria = task
    build_prompt = (
        "Ejecuta las fases I+V del loop PIVR (skill .opencode/skills/loop-piv) "
        f"para la tarea #{task_id} '{title}'. LEE EL PLAN DEL ARCHIVO: {plan_ref} "
        "(es el contrato del ciclo: pasos, archivos a tocar, criterios). "
        "Implementa, corre los gates (typecheck -> lint -> test -> build) y "
        "commitea SOLO con gates GREEN."
    )
    if args.no_commit:
        build_prompt += (
            " NO hagas commit: modo verificación sin tocar el repo "
            "(pero sí corre los gates FULL)."
        )
    code, out = run(
        oc + ["run", "--agent", "piv-build", build_prompt], args.dry_run, timeout=args.timeout
    )
    if code != 0:
        log(f"- Tarea #{task_id} '{title}': **I FAIL** (exit {code})\n- Salida:\n{out[-1500:]}")
        print("[I] build FAIL")
        return False, out
    return True, out


def finish_cycle(task: Task, plan_ref: str, started: float, args: argparse.Namespace) -> None:
    """Fase R: registra el veredicto, marca DONE y anota el JSON de presupuesto."""
    task_id, title, _priority, _criteria = task
    duration = time.monotonic() - started
    if not args.dry_run and not args.no_commit:
        commit = latest_commit()
        mark_done(task_id)
        budget = budget_json(
            'pivr', duration, 'fix-proposed', {'items_found': 1, 'actions_taken': 1}
        )
        log(
            f"- Tarea #{task_id} '{title}': P ✅ I ✅ V ✅ GREEN\n"
            f"- Plan file: {plan_ref}\n- Commit: {commit}\n- Gates: FULL\n"
            f"- {budget}"
        )
        print(f"[R] ciclo completo (commit {commit}, {duration:.1f}s)")
    elif not args.dry_run:
        budget = budget_json('pivr', duration, 'no-op', {'items_found': 1, 'actions_taken': 1})
        log(
            f"- Tarea #{task_id} '{title}': no-commit — verificación OK"
            " (sin commit)\n"
            f"- {budget}"
        )
        print("[R] (no-commit) ciclo completo — sin cambios en STATE")
    else:
        print("[R] (dry-run) ciclo completo — sin cambios en STATE/run-log")


def run_singletons(args: argparse.Namespace) -> int | None:
    """Maneja kill switch / triage / gate-only; None si toca correr ciclos."""
    if kill_switch_active():
        print(f"[stop] kill switch '{KILL_SWITCH}' activo — bucle detenido")
        return 0
    if args.triage:
        return run_triage(args.dry_run, args.timeout)
    if args.gate_only:
        ok = gates(dry=args.dry_run, timeout=args.timeout)
        print("[gate-only] FULL:", "GREEN" if ok else "RED")
        return 0 if ok else 1
    return None


def parse_args() -> argparse.Namespace:
    """Argumentos de línea de comandos del driver."""
    ap = argparse.ArgumentParser(description="Driver del loop PIVR de UltraIa")
    ap.add_argument("--cycles", type=int, default=1, help="ciclos máximos (default 1)")
    ap.add_argument("--gate-only", action="store_true", help="solo gates, sin P/I")
    ap.add_argument("--plan-only", action="store_true", help="solo fase P (escribe el plan file)")
    ap.add_argument(
        "--triage", action="store_true", help="ejecuta loop-triage (report-only) y termina"
    )
    ap.add_argument("--no-commit", action="store_true", help="I+V sin commit (verificación)")
    ap.add_argument("--dry-run", action="store_true", help="imprime comandos sin ejecutar")
    ap.add_argument(
        "--timeout", type=int, default=3600, help="timeout por opencode run (default 3600s)"
    )
    ap.add_argument(
        "--full-gate", action="store_true", help="legacy: gates FULL siempre (default)"
    )
    return ap.parse_args()


def main() -> int:
    """Punto de entrada: ejecuta triage, gates o N ciclos PIVR."""
    args = parse_args()
    singleton = run_singletons(args)
    if singleton is not None:
        return singleton

    oc = opencode_exec()
    rc = 0
    for cycle in range(1, max(1, args.cycles) + 1):
        started = time.monotonic()
        task = next_task()
        if task is None:
            print("[backlog] vacío — proyecto completado (o sin tareas PENDIENTE)")
            break
        task_id, title, priority, _ = task
        print(
            f"\n=== Ciclo {cycle} — tarea #{task_id}: {title} "
            f"[{priority}] ==="
        )

        noise = working_tree_noise()
        if noise:
            print(
                f"[warn] working tree con {noise} cambios sin commitear "
                "(ruido externo al loop)"
            )

        ok_plan, plan_ref = run_plan_phase(oc, task, args)
        if not ok_plan:
            rc = 1
            break

        if args.plan_only:
            print(
                "[plan-only] fase P completa. Siguiente: python scripts/loop_piv.py "
                "(o ciclo en-sesión)."
            )
            break

        ok_build, out_i = run_build_phase(oc, task, plan_ref, args)
        if not ok_build:
            rc = 1
            break

        if not gates(dry=args.dry_run, timeout=args.timeout):
            log(
                f"- Tarea #{task_id} '{title}': **V FAIL** (gates RED)\n"
                f"- Salida build:\n{out_i[-1200:]}"
            )
            print("[V] gates RED")
            rc = 1
            break

        finish_cycle(task, plan_ref, started, args)

    if rc == 0:
        print(
            "\n[fin] ciclos ejecutados. Siguiente: python scripts/loop_piv.py "
            "de nuevo (o ciclo en-sesión)."
        )
    return rc


if __name__ == "__main__":
    sys.exit(main())
