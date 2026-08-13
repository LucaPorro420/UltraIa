"""Solución 3 (high-demand): Datos en tiempo real → Publicidad generativa.

Requisito funcional RF-16: se monitorea una fuente de datos en vivo (clima,
mercados, tráfico aéreo) y, según los factores ambientales actuales, se
construye un prompt publicitario hiper-personalizado que se envía a DALL-E 3
o FLUX para generar la imagen del anuncio.

Fuentes gratuitas implementadas (sin clave API):
    open-meteo.com  — clima actual por ciudad (code 0 = libre).
    Yahoo Finance   — cotización de un símbolo (best-effort, requiere User-Agent).
Cualquier otra fuente puede conectarse vía `--json <url>` si devuelve JSON.

Uso:
    python ads.py --city "Dubai" --product "café helado"
    python ads.py --stock AAPL --product "iPhone"
    python ads.py --json https://api.ejemplo.com/data.json --product "auto"
    python ads.py --dry-run --city Lima                     # simular
"""
from __future__ import annotations

import datetime
import json
import re
from pathlib import Path

import requests

from .config import Settings, ensure_output_dirs
from .images import generate_image

_OPEN_METEO = "https://api.open-meteo.com/v1/forecast"
_YAHOO_CHART = "https://query1.finance.yahoo.com/v8/finance/chart/{}"
_HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
        "(KHTML, like Gecko) Chrome/126.0 Safari/537.36"
    )
}


# ------------------------------------------------------------------ fuentes

def fetch_weather(city: str) -> dict:
    """Clima actual de una ciudad vía Open-Meteo (sin API key)."""
    geo = requests.get(
        "https://geocoding-api.open-meteo.com/v1/search",
        params={"name": city, "count": 1, "language": "en"},
        timeout=30,
    ).json()
    if not geo.get("results"):
        raise RuntimeError(f"Ciudad no encontrada: {city}")
    place = geo["results"][0]
    lat, lon = place["latitude"], place["longitude"]

    data = requests.get(
        _OPEN_METEO,
        params={
            "latitude": lat,
            "longitude": lon,
            "current": "temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m",
        },
        timeout=30,
    ).json()["current"]

    return {
        "source": "open-meteo",
        "city": city,
        "temp_c": data["temperature_2m"],
        "humidity": data["relative_humidity_2m"],
        "condition_code": data["weather_code"],
        "wind_kmh": data["wind_speed_10m"],
        "fetched_at": datetime.datetime.now().isoformat(timespec="seconds"),
    }


def fetch_stock(symbol: str) -> dict:
    """Cotización de un símbolo vía Yahoo Finance (best-effort)."""
    res = requests.get(_YAHOO_CHART.format(symbol), headers=_HEADERS, timeout=30)
    res.raise_for_status()
    chart = res.json()["chart"]["result"][0]
    meta = chart["meta"]
    price = meta.get("regularMarketPrice") or chart["indicators"]["quote"][0]["close"][-1]
    prev = meta.get("chartPreviousClose") or meta.get("previousClose") or price
    change_pct = (price / prev - 1) * 100 if prev else 0.0

    return {
        "source": "yahoo-finance",
        "symbol": symbol,
        "price": round(price, 2),
        "change_pct": round(change_pct, 2),
        "currency": meta.get("currency", "USD"),
        "fetched_at": datetime.datetime.now().isoformat(timespec="seconds"),
    }


def fetch_json(url: str) -> dict:
    """Fuente JSON genérica (cualquier API en tiempo real)."""
    res = requests.get(url, headers=_HEADERS, timeout=30)
    res.raise_for_status()
    return {"source": url, "payload": res.json(),
            "fetched_at": datetime.datetime.now().isoformat(timespec="seconds")}


# --------------------------------------------------------------------- copy

_WEATHER_LABELS = {
    0: "cielo despejado", 1: "mayormente despejado", 2: "parcialmente nublado",
    3: "nublado", 45: "niebla", 51: "llovizna", 61: "lluvia", 63: "lluvia moderada",
    71: "nieve", 80: "chubascos", 95: "tormenta",
}


def build_ad_prompt(data: dict, product: str, style: str = "photorealistic") -> str:
    """Construye el prompt publicitario a partir de los datos en vivo.

    Inyecta los factores ambientales reales en el copy de la imagen para que
    cada anuncio sea único según la situación actual (RF-16).
    """
    if data["source"] == "open-meteo":
        condition = _WEATHER_LABELS.get(int(data.get("condition_code", 0)), "clima variable")
        factors = (
            f"{condition}, {data['temp_c']}°C, "
            f"humedad {data['humidity']}%, viento {data['wind_kmh']} km/h"
        )
        scene = f"{data['city']}, {datetime.date.today().strftime('%B %d')}"

    elif data["source"] == "yahoo-finance":
        direction = "subiendo" if data["change_pct"] >= 0 else "cayendo"
        factors = f"{data['symbol']} a {data['price']} {data['currency']} ({direction} {abs(data['change_pct'])}%)"
        scene = "market trading floor vibes"

    else:
        factors = json.dumps(data.get("payload", {}))[:300]
        scene = "real-time data visualization"

    return (
        f"{style} advertising image for '{product}', {scene}. "
        f"Real-time context: {factors}. "
        "Premium commercial look, strong product focus, vivid colors, "
        "clean composition, no text overlays."
    )


def generate_realtime_ad(
    data: dict,
    product: str,
    settings: Settings,
    provider: str = "openai",
) -> Path:
    """Genera la imagen del anuncio y la guarda en output/ads/.

    Args:
        data: resultado de fetch_weather/fetch_stock/fetch_json.
        product: producto o servicio anunciado.
        settings: configuración del pipeline.
        provider: 'openai' (DALL-E 3) o 'fal' (FLUX).

    Returns:
        Ruta PNG del anuncio generado.
    """
    prompt = build_ad_prompt(data, product)
    url = generate_image(prompt, settings, provider)

    dirs = ensure_output_dirs()
    ads_dir = dirs["images"] / "ads"
    ads_dir.mkdir(parents=True, exist_ok=True)

    from .images import download_image

    stamp = datetime.datetime.now().strftime("%Y%m%d_%H%M%S")
    return download_image(url, ads_dir, f"ad_{stamp}")