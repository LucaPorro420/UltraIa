"""scripts/loop_triage.py - Triage determinista del loop PIVR (paso 0 = state-doctor).

Version determinista y rapida del skill loop-triage: no depende de opencode. Corre
state-integrity-check (13 checks) como paso 0, lee el lock de concurrencia, el
presupuesto 24h, enlaces.txt, la divergencia de push y los deletions en staging, y
emite un reporte accionable + linea "Proxima accion recomendada" + bloque JSON.

Modos:
    python scripts/loop_triage.py                 # dry-run (NO edita nada)
    python scripts/loop_triage.py --write         # aplica: bloque sentinel en STATE.md + loop-run-log.md
    python scripts/loop_triage.py --json          # salida JSON

Exit: 0 si no hay escalaciones; 1 si hay escalaciones (red o warning).
"""

from __future__ import annotations

import argparse
import importlib.util
import json
import re
import subprocess
import sys
import time
from pathlib import Path

SCRIPT = Path(__file__).resolve()
DEFAULT_ROOT = SCRIPT.parent.parent
SCRIPTS_DIR = SCRIPT.parent

# Cargar state_doctor como modulo (mismo directorio) para reutilizar sus 13 checks.
_spec = importlib.util.spec_from_file_location("state_doctor", SCRIPTS_DIR / "state_doctor.py")
state_doctor = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(state_doctor)

SENTINEL_START = "<!-- TRIAGE:AUTO:START -->"
SENTINEL_END = "<!-- TRIAGE:AUTO:END -->"


def _force_utf8() -> None:
    for stream in (sys.stdout, sys.stderr):
        reconf = getattr(stream, "reconfigure", None)
        if callable(reconf):
            reconf(encoding="utf-8", errors="replace")


_force_utf8()


def run_git(root: Path, args: list[str]) -> tuple[int, str]:
    proc = subprocess.run(
        ["git"] + args, cwd=str(root), capture_output=True,
        text=True, encoding="utf-8", errors="replace", timeout=120, check=False,
    )
    return proc.returncode, (proc.stdout or "") + (proc.stderr or "")


def git_recent_commits(root: Path, hours: int = 48) -> int:
    code, out = run_git(root, ["rev-list", "--count", f"--since={hours} hours ago", "HEAD"])
    if code != 0:
        return -1
    try:
        return int(out.strip())
    except ValueError:
        return -1


def git_divergence(root: Path) -> int:
    # origin/master..HEAD; si no hay remote, 0.
    code, out = run_git(root, ["rev-list", "--count", "origin/master..HEAD"])
    if code != 0:
        return 0
    try:
        return int(out.strip())
    except ValueError:
        return 0


def enlaces_age_hours(root: Path) -> float | None:
    p = root / "enlaces.txt"
    if not p.exists():
        return None
    age_s = time.time() - p.stat().st_mtime
    return age_s / 3600.0


def triage_run(root: Path) -> dict:
    integrity = state_doctor.run_all(root)
    lock = integrity.get("lock", {})
    staged = state_doctor.check_staged(root)
    recent = git_recent_commits(root)
    divergence = git_divergence(root)
    enlaces = enlaces_age_hours(root)

    reds = [i for i in integrity["issues"] if i["severity"] == "red"]
    warns = [i for i in integrity["issues"] if i["severity"] == "warn"]

    items_found = {
        "integrity_issues": len(integrity["issues"]),
        "red": len(reds),
        "warn": len(warns),
        "lock_state": lock.get("state"),
        "recent_commits_48h": recent,
        "divergence_push": divergence,
        "staged_deletions": staged["deletions"],
        "enlaces_age_hours": round(enlaces, 1) if enlaces is not None else None,
    }

    escalations = []
    if reds:
        escalations.append(f"{len(reds)} RED integrity issues (ver state_doctor)")
    if lock.get("state") == "stale":
        escalations.append("lock de concurrencia STALE (heartbeat vencido)")
    elif lock.get("state") == "activo":
        escalations.append(f"lock ACTIVO de otra sesion (task {lock.get('task_id')})")
    if divergence > 0:
        escalations.append(f"{divergence} commits sin pushear (origin/master..HEAD)")
    if staged["deletions"] > 0:
        escalations.append(f"{staged['deletions']} .ts/.test.ts borrados en staging")
    if enlaces is not None and enlaces > 168:
        escalations.append(f"enlaces.txt sin tocar hace {enlaces:.0f}h")

    if reds:
        rec = "Resolver los RED issues de state_doctor antes de iniciar ciclos PIVR."
    elif lock.get("state") == "activo":
        rec = "Hay un lock ACTIVO ajeno: ceder el ciclo (SKIP) hasta que libere."
    elif divergence > 0:
        rec = "Revisionar y pushear los commits locales pendientes antes de triage profundo."
    elif staged["deletions"] > 0:
        rec = "Confirmar los deletions en staging antes de cualquier commit."
    else:
        rec = "Sin bloqueos: el siguiente ciclo PIVR puede iniciar."

    return {
        "ts": time.strftime("%Y-%m-%dT%H:%M:%S"),
        "items_found": items_found,
        "escalations": escalations,
        "recommended_action": rec,
    }


def _replace_sentinel(text: str, block: str) -> str:
    if SENTINEL_START in text and SENTINEL_END in text:
        pre = text[: text.index(SENTINEL_START)]
        post = text[text.index(SENTINEL_END) + len(SENTINEL_END):]
        return pre + SENTINEL_START + "\n" + block + "\n" + SENTINEL_END + post
    return text.rstrip() + "\n\n" + SENTINEL_START + "\n" + block + "\n" + SENTINEL_END + "\n"


def apply_write(root: Path, report: dict) -> list[str]:
    written = []
    state = root / "STATE.md"
    block_lines = ["## Triage automatico (auto)", ""]
    block_lines.append(f"**{report['ts']}** ? Proxima accion: {report['recommended_action']}")
    if report["escalations"]:
        block_lines.append("")
        block_lines.append("Escalations:")
        for e in report["escalations"]:
            block_lines.append(f"- {e}")
    block = "\n".join(block_lines)
    if state.exists():
        text = state.read_text(encoding="utf-8", errors="replace")
        new_text = _replace_sentinel(text, block)
        state.write_text(new_text, encoding="utf-8")
        written.append(str(state))
    runlog = root / "loop-run-log.md"
    entry = f"### Triage {report['ts']}\n\n```json\n{json.dumps(report, ensure_ascii=False, indent=2)}\n```\n\n"
    with runlog.open("a", encoding="utf-8") as f:
        f.write(entry)
    written.append(str(runlog))
    return written


def format_report(report: dict) -> str:
    lines = ["Triage PIVR:", f"- Proxima accion recomendada: {report['recommended_action']}"]
    if report["escalations"]:
        lines.append("- Escalations:")
        for e in report["escalations"]:
            lines.append(f"  - {e}")
    lines.append("- Items found:")
    for k, v in report["items_found"].items():
        lines.append(f"  - {k}: {v}")
    return "\n".join(lines)


def main() -> int:
    ap = argparse.ArgumentParser(description="Deterministic loop triage (step 0 = state-doctor)")
    ap.add_argument("--root", default=str(DEFAULT_ROOT), help="repo root")
    ap.add_argument("--write", action="store_true", help="aplica bloque sentinel en STATE.md + loop-run-log.md")
    ap.add_argument("--json", action="store_true", help="salida JSON")
    args = ap.parse_args()
    root = Path(args.root).resolve()
    report = triage_run(root)
    if args.json:
        print(json.dumps(report, ensure_ascii=False, indent=2))
    else:
        print(format_report(report))
    if args.write:
        written = apply_write(root, report)
        print(f"[triage] escrito en: {', '.join(written)}")
    return 1 if report["escalations"] else 0


if __name__ == "__main__":
    sys.exit(main())
