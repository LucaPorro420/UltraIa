"""Tests del director multilingüe: cobertura de idiomas y contrato del prompt."""
from __future__ import annotations

from src.prompts import (
    AUDIOVISUAL_DIRECTOR_SYSTEM_PROMPT,
    LANGUAGE_NAMES,
    MULTIMODAL_DIRECTOR_SYSTEM_PROMPT,
    SUPPORTED_LANGUAGES,
    build_user_prompt,
)


def test_supported_languages_10_plus() -> None:
    assert len(SUPPORTED_LANGUAGES) >= 10


def test_all_supported_languages_have_names() -> None:
    for code in SUPPORTED_LANGUAGES:
        assert code in LANGUAGE_NAMES, f"falta nombre para {code}"


def test_prompt_mentions_contract_keys() -> None:
    for key in ["title", "language", "script_diacritized", "script_plain", "shot_list"]:
        assert key in MULTIMODAL_DIRECTOR_SYSTEM_PROMPT


def test_prompt_mentions_english_visual_prompts() -> None:
    assert "visual_prompt_en" in MULTIMODAL_DIRECTOR_SYSTEM_PROMPT
    assert "SIEMPRE en inglés" in MULTIMODAL_DIRECTOR_SYSTEM_PROMPT


def test_legacy_alias_kept() -> None:
    # Retrocompatibilidad: el nombre antiguo sigue exportado y apunta al v2.
    assert AUDIOVISUAL_DIRECTOR_SYSTEM_PROMPT == MULTIMODAL_DIRECTOR_SYSTEM_PROMPT


def test_user_prompt_mentions_any_language() -> None:
    assert "cualquier idioma" in build_user_prompt("x")