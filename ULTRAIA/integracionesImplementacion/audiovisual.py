"""CLI: Video audio-reactive sincronizado con música (Solución 4, RF-17).

Uso:
    python audiovisual.py pista.mp3                       # destellos por beat (pulse)
    python audiovisual.py pista.mp3 --style waveform      # forma de onda animada
    python audiovisual.py pista.mp3 --size 1080x1920      # vertical para Shorts
    python audiovisual.py pista.mp3 --analyze-only        # solo BPM/beats

Requiere ffmpeg en el PATH (para decodificar y renderizar).
"""
from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")

from src.audiovisual import build_audio_reactive, detect_beats


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Video audio-reactive (RF-17)")
    parser.add_argument("audio", help="Archivo de audio (MP3/WAV)")
    parser.add_argument("--style", default="pulse", choices=["pulse", "waveform"])
    parser.add_argument("--size", default="1080x1920", help="Dimensión del video")
    parser.add_argument("--analyze-only", action="store_true",
                        help="Solo detectar BPM/beats sin renderizar")
    args = parser.parse_args(argv)

    audio = Path(args.audio)
    if not audio.exists():
        print(f"[ERROR] No existe: {audio}")
        return 1

    try:
        if args.analyze_only:
            analysis = detect_beats(str(audio))
            print(json.dumps(analysis, indent=2))
        else:
            result = build_audio_reactive(str(audio), style=args.style, size=args.size)
            print(json.dumps(result, indent=2))
    except (RuntimeError, TimeoutError) as exc:
        print(f"\n[ERROR] {exc}")
        return 1

    return 0


if __name__ == "__main__":
    raise SystemExit(main())