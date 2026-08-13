import json, math, hashlib, datetime
from pathlib import Path

truth = {
  "generated_at": datetime.datetime.now(datetime.timezone.utc).isoformat(),
  "method": "Respuestas calculadas de forma determinista con Python (independiente de cualquier LLM)",
  "cases": [
    {"id": "math_1", "prompt": "Calcula: 17 * 23", "answer": 391.0, "type": "exact", "unit": ""},
    {"id": "math_2", "prompt": "Calcula: raiz cuadrada de 529", "answer": 23.0, "type": "exact", "unit": ""},
    {"id": "math_3", "prompt": "Calcula: (2^10) + (3^5) - 42", "answer": 1024 + 243 - 42, "type": "exact", "unit": ""},
    {"id": "math_4", "prompt": "Convierte 100 grados Celsius a Fahrenheit", "answer": 212.0, "type": "exact", "unit": "F"},
    {"id": "math_5", "prompt": "Calcula el area de un circulo de radio 7 (pi=3.14159)", "answer": round(math.pi * 7**2, 2), "type": "approx", "tolerance": 0.5, "unit": ""},
    {"id": "math_6", "prompt": "Calcula: 7 factorial (7!)", "answer": 5040.0, "type": "exact", "unit": ""},
  ]
}

p = Path(__file__).parent / "truth_math.json"
p.write_text(json.dumps(truth, indent=2, ensure_ascii=False), encoding="utf-8")
print(f"truth_math.json generado: {len(truth['cases'])} casos")
for c in truth["cases"]:
    print(f"  {c['id']}: {c['prompt']} = {c['answer']} {c['unit']}")
