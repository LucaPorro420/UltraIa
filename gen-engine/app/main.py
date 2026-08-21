"""Gen-Engine — motor de generación multimedia self-hosted (el 'modelo propio').

Arquitectura de proveedores pluggables con degradación garantizada:

    local (GPU open-weights) -> cloud premium (fal/meigen, si hay claves)
                             -> keyless (pollinations / edge-tts / storyboard)

Sin GPU ni claves, TODAS las modalidades siguen funcionando vía keyless.
En GPU (RunPod/Spheron/Vast, ver GENENGINE.md) se activan automáticamente:
  - imagen:  FLUX.2 klein 4B (Apache-2.0, ~8GB VRAM)
  - música:  ACE-Step 1.5 (MIT, <4GB VRAM)
  - video:   LTX-2.3 (22B, audio+video sincronizado, 16GB FP8)
  - TTS:     edge-tts (CPU, 100+ voces, siempre activo)
"""
from __future__ import annotations

import sys
from pathlib import Path

# Permite importar el pipeline Python existente (TTS, slideshow, audio).
_INTEGRACIONES = Path(__file__).resolve().parents[2] / "ULTRAIA" / "integracionesImplementacion"
if str(_INTEGRACIONES) not in sys.path:
    sys.path.insert(0, str(_INTEGRACIONES))

from fastapi import FastAPI, HTTPException
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field

from . import providers

_MEDIA_DIR = Path(__file__).resolve().parents[1] / "media"
_MEDIA_DIR.mkdir(parents=True, exist_ok=True)

app = FastAPI(title="UltraIa Gen-Engine", version="1.0.0")
app.mount("/media", StaticFiles(directory=_MEDIA_DIR), name="media")


# ------------------------------------------------------------------- schemas


class ImageRequest(BaseModel):
    prompt: str = Field(min_length=1, max_length=2000)
    width: int = Field(default=1024, ge=128, le=1792)
    height: int = Field(default=1024, ge=128, le=1792)
    provider: str = Field(default="auto", pattern="^(auto|local|pollinations|fal|meigen)$")
    enhance: bool = Field(default=True, description="Aplica realce matemático (keyless) a la imagen.")


class MusicRequest(BaseModel):
    prompt: str = Field(min_length=1, max_length=2000)
    duration_sec: int = Field(default=30, ge=3, le=240)
    provider: str = Field(default="auto", pattern="^(auto|local|composition)$")


class TtsRequest(BaseModel):
    text: str = Field(min_length=1, max_length=5000)
    language: str = Field(default="es", min_length=2, max_length=10)
    voice: str | None = None


class VideoRequest(BaseModel):
    prompt: str = Field(min_length=1, max_length=2000)
    frames: int = Field(default=3, ge=1, le=8)
    duration_sec: int = Field(default=5, ge=2, le=15)
    provider: str = Field(default="auto", pattern="^(auto|local|storyboard|slideshow)$")
    coherent: bool = Field(default=True, description="Interpola keyframes con flujo óptico + Ken Burns (keyless).")


# ------------------------------------------------------------------- endpoints


@app.get("/health")
def health() -> dict:
    return providers.health()


@app.post("/generate/image")
def generate_image(req: ImageRequest) -> dict:
    try:
        return providers.image(req)
    except RuntimeError as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc


@app.post("/generate/music")
def generate_music(req: MusicRequest) -> dict:
    try:
        return providers.music(req)
    except RuntimeError as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc


@app.post("/generate/tts")
def generate_tts(req: TtsRequest) -> dict:
    try:
        return providers.tts(req)
    except RuntimeError as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc


@app.post("/generate/video")
def generate_video(req: VideoRequest) -> dict:
    try:
        return providers.video(req)
    except RuntimeError as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc


@app.get("/capabilities")
def capabilities() -> dict:
    return providers.capabilities()