"""Preprocesamiento de texto árabe para motores TTS (ElevenLabs, Coqui).

Requisito funcional RF-02: el texto árabe debe normalizarse ANTES de enviarse a
síntesis de voz. Problema real documentado: los motores TTS leen mal el texto si
la puntuación es incorrecta (coma occidental vs árabe) o si hay mezcla de
idiomas, produciendo pausas inexistentes o pronunciación defectuosa.

Fuente: código preescrito verificado en `gemini-code-1786582800365.py`.
"""
from __future__ import annotations

import re

# Rango Unicode del árabe (U+0600–U+06FF) + espacios + puntuación estándar.
# Nota: incluye diacríticos (Tashkeel) que viven dentro del mismo rango.
_ARABIC_KEEP_RE = re.compile(r"[^\u0600-\u06FF\s\.\,\؟\!]")
_ARABIC_COMMA_RE = re.compile(r",")
_PUNCT_SPACE_RE = re.compile(r"([،\.\؟\!])(?=[^\s])")


def preprocess_arabic_for_tts(text: str) -> str:
    """Limpia y prepara texto en árabe para Text-to-Speech.

    Pasos:
    1. Elimina caracteres ajenos al árabe manteniendo puntuación básica.
    2. Reemplaza la coma occidental por la coma árabe (،), obligatoria para
       pausas naturales en TTS.
    3. Garantiza un espacio después de cada signo de puntuación.

    Ejemplo:
        "مرحبا بكم, في هذا الفيديو سنشرح الذكاء الاصطناعي."
        -> "مرحبا بكم، في هذا الفيديو سنشرح الذكاء الاصطناعي."
    """
    text = _ARABIC_KEEP_RE.sub("", text)
    text = _ARABIC_COMMA_RE.sub("،", text)
    text = _PUNCT_SPACE_RE.sub(r"\1 ", text)
    return text.strip()


def build_tts_text(script_diacritized: str) -> str:
    """Prepara el guion diacritizado para síntesis de voz.

    El guion ya trae diacríticos (Tashkeel) del LLM; aquí solo se normaliza la
    puntuación para que ElevenLabs respete las pausas del director.
    """
    return preprocess_arabic_for_tts(script_diacritized)