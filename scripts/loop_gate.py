"""Gate runner determinista del loop PIVR (fase V de verificacion).

Corre los 4 gates npm en orden CI (typecheck -> lint -> test -> build) y, si se
solicita, mata los dev servers antes del build (requisito de AGENTS.md: el build
de Next se corrompe si un `next dev` compila en caliente al mismo tiempo).

Diseno puro y testeable:
  * El subprocess se inyecta via el parametro `run` de `run_gates()` (default
    `run_gate_cmd`), para que los tests mockeen sin ejecutar nada real.
  * `kill_dev_servers()` es mejor-esfuerzo y fail-soft (no aborta el gate).
  * Sin efectos secundarios fuera de lo solicitado (no commitea, no toca STATE).

Uso:
    python scripts/loop_gate.py [--root .] [--kill] [--continue-on-failure]
                                [--json] [--timeout S]

Exit: 0 todos PASS, 1 alguno FAIL.

Standalone, stdlib puro (sin deps).
"""

from __future__ import annotations

import argparse
import json
import os
import subprocess
import sys
import time
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent

# Orden canónico de CI (ver AGENTS.md "Health Stack").
GATES = (
    ("typecheck", "npm run typecheck"),
    ("lint", "npm run lint"),
    ("test", "npm run test"),
    ("build", "npm run build"),
)


def npm_cmd() -> str:
    """Ejecutable npm segun plataforma."""
    return "npm.cmd" if os.name == "nt" else "npm"


def kill_dev_servers() -> None:
    """Mejor-esfuerzo: mata procesos de `next dev` antes del build.

    win32: taskkill de next-server.exe (el proceso real del dev server).
    posix: pkill -f 'next dev'.
    Cualquier error se ignora (fail-soft): el gate continua igualmente.
    """
    if os.name == "nt":
        for img in ("next-server.exe",):
            try:
                subprocess.run(
                    ["taskkill", "/F", "/IM", img],
                    capture_output=True,
                    text=True,
                    timeout=30,
                    check=False,
                )
            except Exception:
                pass
    else:
        try:
            subprocess.run(
                ["pkill", "-f", "next dev"],
                capture_output=True,
                text=True,
                timeout=30,
                check=False,
            )
        except Exception:
            pass


def run_gate_cmd(argv: list[str], timeout: int) -> tuple[int, str]:
    """Ejecuta un gate y devuelve (exit_code, salida combinada)."""
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


def run_gates(
    root: Path | None = None,
    *,
    kill_dev: bool = False,
    continue_on_failure: bool = False,
    timeout: int = 3600,
    run=run_gate_cmd,
) -> dict:
    """Corre los gates en orden CI.

    Args:
        root: raiz del repo (no usado directamente; `run` controla el cwd).
        kill_dev: si True, mata dev servers antes del primer gate.
        continue_on_failure: si True, corre los 4 gates aunque uno falle.
        timeout: timeout por gate (segundos).
        run: callable inyectable (argv, timeout) -> (code, out) para tests.

    Returns:
        {"passed": bool, "killed": bool, "results": [ {name, cmd, returncode,
         duration_s, tail} ]}
    """
    if kill_dev:
        kill_dev_servers()

    results: list[dict] = []
    for name, cmd in GATES:
        argv = [npm_cmd(), "run", name]
        t0 = time.monotonic()
        code, out = run(argv, timeout)
        dur = time.monotonic() - t0
        results.append(
            {
                "name": name,
                "cmd": cmd,
                "returncode": code,
                "duration_s": round(dur, 2),
                "tail": (out or "")[-2000:],
            }
        )
        if code != 0 and not continue_on_failure:
            break

    passed = all(r["returncode"] == 0 for r in results)
    return {"passed": passed, "killed": kill_dev, "results": results}


def main(argv: list[str] | None = None) -> int:
    ap = argparse.ArgumentParser(description="Gate runner determinista del loop PIVR")
    ap.add_argument("--root", type=str, default=str(ROOT), help="raiz del repo")
    ap.add_argument(
        "--kill",
        action="store_true",
        help="mata dev servers (next dev) antes del build",
    )
    ap.add_argument(
        "--continue-on-failure",
        action="store_true",
        help="corre los 4 gates aunque uno falle",
    )
    ap.add_argument("--json", action="store_true", help="imprime el reporte JSON")
    ap.add_argument(
        "--timeout", type=int, default=3600, help="timeout por gate (s, default 3600)"
    )
    args = ap.parse_args(argv)

    report = run_gates(
        kill_dev=args.kill,
        continue_on_failure=args.continue_on_failure,
        timeout=args.timeout,
    )
    if args.json:
        print(json.dumps(report, ensure_ascii=False, indent=2))
    else:
        for r in report["results"]:
            status = "PASS" if r["returncode"] == 0 else "FAIL"
            print(f"[gate] {r['name']}: {status} ({r['duration_s']:.1f}s)")
        print("[gate] FULL:", "GREEN" if report["passed"] else "RED")
    return 0 if report["passed"] else 1


if __name__ == "__main__":
    sys.exit(main())
