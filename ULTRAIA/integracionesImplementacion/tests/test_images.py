"""Tests del módulo de imágenes: dispatcher keyless (pollinations) y clamps."""
from __future__ import annotations

import pytest

from src import images
from src.config import get_settings


class FakeResponse:
    def __init__(self, status: int, url: str, text: str = "") -> None:
        self.status_code = status
        self.url = url
        self.text = text


def test_pollinations_url_shape(monkeypatch) -> None:
    captured: dict = {}

    def fake_get(url: str, timeout: int, allow_redirects: bool) -> FakeResponse:
        captured["url"] = url
        return FakeResponse(200, "https://image.pollinations.ai/result.png")

    monkeypatch.setattr(images.requests, "get", fake_get)
    url = images.generate_image_pollinations("a sunset over lima", seed=42, width=1024, height=576)
    assert url == "https://image.pollinations.ai/result.png"
    assert captured["url"].startswith("https://image.pollinations.ai/prompt/a%20sunset%20over%20lima?")
    assert "width=1024" in captured["url"]
    assert "height=576" in captured["url"]
    assert "seed=42" in captured["url"]
    assert "nologo=true" in captured["url"]


def test_pollinations_clamps_dimensions(monkeypatch) -> None:
    captured: dict = {}

    def fake_get(url: str, timeout: int, allow_redirects: bool) -> FakeResponse:
        captured["url"] = url
        return FakeResponse(200, "https://x/y.png")

    monkeypatch.setattr(images.requests, "get", fake_get)
    images.generate_image_pollinations("x", width=5, height=9000)
    assert "width=128" in captured["url"]  # clamp inferior
    assert "height=1792" in captured["url"]  # clamp superior


def test_pollinations_http_error_raises(monkeypatch) -> None:
    def fake_get(url: str, timeout: int, allow_redirects: bool) -> FakeResponse:
        return FakeResponse(500, "", text="boom")

    monkeypatch.setattr(images.requests, "get", fake_get)
    with pytest.raises(RuntimeError, match="Error Pollinations"):
        images.generate_image_pollinations("x")


def test_dispatch_pollinations_keyless(monkeypatch) -> None:
    """El provider 'pollinations' NO debe requerir clave alguna."""
    captured: dict = {}

    def fake_get(url: str, timeout: int, allow_redirects: bool) -> FakeResponse:
        captured["url"] = url
        return FakeResponse(200, "https://image.pollinations.ai/r.png")

    monkeypatch.setattr(images.requests, "get", fake_get)
    settings = get_settings()
    url = images.generate_image("una ciudad futurista", settings, "pollinations")
    assert url.startswith("https://image.pollinations.ai")
    assert captured["url"].startswith("https://image.pollinations.ai/prompt/una%20ciudad%20futurista")


def test_dispatch_unknown_provider_falls_back_to_keyless(monkeypatch) -> None:
    """Un provider inválido no debe romper el pipeline: degrada a pollinations."""
    captured: dict = {}

    def fake_get(url: str, timeout: int, allow_redirects: bool) -> FakeResponse:
        captured["url"] = url
        return FakeResponse(200, "https://image.pollinations.ai/r.png")

    monkeypatch.setattr(images.requests, "get", fake_get)
    settings = get_settings()
    url = images.generate_image("x", settings, "nope")
    assert url.startswith("https://image.pollinations.ai")


def test_dispatch_openai_requires_key(monkeypatch) -> None:
    from src.config import Settings as S

    settings = S(
        language_target="es", llm_model="gpt-4o", llm_temperature=0.7,
        llm_base_url="https://api.openai.com/v1", openai_api_key="",
        voice_id="v", elevenlabs_api_key="", runway_api_key="",
        video_provider="runway", image_model="dall-e-3", image_size="1024x1792",
        image_provider="openai", video_model="gen3a_turbo", video_duration_sec=5,
        video_aspect_ratio="16:9", polling_initial_delay=10, polling_max_delay=30,
        polling_max_retries=20, fal_key_id="", fal_key_secret="",
        fal_image_model="fal-ai/flux/dev", fal_video_model="fal-ai/kling-video/v1",
    )
    with pytest.raises(RuntimeError, match="Falta la clave API 'OPENAI_API_KEY'"):
        images.generate_image("x", settings, "openai")