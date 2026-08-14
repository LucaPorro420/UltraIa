"""Tests del ensamblado: SRT, timecodes, escape de rutas para filtros ffmpeg."""
from __future__ import annotations

from src import assembly
from src.assembly import _escape_filter_path, _srt_timecode, generate_srt


def test_srt_timecode_format() -> None:
    assert _srt_timecode(0.0) == "00:00:00,000"
    assert _srt_timecode(5.0) == "00:00:05,000"
    assert _srt_timecode(65.4) == "00:01:05,400"


def test_generate_srt_two_shots(tmp_path) -> None:
    shots = [
        {"shot_id": 1, "duration_sec": 5},
        {"shot_id": 2, "duration_sec": 3},
    ]
    out = tmp_path / "subs.srt"
    generate_srt("texto del guion", shots, out)
    content = out.read_text(encoding="utf-8")
    lines = content.splitlines()
    assert lines[0] == "1"
    assert "00:00:00,000" in content
    assert "00:00:05,000" in content  # primer shot termina en 5s
    # último shot: 8s - fade_out 0.5s = 7.5s
    assert "00:00:07,500" in content
    assert "texto del guion" in content


def test_generate_srt_fade_out_last_shot(tmp_path) -> None:
    shots = [{"shot_id": 1, "duration_sec": 5}]
    out = tmp_path / "subs.srt"
    generate_srt("x", shots, out, fade_out_sec=1.0)
    content = out.read_text(encoding="utf-8")
    assert "00:00:04,000" in content  # 5 - 1.0 de fade


def test_escape_filter_path_windows() -> None:
    assert _escape_filter_path(r"C:\data\subs.srt") == "C\\:/data/subs.srt"
    assert _escape_filter_path("C:/data/a'b.srt") == "C\\:/data/a\\'b.srt"


def test_escape_filter_path_posix() -> None:
    assert _escape_filter_path("/tmp/subs.srt") == "/tmp/subs.srt"