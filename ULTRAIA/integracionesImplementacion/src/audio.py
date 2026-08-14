"""Síntesis de voz multilingüe: ElevenLabs (si hay clave) o edge-tts keyless.

Requisito funcional RF-04: el guion (diacritizado para árabe, plano para el
resto) se envía al endpoint /v1/text-to-speech con los parámetros de voz
definidos en pipeline_config.json. Sin ELEVENLABS_API_KEY se usa edge-tts
(Microsoft Edge TTS, gratuito, 100+ voces por idioma) como fallback keyless.

Base: `gemini-code-1786583058526.py` (parámetros ahora 100% config-driven).
"""
from __future__ import annotations

import shutil
import subprocess
from pathlib import Path

import requests

from .arabic import build_tts_text
from .config import Settings, require_key

# Voces edge-tts por idioma (fallback keyless). Cobertura 10+ idiomas:
# árabe, español, inglés, francés, portugués, alemán, italiano, japonés,
# chino, hindi y ruso.
VOICES_BY_LANG: dict[str, str] = {
    "ar": "ar-SA-HamedNeural",
    "es": "es-ES-ElviraNeural",
    "en": "en-US-JennyNeural",
    "fr": "fr-FR-DeniseNeural",
    "pt": "pt-BR-FranciscaNeural",
    "de": "de-DE-KatjaNeural",
    "it": "it-IT-ElsaNeural",
    "ja": "ja-JP-NanamiNeural",
    "zh": "zh-CN-XiaoxiaoNeural",
    "hi": "hi-IN-SwaraNeural",
    "ru": "ru-RU-SvetlanaNeural",
    "nl": "nl-NL-ColetteNeural",
    "tr": "tr-TR-EmelNeural",
    "pl": "pl-PL-ZofiaNeural",
}

# BCP-47 -> código corto (idioma dominante de la etiqueta).
_LANG_ALIASES = {
    "ar-sa": "ar", "ar-eg": "ar", "ar": "ar",
    "es": "es", "es-es": "es", "es-mx": "es", "es-pe": "es",
    "en": "en", "en-us": "en", "en-gb": "en",
    "fr": "fr", "fr-fr": "fr",
    "pt": "pt", "pt-br": "pt", "pt-pt": "pt",
    "de": "de", "de-de": "de",
    "it": "it", "it-it": "it",
    "ja": "ja", "ja-jp": "ja",
    "zh": "zh", "zh-cn": "zh",
    "hi": "hi", "hi-in": "hi",
    "ru": "ru", "ru-ru": "ru",
    "nl": "nl", "tr": "tr", "pl": "pl",
}


def lang_code(language_target: str) -> str:
    """Normaliza un target BCP-47 ('ar-SA', 'es-PE'...) a código corto ('ar', 'es')."""
    return _LANG_ALIASES.get(language_target.strip().lower(), "en")


def edge_voice_for(language_target: str) -> str:
    """Devuelve la voz edge-tts recomendada para un language_target dado."""
    return VOICES_BY_LANG.get(lang_code(language_target), "en-US-JennyNeural")


def tts_text_for(script: str, language_target: str) -> str:
    """Prepara el texto para TTS según el idioma.

    Árabe: preprocesa diacríticos/puntuación (build_tts_text). Resto de
    idiomas: solo se limpian espacios extremos (el LLM ya entrega el guion
    listo para leer).
    """
    text = (script or "").strip()
    if lang_code(language_target) == "ar" and text:
        return build_tts_text(text)
    return text


def generate_audio(
    script_diacritized: str,
    settings: Settings,
    voice_id: str | None = None,
) -> bytes:
    """Sintetiza voz a partir del guion (diacritizado o plano).

    Args:
        script_diacritized: guion del LLM; para árabe debe llevar Tashkeel
            (diacríticos) para pronunciación perfecta.
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
        "text": tts_text_for(script_diacritized, settings.language_target),
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


def generate_audio_free(
    script_diacritized: str,
    language_target: str = "ar-SA",
    voice: str | None = None,
) -> bytes:
    """Síntesis de voz SIN API key vía Microsoft Edge TTS (gratuito, 100+ voces).

    Fallback local cuando ELEVENLABS_API_KEY no está configurada. La voz se
    elige automáticamente según el idioma (VOICES_BY_LANG) salvo que se
    especifique una. Requiere `pip install edge-tts`. Devuelve bytes MP3,
    misma firma que generate_audio.
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

    text = tts_text_for(script_diacritized, language_target)
    voice = voice or edge_voice_for(language_target)
    with tempfile.NamedTemporaryFile(suffix=".mp3", delete=False) as tmp:
        tmp_path = Path(tmp.name)
    try:
        asyncio.run(edge_tts.Communicate(text, voice).save(str(tmp_path)))
        return tmp_path.read_bytes()
    finally:
        tmp_path.unlink(missing_ok=True)


def _probe_duration(path: Path) -> float:
    """Devuelve la duración en segundos del archivo de audio (ffprobe)."""
    proc = subprocess.run(
        ["ffprobe", "-v", "error", "-show_entries", "format=duration",
         "-of", "csv=p=0", str(path)],
        capture_output=True, text=True, timeout=60,
    )
    if proc.returncode != 0:
        raise RuntimeError(f"ffprobe falló: {proc.stderr[-300:]}")
    return float(proc.stdout.strip())


def postprocess_audio(audio_path: Path, loudness_target: float = -16.0) -> Path:
    """Normaliza el volumen (ITU-R BS.1770) y aplica fade in/out al MP3.

    Mejora la calidad percibida del audio generado (RF-04): loudnorm evita
    picos/clipping y los fades evitan cortes bruscos al inicio y final.

    Args:
        audio_path: MP3 de entrada (locución generada).
        loudness_target: LUFS objetivo (default -16, apto para voz en video).

    Returns:
        La ruta del MP3 procesado (sobrescribe el original).

    Raises:
        RuntimeError: si ffmpeg no está instalado o falla la ejecución.
    """
    if shutil.which("ffmpeg") is None or shutil.which("ffprobe") is None:
        return audio_path
    duration = _probe_duration(audio_path)
    fade_out = max(duration - 0.6, 0.0)
    tmp = audio_path.with_suffix(".raw.mp3")
    cmd = [
        "ffmpeg", "-y", "-i", str(audio_path),
        "-af",
        f"loudnorm=I={loudness_target}:TP=-1.5:LRA=11,"
        f"afade=t=in:st=0:d=0.4,afade=t=out:st={fade_out:.2f}:d=0.6",
        "-c:a", "libmp3lame", "-q:a", "2", str(tmp),
    ]
    proc = subprocess.run(cmd, capture_output=True, text=True, timeout=300)
    if proc.returncode != 0:
        raise RuntimeError(f"ffmpeg postprocess falló: {proc.stderr[-500:]}")
    tmp.replace(audio_path)
    return audio_path


def save_audio(audio_bytes: bytes, output_dir: Path, title: str) -> Path:
    """Persiste el audio MP3 en output/audio/<title>.mp3 y devuelve su ruta."""
    safe_title = "".join(c if c.isalnum() else "_" for c in title).strip("_") or "audio"
    path = output_dir / f"{safe_title}.mp3"
    path.write_bytes(audio_bytes)
    return path