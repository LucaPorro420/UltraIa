"""Tests del módulo de audio: mapeo de voces, TTS text prep, postproceso."""
from __future__ import annotations

from src import audio


def test_voice_map_has_multilingual_coverage() -> None:
    # Cobertura 10+ idiomas requerida.
    for code in ["ar", "es", "en", "fr", "pt", "de", "it", "ja", "zh", "hi", "ru"]:
        assert code in audio.VOICES_BY_LANG, f"falta voz para {code}"


def test_tts_text_for_empty() -> None:
    assert audio.tts_text_for("", "en") == ""


def test_save_audio_sanitizes_title(tmp_path) -> None:
    audio.save_audio(b"bytes", tmp_path, "Título: ¡Hola!")
    files = list(tmp_path.glob("*.mp3"))
    assert len(files) == 1
    # ':' y '!' (no alfanuméricos) se reemplazan por '_'; la tilde se conserva
    assert "_" in files[0].name
    assert ":" not in files[0].name
    assert "!" not in files[0].name


def test_postprocess_skips_without_ffmpeg(tmp_path, monkeypatch) -> None:
    monkeypatch.setattr(audio.shutil, "which", lambda _x: None)
    p = tmp_path / "a.mp3"
    p.write_bytes(b"abc")
    assert audio.postprocess_audio(p) == p  # no lanza sin ffmpeg