"""CLI del pipeline audiovisual generativo con soporte árabe (ar-SA).

Uso:
    python main.py "Tema de la idea"            # ejecución completa (requiere .env)
    python main.py "Tema" --dry-run             # simula sin claves API (CI/tests)
    python main.py "Tema" --steps audio,video   # solo pasos indicados
    python main.py "Tema" --publish             # además publica en YouTube/TikTok
    python main.py --validate                   # valida pipeline_config.json

Requisito funcional RF-09: el CLI debe permitir seleccionar pasos, validar la
configuración y operar sin claves en modo simulación.
"""
from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

# Asegura que `src` sea importable al ejecutar main.py directamente.
sys.path.insert(0, str(Path(__file__).resolve().parent))

# Windows: la consola usa cp1252 por defecto; el árabe (y JSON) requiere UTF-8.
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    sys.stderr.reconfigure(encoding="utf-8", errors="replace")

from src.config import CONFIG_PATH, get_settings, load_config
from src.pipeline import Pipeline

VALID_STEPS = {"audio", "images", "video", "assembly", "all"}


def validate_config() -> int:
    """Valida pipeline_config.json y las claves de entorno presentes."""
    try:
        cfg = load_config()
        settings = get_settings()
    except (FileNotFoundError, KeyError, TypeError) as exc:
        print(f"[ERROR] Configuración inválida: {exc}")
        return 1

    print(f"Configuración OK: v{cfg.get('version', '?')} "
          f"(target: {settings.language_target})")
    required = [
        ("OPENAI_API_KEY", settings.openai_api_key),
        ("ELEVENLABS_API_KEY", settings.elevenlabs_api_key),
        ("RUNWAY_API_KEY", settings.runway_api_key),
    ]
    for name, value in required:
        status = "ok" if value else "FALTA (usa .env o --dry-run)"
        print(f"  {name}: {status}")
    return 0


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(
        description="Pipeline audiovisual generativo con soporte árabe (ar-SA)."
    )
    parser.add_argument("topic", nargs="?", help="Idea/tema a desarrollar")
    parser.add_argument("--dry-run", action="store_true", help="Simula sin claves API")
    parser.add_argument(
        "--steps",
        default="all",
        help=f"Pasos a ejecutar: {','.join(VALID_STEPS)} (default: all)",
    )
    parser.add_argument(
        "--validate",
        action="store_true",
        help="Valida pipeline_config.json y las claves de entorno",
    )
    parser.add_argument(
        "--no-cache",
        action="store_true",
        help="Ignora el caché SQLite (RF-10) y fuerza llamadas a API",
    )
    parser.add_argument(
        "--publish",
        action="store_true",
        help="Publica el MP4 final en YouTube Shorts y TikTok (RF-12)",
    )
    args = parser.parse_args(argv)

    if args.validate:
        return validate_config()

    if not args.topic:
        parser.print_help()
        return 2

    steps = {s.strip() for s in args.steps.split(",")}
    invalid = steps - VALID_STEPS
    if invalid:
        print(f"[ERROR] Pasos inválidos: {invalid}. Válidos: {VALID_STEPS}")
        return 2

    settings = get_settings()
    pipeline = Pipeline(settings=settings, dry_run=args.dry_run)
    pipeline.use_cache = not args.no_cache

    try:
        result = pipeline.run(args.topic, steps=steps)
        if args.publish and result.assembled_path:
            from src.publish import build_metadata_from_script, publish_video

            print("\n--- Publicando en redes (RF-12) ---")
            metadata = build_metadata_from_script(result.title)
            publish_video(str(result.assembled_path), metadata=metadata)
    except (RuntimeError, TimeoutError, FileNotFoundError) as exc:
        print(f"\n[ERROR] Pipeline falló: {exc}")
        return 1

    print("\n=== Resumen de la ejecución ===")
    print(json.dumps(result.to_manifest(), indent=2, ensure_ascii=False))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
