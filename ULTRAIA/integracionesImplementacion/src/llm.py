"""Generación del guion estructurado (JSON) vía API OpenAI-compatible.

Requisito funcional RF-03: dado un tema, el LLM devuelve el JSON estricto del
"Director Audiovisual" (ver `prompts.py`). El endpoint es compatible con
OpenAI, DeepSeek y Ollama (mismo formato /chat/completions).

Base: `gemini-code-1786583058526.py` (modernizado: sin SDK legacy, claves desde
entorno, manejo de errores HTTP explícito).
"""
from __future__ import annotations

import json

import requests

from .config import Settings, require_key
from .prompts import AUDIOVISUAL_DIRECTOR_SYSTEM_PROMPT, build_user_prompt


def generate_script_json(topic: str, settings: Settings) -> dict:
    """Llama al LLM y devuelve el guion JSON estructurado.

    Args:
        topic: idea/concepto a desarrollar (p. ej. "Ciudad inteligente en el desierto").
        settings: configuración activa del pipeline.

    Returns:
        dict con claves: title, script_arabic_diacritized,
        script_arabic_plain, shot_list.

    Raises:
        RuntimeError: si falta OPENAI_API_KEY o el LLM no devuelve JSON válido.
    """
    require_key("OPENAI_API_KEY", settings.openai_api_key)

    url = f"{settings.llm_base_url.rstrip('/')}/chat/completions"
    headers = {
        "Authorization": f"Bearer {settings.openai_api_key}",
        "Content-Type": "application/json",
    }
    payload = {
        "model": settings.llm_model,
        "temperature": settings.llm_temperature,
        "response_format": {"type": "json_object"},
        "messages": [
            {"role": "system", "content": AUDIOVISUAL_DIRECTOR_SYSTEM_PROMPT},
            {"role": "user", "content": build_user_prompt(topic)},
        ],
    }

    res = requests.post(url, headers=headers, json=payload, timeout=90)
    if res.status_code == 429:
        raise RuntimeError("Rate limit del LLM (429). Espera y reintenta.")
    if res.status_code != 200:
        raise RuntimeError(f"Error LLM ({res.status_code}): {res.text[:500]}")

    content = res.json()["choices"][0]["message"]["content"]
    try:
        return json.loads(content)
    except json.JSONDecodeError as exc:
        raise RuntimeError(
            f"El LLM no devolvió JSON válido. Respuesta cruda: {content[:300]}"
        ) from exc