"""Paquete del pipeline audiovisual generativo con soporte árabe (ar-SA).

Flujo end-to-end: idea -> LLM (guion JSON) -> ElevenLabs (audio) -> DALL-E/FLUX
(imágenes) -> Runway/Fal.ai (video) -> artefactos en `output/`.

Módulos:
    config   : carga pipeline_config.json + variables de entorno.
    prompts  : system prompts del "Director Audiovisual" (JSON estricto).
    arabic   : preprocesamiento de texto árabe para TTS.
    llm      : generación del guion estructurado vía API OpenAI-compatible.
    audio    : síntesis de voz en ElevenLabs.
    images   : generación de imágenes (OpenAI DALL-E 3 o Fal.ai FLUX).
    video    : generación de video (Runway Gen-3 o Fal.ai Kling) con polling.
    pipeline : orquestador que conecta todos los pasos.
"""

__version__ = "2.0.0"