"""Verificador del corpus de documentacion [prompt+resultado] del Gen-Engine.

Uso:
  python verify_corpus.py [--verbose]

Valida:
  1. Estructura del corpus (schema_version, modalidades, casos unicos).
  2. Que cada caso tiene modalidad e idioma validos.
  3. Que el resultado esperado es coherente con el provider (contrato).
  4. Que el idioma del caso esta en los soportados.
Registra veredictos en media-corpus/verdicts.jsonl (apendice).
"""
from __future__ import annotations

import datetime
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent
CORPUS = ROOT / "corpus.json"
VERDICTS = ROOT / "verdicts.jsonl"

MODALIDADES = {"image", "audio", "video", "tts", "music", "director"}
PROVIDERS_VALIDOS = {
    "image": {"pollinations", "local", "fal", "meigen"},
    "audio": {"edge-tts", "local", "composition"},
    "video": {"storyboard", "local", "slideshow"},
    "tts": {"edge-tts"},
    "music": {"composition", "local"},
    "director": {"llm", "local"},
}
DOMINIOS_CONOCIDOS = {"image.pollinations.ai", "images.meigen.ai"}


def validar_caso(caso: dict) -> list[str]:
    """Devuelve lista de errores del caso (vacia = OK)."""
    errores: list[str] = []
    cid = caso.get("id", "?")
    modalidad = caso.get("modalidad")
    idioma = caso.get("idioma")
    provider = caso.get("provider_esperado")
    resultado = caso.get("resultado", {})

    if modalidad not in MODALIDADES:
        errores.append(f"{cid}: modalidad invalida '{modalidad}'")
    if not isinstance(caso.get("prompt"), str) or not caso["prompt"].strip():
        errores.append(f"{cid}: prompt vacio")
    if idioma not in {"multi", *CORPUS_IDIOMAS}:
        errores.append(f"{cid}: idioma '{idioma}' no soportado")

    if modalidad in PROVIDERS_VALIDOS and provider not in PROVIDERS_VALIDOS[modalidad]:
        errores.append(f"{cid}: provider '{provider}' invalido para {modalidad}")

    dominio = resultado.get("dominio")
    if dominio and dominio not in DOMINIOS_CONOCIDOS:
        errores.append(f"{cid}: dominio no verificado '{dominio}'")

    frames = resultado.get("frames")
    if frames is not None and not (1 <= frames <= 8):
        errores.append(f"{cid}: frames {frames} fuera de rango 1-8")

    lufs = resultado.get("loudnorm_target_lufs")
    if lufs is not None and not (-30 <= lufs <= 0):
        errores.append(f"{cid}: loudnorm {lufs} fuera de rango")
    return errores


def main() -> int:
    verbose = "--verbose" in sys.argv
    data = json.loads(CORPUS.read_text(encoding="utf-8"))
    global CORPUS_IDIOMAS
    CORPUS_IDIOMAS = set(data.get("idiomas_soportados", []))

    if data.get("schema_version") != "1.0":
        print("FAIL: schema_version != 1.0")
        return 1

    casos = data["casos"]
    ids = [c["id"] for c in casos]
    duplicados = {i for i in ids if ids.count(i) > 1}
    errores: list[str] = [f"id duplicado {i}" for i in duplicados]
    for caso in casos:
        errores += validar_caso(caso)

    total = len(casos)
    ok = not errores
    veredicto = {
        "ts": datetime.datetime.now(datetime.timezone.utc).isoformat(),
        "schema_version": data["schema_version"],
        "casos": total,
        "status": "PASS" if ok else "FAIL",
        "errores": errores,
    }
    with VERDICTS.open("a", encoding="utf-8") as f:
        f.write(json.dumps(veredicto, ensure_ascii=False) + "\n")

    print(f"[{'PASS' if ok else 'FAIL'}] corpus {total} casos, {len(errores)} errores")
    if verbose and errores:
        for e in errores:
            print(f"  - {e}")
    return 0 if ok else 1


CORPUS_IDIOMAS: set[str] = set()

if __name__ == "__main__":
    sys.exit(main())