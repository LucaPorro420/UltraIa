"""Verificador de respuestas contra la verdad guardada aparte.

Uso:
  python verify.py <case_id> <response_json_path> [--verbose]

Compara la respuesta del LLM contra truth/<archivo>.json.
Veredicto: PASS / FAIL (con tolerancia para numericos).
Registra el resultado en verdicts.jsonl (apendice).
"""
import json, sys, re, datetime
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
TRUTH_DIR = ROOT / "truth"
RESPONSES_DIR = ROOT / "responses"
VERDICTS = ROOT / "verdicts.jsonl"

def load_truth(case_id):
    for tf in TRUTH_DIR.glob("truth_*.json"):
        data = json.loads(tf.read_text(encoding="utf-8"))
        for c in data["cases"]:
            if c["id"] == case_id:
                return c, tf.name
    return None, None

def norm(s):
    if s is None: return ""
    s = str(s).strip().lower()
    s = s.replace("$home", "~").replace("${home}", "~")
    s = s.replace(",", "").replace(" ", "").replace("\u00b0", "")
    return s

def extract_number(text):
    if isinstance(text, (int, float)):
        return float(text)
    m = re.search(r"-?\d+[.,]?\d*", str(text))
    return float(m.group(0).replace(",", ".")) if m else None

def check(case, response):
    kind = case.get("type", "exact")
    truth = case["answer"]
    if kind == "text":
        t = norm(truth); r = norm(response)
        return t in r or r in t, f"truth='{t}', resp='{r}'"
    if kind == "exact":
        tn, rn = extract_number(truth), extract_number(response)
        if tn is None or rn is None:
            return False, f"no-number (truth={truth!r}, resp={response!r})"
        return abs(tn - rn) < 1e-6, f"expected {tn}, got {rn}"
    if kind == "approx":
        tn, rn = extract_number(truth), extract_number(response)
        tol = case.get("tolerance", 0.5)
        if tn is None or rn is None:
            return False, f"no-number (truth={truth!r}, resp={response!r})"
        return abs(tn - rn) <= tol, f"expected {tn}±{tol}, got {rn}"
    if kind == "text":
        t = norm(truth); r = norm(response)
        return t in r or r in t, f"truth='{t}', resp='{r}'"
    if kind == "dict":
        if not isinstance(response, dict):
            return False, f"response no es dict: {response!r}"
        results = []
        for k, v in truth.items():
            rv = response.get(k)
            if isinstance(v, (int, float)):
                ok = abs(float(v) - extract_number(rv)) <= case.get("tolerance", 1.0)
            else:
                ok = str(v) in str(rv)
            results.append(ok)
            if not ok:
                return False, f"campo {k}: esperado {v}, got {rv}"
        return True, f"todos los campos OK {list(truth.keys())}"
    return False, f"tipo desconocido: {kind}"

def main():
    case_id = sys.argv[1]
    resp_path = sys.argv[2]
    verbose = "--verbose" in sys.argv

    truth, tfile = load_truth(case_id)
    if not truth:
        print(f"ERROR: caso {case_id} no encontrado en truth/")
        sys.exit(2)

    resp_raw = json.loads(Path(resp_path).read_text(encoding="utf-8"))
    response = resp_raw.get("answer", resp_raw)
    ok, detail = check(truth, response)

    record = {
        "ts": datetime.datetime.now(datetime.timezone.utc).isoformat(),
        "case_id": case_id,
        "truth_file": tfile,
        "response_file": str(Path(resp_path).relative_to(ROOT)),
        "status": "PASS" if ok else "FAIL",
        "detail": detail,
        "attempt": resp_raw.get("attempt", 0),
        "prompt_used": resp_raw.get("prompt", ""),
    }
    with VERDICTS.open("a", encoding="utf-8") as f:
        f.write(json.dumps(record, ensure_ascii=False) + "\n")

    tag = "PASS" if ok else "FAIL"
    print(f"[{tag}] {case_id}: {detail}")
    if verbose:
        print(f"  prompt: {record['prompt_used'][:120]}")
        print(f"  respuesta: {str(response)[:200]}")
        print(f"  verdad:    {str(truth['answer'])[:200]}")

if __name__ == "__main__":
    main()
