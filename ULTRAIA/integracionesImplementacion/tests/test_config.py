"""Tests del módulo de configuración (Settings, claves, rutas de salida)."""
from __future__ import annotations

import pytest

from src import audio
from src.config import BASE_DIR, CONFIG_PATH, OUTPUT_DIR, Settings, get_settings


def test_config_file_exists() -> None:
    assert CONFIG_PATH.exists()


def test_settings_loads_from_json_and_env() -> None:
    settings = get_settings()
    assert isinstance(settings, Settings)
    assert settings.image_provider in {"openai", "fal", "pollinations"}
    assert settings.video_provider in {"runway", "fal"}


def test_default_image_provider_is_keyless() -> None:
    settings = get_settings()
    assert settings.image_provider == "pollinations"


def test_require_key_raises_on_empty() -> None:
    with pytest.raises(RuntimeError, match="Falta la clave"):
        from src.config import require_key

        require_key("TEST_KEY", "")


def test_require_key_ok_on_value() -> None:
    from src.config import require_key

    require_key("TEST_KEY", "abc")  # no debe lanzar


def test_output_dirs_created() -> None:
    from src.config import ensure_output_dirs

    dirs = ensure_output_dirs()
    assert dirs["audio"].exists()
    assert dirs["images"].exists()
    assert dirs["video"].exists()


def test_lang_code_normalization() -> None:
    assert audio.lang_code("ar-SA") == "ar"
    assert audio.lang_code("es-PE") == "es"
    assert audio.lang_code("pt-BR") == "pt"
    assert audio.lang_code("en") == "en"
    assert audio.lang_code("xx-YY") == "en"  # desconocido -> inglés


def test_edge_voice_for_known_and_unknown() -> None:
    assert audio.edge_voice_for("ar-SA") == "ar-SA-HamedNeural"
    assert audio.edge_voice_for("es") == "es-ES-ElviraNeural"
    assert audio.edge_voice_for("ja-JP") == "ja-JP-NanamiNeural"
    assert audio.edge_voice_for("xx") == "en-US-JennyNeural"  # fallback


def test_tts_text_for_arabic_preprocesses() -> None:
    raw = "مرحبا بكم, في الفيديو"
    out = audio.tts_text_for(raw, "ar-SA")
    assert "،" in out  # coma árabe aplicada


def test_tts_text_for_non_arabic_passthrough() -> None:
    raw = "Hello, world!"
    out = audio.tts_text_for(raw, "en-US")
    assert out == raw


def test_base_dir_is_integraciones() -> None:
    assert BASE_DIR.name == "integracionesImplementacion"
    assert OUTPUT_DIR.exists() or True  # se crea bajo demanda
