"""CLI: Anuncios generativos en tiempo real (Solución 3 high-demand, RF-16).

Uso:
    python ads.py --city "Dubai" --product "café helado"
    python ads.py --stock AAPL --product "iPhone"
    python ads.py --json <url> --product "auto eléctrico"
    python ads.py --city Lima --product "paraguas" --dry-run     # sin claves
    python ads.py --city Lima --product "x" --provider fal      # FLUX vía Fal.ai
"""
from __future__ import annotations

import argparse
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")

from src.ads import build_ad_prompt, fetch_json, fetch_stock, fetch_weather, generate_realtime_ad
from src.config import get_settings


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Anuncio generativo con datos en vivo (RF-16)")
    group = parser.add_mutually_exclusive_group(required=True)
    group.add_argument("--city", help="Ciudad para clima real (Open-Meteo, sin key)")
    group.add_argument("--stock", help="Símbolo bursátil (Yahoo Finance)")
    group.add_argument("--json", dest="json_url", help="URL de cualquier API JSON en vivo")
    parser.add_argument("--product", required=True, help="Producto/servicio anunciado")
    parser.add_argument("--provider", default="openai", choices=["openai", "fal"],
                        help="DALL-E 3 (openai) o FLUX (fal)")
    parser.add_argument("--dry-run", action="store_true", help="Simula sin claves API")
    args = parser.parse_args(argv)

    settings = get_settings()

    try:
        print("--- 1. Consultando datos en tiempo real ---")
        if args.city:
            data = fetch_weather(args.city)
        elif args.stock:
            data = fetch_stock(args.stock)
        else:
            data = fetch_json(args.json_url)
        print(f"Fuente: {data['source']} | {data['fetched_at']}")

        print("\n--- 2. Prompt publicitario dinámico ---")
        prompt = build_ad_prompt(data, args.product)
        print(prompt)

        print("\n--- 3. Generando imagen del anuncio ---")
        if args.dry_run:
            print("  [simulado] DALL-E 3 / FLUX con el prompt anterior.")
        else:
            path = generate_realtime_ad(data, args.product, settings, args.provider)
            print(f"Anuncio generado: {path}")

    except (RuntimeError, TimeoutError) as exc:
        print(f"\n[ERROR] {exc}")
        return 1

    return 0


if __name__ == "__main__":
    raise SystemExit(main())