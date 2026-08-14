"""System prompts del pipeline.

Requisito funcional RF-01: el LLM debe devolver SIEMPRE un JSON estricto con la
estructura definida en `MULTIMODAL_DIRECTOR_SYSTEM_PROMPT`. Este JSON es el
contrato que consumen los módulos de audio, imagen y video.

Soporte multilingüe (v2): el director detecta el idioma de la idea del usuario
y produce un guion EN ESE IDIOMA (subtítulos/TTS localizados), mientras que
los prompts visuales (`visual_prompt_en`) se generan SIEMPRE en inglés, que es
donde los modelos de imagen/video responden mejor.
"""
from __future__ import annotations

# Idiomas soportados por el director (entrada natural -> guion localizado).
SUPPORTED_LANGUAGES = [
    "es", "en", "ar", "fr", "pt", "de", "it", "ja", "zh", "hi", "ru",
]
LANGUAGE_NAMES = {
    "es": "español", "en": "inglés", "ar": "árabe", "fr": "francés",
    "pt": "portugués", "de": "alemán", "it": "italiano", "ja": "japonés",
    "zh": "chino", "hi": "hindi", "ru": "ruso",
}

_LANGUAGE_LIST = ", ".join(f"{k} ({v})" for k, v in LANGUAGE_NAMES.items())

MULTIMODAL_DIRECTOR_SYSTEM_PROMPT = """
Eres un Director Audiovisual Senior multilingüe. Debes procesar la idea del
usuario y devolver un JSON estricto con la siguiente estructura:

{
  "title": "Título del proyecto (en el idioma detectado)",
  "language": "código ISO corto detectado (es|en|ar|fr|pt|de|it|ja|zh|hi|ru)",
  "script_diacritized": "Guion para TTS: en árabe, con diacríticos (تَشْكِيل); en cualquier otro idioma, idéntico a script_plain.",
  "script_plain": "Guion sin diacríticos para subtítulos en pantalla.",
  "shot_list": [
    {
      "shot_id": 1,
      "duration_sec": 5,
      "visual_prompt_en": "Cinematic 8k shot, wide angle... (SIEMPRE en inglés)",
      "camera_movement": "Pan Right / Zoom In"
    }
  ]
}

Reglas:
1. Detecta el idioma de la idea del usuario entre: {languages}.
   El guion (title, script_plain) debe escribirse EN ESE IDIOMA.
2. `visual_prompt_en` DEBE estar en inglés (los modelos de imagen/video
   responden mejor en inglés). Incluye estilo cinematográfico, iluminación,
   resolución (8k), y consistencia de personajes/escenario entre shots.
3. `camera_movement` con movimiento explícito (Zoom In/Out, Pan, Tilt, Dolly...).
4. Cada shot dura 4-6 segundos; un video corto tiene 3-6 shots.
5. No incluyas texto fuera del JSON. No uses markdown.
""".replace("{languages}", _LANGUAGE_LIST)

# Retrocompatibilidad: el prompt anterior (solo ar-SA) sigue exportado para
# quien aún lo consuma; el pipeline usa MULTIMODAL_DIRECTOR_SYSTEM_PROMPT.
AUDIOVISUAL_DIRECTOR_SYSTEM_PROMPT = MULTIMODAL_DIRECTOR_SYSTEM_PROMPT


def build_user_prompt(topic: str) -> str:
    """Prompt de usuario: la idea/concepto a desarrollar (cualquier idioma)."""
    return f"Idea a desarrollar (puede estar en cualquier idioma): {topic}"


def detect_language_instruction() -> str:
    """Instrucción de refuerzo para forzar el idioma detectado en el guion."""
    return (
        "IMPORTANTE: el guion debe estar en el idioma de la idea del usuario. "
        "Los prompts visuales deben estar en inglés."
    )