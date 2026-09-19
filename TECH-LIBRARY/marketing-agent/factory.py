#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Fábrica local TECH-LIBRARY — produce packs con bytes reales, sin teléfono.

Niveles: FULL (ffmpeg+SAPI) / SOLO-IMAGEN (PNG stdlib) / SOLO-TEXTO.
Todo fail-soft con motivos en el manifiesto. Reutiliza generate.build_package.
Uso:
  py factory.py --check          backends + nivel, no escribe
  py factory.py --demo           1 pack completo en out/<fecha>-<slug>/
  py factory.py --todo           3 packs del día (09/14/19)
  py factory.py --demo --sin-voz --sin-video   solo PNG + manifiesto
"""
from __future__ import annotations

import argparse
import datetime as _dt
import json
import os
import shutil
import struct
import subprocess
import sys
import tempfile
import zlib

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import generate  # noqa: E402  (mismo dir: build_package, slugify, write_package)

BASE = os.path.dirname(os.path.abspath(__file__))
CONFIG_PATH = os.path.join(BASE, "autopub.config.json")
CAL_PATH = os.path.join(BASE, "content-calendar.json")
RECURSOS_PATH = os.path.join(BASE, "recursos.json")
OUT_DIR = os.path.join(BASE, "out")
ARIAL = "C:\\Windows\\Fonts\\arial.ttf"
W, H = 1080, 1920  # 9:16
VIDEO_SEG = 8
FPS = 25

PS_NARRAR = """\
Add-Type -AssemblyName System.Speech
$s = New-Object System.Speech.Synthesis.SpeechSynthesizer
if ('{voz}') {{
  try {{ $s.SelectVoice('{voz}') }} catch {{}}
}}
$s.SetOutputToWaveFile('{wav}')
$s.Speak('{texto}')
$s.Dispose()
"""


def load_json(path):
    with open(path, "r", encoding="utf-8") as fh:
        return json.load(fh)


def recursos():
    try:
        return load_json(RECURSOS_PATH)
    except Exception:
        return {}


def ffmpeg_bin():
    return shutil.which("ffmpeg")


def voz_es(rec):
    try:
        es = rec["backends"]["sapi_offline"]["voces_es"]
        if es:
            return es[0]["nombre"]
    except Exception:
        pass
    return ""


# ---------- PNG stdlib (gradiente obsidian + acento violeta) ----------

def _png_chunk(tipo, data):
    c = struct.pack(">I", len(data)) + tipo + data
    return c + struct.pack(">I", zlib.crc32(tipo + data) & 0xFFFFFFFF)


def fila_png(y):
    """Una scanline RGB (sin byte de filtro)."""
    t = y / (H - 1)
    r = int(8 + (26 - 8) * t)
    g = int(8 + (22 - 8) * t)
    b = int(10 + (36 - 10) * t)
    fila = bytearray()
    base = bytes((r, g, b))
    fila.extend(base * W)
    # Barra lateral violeta (derecha, 40px).
    for x in range(W - 40, W):
        f = 0.55 + 0.45 * t
        fila[x * 3:x * 3 + 3] = bytes((int(139 * f), int(92 * f), int(246 * f)))
    # Panel inferior (últimas 220px) + borde violeta superior de 6px.
    if y >= H - 220:
        fila[:] = bytes((16, 16, 20)) * W
        if y < H - 220 + 6:
            fila[:] = bytes((139, 92, 246)) * W
    return bytes(fila)


def escribir_png(path):
    crudo = b"".join(b"\x00" + fila_png(y) for y in range(H))
    ihdr = struct.pack(">IIBBBBB", W, H, 8, 2, 0, 0, 0)
    png = (b"\x89PNG\r\n\x1a\n" + _png_chunk(b"IHDR", ihdr)
           + _png_chunk(b"IDAT", zlib.compress(crudo, 6))
           + _png_chunk(b"IEND", b""))
    with open(path, "wb") as fh:
        fh.write(png)
    return path


# ---------- ffmpeg: portada con texto + video ----------

def _font_arg():
    return ARIAL.replace("\\", "/").replace(":", "\\:")


def _ff_path(p):
    """Ruta apta para drawtext sin comillas internas (los : se escapan)."""
    return p.replace("\\", "/").replace(":", "\\:")


def portada_ffmpeg(base_png, titular, marca, destino):
    # Sin dos puntos en el filtro: se trabaja con cwd en .fonts y nombres base.
    # (El parser de filtros parte en ':' aunque se escape tras letra de unidad.)
    fonts = os.path.join(OUT_DIR, ".fonts")
    os.makedirs(fonts, exist_ok=True)
    copia_fuente = os.path.join(fonts, "arial.ttf")
    if not os.path.exists(copia_fuente):
        shutil.copyfile(ARIAL, copia_fuente)
    tag = os.path.splitext(os.path.basename(destino))[0]
    tit, mar = tag + ".tit.txt", tag + ".mar.txt"
    with open(os.path.join(fonts, tit), "w", encoding="utf-8") as fh:
        fh.write(titular[:90])
    with open(os.path.join(fonts, mar), "w", encoding="utf-8") as fh:
        fh.write(marca[:40])
    cmd = [ffmpeg_bin(), "-y", "-i", base_png, "-vf",
           "drawtext=fontfile=arial.ttf:textfile=%s:fontsize=64:fontcolor=white:"
           "x=(w-text_w)/2:y=300:box=1:boxcolor=black@0.55:boxborderw=24,"
           "drawtext=fontfile=arial.ttf:textfile=%s:fontsize=36:fontcolor=#f4f4f5:"
           "x=w-text_w-70:y=h-140" % (tit, mar),
           "-frames:v", "1", destino]
    try:
        proc = subprocess.run(cmd, capture_output=True, timeout=120, cwd=fonts)
        return proc.returncode == 0
    except Exception:
        return False
    finally:
        for tmp in (os.path.join(fonts, tit), os.path.join(fonts, mar)):
            try:
                os.remove(tmp)
            except Exception:
                pass


def video_ffmpeg(portada, audio, destino):
    frames = VIDEO_SEG * FPS
    cmd = [ffmpeg_bin(), "-y", "-loop", "1", "-i", portada]
    if audio:
        cmd += ["-i", audio]
    else:
        cmd += ["-f", "lavfi", "-i", "anullsrc=r=44100:cl=mono:d=%d" % VIDEO_SEG]
    cmd += ["-filter_complex",
            "[0:v]scale=1080:1920,zoompan=z='1+0.06*on/%d':d=%d:s=1080x1920:fps=%d[v]"
            % (frames, frames, FPS),
            "-map", "[v]", "-map", "1:a", "-t", str(VIDEO_SEG),
            "-c:v", "libx264", "-pix_fmt", "yuv420p", "-preset", "veryfast",
            "-c:a", "aac", "-shortest", destino]
    try:
        proc = subprocess.run(cmd, capture_output=True, timeout=600)
        return proc.returncode == 0
    except Exception:
        return False


# ---------- SAPI offline: narración a WAV ----------

def narrar_sapi(texto, voz, destino_wav):
    texto = texto.replace("'", " ").replace("\n", " ")[:140]
    guion = PS_NARRAR.replace("{voz}", voz).replace("{wav}", destino_wav).replace("{texto}", texto)
    tmp = None
    try:
        import tempfile as _tf

        handle, tmp = _tf.mkstemp(suffix=".ps1", prefix="narrar-")
        with os.fdopen(handle, "w", encoding="utf-8") as fh:
            fh.write(guion)
        proc = subprocess.run(
            ["powershell", "-NoProfile", "-ExecutionPolicy", "Bypass", "-File", tmp],
            capture_output=True, timeout=120)
        return proc.returncode == 0 and os.path.exists(destino_wav)
    except Exception:
        return False
    finally:
        try:
            if tmp and os.path.exists(tmp):
                os.remove(tmp)
        except Exception:
            pass


# ---------- packs ----------

def construir_pack(config, pilar, tema, fecha, dest, con_voz=True, con_video=True):
    motivos = []
    pkg = generate.build_package(config, pilar, tema, fecha)
    os.makedirs(dest, exist_ok=True)

    base_png = os.path.join(dest, "base.png")
    escribir_png(base_png)
    portada = os.path.join(dest, "portada.png")

    ff = ffmpeg_bin()
    titular = "%s: %s" % (pilar["titulo"], tema)
    if ff and os.path.exists(ARIAL):
        if portada_ffmpeg(base_png, titular, "TECH-LIBRARY", portada):
            pass
        else:
            motivos.append("drawtext fallo; portada = base stdlib")
            shutil.copyfile(base_png, portada)
    else:
        motivos.append("sin ffmpeg/arial; portada = base stdlib")
        shutil.copyfile(base_png, portada)

    wav = None
    if con_voz:
        rec = recursos()
        voz = voz_es(rec)
        candidato = os.path.join(dest, "narracion.wav")
        texto = "%s: %s. %s" % (pilar["gancho"], tema, pilar["cta"])
        if narrar_sapi(texto, voz, candidato) and os.path.getsize(candidato) > 0:
            wav = candidato
        else:
            motivos.append("SAPI sin voz disponible; sin narracion")

    mp4 = None
    if con_video and ff:
        candidato = os.path.join(dest, "reel.mp4")
        if video_ffmpeg(portada, wav, candidato) and os.path.getsize(candidato) > 0:
            mp4 = candidato
        else:
            motivos.append("ffmpeg video fallo; solo imagen+texto")
    elif con_video:
        motivos.append("sin ffmpeg; sin video")

    try:
        os.remove(base_png)
    except Exception:
        pass

    nivel = "FULL" if (mp4 and wav) else ("SOLO-IMAGEN" if mp4 or os.path.exists(portada) else "SOLO-TEXTO")
    pkg["archivos_locales"] = {
        "portada": "portada.png",
        "video": "reel.mp4" if mp4 else None,
        "audio": "narracion.wav" if wav else None,
        "nivel": nivel,
        "motivos": motivos,
        "telefono_requerido": False,
    }
    generate.write_package(pkg, dest)
    return pkg


def main(argv=None):
    ap = argparse.ArgumentParser(description="Fabrica local TECH-LIBRARY")
    ap.add_argument("--check", action="store_true")
    ap.add_argument("--demo", action="store_true")
    ap.add_argument("--todo", action="store_true")
    ap.add_argument("--fecha", default=None)
    ap.add_argument("--sin-voz", action="store_true")
    ap.add_argument("--sin-video", action="store_true")
    args = ap.parse_args(argv)

    config = load_json(CONFIG_PATH)
    cal = load_json(CAL_PATH)
    pilares = cal["pilares"]
    rec = recursos()
    ff = ffmpeg_bin()
    voz = voz_es(rec)
    nivel = "FULL" if (ff and (voz or True)) else "LIMITADO"

    if args.check:
        print("ffmpeg: %s" % (ff or "AUSENTE"))
        print("arial.ttf: %s" % os.path.exists(ARIAL))
        print("voz ES SAPI: %s" % (voz or "default/ninguna (fail-soft)"))
        print("pilares: %d | canales: %d" % (len(pilares), len(config["channels"])))
        print("OK: fabrica lista (nivel con todo disponible: %s)" % nivel)
        return 0

    fecha = args.fecha or _dt.date.today().isoformat()
    doy = _dt.date.fromisoformat(fecha).timetuple().tm_yday if len(fecha) == 10 else 0
    trabajos = []
    if args.todo:
        for i in range(3):
            pilar = pilares[(doy + i) % len(pilares)]
            tema = pilar["temas_ejemplo"][(doy + i) % len(pilar["temas_ejemplo"])]
            trabajos.append((pilar, tema))
    else:
        pilar = pilares[doy % len(pilares)]
        tema = pilar["temas_ejemplo"][doy % len(pilar["temas_ejemplo"])]
        trabajos.append((pilar, tema))

    for pilar, tema in trabajos:
        slug = generate.slugify(pilar["id"] + "-" + tema)
        dest = os.path.join(OUT_DIR, "%s-%s" % (fecha, slug))
        pkg = construir_pack(config, pilar, tema, fecha, dest,
                             con_voz=not args.sin_voz, con_video=not args.sin_video)
        loc = pkg["archivos_locales"]
        print("pack: %s nivel=%s video=%s audio=%s" % (slug, loc["nivel"], loc["video"], loc["audio"]))
        for motivo in loc["motivos"]:
            print("  motivo: %s" % motivo)
    print("OK: %d pack(s) en out/" % len(trabajos))
    return 0


if __name__ == "__main__":
    sys.exit(main())
