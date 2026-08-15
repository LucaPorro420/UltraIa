"""AutoPub F1 — Motor de ideas (CLI keyless).

Genera briefs de contenido priorizados desde fuentes RSS + búsqueda DuckDuckGo
(solo stdlib: urllib + xml.etree + json), con el MISMO esquema de brief que la
tool TS `packages/core/src/tools/topics.ts` (fuente de verdad):

    {tema, canal, formato, tono, angulo, fuentes, score, pubDate}

Uso:
    python scripts/topics.py --dry-run                 # briefs a stdout (default)
    python scripts/topics.py --dry-run --max 12        # más briefs
    python scripts/topics.py --canales yt,tiktok       # solo canales elegidos
    python scripts/topics.py --out briefs.json         # escribe JSON (UTF-8 sin BOM)
    python scripts/topics.py --rss <url> --search "IA" # fuentes custom (repetible)

Reglas aprendidas aplicadas: API directa > scraping; JSON sin BOM (PowerShell);
degradación elegante si una fuente falla (nunca crashea).
"""
from __future__ import annotations

import argparse
import json
import re
import sys
import urllib.request
import xml.etree.ElementTree as ET
from datetime import datetime, timezone
from typing import Any

HEADERS = {"User-Agent": "Mozilla/5.0 (UltraIa topics/0.1)"}

DEFAULT_RSS = [
    "https://hnrss.org/frontpage",
    "https://feeds.arstechnica.com/arstechnica/technology-lab",
    "https://www.theverge.com/rss/index.xml",
]

DEFAULT_SEARCHES = ["AI tendencias 2026", "IA generativa noticias hoy"]

CANALES = {
    "youtube_shorts": {"formato": "9:16 video", "keywords": ["tutorial", "como", "tips", "5", "mejores", "error", "rapido", "facil"]},
    "tiktok": {"formato": "9:16 video", "keywords": ["tendencia", "viral", "hack", "lifehack", "misterio", "antes", "despues", "pov"]},
    "instagram": {"formato": "1:1 imagen", "keywords": ["estetica", "diseno", "inspiracion", "idea", "pack", "branding", "visual"]},
    "blog": {"formato": "16:9 articulo", "keywords": ["guia", "analisis", "futuro", "estrategia", "que es", "como funciona", "reporte", "caso"]},
}


def normalize_title(title: str) -> str:
    return re.sub(r"\s+", " ", re.sub(r"[^\w\s]", " ", title.lower())).strip()


def bigrams(s: str) -> set[str]:
    tokens = [t for t in s.split(" ") if t]
    return {f"{tokens[i]} {tokens[i + 1]}" for i in range(len(tokens) - 1)}


def jaccard(a: set[str], b: set[str]) -> float:
    if not a and not b:
        return 1.0
    inter = len(a & b)
    union = len(a | b)
    return inter / union if union else 0.0


def dedupe(items: list[dict[str, Any]]) -> list[dict[str, Any]]:
    seen: list[str] = []
    out: list[dict[str, Any]] = []
    for item in items:
        norm = normalize_title(item["title"])
        if not norm:
            continue
        if any(jaccard(bigrams(prev), bigrams(norm)) > 0.6 for prev in seen):
            continue
        seen.append(norm)
        out.append(item)
    return out


def fetch(url: str, timeout: int = 20) -> str:
    req = urllib.request.Request(url, headers=HEADERS)
    with urllib.request.urlopen(req, timeout=timeout) as resp:
        return resp.read().decode("utf-8", errors="replace")


def parse_rss(url: str, max_items: int = 8) -> list[dict[str, Any]]:
    xml_text = fetch(url)
    root = ET.fromstring(xml_text)
    items: list[dict[str, Any]] = []
    for node in root.iter("item"):
        if len(items) >= max_items:
            break
        title = (node.findtext("title") or "").strip()
        link = (node.findtext("link") or url).strip()
        desc = (node.findtext("description") or "").strip()
        desc = re.sub(r"<[^>]+>", " ", desc)
        pub = (node.findtext("pubDate") or "").strip()
        items.append({"title": title, "link": link, "description": desc, "pubDate": pub or None})
    return items


def ddg_search(query: str, max_results: int = 8) -> list[dict[str, Any]]:
    api = f"https://api.duckduckgo.com/?q={urllib.parse.quote(query)}&format=json&no_html=1&skip_disambig=1"
    data = json.loads(fetch(api))
    items: list[dict[str, Any]] = []
    if data.get("AbstractText") and data.get("AbstractURL"):
        items.append({"title": data.get("Heading") or data["AbstractURL"], "link": data["AbstractURL"], "description": data["AbstractText"], "pubDate": None})
    for topic in data.get("RelatedTopics") or []:
        if len(items) >= max_results:
            break
        if isinstance(topic, dict) and topic.get("Text") and topic.get("FirstURL"):
            text = str(topic["Text"])
            items.append({"title": text.split(" - ")[0], "link": topic["FirstURL"], "description": text, "pubDate": None})
    return items[:max_results]


def parse_date(pub: str | None) -> datetime | None:
    if not pub:
        return None
    # RFC 2822 (RSS). Si falla, devuelve None (score neutro).
    try:
        from email.utils import parsedate_to_datetime

        return parsedate_to_datetime(pub).astimezone(timezone.utc)
    except Exception:
        return None


def novelty(pub: str | None, now: datetime) -> float:
    dt = parse_date(pub)
    if dt is None:
        return 0.5
    age_days = (now - dt).total_seconds() / 86400
    if age_days < 0 or age_days <= 7:
        return 1.0
    if age_days >= 30:
        return 0.0
    return 1.0 - (age_days - 7) / 23


def tone_for(title: str, desc: str, from_search: bool) -> str:
    t = f"{title} {desc}".lower()
    if re.search(r"\b(guia|como|tutorial|paso|tips|hack|mejores)\b", t):
        return "educativo"
    if re.search(r"\b(tendencia|viral|misterio|pov|antes|despues)\b", t):
        return "entretenido"
    if re.search(r"\b(analisis|reporte|futuro|estrategia|estudio|datos)\b", t):
        return "analitico"
    if re.search(r"\b(nueva|nuevo|anuncio|lanza|presenta)\b", t):
        return "noticia"
    if re.search(r"\b(inspira|idea|pack|branding|estetica|diseno)\b", t):
        return "inspirador"
    return "informativo" if from_search else "noticia"


def angle_for(title: str, desc: str, from_search: bool) -> str:
    t = f"{title} {desc}".lower()
    if re.search(r"\b(como|tutorial|paso)\b", t):
        return "Tutorial paso a paso con ejemplo real"
    if re.search(r"\b(tips|hack|mejores)\b", t):
        return "Lista de recomendaciones accionables"
    if re.search(r"\b(tendencia|viral)\b", t):
        return "Por que esto esta en tendencia ahora"
    if re.search(r"\b(guia|estrategia|analisis)\b", t):
        return "Analisis con contexto y datos"
    if re.search(r"\b(nueva|nuevo|anuncio|lanza)\b", t):
        return "Novedad explicada en 60 segundos"
    return "Resumen de tendencia con datos de la busqueda" if from_search else "Resumen de la noticia con contexto"


def build_briefs(items: list[dict[str, Any]], canales: list[str], now: datetime) -> list[dict[str, Any]]:
    briefs: list[dict[str, Any]] = []
    for item in items:
        from_search = item.get("from_search", False)
        for canal in canales:
            cfg = CANALES[canal]
            norm = normalize_title(item["title"])
            relevance = 1.0 if any(kw in norm for kw in cfg["keywords"]) else 0.5
            score = round(novelty(item.get("pubDate"), now) * relevance, 2)
            briefs.append(
                {
                    "tema": item["title"],
                    "canal": canal,
                    "formato": cfg["formato"],
                    "tono": tone_for(item["title"], item["description"], from_search),
                    "angulo": angle_for(item["title"], item["description"], from_search),
                    "fuentes": [item["link"]],
                    "score": score,
                    "pubDate": item.get("pubDate"),
                }
            )
    briefs.sort(key=lambda b: b["score"], reverse=True)
    return briefs


def main() -> int:
    import urllib.parse  # noqa: PLC0415 (import tardío para CLI corto)

    parser = argparse.ArgumentParser(description="AutoPub F1 — motor de ideas keyless (RSS + DuckDuckGo)")
    parser.add_argument("--dry-run", action="store_true", help="imprime briefs sin persistir (default)")
    parser.add_argument("--max", type=int, default=8, help="máximo de briefs (default 8)")
    parser.add_argument("--canales", default="youtube_shorts,tiktok,instagram,blog", help="canales separados por coma")
    parser.add_argument("--rss", action="append", default=[], help="feed RSS custom (repetible)")
    parser.add_argument("--search", action="append", default=[], help="query de tendencias (repetible)")
    parser.add_argument("--out", default=None, help="ruta del JSON de salida (UTF-8 sin BOM)")
    args = parser.parse_args()

    rss_sources = args.rss or DEFAULT_RSS
    search_sources = args.search or DEFAULT_SEARCHES
    canales = [c.strip() for c in args.canales.split(",") if c.strip() in CANALES]

    now = datetime.now(timezone.utc)
    raw: list[dict[str, Any]] = []
    activas: list[str] = []

    for url in rss_sources:
        try:
            items = parse_rss(url)
            if items:
                activas.append(url)
                raw.extend(items)
        except Exception as exc:  # noqa: BLE001 — degradación elegante por fuente
            print(f"[topics] aviso: RSS {url} falló ({exc}) — se ignora", file=sys.stderr)

    for q in search_sources:
        try:
            items = ddg_search(q)
            if items:
                activas.append(f"search:{q}")
                for it in items:
                    it["from_search"] = True
                raw.extend(items)
        except Exception as exc:  # noqa: BLE001
            print(f"[topics] aviso: búsqueda '{q}' falló ({exc}) — se ignora", file=sys.stderr)

    unique = dedupe(raw)
    briefs = build_briefs(unique, canales, now)[: args.max]

    result = {
        "generatedAt": now.isoformat(),
        "rawCount": len(raw),
        "uniqueCount": len(unique),
        "fuentesActivas": activas,
        "briefs": briefs,
    }

    if args.out:
        with open(args.out, "w", encoding="utf-8", newline="\n") as fh:
            json.dump(result, fh, ensure_ascii=False, indent=2)
        print(f"[topics] {len(briefs)} briefs escritos en {args.out}")
    else:
        print(json.dumps(result, ensure_ascii=False, indent=2))

    return 0 if briefs else 1


if __name__ == "__main__":
    sys.exit(main())