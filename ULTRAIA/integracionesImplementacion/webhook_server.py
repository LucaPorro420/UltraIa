"""Servidor Webhook (FastAPI) para notificaciones de Runway/Fal.ai.

Requisito funcional RF-13: alternativa al polling — los proveedores notifican
al servidor cuando la tarea termina; el servidor descarga el video y dispara el
ensamblado (audio + subtítulos) en segundo plano.

Uso:
    python webhook_server.py            # http://0.0.0.0:8000
    ngrok http 8000                     # URL pública para el webhook del proveedor

Base verificada: `gemini-code-1786584811320.py` (misma arquitectura, ahora con
descarga real y disparo del ensamblado).
"""
from __future__ import annotations

import os
import secrets
import subprocess
import sys
from pathlib import Path

from fastapi import BackgroundTasks, FastAPI, Header, HTTPException, Request

# Asegura que `src` sea importable al ejecutar este archivo directamente.
sys.path.insert(0, str(Path(__file__).resolve().parent))

from src.assembly import download_media, merge_audio_video_subtitles
from src.config import OUTPUT_DIR

app = FastAPI(title="AI Generation Webhook Receiver")
VIDEO_DIR = OUTPUT_DIR / "video"
ASSEMBLED_DIR = OUTPUT_DIR / "assembled"
VIDEO_DIR.mkdir(parents=True, exist_ok=True)
ASSEMBLED_DIR.mkdir(parents=True, exist_ok=True)

# Autenticación de callbacks: token compartido vía WEBHOOK_SECRET (ver .env.example).
# Si no está configurado, se genera uno aleatorio por arranque (modo dev) y se
# imprime en consola — el endpoint NUNCA queda abierto sin auth.
WEBHOOK_SECRET = os.environ.get("WEBHOOK_SECRET", "")
if not WEBHOOK_SECRET:
    WEBHOOK_SECRET = secrets.token_urlsafe(24)
    print(
        "[webhook] AVISO: WEBHOOK_SECRET no configurado; token aleatorio de esta "
        f"ejecución: {WEBHOOK_SECRET} (fija WEBHOOK_SECRET en .env para estabilidad)"
    )


def _verify_secret(x_webhook_secret: str | None) -> None:
    if not x_webhook_secret or not secrets.compare_digest(x_webhook_secret, WEBHOOK_SECRET):
        raise HTTPException(status_code=401, detail="invalid webhook secret")


def process_final_video(url: str, task_id: str, audio_path: str | None = None) -> None:
    """Descarga el video terminado y (si hay audio) lo ensambla en MP4 final."""
    print(f"Descargando y procesando video {task_id} desde {url}...")
    local = download_media(url, VIDEO_DIR / f"{task_id}.mp4")
    print(f"Video local: {local}")

    if audio_path and Path(audio_path).exists():
        final = merge_audio_video_subtitles(str(local), audio_path, str(ASSEMBLED_DIR / f"{task_id}_final.mp4"))
        print(f"MP4 final ensamblado: {final}")


@app.post("/webhook/runway")
async def runway_callback(
    request: Request,
    background_tasks: BackgroundTasks,
    x_webhook_secret: str | None = Header(default=None, alias="X-Webhook-Secret"),
) -> dict:
    """Recibe la notificación de Runway y dispara el procesamiento en background."""
    _verify_secret(x_webhook_secret)
    payload = await request.json()
    task_id = payload.get("id")
    status = payload.get("status")

    if status == "SUCCEEDED":
        video_url = payload.get("output", [None])[0]
        print(f"¡Notificación recibida! Video listo en: {video_url}")
        background_tasks.add_task(process_final_video, video_url, task_id)
    else:
        print(f"Tarea {task_id} en estado: {status}")

    return {"status": "received"}


@app.post("/webhook/fal")
async def fal_callback(
    request: Request,
    background_tasks: BackgroundTasks,
    x_webhook_secret: str | None = Header(default=None, alias="X-Webhook-Secret"),
) -> dict:
    """Recibe la notificación de Fal.ai y dispara el procesamiento en background."""
    _verify_secret(x_webhook_secret)
    payload = await request.json()
    request_id = payload.get("request_id") or payload.get("id")
    status = payload.get("status")

    if status == "COMPLETED":
        video_url = (payload.get("video") or {}).get("url") or payload.get("output")
        print(f"¡Notificación Fal.ai! Video listo en: {video_url}")
        background_tasks.add_task(process_final_video, video_url, request_id)
    else:
        print(f"Request {request_id} en estado: {status}")

    return {"status": "received"}


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=8000)