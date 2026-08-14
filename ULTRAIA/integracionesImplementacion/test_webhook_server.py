"""Tests del servidor de webhooks (auth X-Webhook-Secret + payloads Runway/Fal).

Run:  pytest test_webhook_server.py -q   (o: python test_webhook_server.py)
"""
from __future__ import annotations

import os

from fastapi.testclient import TestClient

os.environ.setdefault("WEBHOOK_SECRET", "test-secret-123")
import webhook_server as w

# Sin red en CI/dev: el background task de descarga se neutraliza (se prueba la
# ruta + auth, no la descarga).
w.process_final_video = lambda url, task_id, audio_path=None: print(  # noqa: E731
    f"[test] skip download {url} (task {task_id})"
)

client = TestClient(w.app)


def test_reject_without_token() -> None:
    res = client.post("/webhook/runway", json={"id": "t1", "status": "SUCCEEDED"})
    assert res.status_code == 401


def test_reject_wrong_token() -> None:
    res = client.post(
        "/webhook/fal",
        json={"request_id": "f1", "status": "COMPLETED"},
        headers={"X-Webhook-Secret": "wrong"},
    )
    assert res.status_code == 401


def test_runway_succeeded_with_token() -> None:
    res = client.post(
        "/webhook/runway",
        json={"id": "t1", "status": "SUCCEEDED", "output": ["https://example.com/v.mp4"]},
        headers={"X-Webhook-Secret": w.WEBHOOK_SECRET},
    )
    assert res.status_code == 200
    assert res.json() == {"status": "received"}


def test_runway_other_status_accepted() -> None:
    res = client.post(
        "/webhook/runway",
        json={"id": "t2", "status": "FAILED"},
        headers={"X-Webhook-Secret": w.WEBHOOK_SECRET},
    )
    assert res.status_code == 200


def test_fal_completed_with_token() -> None:
    res = client.post(
        "/webhook/fal",
        json={"request_id": "f1", "status": "COMPLETED", "video": {"url": "https://example.com/v.mp4"}},
        headers={"X-Webhook-Secret": w.WEBHOOK_SECRET},
    )
    assert res.status_code == 200
    assert res.json() == {"status": "received"}


def test_fal_video_output_fallback() -> None:
    res = client.post(
        "/webhook/fal",
        json={"id": "f2", "status": "COMPLETED", "output": "https://example.com/v2.mp4"},
        headers={"X-Webhook-Secret": w.WEBHOOK_SECRET},
    )
    assert res.status_code == 200


if __name__ == "__main__":
    import sys

    failures = 0
    for name, fn in sorted(globals().items()):
        if name.startswith("test_") and callable(fn):
            try:
                fn()
                print(f"PASS {name}")
            except AssertionError as exc:
                failures += 1
                print(f"FAIL {name}: {exc}")
    sys.exit(1 if failures else 0)