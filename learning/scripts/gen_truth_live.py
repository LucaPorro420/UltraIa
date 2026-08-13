import json, urllib.request, datetime
from pathlib import Path

results = {
  "generated_at": datetime.datetime.now(datetime.timezone.utc).isoformat(),
  "method": "Datos descargados directamente de la API (respuesta cruda guardada como verdad, sin interpretacion de LLM)",
  "cases": []
}

def fetch(url):
    req = urllib.request.Request(url, headers={"User-Agent": "learning-verify/1.0"})
    with urllib.request.urlopen(req, timeout=30) as r:
        return json.loads(r.read().decode("utf-8"))

# 1. Clima Lima (Open-Meteo, sin API key)
try:
    w = fetch("https://api.open-meteo.com/v1/forecast?latitude=-12.0464&longitude=-77.0428&current=temperature_2m,relative_humidity_2m,wind_speed_10m")
    results["cases"].append({
        "id": "live_weather_lima",
        "type": "dict",
        "tolerance": 1.5,
        "prompt": "Cual es la temperatura actual, humedad y velocidad del viento en Lima, Peru?",
        "raw_response": w,
        "answer": {
            "temperature_c": w["current"]["temperature_2m"],
            "humidity_pct": w["current"]["relative_humidity_2m"],
            "wind_kmh": w["current"]["wind_speed_10m"],
        },
        "source_url": "https://api.open-meteo.com/v1/forecast?latitude=-12.0464&longitude=-77.0428&current=temperature_2m,relative_humidity_2m,wind_speed_10m",
    })
    print("live_weather_lima OK:", results["cases"][-1]["answer"])
except Exception as e:
    print("weather fail:", e)

# 2. Tasa de cambio USD->PEN (open.er-api.com)
try:
    fx = fetch("https://open.er-api.com/v6/latest/USD")
    pen = fx["rates"].get("PEN")
    results["cases"].append({
        "id": "live_fx_usd_pen",
        "type": "dict",
        "tolerance": 0.05,
        "prompt": "Cual es el tipo de cambio actual de USD a PEN (soles peruanos)?",
        "raw_response": fx,
        "answer": {"usd_to_pen": pen, "update_date": fx.get("time_last_update_utc")},
        "source_url": "https://open.er-api.com/v6/latest/USD",
    })
    print("live_fx_usd_pen OK:", results["cases"][-1]["answer"])
except Exception as e:
    print("fx fail:", e)

p = Path(__file__).parent / "truth_live.json"
p.write_text(json.dumps(results, indent=2, ensure_ascii=False), encoding="utf-8")
print("guardado:", p)
