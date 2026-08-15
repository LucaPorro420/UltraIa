"""Generador de disenos nanoprompts: JSON -> imagen + archivo .py regenerable.

Transforma los prompts con imagen de nanoprompts.org (guardados offline como
JSON) en un archivo de programacion que replica el diseno programaticamente
(patron del TODO de integracionTecno.txt: texto+img -> json -> .py/.ts).

Genera por cada prompt:
    learning/nanoprompts/generated/<slug>.png   (imagen replicada via pollinations)
    learning/nanoprompts/generated/<slug>.py    (script que regenera el diseno)

Uso:
    python scripts/nanoprompts_generate.py --ids pop-style-sweets-monsters,holographic-profile-interface
    python scripts/nanoprompts_generate.py --all

Dependencias: stdlib (urllib). Sin claves (pollinations keyless).
"""
from __future__ import annotations

import argparse
import json
import os
import sys
import urllib.parse
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
NANO_DIR = ROOT / "learning" / "nanoprompts"
PROMPTS_DIR = NANO_DIR / "prompts"
GEN_DIR = NANO_DIR / "generated"

POLLINATIONS = "https://image.pollinations.ai/prompt/{prompt}?width={w}&height={h}&model=flux&nologo=true"
WIDTH, HEIGHT = 1024, 1024


def fetch_image(prompt: str, dest: Path, timeout: int = 120) -> bool:
    if dest.exists() and dest.stat().st_size > 0:
        print(f"  [cache] {dest.name}")
        return True
    url = POLLINATIONS.format(
        prompt=urllib.parse.quote(prompt), w=WIDTH, h=HEIGHT
    )
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0 (UltraIa nanoprompts-generate/0.1)"})
    try:
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            data = resp.read()
            ctype = resp.headers.get("Content-Type", "")
        if len(data) < 1000:
            print(f"  [warn] respuesta sospechosamente corta ({len(data)} B): {dest.name}")
        if dest.suffix.lower() == ".png" and "jpeg" in ctype:
            dest = dest.with_suffix(".jpg")
        dest.write_bytes(data)
        return True
    except Exception as exc:  # noqa: BLE001 - degradar sin romper el lote
        print(f"  [fail] {dest.name}: {exc}")
        return False


def write_replicator(prompt: dict, png_path: Path, py_path: Path) -> None:
    code = f'''"""Replica programatica del diseno nanoprompts: {prompt["title"]}.

Fuente: {prompt["url"]}  (copia offline: learning/nanoprompts/prompts/{prompt["id"]}.json)
Categoria: {prompt["category"]} | Dificultad: {prompt["difficulty"]}

Replica: envia el prompt original a un generador de imagenes keyless
(pollinations) y guarda el PNG resultante. Requiere solo stdlib.
"""
from __future__ import annotations

import urllib.parse
import urllib.request
from pathlib import Path

PROMPT = {json.dumps(prompt["prompt"], ensure_ascii=False, indent=2)}
OUT = Path(__file__).with_suffix(".jpg")

URL = "https://image.pollinations.ai/prompt/{{prompt}}?width=1024&height=1024&model=flux&nologo=true".format(
    prompt=urllib.parse.quote(PROMPT)
)

req = urllib.request.Request(URL, headers={{"User-Agent": "UltraIa nanoprompts-replicator"}})
with urllib.request.urlopen(req, timeout=120) as resp:
    data = resp.read()
    ctype = resp.headers.get("Content-Type", "")
    if "jpeg" in ctype:
        OUT = OUT.with_suffix(".jpg")
    else:
        OUT = OUT.with_suffix(".png")
OUT.write_bytes(data)
print(f"Diseno replicado en {{OUT}}")
'''
    py_path.write_text(code, encoding="utf-8")


def main() -> int:
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    parser = argparse.ArgumentParser(description="Generador de disenos nanoprompts -> PNG + .py")
    group = parser.add_mutually_exclusive_group(required=True)
    group.add_argument("--ids", help="slugs separados por coma")
    group.add_argument("--all", action="store_true", help="todos los prompts en prompts/")
    args = parser.parse_args()

    GEN_DIR.mkdir(parents=True, exist_ok=True)

    if args.all:
        files = sorted(PROMPTS_DIR.glob("*.json"))
    else:
        ids = [i.strip() for i in args.ids.split(",") if i.strip()]
        files = [PROMPTS_DIR / f"{i}.json" for i in ids]

    ok = 0
    for f in files:
        if not f.exists():
            print(f"[skip] no existe: {f.name}")
            continue
        prompt = json.loads(f.read_text(encoding="utf-8"))
        print(f"[..] {prompt['id']}: {prompt['title'][:50]}")
        png_path = GEN_DIR / f"{prompt['id']}.png"
        if fetch_image(prompt["prompt"], png_path):
            write_replicator(prompt, png_path, GEN_DIR / f"{prompt['id']}.py")
            ok += 1
            out_file = png_path if png_path.exists() else GEN_DIR / f"{prompt['id']}.jpg"
            print(f"  [ok] {out_file.name} + {prompt['id']}.py")

    print(f"\n[done] {ok}/{len(files)} disenos generados en {GEN_DIR}")
    return 0 if ok else 1


if __name__ == "__main__":
    sys.exit(main())