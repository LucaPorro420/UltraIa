"""Driver híbrido del loop PIVR (Plan => Implement => Verificar => Reiniciar) de UltraIa.

Ejecuta ciclos de desarrollo continuo invocando opencode en modo headless:

    P: opencode run --agent piv-plan "<tarea>"   (escribe el plan en loop-run-log.md)
    I: opencode run --agent piv-build "<plan>"   (implementa + gates + commit)
    V: gates npm en orden CI (scoped por iteración, FULL en commit)
    R: bitácora en loop-run-log.md + actualización de STATE.md

La "petición" de build la emite este driver automáticamente al terminar P
(simula la instrucción del usuario: auto-conmutación Plan->Build).

Uso:
    python scripts/loop_piv.py [--cycles N] [--gate-only] [--dry-run] [--full-gate]

Flags:
    --cycles N     ciclos máximos a ejecutar (default 1)
    --gate-only    solo verificación (P/I saltados); exit 1 si algún gate falla
    --dry-run      imprime los comandos sin ejecutarlos
    --full-gate    gates FULL incluso sin commit (default: FULL en cada commit)

Kill switch: si STATE.md o loop-run-log.md contienen "loop-pause-all", no hace nada.
Nunca hace push ni merge (gates humanos). Exit codes: 0 ok, 1 fallo.
"""

from __future__ import annotations

import argparse
import datetime as dt
import os
import re
import shutil
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
STATE = ROOT / "STATE.md"
RUN_LOG = ROOT / "loop-run-log.md"
LEARNINGS = ROOT / "learning" / "LEARNINGS.md"

KILL_SWITCH = "loop-pause-all"
TASK_RE = re.compile(r"^\|\s*(\d+)\s*\|\s*([^|]+?)\s*\|\s*([^|]+?)\s*\|\s*([^|]+?)\s*\|\s*pendiente\s*\|", re.IGNORECASE)
DONE_RE = re.compile(r"^\|\s*(\d+)\s*\|")


def npm_cmd() -> str:
    return "npm.cmd" if os.name == "nt" else "npm"


def opencode_exec() -> list[str]:
    for cand in ("opencode.cmd", "opencode", "opencode.exe"):
        path = shutil.which(cand)
        if path:
            return [path]
    fallback = Path(os.environ.get("APPDATA", "")) / "npm" / ("opencode.cmd" if os.name == "nt" else "opencode")
    if fallback.exists():
        return [str(fallback)]
    return ["npx", "opencode"]


def run(argv: list[str], dry: bool, timeout: int = 3600) -> tuple[int, str]:
    if dry:
        print("[dry-run]", " ".join(argv))
        return 0, ""
    proc = subprocess.run(argv, cwd=ROOT, capture_output=True, text=True, encoding="utf-8", errors="replace", timeout=timeout)
    out = (proc.stdout or "") + "\n" + (proc.stderr or "")
    return proc.returncode, out


def gates(full: bool, dry: bool) -> bool:
    steps = ["typecheck", "test"]
    if full:
        steps += ["lint", "build"]
    ok = True
    for step in steps:
        code, out = run([npm_cmd(), "run", step], dry)
        if code != 0:
            ok = False
            print(f"[gate] {step}: FAIL")
            print(out[-4000:] if out else "")
        else:
            print(f"[gate] {step}: PASS")
    return ok


def kill_switch_active() -> bool:
    for path in (STATE, RUN_LOG):
        if path.exists() and KILL_SWITCH in path.read_text(encoding="utf-8", errors="replace"):
            return True
    return False


def next_task() -> tuple[int, str, str, str] | None:
    if not STATE.exists():
        return None
    for line in STATE.read_text(encoding="utf-8", errors="replace").splitlines():
        m = TASK_RE.match(line)
        if m:
            return int(m.group(1)), m.group(2).strip(), m.group(3).strip(), m.group(4).strip()
    return None


def mark_done(task_id: int) -> None:
    if not STATE.exists():
        return
    today = dt.date.today().isoformat()
    lines = STATE.read_text(encoding="utf-8", errors="replace").splitlines()
    out = []
    for line in lines:
        if TASK_RE.match(line):
            line = re.sub(r"\|\s*pendiente\s*\|", f"| ✅ DONE {today} |", line, flags=re.IGNORECASE)
        out.append(line)
    STATE.write_text("\n".join(out) + "\n", encoding="utf-8")
    print(f"[state] tarea #{task_id} marcada DONE {today}")


def log(entry: str) -> None:
    stamp = dt.datetime.now().strftime("%Y-%m-%d %H:%M")
    RUN_LOG.parent.mkdir(parents=True, exist_ok=True)
    with RUN_LOG.open("a", encoding="utf-8") as fh:
        fh.write(f"\n## {stamp}\n{entry}\n")
    print("[log] loop-run-log.md actualizado")


def latest_commit() -> str:
    code, out = run(["git", "log", "-1", "--oneline"], dry=False)
    return out.strip().splitlines()[0] if code == 0 and out.strip() else "n/a"


def main() -> int:
    ap = argparse.ArgumentParser(description="Driver del loop PIVR de UltraIa")
    ap.add_argument("--cycles", type=int, default=1, help="ciclos máximos (default 1)")
    ap.add_argument("--gate-only", action="store_true", help="solo gates, sin P/I")
    ap.add_argument("--dry-run", action="store_true", help="imprime comandos sin ejecutar")
    ap.add_argument("--full-gate", action="store_true", help="gates FULL siempre")
    args = ap.parse_args()

    if kill_switch_active():
        print(f"[stop] kill switch '{KILL_SWITCH}' activo — bucle detenido")
        return 0

    if args.gate_only:
        ok = gates(full=True, dry=args.dry_run)
        print("[gate-only] FULL:", "GREEN" if ok else "RED")
        return 0 if ok else 1

    oc = opencode_exec()
    for cycle in range(1, max(1, args.cycles) + 1):
        task = next_task()
        if task is None:
            print("[backlog] vacío — proyecto completado (o sin tareas PENDIENTE)")
            return 0
        task_id, title, priority, criteria = task
        print(f"\n=== Ciclo {cycle} — tarea #{task_id}: {title} [{priority}] ===")

        plan_prompt = (
            f"Ejecuta la fase P del loop PIVR (skill .opencode/skills/loop-piv) para la tarea "
            f"#{task_id} '{title}'. Criterios de verificación: {criteria}. "
            f"Contexto: lee learning/LEARNINGS.md si existe."
        )
        code_p, out_p = run(oc + ["run", "--agent", "piv-plan", plan_prompt], args.dry_run)
        if code_p != 0:
            log(f"- Ciclo {cycle} tarea #{task_id} '{title}': **P FAIL**\n- Salida:\n{out_p[-1500:]}")
            print("[P] plan FAIL")
            return 1
        plan_tail = out_p.strip()[-2000:] if out_p.strip() else "(plan vacío)"

        build_prompt = (
            f"Ejecuta las fases I+V del loop PIVR (skill .opencode/skills/loop-piv) para la tarea "
            f"#{task_id} '{title}': implementa el plan recién escrito en loop-run-log.md, corre los "
            f"gates (typecheck -> lint -> test -> build) y commitea. Plan del agente P:\n{plan_tail}"
        )
        code_i, out_i = run(oc + ["run", "--agent", "piv-build", build_prompt], args.dry_run)
        if code_i != 0:
            log(f"- Ciclo {cycle} tarea #{task_id} '{title}': **I FAIL** (exit {code_i})\n- Salida:\n{out_i[-1500:]}")
            print("[I] build FAIL")
            return 1

        full = args.full_gate or True
        ok = gates(full=full, dry=args.dry_run)
        if not ok:
            log(f"- Ciclo {cycle} tarea #{task_id} '{title}': **V FAIL** (gates RED)\n- Salida build:\n{out_i[-1200:]}")
            print("[V] gates RED")
            return 1

        if not args.dry_run:
            commit = latest_commit()
            mark_done(task_id)
            log(
                f"- Ciclo {cycle} tarea #{task_id} '{title}': P ✅ I ✅ V ✅ GREEN\n"
                f"- Commit: {commit}\n- Gates: FULL"
            )
            print(f"[R] ciclo {cycle} completo (commit {commit})")
        else:
            print(f"[R] (dry-run) ciclo {cycle} completo — sin cambios en STATE/run-log")

    print("\n[fin] ciclos ejecutados. Siguiente: python scripts/loop_piv.py de nuevo (o ciclo en-sesión).")
    return 0


if __name__ == "__main__":
    sys.exit(main())