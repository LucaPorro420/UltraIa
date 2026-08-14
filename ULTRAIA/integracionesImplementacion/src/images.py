"""Generación de imágenes: Pollinations (keyless, default) | DALL-E 3 | FLUX.

Requisito funcional RF-05: cada shot del shot_list produce una imagen base que
Runway/Fal.ai usará como frame inicial (image-to-video) o como referencia
visual del prompt. Proveedor configurable vía pipeline_config.json:
'pollinations' (keyless, funciona sin claves), 'openai' (DALL-E 3) o
'fal' (FLUX via Fal.ai). El fallback keyless garantiza que el pipeline
completo funcione sin ninguna API key.

Base: `gemini-code-1786583784678.py` (SDK legacy corregido -> HTTP directo,
clave desde entorno, timeout y validación de errores).
"""
from __future__ import annotations

import base64
import json
import time
from pathlib import Path
from urllib.parse import quote

import requests

from .config import Settings, require_key

_OPENAI_IMAGES_URL = "https://api.openai.com/v1/images/generations"
_FAL_QUEUE_URL = "https://queue.fal.run"
_POLLINATIONS_URL = "https://image.pollinations.ai/prompt"


def generate_image_dalle3(prompt: str, settings: Settings) -> str:
    """Genera una imagen con DALL-E 3 y devuelve la URL temporal del PNG."""
    require_key("OPENAI_API_KEY", settings.openai_api_key)

    payload = {
        "model": settings.image_model,  # "dall-e-3"
        "prompt": prompt,
        "n": 1,
        "size": settings.image_size,  # "1024x1792" (vertical, ideal Shorts)
    }
    res = requests.post(
        _OPENAI_IMAGES_URL,
        headers={
            "Authorization": f"Bearer {settings.openai_api_key}",
            "Content-Type": "application/json",
        },
        json=payload,
        timeout=120,
    )
    if res.status_code != 200:
        raise RuntimeError(f"Error OpenAI Images ({res.status_code}): {res.text[:500]}")
    return res.json()["data"][0]["url"]


def _fal_headers(settings: Settings) -> dict:
    """Headers de autenticación para Fal.ai (Basic auth con key-id/secret)."""
    require_key("FAL_KEY_ID", settings.fal_key_id)
    require_key("FAL_KEY_SECRET", settings.fal_key_secret)
    token = base64.b64encode(f"{settings.fal_key_id}:{settings.fal_key_secret}".encode()).decode()
    return {"Authorization": f"Key {token}", "Content-Type": "application/json"}


def generate_image_flux(prompt: str, settings: Settings) -> str:
    """Genera una imagen con FLUX vía Fal.ai (queue) y devuelve la URL final."""
    url = f"{_FAL_QUEUE_URL}/{settings.fal_image_model}"  # "fal-ai/flux/dev"
    headers = _fal_headers(settings)

    res = requests.post(url, headers=headers, json={"prompt": prompt}, timeout=120)
    if res.status_code != 200:
        raise RuntimeError(f"Error Fal.ai FLUX ({res.status_code}): {res.text[:500]}")
    return res.json()["images"][0]["url"]


def generate_image(prompt: str, settings: Settings, provider: str = "pollinations") -> str:
    """Dispatch según proveedor configurado: 'pollinations' | 'openai' | 'fal'.

    'pollinations' es el default keyless: funciona sin ninguna API key.
    """
    if provider == "fal":
        return generate_image_flux(prompt, settings)
    if provider == "openai":
        return generate_image_dalle3(prompt, settings)
    return generate_image_pollinations(prompt)


def generate_image_pollinations(
    prompt: str,
    settings: Settings | None = None,
    width: int = 1024,
    height: int = 1024,
    model: str = "flux",
    seed: int | None = None,
) -> str:
    """Genera una imagen SIN API key vía Pollinations (open image API, keyless).

    Devuelve la URL final (tras redirección) del PNG generado. Modelos típicos:
    'flux', 'turbo', 'flux-2', 'flux-schnell'. El tamaño se clampa al rango
    soportado por la API (128–1792 px por lado).

    Args:
        prompt: descripción visual (en inglés para mejor adherencia).
        settings: opcional; si se provee, usa image_model de la configuración.
        width: ancho en px (clamped 128–1792).
        height: alto en px (clamped 128–1792).
        model: modelo Pollinations (default 'flux').
        seed: semilla fija para reproducibilidad; aleatoria si se omite.

    Returns:
        URL final de la imagen generada.

    Raises:
        RuntimeError: si la API devuelve error o no hay red.
    """
    w = max(128, min(1792, int(width)))
    h = max(128, min(1792, int(height)))
    seed = seed if seed is not None else int(time.time() * 1000) % 1_000_000_000
    model = model or (settings.image_model if settings else "flux")

    query = (
        f"width={w}&height={h}&seed={seed}&model={quote(model)}&nologo=true"
    )
    url = f"{_POLLINATIONS_URL}/{quote(prompt)}?{query}"

    res = requests.get(url, timeout=120, allow_redirects=True)
    if res.status_code != 200:
        raise RuntimeError(f"Error Pollinations ({res.status_code}): {res.text[:500]}")
    return res.url or url


def download_image(url: str, output_dir: Path, name: str) -> Path:
    """Descarga la imagen generada a output/images/<name>.png."""
    res = requests.get(url, timeout=120)
    res.raise_for_status()
    path = output_dir / f"{name}.png"
    path.write_bytes(res.content)
    return path


def wait_for_fal_result(request_id: str, settings: Settings, timeout_sec: int = 300) -> str:
    """Polling síncrono del resultado de Fal.ai (imagen o video).

    Requisito funcional RF-08: Fal.ai expone el resultado vía
    /requests/{id}/status y /requests/{id}; se consulta hasta completar.
    """
    headers = _fal_headers(settings)
    status_url = f"{_FAL_QUEUE_URL}/requests/{request_id}/status"
    result_url = f"{_FAL_QUEUE_URL}/requests/{request_id}"

    deadline = time.time() + timeout_sec
    while time.time() < deadline:
        status = requests.get(status_url, headers=headers, timeout=60).json()
        state = status.get("status")
        if state == "COMPLETED":
            return result_url
        if state in ("FAILED", "CANCELLED"):
            raise RuntimeError(f"Fal.ai falló con estado: {state}")
        time.sleep(10)
    raise TimeoutError(f"Fal.ai no completó en {timeout_sec}s. Request: {request_id}")


def fetch_fal_json(result_url: str, settings: Settings) -> dict:
    """Descarga el payload JSON final del request completado en Fal.ai."""
    return requests.get(result_url, headers=_fal_headers(settings), timeout=60).json()