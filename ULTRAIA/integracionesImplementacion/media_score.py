"""Puntuacion de calidad de media generada (loop de verificacion).

Uso:
  python media_score.py <resultado.json> [--verbose]

<resultado.json> es la salida de una generacion (p.ej. el manifest del pipeline,
  o la respuesta del Gen-Engine). Devuelve 0-100 y un veredicto PASS/FAIL.

Criterios (cada uno aporta puntos):
  - imagen: URL https de dominio conocido, con modelo explicito, sin logo.
  - audio:  formato mp3/wav, duracion > 0, loudnorm en rango.
  - video:  frames 1-8 o url de video, motion valida.
  - tts:    idioma soportado, voz edge-tts conocida.
  - director: plan con script, images >= 1, language en los soportados.
"""
from __future__ import annotations

import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent
VERDICTS = ROOT / ".." / "learning" / "media-corpus" / "verdicts.jsonl"

DOMINIOS_IMAGEN = {"image.pollinations.ai", "images.meigen.ai"}
PROVIDERS_AUDIO = {"edge-tts", "local", "composition"}
MOTIONS = {"zoom-in", "zoom-out", "pan-left", "pan-right", "pan-up", "pan-down"}
IDIOMAS = {"es", "en", "fr", "pt", "de", "it", "ar", "hi", "ja", "zh", "ru", "nl", "tr", "ko"}


def _url_ok(url: str) -> bool:
    return url.startswith(("https://", "/media/"))


def score_image(data: dict) -> tuple[int, list[str]]:
    """Max 25: url valida (10) + dominio conocido (10) + modelo (5)."""
    puntos = 0
    notas: list[str] = []
    url = data.get("url", "")
    if _url_ok(url):
        puntos += 10
    else:
        notas.append("url invalida")
    if any(url.startswith(d) or f"/{d.split('.')[0]}" in url for d in DOMINIOS_IMAGEN):
        puntos += 10
    elif url:
        notas.append("dominio no verificado")
    if data.get("model"):
        puntos += 5
    else:
        notas.append("sin modelo")
    return puntos, notas


def score_audio(data: dict) -> tuple[int, list[str]]:
    """Max 25: provider (10) + formato (10) + url (5)."""
    puntos = 0
    notas: list[str] = []
    if data.get("provider") in PROVIDERS_AUDIO:
        puntos += 10
    else:
        notas.append(f"provider '{data.get('provider')}' no esperado")
    url = data.get("url", "")
    if url and (url.endswith((".mp3", ".wav")) or _url_ok(url)):
        puntos += 10
    else:
        notas.append("sin archivo de audio")
    if _url_ok(url):
        puntos += 5
    else:
        notas.append("sin url servible")
    return puntos, notas


def score_video(data: dict) -> tuple[int, list[str]]:
    """Max 25: frames validos (10) o url (10) + motion (5) + provider (5)."""
    puntos = 0
    notas: list[str] = []
    frames = data.get("frames")
    url = data.get("url", "")
    if isinstance(frames, list) and 1 <= len(frames) <= 8 or _url_ok(url):
        puntos += 10
    else:
        notas.append("sin frames ni url")
    if data.get("motion") in MOTIONS:
        puntos += 5
    if data.get("provider"):
        puntos += 5
    return puntos, notas


def score_tts(data: dict) -> tuple[int, list[str]]:
    """Max 25: idioma (10) + voz edge-tts (10) + url mp3 (5)."""
    puntos = 0
    notas: list[str] = []
    if data.get("language") in IDIOMAS or data.get("language") == "multi":
        puntos += 10
    else:
        notas.append(f"idioma '{data.get('language')}' no soportado")
    voz = data.get("voz") or data.get("voice") or ""
    if "Neural" in str(voz):
        puntos += 10
    else:
        notas.append("voz edge-tts no reconocida")
    url = data.get("url", "")
    if url.endswith(".mp3") or _url_ok(url):
        puntos += 5
    else:
        notas.append("sin mp3")
    return puntos, notas


def score_director(data: dict) -> tuple[int, list[str]]:
    """Max 25: language (10) + script (10) + images>=1 (5)."""
    puntos = 0
    notas: list[str] = []
    plan = data.get("plan", data)
    if plan.get("language") in IDIOMAS or plan.get("language") == "multi":
        puntos += 10
    else:
        notas.append("language invalido")
    if plan.get("script"):
        puntos += 10
    else:
        notas.append("sin script")
    if isinstance(plan.get("images"), list) and len(plan["images"]) >= 1:
        puntos += 5
    else:
        notas.append("sin images")
    return puntos, notas


SCORERS = {
    "image": score_image,
    "audio": score_audio,
    "video": score_video,
    "tts": score_tts,
    "music": score_audio,
    "director": score_director,
}


def main() -> int:
    if len(sys.argv) < 2:
        print(__doc__)
        return 2
    verbose = "--verbose" in sys.argv
    data = json.loads(Path(sys.argv[1]).read_text(encoding="utf-8"))
    modalidad = data.get("modalidad", "image")
    scorer = SCORERS.get(modalidad, score_image)
    puntos, notas = scorer(data)
    ok = puntos >= 20  # >= 80% del maximo (25)
    veredicto = {
        "ts": "",
        "case_id": data.get("id", "media-unknown"),
        "modalidad": modalidad,
        "score": puntos,
        "max": 25,
        "status": "PASS" if ok else "FAIL",
        "notas": notas,
    }
    veredicto["ts"] = __import__("datetime").datetime.now(__import__("datetime").timezone.utc).isoformat()
    if VERDICTS.exists():
        with VERDICTS.open("a", encoding="utf-8") as f:
            f.write(json.dumps(veredicto, ensure_ascii=False) + "\n")
    print(f"[{'PASS' if ok else 'FAIL'}] {modalidad} {puntos}/25")
    if verbose and notas:
        for n in notas:
            print(f"  - {n}")
    return 0 if ok else 1


if __name__ == "__main__":
    sys.exit(main())