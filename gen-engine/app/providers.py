"""Providers del Gen-Engine: dispatch con degradación keyless garantizada.

Jerarquía de selección para cada modalidad:
    auto -> local (si GPU disponible) -> premium (si claves) -> keyless
"""
from __future__ import annotations

import io
import os
import uuid
from pathlib import Path

import requests

from . import models_local

# Directorio de medios servido por main.py en /media (mismo path que _MEDIA_DIR).
_OUTPUT = Path(__file__).resolve().parents[1] / "media"
_OUTPUT.mkdir(parents=True, exist_ok=True)

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
    # keyless: pollinations + realce matemático
    from src.images import generate_image_pollinations

    raw_url = generate_image_pollinations(req.prompt, width=req.width, height=req.height)
    if req.enhance:
        try:
            data = requests.get(raw_url, timeout=120).content
            from .math_core import img_enhance

            out = img_enhance.enhance_image_bytes(data, preset="cinematic", sharpen=True, denoise=True)
            name = f"enhanced_{uuid.uuid4().hex[:12]}.png"
            (Path(_OUTPUT) / name).write_bytes(out)
            return {
                "provider": "pollinations",
                "model": "flux+math-enhance",
                "url": f"/media/{name}",
                "enhanced": True,
            }
        except Exception:
            pass
    return {"provider": "pollinations", "model": "flux", "url": raw_url, "enhanced": False}


def music(req) -> dict:
    provider = _pick(req.provider, True)
    if provider == "local":
        audio_url = models_local.ace_step_music(req.prompt, req.duration_sec)
        return {"provider": "local", "model": "ace-step-1.5", "url": audio_url}
    # keyless: síntesis procedural REAL (FM/ADSR/granular) — sin GPU
    try:
        from .math_core import audio_synth

        wav = audio_synth.music_from_prompt(req.prompt, duration_sec=req.duration_sec)
        name = f"music_{uuid.uuid4().hex[:12]}.wav"
        (Path(_OUTPUT) / name).write_bytes(wav)
        return {"provider": "keyless-synthesis", "model": "procedural-fm+adsr", "url": f"/media/{name}"}
    except Exception:
        return {
            "provider": "composition",
            "model": "keyless-composition",
            "prompt": req.prompt,
            "note": "Síntesis no disponible; activa GPU o un MusicProvider para audio renderizado.",
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
    # keyless: keyframes pollinations -> clip coherente por flujo óptico + Ken Burns
    from PIL import Image

    from src.images import generate_image_pollinations

    nk = max(2, min(5, req.frames))
    if req.coherent:
        try:
            keyframes = []
            for i in range(nk):
                cap = (
                    f"Keyframe {i + 1}/{nk} - {req.prompt} "
                    f"(cinematic, consistent character, cohesive lighting, shot {i + 1})"
                )
                u = generate_image_pollinations(cap, width=1024, height=576)
                keyframes.append(Image.open(io.BytesIO(requests.get(u, timeout=120).content)).convert("RGB"))
            from .math_core import video_cohere

            frames = video_cohere.build_coherent_clip(
                keyframes, frames_between=max(2, req.frames), use_kenburns=True
            )
            name = f"video_{uuid.uuid4().hex[:12]}.mp4"
            video_cohere.write_mp4(frames, str(Path(_OUTPUT) / name), fps=24)
            return {
                "provider": "keyless-coherent",
                "model": "optical-flow+kenburns",
                "url": f"/media/{name}",
                "frames": len(frames),
                "note": "Video coherente por interpolación de flujo óptico + cámara Ken Burns (sin GPU).",
            }
        except Exception:
            pass
    # fallback: storyboard crudo
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