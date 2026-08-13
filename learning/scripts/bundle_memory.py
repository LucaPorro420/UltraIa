"""Generador de bundle de memoria de aprendizaje comprimido.

Empaqueta toda la informacion (truth + veredictos + lecciones + respuestas)
en un unico archivo .zip de memoria reutilizable, para:
  - ahorrar espacio en disco
  - persistir el conocimiento de aprendizaje (propio + extraido)
  - permitir recargarlo en futuras sesiones via restore_memory.py

Uso:
  python bundle_memory.py build      # crea learning/memory/ultraia_memory.zip
  python bundle_memory.py info       # muestra contenido y tamano del zip
"""
import json, zipfile, datetime, sys, hashlib
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
MEM_DIR = ROOT / "memory"
BUNDLE = MEM_DIR / "ultraia_memory.zip"

INCLUDE_DIRS = ["truth", "responses", "scripts"]
INCLUDE_FILES = ["LEARNINGS.md", "verdicts.jsonl"]

def build():
    MEM_DIR.mkdir(exist_ok=True)
    manifest = {
        "generated_at": datetime.datetime.now(datetime.timezone.utc).isoformat(),
        "system": "UltraIa learning memory",
        "purpose": "Esquemas de consulta verificados + verdad + veredictos + lecciones para reutilizar en prompts futuros",
    }
    with zipfile.ZipFile(BUNDLE, "w", zipfile.ZIP_DEFLATED, compresslevel=9) as z:
        for f in INCLUDE_FILES:
            p = ROOT / f
            if p.exists():
                z.write(p, f"learning/{f}")
        for d in INCLUDE_DIRS:
            for p in sorted((ROOT / d).rglob("*")):
                if p.is_file():
                    rel = p.relative_to(ROOT)
                    z.write(p, f"learning/{rel}")
        z.writestr("learning/manifest.json", json.dumps(manifest, indent=2, ensure_ascii=False))
    size = BUNDLE.stat().st_size
    print(f"Bundle creado: {BUNDLE} ({size/1024:.1f} KB)")
    _info(zipfile.ZipFile(BUNDLE))

def info():
    if not BUNDLE.exists():
        print("No existe bundle. Ejecuta: python bundle_memory.py build")
        return
    _info(zipfile.ZipFile(BUNDLE))
    print(f"Tamano: {BUNDLE.stat().st_size/1024:.1f} KB")
    sha = hashlib.sha256(BUNDLE.read_bytes()).hexdigest()[:16]
    print(f"SHA256 (primeros 16): {sha}")

def _info(z):
    names = z.namelist()
    total = sum(i.file_size for i in z.infolist())
    print(f"  {len(names)} archivos, {total/1024:.1f} KB sin comprimir")
    for n in names:
        print(f"    {n}")

if __name__ == "__main__":
    cmd = sys.argv[1] if len(sys.argv) > 1 else "build"
    if cmd == "build": build()
    elif cmd == "info": info()
    else: print(__doc__)
