#!/usr/bin/env python3
"""sync_skill_mirrors.py - Mantiene los espejos skills/ sincronizados con la fuente canonica .opencode/skills/.

El check-9 del state_doctor requiere que los ESPEJOS de skills
(.opencode/skills/<n>/SKILL.md vs skills/<n>/SKILL.md, cuando existen en AMBOS
lados) esten en sync SHA-1. Este script copia la fuente -> espejo cuando diffieren.

Definicion de "espejo": un skill cuyo directorio skills/<n>/ YA existe (tiene un
SKILL.md en ambos lados). Los skills que solo existen en .opencode/skills/ (sin
contraparte en skills/) son "source-only" y se OMITEN (no se crean espejos nuevos).

Modos:
  --check   Solo reporta; devuelve 1 si hay espejos fuera de sync (para CI).
  (default) Aplica la copia de los espejos faltantes/drift y devuelve 0.

Uso: py -3.12 scripts/sync_skill_mirrors.py [--root <dir>] [--check]
"""

from __future__ import annotations

import argparse
import hashlib
import sys
from pathlib import Path


def sha1(path: Path) -> str:
    return hashlib.sha1(path.read_bytes()).hexdigest()


def plan_sync(root: Path) -> list[dict]:
    src_dir = root / ".opencode" / "skills"
    mirror_dir = root / "skills"
    items: list[dict] = []
    if not src_dir.is_dir():
        return items
    for d in sorted(src_dir.iterdir()):
        src = d / "SKILL.md"
        if not (d.is_dir() and src.is_file()):
            continue
        name = d.name
        dst = mirror_dir / name / "SKILL.md"
        if not dst.parent.exists():
            # No es un espejo: solo existe en .opencode/skills/. Se omite.
            items.append({"name": name, "src": src, "dst": dst, "status": "source-only"})
            continue
        if not dst.exists():
            status = "missing"
        elif sha1(src) == sha1(dst):
            status = "synced"
        else:
            status = "drift"
        items.append({"name": name, "src": src, "dst": dst, "status": status})
    return items


def apply_sync(items: list[dict]) -> list[str]:
    synced: list[str] = []
    for it in items:
        if it["status"] in ("missing", "drift"):
            it["dst"].parent.mkdir(parents=True, exist_ok=True)
            it["dst"].write_bytes(it["src"].read_bytes())
            synced.append(it["name"])
    return synced


def main(argv: list[str] | None = None) -> int:
    p = argparse.ArgumentParser(description="Sync skill mirrors (.opencode/skills -> skills).")
    p.add_argument("--root", default=str(Path.cwd()), help="Root del repo (default: cwd)")
    p.add_argument("--check", action="store_true", help="Solo reporta; no escribe")
    args = p.parse_args(argv)

    root = Path(args.root)
    items = plan_sync(root)
    drift = [i for i in items if i["status"] in ("missing", "drift")]

    print(f"skill mirrors: {len(items)} evaluado(s), {len(drift)} fuera de sync")
    for i in items:
        print(f"  - {i['name']}: {i['status']}")

    if args.check:
        return 1 if drift else 0

    if drift:
        synced = apply_sync(items)
        print(f"sync aplicado: {len(synced)} espejo(s) actualizado(s): {', '.join(synced)}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
