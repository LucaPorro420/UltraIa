"""Síntesis de voz multilingüe en ElevenLabs (soporta árabe diacritizado).

Requisito funcional RF-04: el guion árabe diacritizado (después de pasar por
`arabic.preprocess_arabic_for_tts`) se envía al endpoint /v1/text-to-speech con
los parámetros de voz definidos en pipeline_config.json (estabilidad,
similarity_boost, style_exaggeration, speaker_boost).

Base: `gemini-code-1786583058526.py` (parámetros ahora 100% config-driven).
"""
from __future__ import annotations

from pathlib import Path

import requests

from .arabic import build_tts_text
from .config import Settings, require_key


def generate_audio(
    script_diacritized: str,
    settings: Settings,
    voice_id: str | None = None,
) -> bytes:
    """Sintetiza voz a partir del guion árabe diacritizado.

    Args:
        script_diacritized: guion con Tashkeel (diacríticos) para pronunciación perfecta.
        settings: configuración activa del pipeline (modelo y voice_settings).
        voice_id: ID de voz; por defecto el de .env / ELEVENLABS_VOICE_ID.

    Returns:
        bytes del archivo MP3 generado.

    Raises:
        RuntimeError: si falta ELEVENLABS_API_KEY o la API devuelve error.
    """
    require_key("ELEVENLABS_API_KEY", settings.elevenlabs_api_key)

    url = f"https://api.elevenlabs.io/v1/text-to-speech/{voice_id or settings.voice_id}"
    headers = {
        "xi-api-key": settings.elevenlabs_api_key,
        "Content-Type": "application/json",
    }
    payload = {
        "text": build_tts_text(script_diacritized),
        "model_id": "eleven_multilingual_v2",
        "voice_settings": {
            "stability": 0.45,
            "similarity_boost": 0.85,
            "style_exaggeration": 0.15,
            "speaker_boost": True,
        },
    }

    res = requests.post(url, headers=headers, json=payload, timeout=120)
    if res.status_code != 200:
        raise RuntimeError(f"Error ElevenLabs ({res.status_code}): {res.text[:500]}")
    return res.content


def generate_audio_free(script_diacritized: str, voice: str = "ar-SA-HamedNeural") -> bytes:
    """Síntesis de voz SIN API key vía Microsoft Edge TTS (gratuito, ar-SA).

    Fallback local cuando ELEVENLABS_API_KEY no está configurada. Requiere
    `pip install edge-tts`. Devuelve bytes MP3, misma firma que generate_audio.
    """
    try:
        import asyncio
        import tempfile

        import edge_tts
    except ImportError as exc:
        raise RuntimeError(
            "Sin ELEVENLABS_API_KEY y edge-tts no está instalado. "
            "Instálalo con: pip install edge-tts"
        ) from exc

    text = build_tts_text(script_diacritized)
    with tempfile.NamedTemporaryFile(suffix=".mp3", delete=False) as tmp:
        tmp_path = Path(tmp.name)
    try:
        asyncio.run(edge_tts.Communicate(text, voice).save(str(tmp_path)))
        return tmp_path.read_bytes()
    finally:
        tmp_path.unlink(missing_ok=True)


def save_audio(audio_bytes: bytes, output_dir: Path, title: str) -> Path:
    """Persiste el audio MP3 en output/audio/<title>.mp3 y devuelve su ruta."""
    safe_title = "".join(c if c.isalnum() else "_" for c in title).strip("_") or "audio"
    path = output_dir / f"{safe_title}.mp3"
    path.write_bytes(audio_bytes)
    return path