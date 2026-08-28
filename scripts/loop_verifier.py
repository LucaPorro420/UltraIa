"""Verificador determinista del loop PIVR (fase V / loop-verifier).

Lee un plan file (.opencode/plans/loop-<id>-<slug>.md) y verifica de forma determinista:

  1. Secciones obligatorias presentes (Contexto, Objetivo, Pasos, ARCHIVOS A TOCAR, Criterios).
  2. Los archivos listados en ARCHIVOS A TOCAR existen en el repo (o figuran en el diff
     si se pasa --check-diff).
  3. (Opcional, --check-diff) el diff toca al menos un archivo planificado.

No edita archivos. Devuelve APPROVE/REJECT con razones y codigo de salida 0/1.
Disenado para ser reutilizable en CI y por el driver (loop_piv.py --verify).

Uso:
    python scripts/loop_verifier.py <plan_file.md> [--root .] [--check-diff] [--json]

Exit: 0 APPROVE, 1 REJECT.

Standalone, stdlib puro (sin deps).
"""

from __future__ import annotations

import argparse
import json
import os
import re
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent

REQUIRED_SECTIONS = ("contexto", "objetivo", "pasos", "archivos a tocar", "criterios")

# Captura rutas tipo `path/to/file.ext` (backticks opcionales) dentro de la seccion.
FILE_RE = re.compile(r"`?([\w./\\-]+\.[A-Za-z0-9]+)`?")


def _section_headings(text: str) -> list[str]:
    """Devuelve los encabezados '## ...' en minusculas (sin # y espacios)."""
    out: list[str] = []
    for line in text.splitlines():
        m = re.match(r"^#{1,6}\s+(.*?)\s*$", line)
        if m:
            out.append(m.group(1).strip().lower())
    return out


def parse_touched_files(plan_text: str) -> list[str]:
    """Extrae rutas de archivo de la seccion ARCHIVOS A TOCAR del plan."""
    lines = plan_text.splitlines()
    in_section = False
    files: list[str] = []
    for line in lines:
        head = re.match(r"^#{1,6}\s+(.*?)\s*$", line)
        if head:
            title = head.group(1).strip().lower()
            in_section = title == "archivos a tocar"
            continue
        if in_section:
            # La seccion termina en el proximo encabezado (manejado arriba).
            for m in FILE_RE.finditer(line):
                files.append(m.group(1))
    # Dedupe preservando orden.
    seen: set[str] = set()
    result: list[str] = []
    for f in files:
        if f not in seen:
            seen.add(f)
            result.append(f)
    return result


def run_git_diff(root: Path) -> list[str]:
    """Lista de archivos modificados en el working tree vs HEAD (nombre solo)."""
    proc = subprocess.run(
        ["git", "diff", "--name-only", "HEAD"],
        cwd=root,
        capture_output=True,
        text=True,
        encoding="utf-8",
        errors="replace",
        timeout=120,
        check=False,
    )
    if proc.returncode != 0:
        return []
    return [ln.strip() for ln in proc.stdout.splitlines() if ln.strip()]


def verify(
    plan_path: Path,
    root: Path = ROOT,
    *,
    check_diff: bool = False,
    git_diff=None,
) -> dict:
    """Verifica un plan file.

    Returns:
        {"approved": bool, "reasons": [str], "missing_sections": [...],
         "missing_files": [...], "planned": [...], "diff_files": [...]}
    """
    reasons: list[str] = []
    planned: list[str] = []

    if not plan_path.exists():
        return {
            "approved": False,
            "reasons": [f"plan file inexistente: {plan_path}"],
            "missing_sections": [],
            "missing_files": [],
            "planned": [],
            "diff_files": [],
        }

    text = plan_path.read_text(encoding="utf-8", errors="replace")
    headings = _section_headings(text)

    missing_sections = [s for s in REQUIRED_SECTIONS if s not in headings]
    if missing_sections:
        reasons.append("secciones obligatorias faltantes: " + ", ".join(missing_sections))

    planned = parse_touched_files(text)
    missing_files: list[str] = []
    for f in planned:
        if not (root / f).exists():
            missing_files.append(f)
    if missing_files:
        reasons.append("archivos planificados inexistentes: " + ", ".join(missing_files))

    diff_files: list[str] = []
    if check_diff:
        diff_files = (git_diff or run_git_diff)(root)
        if planned and not any(p in diff_files for p in planned):
            reasons.append(
                "el diff no toca ningun archivo planificado (revisa staged/working tree)"
            )

    approved = not missing_sections and not missing_files and not (
        check_diff and planned and not any(p in diff_files for p in planned)
    )
    if approved:
        reasons.append("plan OK: secciones completas y archivos existen")
    return {
        "approved": approved,
        "reasons": reasons,
        "missing_sections": missing_sections,
        "missing_files": missing_files,
        "planned": planned,
        "diff_files": diff_files,
    }


def main(argv: list[str] | None = None) -> int:
    ap = argparse.ArgumentParser(description="Verificador determinista del loop PIVR")
    ap.add_argument("plan", help="ruta al plan file (.md)")
    ap.add_argument("--root", type=str, default=str(ROOT), help="raiz del repo")
    ap.add_argument(
        "--check-diff",
        action="store_true",
        help="exige que el diff toque al menos un archivo planificado",
    )
    ap.add_argument("--json", action="store_true", help="imprime el reporte JSON")
    args = ap.parse_args(argv)

    plan_path = Path(args.plan)
    if not plan_path.is_absolute():
        plan_path = Path(args.root) / plan_path
    report = verify(plan_path, Path(args.root), check_diff=args.check_diff)
    if args.json:
        print(json.dumps(report, ensure_ascii=False, indent=2))
    else:
        verdict = "APPROVE" if report["approved"] else "REJECT"
        print(f"[verify] {verdict}: {plan_path}")
        for r in report["reasons"]:
            print(f"  - {r}")
    return 0 if report["approved"] else 1


if __name__ == "__main__":
    sys.exit(main())
