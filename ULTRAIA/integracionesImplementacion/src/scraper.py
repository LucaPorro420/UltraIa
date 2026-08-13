"""Solución 2 (high-demand): Web-scraping → Video Shorts automatizado.

Requisito funcional RF-15: dado un URL (noticia diaria, página de producto),
se extrae el contenido principal, se resume con el LLM y se dispara el
pipeline audiovisual (audio + imágenes + video + ensamblado) para generar un
Shorts listo para TikTok/YouTube de forma automática.

Alternativa MCP: FireCrawl/Playwright expondrían la misma función vía MCP;
aquí se usa requests + BeautifulSoup (sin navegador).
"""
from __future__ import annotations

import re

import requests
from bs4 import BeautifulSoup

HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
        "(KHTML, like Gecko) Chrome/126.0 Safari/537.36"
    )
}

_NAV_SELECTORS = [
    "nav", "header", "footer", "aside", "script", "style", "noscript",
    "form", "iframe", ".advertisement", ".ads", ".cookie-banner", ".newsletter",
]


def fetch_article(url: str, max_chars: int = 8000) -> dict:
    """Descarga una página y extrae título + párrafos principales.

    Args:
        url: página web (artículo de noticias, ficha de producto...).
        max_chars: tope de caracteres de texto extraído (para el LLM).

    Returns:
        {"url", "title", "text"}
    """
    res = requests.get(url, headers=HEADERS, timeout=60)
    res.raise_for_status()
    soup = BeautifulSoup(res.text, "html.parser")

    for tag in soup.find_all(True):
        if tag.name in _NAV_SELECTORS:
            tag.decompose()

    title = soup.find("h1")
    title = title.get_text(strip=True) if title else (soup.title.get_text(strip=True) if soup.title else url)

    paragraphs = []
    for p in soup.find_all(["p", "h2", "h3", "li"]):
        text = re.sub(r"\s+", " ", p.get_text(" ", strip=True))
        if len(text) > 40:
            paragraphs.append(text)

    body = " ".join(paragraphs)[:max_chars]
    return {"url": url, "title": title[:200], "text": body}


def summarize_article(article: dict, settings: "Settings") -> dict:
    """Resume el artículo con el LLM y devuelve idea + guion para el video.

    Returns:
        {"topic": "...", "title": "...", "summary": "..."} — `topic` es la
        idea que consume `Pipeline.run()` (que a su vez re-genera el guion
        estructurado con el Director Audiovisual).
    """
    from .config import require_key

    require_key("OPENAI_API_KEY", settings.openai_api_key)
    url = f"{settings.llm_base_url.rstrip('/')}/chat/completions"
    payload = {
        "model": settings.llm_model,
        "temperature": 0.5,
        "response_format": {"type": "json_object"},
        "messages": [
            {
                "role": "system",
                "content": (
                    "Eres un editor de contenido para YouTube Shorts/TikTok. "
                    "Recibe el texto de un artículo y devuelve JSON estricto: "
                    '{"topic": "idea condensada en 1-2 líneas", '
                    '"title": "título atractivo bilingüe es/ar", '
                    '"summary": "resumen de 40-60 palabras"}'
                ),
            },
            {
                "role": "user",
                "content": f"Artículo ({article['title']}):\n{article['text']}",
            },
        ],
    }
    res = requests.post(
        url,
        headers={
            "Authorization": f"Bearer {settings.openai_api_key}",
            "Content-Type": "application/json",
        },
        json=payload,
        timeout=90,
    )
    if res.status_code != 200:
        raise RuntimeError(f"Error LLM en resumen ({res.status_code}): {res.text[:500]}")

    import json as _json

    return _json.loads(res.json()["choices"][0]["message"]["content"])