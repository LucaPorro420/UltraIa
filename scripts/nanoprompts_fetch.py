"""Scraper de nanoprompts.org/es -> copia local offline (JSON + imagenes).

Verdad verificada: nanoprompts.org/es tiene 400+ prompts con imagen de resultado
(fuente: integracionTecno.txt, ultimo tramo). Este script:

1. Descubre URLs de detalle desde las paginas indice (trending + categorias).
2. Extrae de cada pagina: titulo, prompt, categoria, fecha, dificultad, tags,
   descripcion, imagen(es).
3. Guarda JSON por prompt en learning/nanoprompts/prompts/ y las imagenes en
   learning/nanoprompts/images/ (uso offline).

Uso:
    python scripts/nanoprompts_fetch.py --limit 6        # batch piloto
    python scripts/nanoprompts_fetch.py --full           # todos los descubiertos
    python scripts/nanoprompts_fetch.py --rebuild        # re-extraer sin descargar

Dependencias: solo stdlib (urllib, re, json, html).
"""
from __future__ import annotations

import argparse
import html
import json
import os
import re
import sys
import time
import urllib.request
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parent.parent
OUT_DIR = ROOT / "learning" / "nanoprompts"
PROMPTS_DIR = OUT_DIR / "prompts"
IMAGES_DIR = OUT_DIR / "images"
INDEX_FILE = OUT_DIR / "index.json"

BASE = "https://nanoprompts.org/es"
HEADERS = {"User-Agent": "Mozilla/5.0 (UltraIa nanoprompts-fetch/0.1)"}

INDEX_URLS = [
    f"{BASE}/prompt-handbook/trending-prompts/",
    f"{BASE}/prompt-handbook/",
]

CATEGORY_RE = re.compile(r'href="(/es/prompt-handbook/[a-z0-9-]+/)"')
DETAIL_RE = re.compile(r'href="(/es/[^"]+)"')
TITLE_RE = re.compile(r"<h1[^>]*>(.*?)</h1>", re.S)
PROMPT_RE = re.compile(r'id="promptText"[^>]*>(.*?)</div>', re.S)
BADGE_RE = re.compile(r'class="prompt-badge"[^>]*>(.*?)</span>', re.S)
IMG_RE = re.compile(r'<img[^>]+src="(https://banana-prompt\.nanoprompts\.org/[^"]+)"', re.I)
DESC_RE = re.compile(r'<meta name="description" content="([^"]+)"')
META_ITEM_RE = re.compile(r'class="prompt-meta-item"[^>]*>(.*?)</span>', re.S)

API_BASE = "https://nanoprompts.org/prompts"


def fetch(url: str) -> str:
    req = urllib.request.Request(url, headers=HEADERS)
    with urllib.request.urlopen(req, timeout=30) as resp:
        return resp.read().decode("utf-8", errors="replace")


def strip_tags(text: str) -> str:
    text = re.sub(r"<[^>]+>", " ", text)
    return html.unescape(re.sub(r"\s+", " ", text)).strip()


def discover_urls() -> list[str]:
    urls: list[str] = []
    for index in INDEX_URLS:
        try:
            page = fetch(index)
        except Exception as exc:  # noqa: BLE001 - degradar sin romper el resto
            print(f"[warn] no se pudo leer {index}: {exc}")
            continue
        for m in DETAIL_RE.finditer(page):
            url = m.group(1)
            if url in urls or not url.endswith((".html", "/")):
                continue
            if url.endswith(".html"):
                url = url[:-5]
            urls.append(url)
    print(f"[ok] {len(urls)} urls de detalle descubiertas")
    return urls


def discover_categories() -> list[str]:
    cats: list[str] = []
    for index in INDEX_URLS:
        try:
            page = fetch(index)
        except Exception as exc:  # noqa: BLE001
            print(f"[warn] no se pudo leer {index}: {exc}")
            continue
        for m in CATEGORY_RE.finditer(page):
            slug = m.group(1).rstrip("/").rsplit("/", 1)[-1]
            if slug not in cats:
                cats.append(slug)
    print(f"[ok] {len(cats)} categorias descubiertas: {', '.join(cats)}")
    return cats


def fetch_category_json(slug: str) -> list[dict] | None:
    url = f"{API_BASE}/{slug}.json"
    req = urllib.request.Request(url, headers=HEADERS)
    try:
        with urllib.request.urlopen(req, timeout=30) as resp:
            data = json.loads(resp.read().decode("utf-8", errors="replace"))
    except Exception as exc:  # noqa: BLE001
        print(f"[warn] API {slug}.json fallo: {exc}")
        return None
    cases = data.get("cases", [])
    out = []
    for c in cases:
        if not isinstance(c, dict) or c.get("id") == "INSERT_MARKER_FOR_AUTOMATION":
            continue
        es = c.get("es") or c.get("en") or {}
        if not es.get("prompt"):
            continue
        slug_id = str(c.get("id"))
        out.append({
            "id": f"{slug}-case{slug_id}",
            "slug": slug_id,
            "url": f"/es/prompt-handbook/{slug}/#case{slug_id}",
            "title": es.get("title", f"Case {slug_id}"),
            "prompt": es.get("prompt"),
            "category": slug,
            "description": es.get("description", ""),
            "difficulty": es.get("difficulty", ""),
            "tags": [],
            "images": c.get("images", {}).get("output", []),
            "local_image": None,
        })
    return out


def parse_prompt(url: str, html_page: str) -> dict[str, Any] | None:
    slug = url.rsplit("/", 1)[-1].replace(".html", "")
    title_m = TITLE_RE.search(html_page)
    prompt_m = PROMPT_RE.search(html_page)
    if not prompt_m:
        return None
    prompt_text = html.unescape(re.sub(r"<[^>]+>", "", prompt_m.group(1))).strip()
    title = strip_tags(title_m.group(1)) if title_m else slug.replace("-", " ").title()
    badge = strip_tags(BADGE_RE.search(html_page).group(1)) if BADGE_RE.search(html_page) else "prompt"
    desc_m = DESC_RE.search(html_page)
    images = [u for u in IMG_RE.findall(html_page)]
    metas = [strip_tags(m) for m in META_ITEM_RE.findall(html_page)]
    difficulty = next((m for m in metas if any(k in m.lower() for k in ("fácil", "facil", "intermedio", "avanzado"))), "")
    tags = [m for m in metas if m and m != difficulty]
    return {
        "id": slug,
        "slug": slug,
        "url": url,
        "title": title,
        "prompt": prompt_text,
        "category": badge,
        "description": html.unescape(desc_m.group(1)).strip() if desc_m else "",
        "difficulty": difficulty,
        "tags": tags,
        "images": images,
        "local_image": None,
    }


def download_image(url: str, dest: Path) -> bool:
    if dest.exists() and dest.stat().st_size > 0:
        return True
    req = urllib.request.Request(url, headers=HEADERS)
    try:
        with urllib.request.urlopen(req, timeout=60) as resp:
            data = resp.read()
        dest.write_bytes(data)
        return True
    except Exception as exc:  # noqa: BLE001
        print(f"[warn] imagen fallo {url}: {exc}")
        return False


def main() -> int:
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    sys.stderr.reconfigure(encoding="utf-8", errors="replace")
    parser = argparse.ArgumentParser(description="Scraper nanoprompts.org -> offline JSON + imagenes")
    parser.add_argument("--limit", type=int, default=6, help="max prompts a procesar (piloto)")
    parser.add_argument("--full", action="store_true", help="procesar TODOS los descubiertos")
    parser.add_argument("--rebuild", action="store_true", help="re-extraer sin re-descargar imagenes")
    parser.add_argument("--no-images", action="store_true", help="solo JSON, sin descargar imagenes")
    parser.add_argument("--images-only", action="store_true", help="descargar imagenes faltantes del index")
    args = parser.parse_args()

    PROMPTS_DIR.mkdir(parents=True, exist_ok=True)
    IMAGES_DIR.mkdir(parents=True, exist_ok=True)

    index: list[dict[str, Any]] = []

    def save(prompt: dict[str, Any]) -> None:
        json_path = PROMPTS_DIR / f"{prompt['id']}.json"
        if prompt["images"]:
            fname = f"{prompt['id']}-0.webp"
            if download_image(prompt["images"][0], IMAGES_DIR / fname):
                prompt["local_image"] = f"images/{fname}"
        json_path.write_text(json.dumps(prompt, ensure_ascii=False, indent=2), encoding="utf-8")
        index.append(prompt)

    categories = discover_categories()
    for slug in categories:
        cases = fetch_category_json(slug)
        if not cases:
            continue
        for c in cases:
            json_path = PROMPTS_DIR / f"{c['id']}.json"
            if json_path.exists() and not args.rebuild:
                try:
                    index.append(json.loads(json_path.read_text(encoding="utf-8")))
                    continue
                except json.JSONDecodeError:
                    pass
            if not args.full and len(index) >= args.limit:
                break
            save(c)
        if not args.full and len(index) >= args.limit:
            break

    urls = discover_urls()
    if not args.full and args.limit:
        urls = urls[: args.limit]
    for url in urls:
        if not args.full and len(index) >= args.limit:
            break
        slug = url.rstrip("/").rsplit("/", 1)[-1].replace(".html", "")
        json_path = PROMPTS_DIR / f"{slug}.json"
        if json_path.exists() and not args.rebuild:
            try:
                index.append(json.loads(json_path.read_text(encoding="utf-8")))
                continue
            except json.JSONDecodeError:
                pass
        try:
            page = fetch("https://nanoprompts.org" + url if not url.startswith("http") else url)
        except Exception as exc:  # noqa: BLE001
            print(f"[warn] fallo {url}: {exc}")
            continue
        data = parse_prompt(url, page)
        if not data:
            print(f"[warn] sin prompt extraible: {url}")
            continue
        save(data)
        print(f"[..] ok: {data['title'][:60]}")

    INDEX_FILE.write_text(json.dumps(index, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"\n[done] {len(index)} prompts -> {INDEX_FILE}")
    print(f"[done] imagenes -> {IMAGES_DIR}")
    return 0


if __name__ == "__main__":
    sys.exit(main())