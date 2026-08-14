"""Generación de video: Runway Gen-3 (default) o Fal.ai Kling, con polling.

Requisito funcional RF-06: los proveedores de video son asíncronos. Se crea la
tarea (POST /v1/tasks) y se verifica el estado (GET /v1/tasks/{id}) con un loop
de polling con backoff lineal (10s -> 30s) y tope de reintentos, evitando
timeouts y saturación de peticiones.

Requisito funcional RF-07: manejo de errores explícito para estados
FAILED/CANCELLED y límites de tasa (429).

Base verificada: `gemini-code-1786583046072.py` (polling) y
`gemini-code-1786583058526.py` (trigger) — reutilizados tal cual su lógica.
"""
from __future__ import annotations

import asyncio
import json
import time
from pathlib import Path

import aiohttp
import requests

from .config import Settings, require_key

_RUNWAY_BASE = "https://api.dev.runwayml.com/v1"
_RUNWAY_VERSION = "2024-11-06"


def trigger_runway_video(prompt: str, settings: Settings, image_url: str | None = None) -> str:
    """Crea la tarea de video en Runway y devuelve su task id.

    Args:
        prompt: visual_prompt_en del shot (cinemático, en inglés).
        settings: configuración (modelo gen3a_turbo, duración, ratio).
        image_url: si se provee, se usa image-to-video (frame inicial).

    Returns:
        id de la tarea para el polling posterior.
    """
    require_key("RUNWAY_API_KEY", settings.runway_api_key)

    url = f"{_RUNWAY_BASE}/tasks"
    headers = {
        "Authorization": f"Bearer {settings.runway_api_key}",
        "X-Runway-Version": _RUNWAY_VERSION,
        "Content-Type": "application/json",
    }
    payload = {
        "taskType": settings.video_model,  # "gen3a_turbo"
        "promptText": prompt,
        "duration": settings.video_duration_sec,
        "ratio": settings.video_aspect_ratio,  # "16:9"
    }
    if image_url:
        payload["initImageUrl"] = image_url

    res = requests.post(url, headers=headers, json=payload, timeout=60)
    if res.status_code == 429:
        raise RuntimeError("Rate limit de Runway (429). Espera y reintenta.")
    if res.status_code != 200:
        raise RuntimeError(f"Error Runway ({res.status_code}): {res.text[:500]}")
    return res.json()["id"]


async def poll_task_status(
    task_id: str,
    api_key: str,
    base_url: str = f"{_RUNWAY_BASE}/tasks",
    initial_delay: int = 10,
    max_delay: int = 30,
    max_retries: int = 20,
) -> dict:
    """Loop de polling robusto con retardo adaptable para IAs de video asíncronas.

    Lógica original verificada en `gemini-code-1786583046072.py`: consulta el
    estado cada `delay` segundos; sobre éxito devuelve el payload completo,
    sobre fallo lanza RuntimeError, y el delay crece linealmente hasta el tope.

    Returns:
        Payload JSON del estado final (incluye "output" con la URL del video).
    """
    headers = {
        "Authorization": f"Bearer {api_key}",
        "X-Runway-Version": _RUNWAY_VERSION,
    }

    delay = initial_delay
    async with aiohttp.ClientSession() as session:
        for attempt in range(max_retries):
            print(f"[Intento {attempt + 1}/{max_retries}] Esperando {delay}s antes de consultar tarea: {task_id}...")
            await asyncio.sleep(delay)

            async with session.get(f"{base_url}/{task_id}", headers=headers) as response:
                if response.status != 200:
                    print(f"Error en respuesta ({response.status}): {await response.text()}")
                    continue

                data = await response.json()
                status = data.get("status")
                print(f"Estado actual: {status}")

                if status == "SUCCEEDED":
                    print("¡Generación completada con éxito!")
                    return data
                if status in ("FAILED", "CANCELLED"):
                    raise RuntimeError(
                        f"La tarea de video falló con estado: {status}. Detalles: {data.get('failure')}"
                    )

                # Aumenta gradualmente el tiempo de espera hasta el máximo permitido
                delay = min(delay + 5, max_delay)

    raise TimeoutError(
        f"Se alcanzó el límite máximo de intentos sin completar la tarea {task_id}."
    )


def trigger_fal_video(prompt: str, settings: Settings) -> str:
    """Crea tarea de video en Fal.ai (Kling) y devuelve el request_id para polling."""
    from .images import _fal_headers  # evita ciclo de imports

    url = f"https://queue.fal.run/{settings.fal_video_model}"
    res = requests.post(
        url,
        headers=_fal_headers(settings),
        json={"prompt": prompt, "duration": settings.video_duration_sec or 5},
        timeout=60,
    )
    if res.status_code != 200:
        raise RuntimeError(f"Error Fal.ai Kling ({res.status_code}): {res.text[:500]}")
    return res.json()["request_id"]


def generate_slideshow(
    image_path: Path,
    output: Path,
    duration_sec: int = 5,
    fps: int = 24,
    size: str = "1920x1080",
) -> str:
    """Video local SIN API key: clip de imagen con movimiento Ken Burns (zoompan).

    Fallback de Runway/Fal.ai usando ffmpeg (gratis). Requiere ffmpeg en PATH
    (winget install Gyan.FFmpeg). Devuelve la ruta del MP4 generado.
    """
    import shutil
    import subprocess as sp

    if shutil.which("ffmpeg") is None:
        raise RuntimeError(
            "Sin RUNWAY/FAL_API_KEY y ffmpeg no está en PATH. "
            "Instálalo con: winget install Gyan.FFmpeg"
        )
    output.parent.mkdir(parents=True, exist_ok=True)
    zoompan = (
        f"scale={size}:force_original_aspect_ratio=decrease,"
        f"pad={size}:(ow-iw)/2:(oh-ih)/2,"
        f"zoompan=z='min(zoom+0.0015,1.15)':d={fps * duration_sec}:s={size}:fps={fps}"
    )
    cmd = [
        "ffmpeg", "-y", "-loop", "1", "-i", str(image_path),
        "-vf", zoompan, "-t", str(duration_sec),
        "-c:v", "libx264", "-pix_fmt", "yuv420p", str(output),
    ]
    proc = sp.run(cmd, capture_output=True, text=True, timeout=300)
    if proc.returncode != 0:
        raise RuntimeError(f"ffmpeg slideshow falló: {proc.stderr[-500:]}")
    return str(output)


def save_video_manifest(output_dir: Path, entries: list[dict]) -> Path:
    """Guarda el manifiesto de videos generados en output/video/manifest.json."""
    path = output_dir / "manifest.json"
    path.write_text(json.dumps(entries, indent=2, ensure_ascii=False), encoding="utf-8")
    return path


def get_video_url(result: dict) -> str | None:
    """Extrae la URL del video del payload de Runway (output[0]) o Fal.ai."""
    if "output" in result and isinstance(result["output"], list) and result["output"]:
        return result["output"][0]
    if "output" in result and isinstance(result["output"], str):
        return result["output"]
    if "video" in result:
        return result["video"].get("url") if isinstance(result["video"], dict) else result["video"]
    return None