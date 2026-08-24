"""Extrae el texto del PDF del cuento y produce:
   - resultTask/poe-demonio/cuento.txt (texto completo limpio)
   - resultTask/poe-demonio/stats.json (paginas, palabras, estimaciones de duracion)
Determinista, stdlib + pypdf.
"""
from __future__ import annotations

import json
import re
import sys
import unicodedata
from pathlib import Path

from pypdf import PdfReader

ROOT = Path(__file__).resolve().parents[1]
PDF = ROOT / "pdf" / "El demonio de la perversidad - Edgar Allan Poe (1).pdf"
OUT_DIR = ROOT / "resultTask" / "poe-demonio"


def clean_text(raw: str) -> str:
    # Normalizar ligaduras/espacios raros; colapsar whitespace preservando parrafos
    text = raw.replace("\u00ad", "")  # soft hyphen
    text = text.replace("-\n", "")  # palabra cortada por salto
    text = re.sub(r"[ \t]+", " ", text)
    text = re.sub(r"\n{3,}", "\n\n", text)
    return text.strip()


def main() -> int:
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    reader = PdfReader(str(PDF))
    pages = [page.extract_text() or "" for page in reader.pages]
    full = clean_text("\n".join(pages))
    (OUT_DIR / "cuento.txt").write_text(full, encoding="utf-8")

    words = re.findall(r"\S+", full)
    n_words = len(words)
    chars = len(full)
    # Velocidades de narracion es-ES edge-tts (palabras/minuto aproximadas)
    rates = {"lento_-25%": 105, "normal": 140, "rapido_+15%": 160}
    estimates = {k: round(n_words / v, 1) for k, v in rates.items()}
    stats = {
        "pdf": str(PDF),
        "paginas": len(pages),
        "caracteres": chars,
        "palabras": n_words,
        "estimacion_minutos": estimates,
        "primeras_lineas": full[:300],
    }
    (OUT_DIR / "stats.json").write_text(
        json.dumps(stats, ensure_ascii=False, indent=2), encoding="utf-8"
    )
    print(json.dumps(stats, ensure_ascii=False)[:800])
    return 0


if __name__ == "__main__":
    sys.exit(main())
