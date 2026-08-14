"""Tests del módulo de video: filtro Ken Burns direccional y extracción de URLs."""
from __future__ import annotations

import pytest

from src import video
from src.video import _MOTIONS, _zoompan_filter, get_video_url


@pytest.mark.parametrize(
    "motion",
    ["zoom-in", "zoom-out", "pan-left", "pan-right", "pan-up", "pan-down"],
)
def test_zoompan_filter_variants(motion: str) -> None:
    filt = _zoompan_filter(motion, fps=24, duration_sec=5, size="1920x1080")
    assert "zoompan=" in filt
    assert "d=120" in filt  # 24 fps * 5 s
    assert "s=1920x1080" in filt


def test_zoompan_filter_contains_scale_pad() -> None:
    filt = _zoompan_filter("zoom-in", 24, 5, "1280x720")
    assert "scale=1280x720:force_original_aspect_ratio=decrease" in filt
    assert "pad=1280x720" in filt


def test_unknown_motion_defaults_to_zoom_in() -> None:
    filt = _zoompan_filter("spiral", 24, 5, "1920x1080")
    assert "min(zoom+0.0015,1.15)" in filt  # expresión de zoom-in


def test_all_motions_are_valid() -> None:
    assert "zoom-in" in _MOTIONS
    assert "pan-down" in _MOTIONS


def test_get_video_url_output_list() -> None:
    assert get_video_url({"output": ["https://a/v.mp4"]}) == "https://a/v.mp4"


def test_get_video_url_output_str() -> None:
    assert get_video_url({"output": "https://b/v.mp4"}) == "https://b/v.mp4"


def test_get_video_url_video_dict() -> None:
    assert get_video_url({"video": {"url": "https://c/v.mp4"}}) == "https://c/v.mp4"


def test_get_video_url_none() -> None:
    assert get_video_url({"foo": "bar"}) is None