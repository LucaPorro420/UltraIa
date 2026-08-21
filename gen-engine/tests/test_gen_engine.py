"""Tests del Gen-Engine: health, capacidades y degradación keyless."""
from __future__ import annotations

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def test_health() -> None:
    res = client.get("/health")
    assert res.status_code == 200
    body = res.json()
    assert body["status"] == "ok"
    assert "local_engine" in body
    assert "device" in body


def test_capabilities_always_keyless_fallback() -> None:
    res = client.get("/capabilities")
    assert res.status_code == 200
    caps = res.json()
    assert caps["image"] in {"local", "keyless"}
    assert caps["tts"] == "keyless"


def test_tts_generates_audio_keyless() -> None:
    res = client.post("/generate/tts", json={"text": "hola mundo", "language": "es"})
    assert res.status_code == 200
    body = res.json()
    assert body["provider"] == "edge-tts"
    assert body["url"].startswith("/media/")


def test_image_keyless_when_no_gpu(monkeypatch) -> None:
    monkeypatch.setattr("app.providers._HAS_LOCAL", False)
    monkeypatch.setattr(
        "src.images.generate_image_pollinations",
        lambda prompt, **kw: f"https://img.mock/{prompt[:20]}",
    )
    res = client.post(
        "/generate/image",
        json={"prompt": "a test image", "width": 1024, "height": 576},
    )
    assert res.status_code == 200
    body = res.json()
    assert body["provider"] in {"pollinations", "local"}
    assert body["url"].startswith("https://")


def test_invalid_provider_rejected() -> None:
    res = client.post(
        "/generate/image",
        json={"prompt": "x", "provider": "hack"},
    )
    assert res.status_code == 422


def test_music_keyless_composition() -> None:
    res = client.post("/generate/music", json={"prompt": "calm ambient", "duration_sec": 20})
    assert res.status_code == 200
    body = res.json()
    assert body["provider"] == "keyless-synthesis"
    assert "note" in body


def test_video_keyless_storyboard(monkeypatch) -> None:
    monkeypatch.setattr("app.providers._HAS_LOCAL", False)
    monkeypatch.setattr(
        "src.images.generate_image_pollinations",
        lambda prompt, **kw: f"https://img.mock/{len(prompt)}",
    )
    res = client.post(
        "/generate/video",
        json={"prompt": "a car driving", "frames": 2, "duration_sec": 5},
    )
    assert res.status_code == 200
    body = res.json()
    assert body["provider"] == "storyboard"
    assert len(body["frames"]) == 2