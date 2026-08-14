"""Providers del Gen-Engine: dispatch con degradación keyless garantizada.

Jerarquía de selección para cada modalidad:
    auto -> local (si GPU disponible) -> premium (si claves) -> keyless
"""
from __future__ import annotations

import os

from . import models_local

# Detección de hardware (una sola vez, cacheada).
_HAS_LOCAL = models_local.detect_local_capability()


def _pick(preferred: str, local_ok: bool) -> str:
    """Resuelve el provider real dado el pedido 'auto' del cliente."""
    if preferred == "auto":
        if local_ok and _HAS_LOCAL:
            return "local"
        return "keyless"
    return preferred


def health() -> dict:
    return {
        "status": "ok",
        "local_engine": _HAS_LOCAL,
        "device": models_local.device_summary(),
        "premium": {
            "fal": bool(os.getenv("FAL_KEY_ID") and os.getenv("FAL_KEY_SECRET")),
            "meigen": bool(os.getenv("MEIGEN_API_TOKEN")),
        },
    }


def capabilities() -> dict:
    return {
        "image": _pick("auto", True),
        "music": _pick("auto", True),
        "tts": "keyless",
        "video": _pick("auto", True),
    }


def image(req) -> dict:
    provider = _pick(req.provider, True)
    if provider == "local":
        url = models_local.flux_image(req.prompt, req.width, req.height)
        return {"provider": "local", "model": "flux.2-klein", "url": url}
    # keyless: pollinations
    from src.images import generate_image_pollinations

    url = generate_image_pollinations(req.prompt, width=req.width, height=req.height)
    return {"provider": "pollinations", "model": "flux", "url": url}


def music(req) -> dict:
    provider = _pick(req.provider, True)
    if provider == "local":
        audio_url = models_local.ace_step_music(req.prompt, req.duration_sec)
        return {"provider": "local", "model": "ace-step-1.5", "url": audio_url}
    # keyless: composición estructurada
    return {
        "provider": "composition",
        "model": "keyless-composition",
        "prompt": req.prompt,
        "note": "Composición estructurada. Activa GPU o un MusicProvider para audio renderizado.",
    }


def tts(req) -> dict:
    from src.audio import generate_audio_free

    audio_bytes = generate_audio_free(req.text, language_target=req.language, voice=req.voice)
    url = models_local.serve_audio_bytes(audio_bytes, "tts.mp3")
    return {"provider": "edge-tts", "language": req.language, "url": url}


def video(req) -> dict:
    provider = _pick(req.provider, True)
    if provider == "local":
        url = models_local.ltx_video(req.prompt, req.duration_sec)
        return {"provider": "local", "model": "ltx-2.3", "url": url}
    # keyless: storyboard de frames (pollinations)
    from src.images import generate_image_pollinations

    frames = []
    for i in range(max(1, min(8, req.frames))):
        caption = f"Frame {i + 1}/{req.frames} - {req.prompt} (cinematic, consistent lighting)"
        frames.append(generate_image_pollinations(caption, width=1024, height=576))
    return {
        "provider": "storyboard",
        "model": "keyless-storyboard",
        "frames": frames,
        "note": "Storyboard de frames (Pollinations). Activa GPU (LTX-2.3) para video real.",
    }