"""Restaurador de memoria de aprendizaje de UltraIa.

Recarga el bundle comprimido (learning/memory/ultraia_memory.zip) en disco
o imprime el conocimiento para re-inyectarlo en el contexto del agente.

Uso:
  python restore_memory.py extract   # restaura archivos a learning/ (verdad + respuestas)
  python restore_memory.py summary   # resumen de conocimiento listo para usar en prompts
  python restore_memory.py schemas   # lista los esquemas de consulta verificados (truth)
"""
import json, zipfile, sys
from pathlib import Path

try:
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
except Exception:
    pass

ROOT = Path(__file__).resolve().parents[1]
BUNDLE = ROOT / "memory" / "ultraia_memory.zip"

def _open():
    if not BUNDLE.exists():
        raise SystemExit(f"No hay bundle: {BUNDLE}. Ejecuta: python learning/scripts/bundle_memory.py build")
    return zipfile.ZipFile(BUNDLE)

def extract():
    with _open() as z:
        z.extractall(ROOT)
    print(f"Memoria restaurada en {ROOT}")

def summary():
    with _open() as z:
        truth = {}
        for name in z.namelist():
            if "/truth/" in name and name.endswith(".json"):
                d = json.loads(z.read(name))
                for c in d["cases"]:
                    truth[c["id"]] = {"prompt": c["prompt"], "answer": c["answer"], "kind": c.get("type", "exact")}
        learnings = ""
        if "learning/LEARNINGS.md" in z.namelist():
            learnings = z.read("learning/LEARNINGS.md").decode("utf-8", errors="replace")
        verdicts = []
        if "learning/verdicts.jsonl" in z.namelist():
            for line in z.read("learning/verdicts.jsonl").decode("utf-8").splitlines():
                if line.strip():
                    verdicts.append(json.loads(line))

    passed = sum(1 for v in verdicts if v["status"] == "PASS")
    total = len(verdicts)
    print(f"MEMORIA ULTRAIA — {passed}/{total} veredictos PASS, {len(truth)} casos de verdad")
    print()
    print("=== ESQUEMAS DE CONSULTA VERIFICADOS ===")
    for cid, c in truth.items():
        ans = str(c["answer"])
        print(f"[{c['kind']}] {cid}: {c['prompt']}  ->  {ans[:70]}")
    print()
    print("=== LECCIONES (LEARNINGS.md) ===")
    for line in learnings.splitlines():
        if line.strip().startswith(("- ", "**", "## ")) and not line.startswith("# "):
            print("  " + line.strip())

def schemas():
    with _open() as z:
        for name in z.namelist():
            if "/truth/" in name and name.endswith(".json"):
                d = json.loads(z.read(name))
                print(f"--- {name}")
                for c in d["cases"]:
                    print(f"[{c.get('type','exact')}] {c['id']} :: {c['prompt']}")

if __name__ == "__main__":
    cmd = sys.argv[1] if len(sys.argv) > 1 else "summary"
    if cmd == "extract": extract()
    elif cmd == "summary": summary()
    elif cmd == "schemas": schemas()
    else: print(__doc__)
