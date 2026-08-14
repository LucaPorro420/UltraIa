"""Carga lazy de modelos open-weight del Gen-Engine (FLUX.2 klein, ACE-Step, LTX-2.3).

Todo es opcional: si torch/diffusers no están instalados o no hay GPU, estas
funciones lanzan RuntimeError y los providers degradan a keyless. En una GPU
cloud (ver GENENGINE.md) se activan automáticamente.
"""
from __future__ import annotations

import os
import shutil
from pathlib import Path

_OUTPUT = Path(__file__).resolve().parents[1] / "media"
_OUTPUT.mkdir(parents=True, exist_ok=True)

# Modelos por modalidad (open-weights, licencias permisivas).
_MODEL_IMAGE = os.getenv("FLUX_MODEL", "black-forest-labs/FLUX.2-klein")
_MODEL_MUSIC = os.getenv("ACESTEP_MODEL", "ACE-Step/ACE-Step-v1-3.5B")
_MODEL_VIDEO = os.getenv("LTX_MODEL", "Lightricks/LTX-2.3")


def device_summary() -> str:
    """Describe el dispositivo de inferencia disponible (o 'cpu')."""
    try:
        import torch

        if torch.cuda.is_available():
            return f"cuda:{torch.cuda.get_device_name(0)}"
        return "cpu (sin GPU: modelos locales desactivados)"
    except ImportError:
        return "cpu (torch no instalado)"


def detect_local_capability() -> bool:
    """True solo si hay GPU NVIDIA utilizable con torch (inferencia real)."""
    try:
        import torch

        return bool(torch.cuda.is_available())
    except ImportError:
        return False


def _require_diffusers() -> None:
    try:
        import diffusers  # noqa: F401
        import torch  # noqa: F401
    except ImportError as exc:
        raise RuntimeError(
            "Modelos locales requieren: pip install torch diffusers accelerate "
            "(solo en GPU; sin GPU usa keyless)."
        ) from exc


def _device() -> str:
    import torch

    return "cuda" if torch.cuda.is_available() else "cpu"


def serve_audio_bytes(audio_bytes: bytes, name: str) -> str:
    """Guarda bytes de audio en /media y devuelve la URL pública servida."""
    path = _OUTPUT / name
    path.write_bytes(audio_bytes)
    return f"/media/{name}"


def flux_image(prompt: str, width: int, height: int) -> str:
    """Genera una imagen con FLUX.2 klein (open-weights, Apache-2.0)."""
    _require_diffusers()
    import torch
    from diffusers import AutoPipelineForText2Image

    pipe = AutoPipelineForText2Image.from_pretrained(
        _MODEL_IMAGE, torch_dtype=torch.float16, variant="fp16"
    ).to(_device())
    image = pipe(prompt=prompt, width=width, height=height).images[0]
    out = _OUTPUT / "flux.png"
    image.save(out)
    return "/media/flux.png"


def ace_step_music(prompt: str, duration_sec: int) -> str:
    """Genera música con ACE-Step 1.5 (MIT, <4GB VRAM)."""
    _require_diffusers()
    from diffusers import ACEStepPipeline
    import torch

    pipe = ACEStepPipeline.from_pretrained(_MODEL_MUSIC, torch_dtype=torch.float16).to(_device())
    audio = pipe(prompt=prompt, duration=duration_sec).audios[0]
    wav = _OUTPUT / "music.wav"
    import soundfile as sf

    sf.write(wav, audio.T, 44100)
    return "/media/music.wav"


def ltx_video(prompt: str, duration_sec: int) -> str:
    """Genera video con LTX-2.3 (22B, audio+video sincronizado, Apache-2.0)."""
    _require_diffusers()
    from diffusers import LTXPipeline
    import torch

    pipe = LTXPipeline.from_pretrained(
        _MODEL_VIDEO, torch_dtype=torch.bfloat16
    ).to(_device())
    frames = pipe(prompt=prompt, num_frames=min(duration_sec * 24, 121)).frames[0]
    mp4 = _OUTPUT / "video.mp4"
    if shutil.which("ffmpeg") is not None:
        frames[0].save(mp4, save_all=True, append_images=frames[1:], fps=24)
    return "/media/video.mp4"