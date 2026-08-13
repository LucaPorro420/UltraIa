"""Runner del loop de aprendizaje.

Uso:
  python run_loop.py start <case_id> <prompt> <answer_json>   # registra un intento y verifica
  python run_loop.py report                                   # resumen de veredictos
  python run_loop.py progress                                 # muestra estado por caso

Flujo del loop (a ejecutar por el agente):
  1. Leer prompt del caso en truth/<archivo>.json
  2. Pedir respuesta (busqueda/API/razonamiento) -> guardar en responses/<id>/attempt_N.json
  3. python verify.py <id> <respuesta>   (esto hace el run_loop)
  4. Si FAIL -> mejorar prompt (dar contexto, pedir pasos) -> reintentar (max 3)
"""
import json, sys, datetime
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
TRUTH_DIR = ROOT / "truth"
RESPONSES_DIR = ROOT / "responses"
VERDICTS = ROOT / "verdicts.jsonl"

def find_case(case_id):
    for tf in TRUTH_DIR.glob("truth_*.json"):
        data = json.loads(tf.read_text(encoding="utf-8"))
        for c in data["cases"]:
            if c["id"] == case_id:
                return c
    return None

def next_attempt(case_id):
    d = RESPONSES_DIR / case_id
    d.mkdir(parents=True, exist_ok=True)
    existing = list(d.glob("attempt_*.json"))
    return len(existing) + 1

def start(case_id, prompt, answer):
    case = find_case(case_id)
    if not case:
        print(f"ERROR: caso {case_id} no existe en truth/")
        sys.exit(2)
    attempt = next_attempt(case_id)
    if isinstance(answer, str):
        try:
            answer = json.loads(answer)
        except (json.JSONDecodeError, ValueError):
            pass  # no era JSON -> se guarda como texto
    out = {
        "case_id": case_id,
        "attempt": attempt,
        "prompt": prompt,
        "answer": answer,
        "ts": datetime.datetime.now(datetime.timezone.utc).isoformat(),
    }
    p = RESPONSES_DIR / case_id / f"attempt_{attempt}.json"
    p.write_text(json.dumps(out, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"intento {attempt} guardado: {p}")
    return p

def report():
    if not VERDICTS.exists():
        print("sin veredictos aun")
        return
    rows = [json.loads(l) for l in VERDICTS.read_text(encoding="utf-8").splitlines() if l.strip()]
    if not rows:
        print("sin veredictos")
        return
    per_case = {}
    for r in rows:
        per_case.setdefault(r["case_id"], []).append(r)
    total = len(rows)
    passed = sum(1 for r in rows if r["status"] == "PASS")
    print(f"=== REPORTE: {passed}/{total} PASS total ===")
    for cid, rs in per_case.items():
        best = "PASS" if any(r["status"] == "PASS" for r in rs) else "FAIL"
        print(f"  {cid}: {best} ({len(rs)} intentos)")

def progress():
    for tf in sorted(TRUTH_DIR.glob("truth_*.json")):
        data = json.loads(tf.read_text(encoding="utf-8"))
        for c in data["cases"]:
            rid = RESPONSES_DIR / c["id"]
            n = len(list(rid.glob("attempt_*.json"))) if rid.exists() else 0
            print(f"  {c['id']}: {n} intentos")

if __name__ == "__main__":
    cmd = sys.argv[1]
    if cmd == "start":
        start(sys.argv[2], sys.argv[3], sys.argv[4])
    elif cmd == "report":
        report()
    elif cmd == "progress":
        progress()
    else:
        print(__doc__)
