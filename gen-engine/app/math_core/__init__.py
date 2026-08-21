"""math_core — fundamentos de matemática/programación/lógica del Gen-Engine.

Módulos puros (numpy + Pillow, sin GPU) que realzan y generan imagen/video/audio
keyless y proveen cimientos reutilizables para los modelos locales (GPU).
"""
from . import audio_synth, critique, diffusion, img_enhance, video_cohere

__all__ = ["img_enhance", "video_cohere", "audio_synth", "critique", "diffusion"]
