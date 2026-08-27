"""Driver h?brido del loop PIVR (Plan => Implement => Verificar => Reiniciar) de UltraIa.

Ejecuta ciclos de desarrollo continuo invocando opencode en modo headless:

    P: opencode run --agent piv-plan "<tarea>"   (escribe .opencode/plans/loop-<id>-<slug>.md)
    I: opencode run --agent piv-build "<plan>"   (implementa + gates + commit;
                                                 lee el plan DEL ARCHIVO)
    V: gates npm en orden CI (scoped por iteraci?n, FULL en commit)
    R: bit?cora en loop-run-log.md + actualizaci?n de STATE.md + JSON de presupuesto

La "petici?n" de build la emite este driver autom?ticamente al terminar P
(simula la instrucci?n del usuario: auto-conmutaci?n Plan->Build).

Novedades (hardening 2026-08):
    - Toma el lock de concurrencia (.ultraia/loop/session.lock) antes de correr ciclos,
      para que dos `loop_piv.py` no tomen la misma tarea (riesgo de sesiones concurrentes).
    - `--retries N`: reintenta I+V hasta N veces en fallo de ciclo.
    - `--resume`: reanuda desde la tarea pendiente registrada en last-run.json.
    - `--json` + last-run.json: resumen de la ?ltima corrida (ts/task/outcome/pending).
    - `run_doctor`/`run_triage` invocan los scripts Python deterministas
      (scripts/state_doctor.py, scripts/loop_triage.py) en vez de agentes opencode;
      el doctor es advisory (no aborta el ciclo) salvo `--doctor` aislado (as_gate).

Uso:
    python scripts/loop_piv.py [--cycles N] [--gate-only] [--plan-only] [--triage]
                               [--doctor] [--no-commit] [--dry-run] [--timeout S]
                               [--retries N] [--resume] [--json]

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
import socket
import subprocess
import sys
import time
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SCRIPTS = ROOT / "scripts"
STATE = ROOT / "STATE.md"
RUN_LOG = ROOT / "loop-run-log.md"
PLANS_DIR = ROOT / ".opencode" / "plans"
LEARNINGS = ROOT / "learning" / "LEARNINGS.md"
LOCK_PATH = ROOT / ".ultraia" / "loop" / "session.lock"
LAST_RUN_PATH = ROOT / ".ultraia" / "loop" / "last-run.json"

KILL_SWITCH = "loop-pause-all"
KILL_SWITCH_NEGATIONS = ("sin ", "sin`", "sin '", "sin \"", "ausente", "no activo", "without ")
TASK_RE = re.compile(
    r"^\|\s*(\d+)\s*\|\s*([^|]+?)\s*\|\s*([^|]+?)\s*\|\s*([^|]+?)\s*\|"
    r"\s*pendiente(?:\s*—\s*SIGUIENTE)?\s*\|",
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
    """Devuelve el ejecutable npm correcto seg?n la plataforma."""
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
    """True si STATE.md o loop-run-log.md contienen el kill switch ACTIVO.

    FIX 2026-08-19: la busqueda de substring bruta devolvia True con menciones en
    prosa tipo "sin `loop-pause-all`" ? un falso positivo. Cada ocurrencia se
    valida contra negaciones en los ~24 caracteres previos.
    """
    extra_negations = ("mencione", "ocurrencia", "falso positivo", "matches")
    for path in (STATE, RUN_LOG):
        if not path.exists():
            continue
        text = path.read_text(encoding="utf-8", errors="replace")
        for m in re.finditer(re.escape(KILL_SWITCH), text):
            prefix = text[max(0, m.start() - 24):m.start()].lower()
            if any(neg in prefix for neg in KILL_SWITCH_NEGATIONS) or any(
                neg in prefix for neg in extra_negations
            ):
                continue
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


def find_task_by_id(task_id: int) -> Task | None:
    """Busca una tarea por ID en el backlog (para --resume)."""
    if not STATE.exists():
        return None
    for line in STATE.read_text(encoding="utf-8", errors="replace").splitlines():
        m = TASK_RE.match(line)
        if m and int(m.group(1)) == task_id:
            return int(m.group(1)), m.group(2).strip(), m.group(3).strip(), m.group(4).strip()
    return None


def mark_done(task_id: int) -> None:
    """Marca DONE (fecha actual) SOLO la fila de STATE.md cuyo ID == task_id.

    FIX 2026-08-18 (auditoria harness): la version anterior aplicaba el
    reemplazo a CUALQUIER fila que siguiera 'pendiente', sin filtrar por
    task_id. Con dos sesiones concurrentes que dejan mas de una fila
    'pendiente' simultanea, marcaba DONE tareas ajenas.
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
                f"| ? DONE {today} |",
                line,
                flags=re.IGNORECASE,
            )
            matched = True
        out.append(line)
    STATE.write_text("\n".join(out) + "\n", encoding="utf-8")
    status = "marcada DONE" if matched else "NO encontrada (?el ID cambi? en STATE.md?)"
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
    """?ltimo commit del repo en formato corto ('hash mensaje')."""
    code, out = run(["git", "log", "-1", "--oneline"], dry=False)
    return out.strip().splitlines()[0] if code == 0 and out.strip() else "n/a"


def working_tree_noise() -> int:
    """N?mero de l?neas de git status --porcelain (ruido externo al loop)."""
    code, out = run(["git", "status", "--porcelain"], dry=False, timeout=120)
    if code != 0 or not out.strip():
        return 0
    return len([line for line in out.splitlines() if line.strip()])


def find_plan_file(task_id: int) -> Path | None:
    """Plan file m?s reciente de la tarea en .opencode/plans/, o None."""
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


# ---------------------------------------------------------------------------
# Lock de concurrencia (.ultraia/loop/session.lock)
# Contrato (ver .opencode/skills/loop-concurrency-guard): session_id
# "<pid>-<hostname>-<timestamp_inicio>", heartbeat 30 min. Dos drivers no
# deben tomar la misma tarea.
# ---------------------------------------------------------------------------

def build_session_id() -> str:
    try:
        host = socket.gethostname()
    except Exception:
        host = "unknown"
    return f"{os.getpid()}-{host}-{int(time.time())}"


def _lock_state(data: dict) -> str:
    hb = data.get("heartbeat_at") or data.get("started_at")
    if not hb:
        return "stale"
    try:
        age = time.time() - time.mktime(time.strptime(hb, "%Y-%m-%dT%H:%M:%S"))
    except Exception:
        return "stale"
    return "activo" if age <= 1800 else "stale"


def write_lock(session_id: str, task_id: int | None, now_iso: str) -> None:
    data = {
        "session_id": session_id,
        "started_at": now_iso,
        "task_id": task_id,
        "touching": [],
        "heartbeat_at": now_iso,
    }
    LOCK_PATH.parent.mkdir(parents=True, exist_ok=True)
    LOCK_PATH.write_text(json.dumps(data, ensure_ascii=False), encoding="utf-8")


def acquire_lock() -> tuple[str, str]:
    """Toma el lock. Devuelve ('ok', sid) o ('skip', other_sid)."""
    sid = build_session_id()
    now_iso = dt.datetime.now(dt.timezone.utc).strftime("%Y-%m-%dT%H:%M:%S")
    if LOCK_PATH.exists():
        try:
            data = json.loads(LOCK_PATH.read_text(encoding="utf-8"))
        except Exception:
            data = {}
        if _lock_state(data) == "activo" and data.get("session_id") != sid:
            return ("skip", str(data.get("session_id")))
    write_lock(sid, None, now_iso)
    return ("ok", sid)


def release_lock(our_sid: str) -> None:
    if LOCK_PATH.exists():
        try:
            data = json.loads(LOCK_PATH.read_text(encoding="utf-8"))
        except Exception:
            data = {}
        if data.get("session_id") == our_sid:
            try:
                LOCK_PATH.unlink()
            except Exception:
                pass


def heartbeat_lock(our_sid: str, task_id: int | None) -> None:
    if not LOCK_PATH.exists():
        return
    try:
        data = json.loads(LOCK_PATH.read_text(encoding="utf-8"))
    except Exception:
        return
    if data.get("session_id") != our_sid:
        return
    data["heartbeat_at"] = dt.datetime.now(dt.timezone.utc).strftime("%Y-%m-%dT%H:%M:%S")
    if task_id is not None:
        data["task_id"] = task_id
    try:
        LOCK_PATH.write_text(json.dumps(data, ensure_ascii=False), encoding="utf-8")
    except Exception:
        pass


def load_last_run() -> dict | None:
    if not LAST_RUN_PATH.exists():
        return None
    try:
        return json.loads(LAST_RUN_PATH.read_text(encoding="utf-8"))
    except Exception:
        return None


def write_last_run(task_id: int, outcome: str, pending: int | None = None) -> None:
    LAST_RUN_PATH.parent.mkdir(parents=True, exist_ok=True)
    data = {
        "ts": dt.datetime.now(dt.timezone.utc).isoformat(timespec="seconds"),
        "last_task_id": task_id,
        "outcome": outcome,
        "pending_task_id": pending,
    }
    LAST_RUN_PATH.write_text(json.dumps(data, ensure_ascii=False), encoding="utf-8")


def run_doctor(dry: bool, timeout: int, as_gate: bool = False) -> int:
    """Ejecuta scripts/state_doctor.py (13 checks deterministas).

    Por defecto es ADVISORY: reporta issues pero no aborta el ciclo (el repo
    puede tener issues leg?timos). Solo con --doctor aislado (as_gate=True)
    devuelve el exit code real del script para CI.
    """
    cmd = [sys.executable, str(SCRIPTS / "state_doctor.py"), "--root", str(ROOT)]
    if not as_gate:
        cmd.append("--no-strict")
    code, out = run(cmd, dry, timeout=timeout)
    if code != 0:
        log(f"- State-doctor: **issues** (exit {code})\n- Salida:\n{out[-1500:]}")
        print("[doctor] issues encontrados (ver state_doctor)")
    else:
        print("[doctor] OK (sin issues)")
    return code if as_gate else 0


def run_triage(dry: bool, timeout: int) -> int:
    """Ejecuta scripts/loop_triage.py (determinista, report-only)."""
    cmd = [sys.executable, str(SCRIPTS / "loop_triage.py"), "--root", str(ROOT)]
    code, out = run(cmd, dry, timeout=timeout)
    if code != 0:
        log(f"- Triage: **escalations** (exit {code})\n- Salida:\n{out[-1500:]}")
        print("[triage] escalations encontradas")
    else:
        print("[triage] OK (sin escalations)")
    return code


def run_plan_phase(oc: list[str], task: Task, args: argparse.Namespace) -> tuple[bool, str]:
    """Fase P: invoca piv-plan y devuelve (ok, plan_ref)."""
    task_id, title, _priority, criteria = task
    plan_prompt = (
        "Ejecuta la fase P del loop PIVR (skill .opencode/skills/loop-piv) "
        f"para la tarea #{task_id} '{title}'. Criterios de verificaci?n: {criteria}. "
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
    plan_ref = str(plan_file) if plan_file else "(plan vac?o ? usa el contexto del agente P)"
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
            " NO hagas commit: modo verificaci?n sin tocar el repo "
            "(pero s? corre los gates FULL)."
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
            f"- Tarea #{task_id} '{title}': P ? I ? V ? GREEN\n"
            f"- Plan file: {plan_ref}\n- Commit: {commit}\n- Gates: FULL\n"
            f"- {budget}"
        )
        print(f"[R] ciclo completo (commit {commit}, {duration:.1f}s)")
    elif not args.dry_run:
        budget = budget_json('pivr', duration, 'no-op', {'items_found': 1, 'actions_taken': 1})
        log(
            f"- Tarea #{task_id} '{title}': no-commit ? verificaci?n OK"
            " (sin commit)\n"
            f"- {budget}"
        )
        print("[R] (no-commit) ciclo completo ? sin cambios en STATE")
    else:
        print("[R] (dry-run) ciclo completo ? sin cambios en STATE/run-log")


def run_singletons(args: argparse.Namespace) -> int | None:
    """Maneja kill switch / doctor / triage / gate-only; None si toca correr ciclos."""
    if kill_switch_active():
        print(f"[stop] kill switch '{KILL_SWITCH}' activo ? bucle detenido")
        return 0
    doctor_only = args.doctor and not (
        args.triage or args.gate_only or args.plan_only or getattr(args, "gate", False)
    )
    if doctor_only:
        # Modo doctor-only: pre-flight de integridad y termina (gate real).
        return run_doctor(args.dry_run, args.timeout, as_gate=True)
    if args.doctor:
        # Pre-flight advisory ANTES de triage/gate-only/gate/ciclos.
        run_doctor(args.dry_run, args.timeout, as_gate=False)
    if args.triage:
        return run_triage(args.dry_run, args.timeout)
    if getattr(args, "gate", False):
        # Gate runner determinista (loop_gate.py): kill de dev servers + 4 gates.
        return run_gate(args)
    if args.gate_only:
        ok = gates(dry=args.dry_run, timeout=args.timeout)
        print("[gate-only] FULL:", "GREEN" if ok else "RED")
        return 0 if ok else 1
    return None


def run_gate(args: argparse.Namespace) -> int:
    """Fase V: corre el gate runner determinista (loop_gate.py) con kill de dev."""
    sys.path.insert(0, str(SCRIPTS))
    import loop_gate  # noqa: E402  (import diferido: evita coste si no se usa)

    if args.dry_run:
        # Dry-run: solo lista los gates, NO mata dev servers ni ejecuta nada real.
        print("[dry-run] matar dev servers (kill_dev=True) antes de build")
        for _name, cmd in loop_gate.GATES:
            print("[dry-run]", cmd)
        return 0

    report = loop_gate.run_gates(
        kill_dev=True, continue_on_failure=False, timeout=args.timeout
    )
    for r in report["results"]:
        status = "PASS" if r["returncode"] == 0 else "FAIL"
        print(f"[gate] {r['name']}: {status} ({r['duration_s']:.1f}s)")
    print("[gate] FULL:", "GREEN" if report["passed"] else "RED")
    return 0 if report["passed"] else 1


def run_cycles(args: argparse.Namespace, our_sid: str | None) -> int:
    """Ejecuta hasta --cycles ciclos PIVR con lock, retry y resume."""
    oc = opencode_exec()
    rc = 0
    resume_task: int | None = None
    if args.resume:
        lr = load_last_run()
        if lr and lr.get("pending_task_id"):
            resume_task = int(lr["pending_task_id"])
    for cycle in range(1, max(1, args.cycles) + 1):
        if our_sid:
            heartbeat_lock(our_sid, None)
        task = find_task_by_id(resume_task) if resume_task is not None else next_task()
        resume_task = None
        if task is None:
            print("[backlog] vac?o ? proyecto completado (o sin tareas PENDIENTE)")
            break
        task_id, title, priority, _ = task
        if our_sid:
            heartbeat_lock(our_sid, task_id)
        started = time.monotonic()
        print(
            f"\n=== Ciclo {cycle} ? tarea #{task_id}: {title} "
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
            if our_sid:
                write_last_run(task_id, "plan-fail", pending=task_id)
            break
        if args.plan_only:
            print(
                "[plan-only] fase P completa. Siguiente: python scripts/loop_piv.py "
                "(o ciclo en-sesi?n)."
            )
            break
        ok = False
        for attempt in range(1, max(1, args.retries) + 1):
            ok_build, out_i = run_build_phase(oc, task, plan_ref, args)
            if not ok_build:
                print(f"[I] build FAIL (intento {attempt}/{args.retries})")
                continue
            if gates(dry=args.dry_run, timeout=args.timeout):
                ok = True
                break
            print(f"[V] gates RED (intento {attempt}/{args.retries})")
        if not ok:
            rc = 1
            if our_sid:
                write_last_run(task_id, "build-fail", pending=task_id)
            break
        finish_cycle(task, plan_ref, started, args)
        if our_sid:
            write_last_run(task_id, "done")
    if args.json:
        print(json.dumps(load_last_run() or {}, ensure_ascii=False, indent=2))
    return rc


def parse_args() -> argparse.Namespace:
    """Argumentos de l?nea de comandos del driver."""
    ap = argparse.ArgumentParser(description="Driver del loop PIVR de UltraIa")
    ap.add_argument("--cycles", type=int, default=1, help="ciclos m?ximos (default 1)")
    ap.add_argument("--gate-only", action="store_true", help="solo gates, sin P/I")
    ap.add_argument("--plan-only", action="store_true", help="solo fase P (escribe el plan file)")
    ap.add_argument(
        "--triage", action="store_true", help="ejecuta loop_triage.py (report-only) y termina"
    )
    ap.add_argument(
        "--gate", action="store_true",
        help="corre el gate runner determinista (loop_gate.py): mata dev servers "
        "antes de build y ejecuta typecheck->lint->test->build",
    )
    ap.add_argument(
        "--doctor",
        action="store_true",
        help="pre-flight: ejecuta state_doctor.py (13 checks) antes de "
        "triage/gates/ciclos; solo con este flag corre el chequeo y termina",
    )
    ap.add_argument("--no-commit", action="store_true", help="I+V sin commit (verificaci?n)")
    ap.add_argument("--dry-run", action="store_true", help="imprime comandos sin ejecutar")
    ap.add_argument("--timeout", type=int, default=3600, help="timeout por opencode run (default 3600s)")
    ap.add_argument(
        "--full-gate", action="store_true", help="legacy: gates FULL siempre (default)"
    )
    ap.add_argument("--retries", type=int, default=1, help="reintentos de ciclo en fallo (default 1)")
    ap.add_argument("--resume", action="store_true", help="reanuda desde last-run.json pendiente")
    ap.add_argument("--json", action="store_true", help="imprime resumen JSON (last-run) al final")
    return ap.parse_args()


def main() -> int:
    """Punto de entrada: ejecuta triage, gates o N ciclos PIVR."""
    args = parse_args()
    singleton = run_singletons(args)
    if singleton is not None:
        return singleton

    if args.dry_run:
        return run_cycles(args, our_sid=None)

    status, sid = acquire_lock()
    if status == "skip":
        print(
            f"[lock] otra sesi?n del loop PIVR est? activa ({sid}) ? SKIP "
            "para no tomar la misma tarea"
        )
        return 0
    try:
        return run_cycles(args, our_sid=sid)
    finally:
        release_lock(sid)


if __name__ == "__main__":
    sys.exit(main())
