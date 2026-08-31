#!/usr/bin/env python3
"""
session_logger.py — Capturador de sesiones IA para UltraIa.

Registra cada interacción (request/response) en markdown cronológico.
Uso:
    python scripts/session_logger.py start <session_id>     # Inicia sesión
    python scripts/session_logger.py log <session_id> <role> <content>  # Log entry
    python scripts/session_logger.py end <session_id>       # Cierra sesión
    python scripts/session_logger.py summary                 # Resumen de todas las sesiones
    python scripts/session_logger.py build-check             # Verifica build antes de continuar

Cada sesión se guarda en sessions/<date>/<session_id>.md
El índice se mantiene en sessions/INDEX.md
"""

import json
import os
import sys
import subprocess
from datetime import datetime, timezone
from pathlib import Path

# ─── Config ──────────────────────────────────────────────────────────────
PROJECT_ROOT = Path(__file__).resolve().parent.parent
SESSIONS_DIR = PROJECT_ROOT / "sessions"
INDEX_FILE = SESSIONS_DIR / "INDEX.md"


def _now() -> str:
    return datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S UTC")


def _today() -> str:
    return datetime.now(timezone.utc).strftime("%Y-%m-%d")


def _session_dir(session_id: str) -> Path:
    """Directorio de la sesión: sessions/<date>/"""
    d = SESSIONS_DIR / _today()
    d.mkdir(parents=True, exist_ok=True)
    return d


def _session_file(session_id: str) -> Path:
    return _session_dir(session_id) / f"{session_id}.md"


def _append_index(session_id: str, title: str, status: str):
    """Agrega entrada al índice maestro."""
    SESSIONS_DIR.mkdir(parents=True, exist_ok=True)
    entry = f"| {_now()} | `{session_id}` | {title} | {status} |\n"
    if not INDEX_FILE.exists():
        INDEX_FILE.write_text(
            "# Session Index\n\n"
            "| Timestamp | Session ID | Title | Status |\n"
            "|-----------|-----------|-------|--------|\n",
            encoding="utf-8",
        )
    with open(INDEX_FILE, "a", encoding="utf-8") as f:
        f.write(entry)


# ─── Commands ────────────────────────────────────────────────────────────

def cmd_start(session_id: str):
    """Inicia una nueva sesión de captura."""
    f = _session_file(session_id)
    if f.exists():
        print(f"WARN: Session {session_id} already exists, appending.")
        mode = "a"
    else:
        mode = "w"

    header = f"""# Session: {session_id}

**Started:** {_now()}
**Project:** UltraIa
**Working Directory:** {PROJECT_ROOT}

---

## Interactions

"""
    with open(f, mode, encoding="utf-8") as fh:
        if mode == "w":
            fh.write(header)

    _append_index(session_id, session_id, "ACTIVE")
    print(f"OK: Session {session_id} started -> {f}")


def cmd_log(session_id: str, role: str, content: str):
    """Agrega un entry (user/assistant/system/tool) a la sesión."""
    f = _session_file(session_id)
    if not f.exists():
        cmd_start(session_id)

    timestamp = _now()
    role_lower = role.lower()

    entry = f"\n### [{timestamp}] `{role_lower}`\n\n{content}\n\n---\n"

    with open(f, "a", encoding="utf-8") as fh:
        fh.write(entry)

    print(f"OK: Logged {role_lower} entry to {session_id}")


def cmd_end(session_id: str, summary: str = ""):
    """Cierra la sesión con un resumen opcional."""
    f = _session_file(session_id)
    if not f.exists():
        print(f"ERROR: Session {session_id} not found")
        return

    footer = f"\n\n## Session End\n\n**Closed:** {_now()}\n"
    if summary:
        footer += f"**Summary:** {summary}\n"

    with open(f, "a", encoding="utf-8") as fh:
        fh.write(footer)

    # Update index
    if INDEX_FILE.exists():
        content = INDEX_FILE.read_text(encoding="utf-8")
        content = content.replace(
            f"| `{session_id}` | ", f"| `{session_id}` | "
        )
        # Replace ACTIVE with CLOSED on the matching line
        lines = content.split("\n")
        for i, line in enumerate(lines):
            if f"`{session_id}`" in line and "ACTIVE" in line:
                lines[i] = line.replace("ACTIVE", "CLOSED")
        INDEX_FILE.write_text("\n".join(lines), encoding="utf-8")

    print(f"OK: Session {session_id} closed")


def cmd_summary():
    """Muestra resumen de todas las sesiones."""
    if not INDEX_FILE.exists():
        print("No sessions found.")
        return

    print(INDEX_FILE.read_text(encoding="utf-8"))

    # Count files
    count = 0
    for d in SESSIONS_DIR.iterdir():
        if d.is_dir():
            count += len(list(d.glob("*.md")))
    print(f"\nTotal session files: {count}")


def cmd_build_check() -> bool:
    """
    Verifica que el build del proyecto está verde.
    Retorna True si pasa, False si falla.
    Este check DEBE correrse al inicio de cada sesión.
    """
    print("BUILD CHECK: Running typecheck + tests...")

    checks = [
        ("typecheck core", "npm run typecheck -w @ultraia/core"),
        ("typecheck runtime", "npm run typecheck -w @ultraia/runtime"),
    ]

    # Only run tests if --with-tests flag is passed (they take longer)
    if "--with-tests" in sys.argv:
        checks.extend([
            ("test core", "npm run test -w @ultraia/core"),
            ("test runtime", "npm run test -w @ultraia/runtime"),
        ])

    results = []
    all_pass = True

    for name, cmd in checks:
        try:
            r = subprocess.run(
                cmd,
                cwd=str(PROJECT_ROOT),
                capture_output=True,
                text=True,
                timeout=180,
                shell=True,
            )
            ok = r.returncode == 0
            results.append((name, ok, r.returncode))
            if not ok:
                all_pass = False
                print(f"  FAIL: {name} (exit {r.returncode})")
                if r.stderr:
                    # Show last 5 lines of error
                    err_lines = r.stderr.strip().split("\n")[-5:]
                    for line in err_lines:
                        print(f"    {line}")
            else:
                print(f"  PASS: {name}")
        except subprocess.TimeoutExpired:
            results.append((name, False, -1))
            all_pass = False
            print(f"  TIMEOUT: {name}")
        except Exception as e:
            results.append((name, False, -2))
            all_pass = False
            print(f"  ERROR: {name}: {e}")

    # Save build check result
    check_file = SESSIONS_DIR / "last_build_check.json"
    check_file.parent.mkdir(parents=True, exist_ok=True)
    with open(check_file, "w", encoding="utf-8") as f:
        json.dump(
            {
                "timestamp": _now(),
                "passed": all_pass,
                "results": [{"name": n, "passed": p, "code": c} for n, p, c in results],
            },
            f,
            indent=2,
        )

    if all_pass:
        print("\nBUILD CHECK: ALL PASS")
    else:
        print("\nBUILD CHECK: FAILED — fix before proceeding")

    return all_pass


def cmd_last_check():
    """Muestra el último build check."""
    check_file = SESSIONS_DIR / "last_build_check.json"
    if not check_file.exists():
        print("No build check found. Run: python scripts/session_logger.py build-check")
        return

    data = json.loads(check_file.read_text(encoding="utf-8"))
    print(f"Last build check: {data['timestamp']}")
    print(f"Result: {'PASS' if data['passed'] else 'FAIL'}")
    for r in data["results"]:
        status = "PASS" if r["passed"] else "FAIL"
        print(f"  {status}: {r['name']}")


# ─── Main ────────────────────────────────────────────────────────────────

def main():
    if len(sys.argv) < 2:
        print(__doc__)
        return

    cmd = sys.argv[1]

    if cmd == "start" and len(sys.argv) >= 3:
        cmd_start(sys.argv[2])
    elif cmd == "log" and len(sys.argv) >= 5:
        cmd_log(sys.argv[2], sys.argv[3], " ".join(sys.argv[4:]))
    elif cmd == "end" and len(sys.argv) >= 3:
        summary = " ".join(sys.argv[3:]) if len(sys.argv) > 3 else ""
        cmd_end(sys.argv[2], summary)
    elif cmd == "summary":
        cmd_summary()
    elif cmd == "build-check":
        ok = cmd_build_check()
        sys.exit(0 if ok else 1)
    elif cmd == "last-check":
        cmd_last_check()
    else:
        print(__doc__)


if __name__ == "__main__":
    main()
