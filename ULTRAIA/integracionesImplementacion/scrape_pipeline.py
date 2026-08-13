"""CLI: Web-scraping → Video Shorts automatizado (Solución 2 high-demand).

Uso:
    python scrape_pipeline.py "https://noticia-ejemplo.com/articulo"
    python scrape_pipeline.py URL --dry-run          # sin claves API
    python scrape_pipeline.py URL --publish          # sube a YouTube/TikTok

Flujo (RF-15): URL → extracción (BeautifulSoup) → resumen LLM → topic →
Pipeline (guion árabe + audio + imágenes + video + ensamblado).
"""
from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

import requests

sys.path.insert(0, str(Path(__file__).resolve().parent))
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")

from src.config import get_settings
from src.pipeline import Pipeline
from src.scraper import fetch_article, summarize_article


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Scraping → Shorts automatizado (RF-15)")
    parser.add_argument("url", help="URL del artículo/página a convertir en video")
    parser.add_argument("--dry-run", action="store_true", help="Simula sin claves API")
    parser.add_argument("--steps", default="all",
                        help="audio,images,video,assembly,all (default: all)")
    parser.add_argument("--publish", action="store_true",
                        help="Publica el resultado en YouTube/TikTok")
    args = parser.parse_args(argv)

    settings = get_settings()

    try:
        print(f"--- 1. Extrayendo artículo: {args.url} ---")
        article = fetch_article(args.url)
        print(f"Título: {article['title']}")
        print(f"Texto extraído: {len(article['text'])} caracteres")

        if not args.dry_run:
            print("--- 2. Resumiendo con LLM ---")
            summary = summarize_article(article, settings)
        else:
            summary = {
                "topic": "El resumen del artículo como idea para un Short.",
                "title": "Noticia del día",
                "summary": "(simulado)",
            }
        print(json.dumps(summary, indent=2, ensure_ascii=False))

        print("--- 3. Generando video con el pipeline audiovisual ---")
        pipeline = Pipeline(settings=settings, dry_run=args.dry_run)
        steps = {s.strip() for s in args.steps.split(",")}
        result = pipeline.run(summary["topic"], steps=steps)

        if args.publish and result.assembled_path:
            from src.publish import build_metadata_from_script, publish_video

            print("--- 4. Publicando ---")
            metadata = build_metadata_from_script(result.title)
            publish_video(str(result.assembled_path), metadata=metadata)

    except (RuntimeError, TimeoutError, requests.RequestException) as exc:
        print(f"\n[ERROR] {exc}")
        return 1

    return 0


if __name__ == "__main__":
    raise SystemExit(main())