#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Agente marketing TECH-LIBRARY — runner stdlib (sin dependencias).

Uso:
  py generate.py --check    valida configs, no escribe nada
  py generate.py --dry-run  genera 3 paquetes ejemplo en out/ejemplos/ (offline)
  py generate.py            genera el paquete de hoy en out/<fecha>-<slug>/

Sin tokens -> DRAFT (fail-soft). Con tokens en entorno -> READY (el motor
publishDue publica; este runner nunca guarda secretos).
"""
from __future__ import annotations

import argparse
import datetime as _dt
import hashlib
import json
import os
import sys
from urllib.parse import quote

BASE = os.path.dirname(os.path.abspath(__file__))
CONFIG_PATH = os.path.join(BASE, "autopub.config.json")
CAL_PATH = os.path.join(BASE, "content-calendar.json")
OUT_DIR = os.path.join(BASE, "out")

BRAND_SUFFIX = "dark obsidian background #08080a, violet #8b5cf6 accent, small badge TECH-LIBRARY bottom right, no watermark, no extra text beyond headline and badge"

PILLAR_PROMPT = {
    "tip": "dark obsidian coding card, violet accent, {tema} headline, minimal, 1 focal icon",
    "snippet": "dark code editor close-up, {tema} code highlight, violet caret",
    "paradigma": "abstract geometric diagram nodes and arrows, {tema}, dark background violet accents",
    "recurso": "stack of books plus laptop glow, dark library, violet rim light, {tema}",
    "novedad": "megaphone badge NUEVO green dot, dark background, {tema}",
    "motivacion": "developer desk at night monitor glow, motivational headline space, {tema}",
    "behind": "screenshot-style workspace markers and notes, authentic work in progress, {tema}",
}


def load_json(path):
    with open(path, "r", encoding="utf-8") as fh:
        return json.load(fh)


def slugify(text):
    out = []
    for ch in text.lower():
        if ch.isalnum():
            out.append(ch)
        elif ch in (" ", "_", "-"):
            out.append("-")
    slug = "".join(out)
    while "--" in slug:
        slug = slug.replace("--", "-")
    return slug.strip("-")[:48] or "post"


def seed_for(fecha, slug):
    digest = hashlib.sha256((fecha + "|" + slug).encode("utf-8")).hexdigest()
    return int(digest[:8], 16) % 100000


def image_url(base, prompt, w, h, seed):
    return base.replace("{prompt}", quote(prompt, safe="")).replace("{w}", str(w)).replace("{h}", str(h)).replace("{seed}", str(seed))


def build_package(config, pilar, tema, fecha):
    canales = config["channels"]
    firma = config["tono"]["firma"]
    caption_base = "%s: %s. %s %s" % (pilar["titulo"], tema, pilar["cta"], firma)
    hashtags = " ".join(pilar["hashtags_base"])
    base = config["imagen"]["url_base"]
    slug = slugify(pilar["id"] + "-" + tema)
    seed = seed_for(fecha, slug)
    prompt_base = PILLAR_PROMPT.get(pilar["id"], "{tema}").replace("{tema}", tema)
    piezas = {}
    # Web/blog
    w = canales["web"]
    piezas["web"] = {
        "titulo": "%s — %s" % (pilar["titulo"], tema),
        "resumen": caption_base,
        "cta": "Abrir en la biblioteca TECH-LIBRARY",
        "url_canal": w["url"],
        "imagen_prompt": prompt_base + ", " + BRAND_SUFFIX,
        "imagen_url": image_url(base, prompt_base + ", " + BRAND_SUFFIX, w["w"], w["h"], seed),
        "estado": "READY" if os.environ.get("CMS_TOKEN") else "DRAFT",
    }
    # Instagram
    ig = canales["instagram"]
    piezas["instagram"] = {
        "caption": "%s\n\n%s\n\n%s" % (caption_base, hashtags, ig["url"]),
        "formato": "9:16 Reels",
        "url_canal": ig["url"],
        "imagen_prompt": prompt_base + ", vertical composition, " + BRAND_SUFFIX,
        "imagen_url": image_url(base, prompt_base + ", vertical composition, " + BRAND_SUFFIX, ig["w"], ig["h"], seed),
        "estado": "READY" if os.environ.get("IG_ACCESS_TOKEN") else "DRAFT",
    }
    # TikTok
    tk = canales["tiktok"]
    gancho = pilar["gancho"] + ": " + tema
    piezas["tiktok"] = {
        "gancho_150": gancho[:150],
        "caption": "%s %s" % (gancho[:150], hashtags),
        "url_canal": tk["url"],
        "imagen_prompt": prompt_base + ", bold hook space top, " + BRAND_SUFFIX,
        "imagen_url": image_url(base, prompt_base + ", bold hook space top, " + BRAND_SUFFIX, tk["w"], tk["h"], seed),
        "estado": "READY" if os.environ.get("TIKTOK_ACCESS_TOKEN") else "DRAFT",
    }
    # LinkedIn (0 emojis)
    li = canales["linkedin"]
    piezas["linkedin"] = {
        "post": "%s: %s.\n\n%s\n\n%s" % (pilar["titulo"], tema, pilar["cta"], firma),
        "url_canal": li["url"],
        "imagen_prompt": prompt_base + ", professional, wide composition, " + BRAND_SUFFIX,
        "imagen_url": image_url(base, prompt_base + ", professional, wide composition, " + BRAND_SUFFIX, li["w"], li["h"], seed),
        "estado": "READY" if os.environ.get("LINKEDIN_ACCESS_TOKEN") else "DRAFT",
    }
    # YouTube Shorts
    yt = canales["youtube_shorts"]
    piezas["youtube_shorts"] = {
        "titulo_100": ("%s | %s" % (tema, pilar["titulo"]))[:100],
        "descripcion": "%s\n\n%s\n\n%s" % (caption_base, hashtags, yt["url"]),
        "tags": ["techlibrary", "programacion", pilar["id"]],
        "url_canal": yt["url"],
        "imagen_prompt": prompt_base + ", vertical thumbnail, big readable headline, " + BRAND_SUFFIX,
        "imagen_url": image_url(base, prompt_base + ", vertical thumbnail, big readable headline, " + BRAND_SUFFIX, yt["w"], yt["h"], seed),
        "estado": "READY" if os.environ.get("YOUTUBE_ACCESS_TOKEN") else "DRAFT",
    }
    return {"fecha": fecha, "pilar": pilar["id"], "tema": tema, "slug": slug, "seed": seed, "piezas": piezas}


def write_package(pkg, dest):
    os.makedirs(dest, exist_ok=True)
    with open(os.path.join(dest, "paquete.json"), "w", encoding="utf-8") as fh:
        json.dump(pkg, fh, ensure_ascii=False, indent=2)
    lines = ["# %s — %s" % (pkg["pilar"], pkg["tema"]), ""]
    for canal, pieza in pkg["piezas"].items():
        titulo = pieza.get("titulo") or pieza.get("titulo_100") or pieza.get("gancho_150") or canal
        lines.append("- [%s] %s (%s)" % (canal, titulo, pieza.get("estado", "DRAFT")))
        lines.append("  %s" % pieza.get("imagen_url", ""))
    with open(os.path.join(dest, "reporte.md"), "w", encoding="utf-8") as fh:
        fh.write("\n".join(lines) + "\n")
    return dest


def check():
    errors = []
    try:
        config = load_json(CONFIG_PATH)
    except Exception as exc:
        return ["autopub.config.json ilegible: %s" % exc]
    try:
        cal = load_json(CAL_PATH)
    except Exception as exc:
        return ["content-calendar.json ilegible: %s" % exc]
    for canal in ("web", "instagram", "tiktok", "linkedin", "youtube_shorts"):
        if canal not in config.get("channels", {}):
            errors.append("falta canal %s en config" % canal)
    pilares = cal.get("pilares", [])
    if len(pilares) != 7:
        errors.append("calendario debe tener 7 pilares, tiene %d" % len(pilares))
    for pilar in pilares:
        for campo in ("id", "titulo", "gancho", "temas_ejemplo", "cta", "hashtags_base"):
            if campo not in pilar:
                errors.append("pilar sin campo %s" % campo)
    return errors


def main(argv=None):
    parser = argparse.ArgumentParser(description="Agente marketing TECH-LIBRARY")
    parser.add_argument("--check", action="store_true")
    parser.add_argument("--dry-run", action="store_true")
    parser.add_argument("--fecha", default=None, help="YYYY-MM-DD (default: hoy)")
    args = parser.parse_args(argv)
    if args.check:
        errors = check()
        if errors:
            for err in errors:
                print("ERROR: %s" % err)
            return 1
        print("OK: configs validas (5 canales, 7 pilares)")
        return 0
    errors = check()
    if errors:
        for err in errors:
            print("ERROR: %s" % err)
        return 1
    config = load_json(CONFIG_PATH)
    cal = load_json(CAL_PATH)
    fecha = args.fecha or _dt.date.today().isoformat()
    pilares = cal["pilares"]
    if args.dry_run:
        dest_base = os.path.join(OUT_DIR, "ejemplos")
        for i in range(3):
            pilar = pilares[i % len(pilares)]
            tema = pilar["temas_ejemplo"][i % len(pilar["temas_ejemplo"])]
            pkg = build_package(config, pilar, tema, fecha)
            write_package(pkg, os.path.join(dest_base, pkg["slug"]))
            print("ejemplo: %s (%s)" % (pkg["slug"], pkg["pilar"]))
        print("OK: dry-run 3 paquetes en out/ejemplos/ (offline, sin red)")
        return 0
    doy = _dt.date.fromisoformat(fecha).timetuple().tm_yday if len(fecha) == 10 else 0
    pilar = pilares[doy % len(pilares)]
    tema = pilar["temas_ejemplo"][doy % len(pilar["temas_ejemplo"])]
    pkg = build_package(config, pilar, tema, fecha)
    dest = write_package(pkg, os.path.join(OUT_DIR, "%s-%s" % (fecha, pkg["slug"])))
    manifest = os.path.join(OUT_DIR, "manifiesto.json")
    data = []
    if os.path.exists(manifest):
        try:
            data = json.load(open(manifest, "r", encoding="utf-8"))
        except Exception:
            data = []
    data.append({"fecha": fecha, "slug": pkg["slug"], "pilar": pkg["pilar"], "tema": tema, "dest": dest})
    with open(manifest, "w", encoding="utf-8") as fh:
        json.dump(data, fh, ensure_ascii=False, indent=2)
    print("OK: paquete %s en %s" % (pkg["slug"], dest))
    return 0


if __name__ == "__main__":
    sys.exit(main())
