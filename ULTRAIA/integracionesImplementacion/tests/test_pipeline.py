"""Tests del orquestador: dry-run end-to-end sin red y retrocompatibilidad."""
from __future__ import annotations

from src.pipeline import Pipeline, _script_text, has_paid_video
from src.config import get_settings


def test_dry_run_full_pipeline(tmp_path, monkeypatch) -> None:
    """Ejecución completa en modo simulación: guion->audio->imagen->video->MP4."""
    settings = get_settings()
    pipe = Pipeline(settings=settings, dry_run=True)
    pipe.dirs = {
        "audio": tmp_path / "audio",
        "images": tmp_path / "images",
        "video": tmp_path / "video",
        "meta": tmp_path / "meta",
    }
    for d in pipe.dirs.values():
        d.mkdir(parents=True, exist_ok=True)

    result = pipe.run("ciudad inteligente", steps={"all"})
    assert result.title
    assert result.audio_path is not None and result.audio_path.exists()
    assert len(result.images) == 2
    assert len(result.videos) == 2
    assert result.assembled_path is not None and result.assembled_path.exists()

    manifest = result.to_manifest()
    assert manifest["assembled"] is not None
    assert len(manifest["images"]) == 2


def test_mock_script_localized_per_language() -> None:
    es = Pipeline._mock_script("x", language="es")
    assert es["language"] == "es"
    assert "ciudades inteligentes" in es["title"]
    assert "desierto" in es["script_plain"]

    en = Pipeline._mock_script("x", language="en")
    assert en["language"] == "en"
    assert "smart cities" in en["title"].lower()

    ar = Pipeline._mock_script("x", language="ar")
    assert ar["script_diacritized"] != ar["script_plain"]  # con Tashkeel


def test_script_text_backward_compat() -> None:
    legacy = {"script_arabic_plain": "texto legado"}
    assert _script_text(legacy) == "texto legado"
    modern = {"script_plain": "texto nuevo"}
    assert _script_text(modern) == "texto nuevo"
    modern_wins = {"script_plain": "nuevo", "script_arabic_plain": "legado"}
    assert _script_text(modern_wins) == "nuevo"
    empty = {}
    assert _script_text(empty) == ""


def test_has_paid_video_without_keys() -> None:
    s = get_settings()
    s = s.__class__(**{**s.__dict__, "runway_api_key": "", "fal_key_id": "", "fal_key_secret": ""})
    assert has_paid_video(s) is False


def test_has_paid_video_with_runway_key() -> None:
    s = get_settings()
    s = s.__class__(**{**s.__dict__, "runway_api_key": "rk", "fal_key_id": "", "fal_key_secret": ""})
    assert has_paid_video(s) is True


def test_has_paid_video_with_fal_keys() -> None:
    s = get_settings()
    s = s.__class__(
        **{**s.__dict__, "video_provider": "fal", "runway_api_key": "",
           "fal_key_id": "fid", "fal_key_secret": "fsec"}
    )
    assert has_paid_video(s) is True