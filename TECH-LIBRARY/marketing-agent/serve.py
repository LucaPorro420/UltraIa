#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Galería local TECH-LIBRARY — ver/descargar packs sin cuentas ni internet.

Sirve out/ en 127.0.0.1:8765 con índice generado (portada, video, audio).
Solo stdlib. Uso:  py serve.py [--port 8765]   (Ctrl+C para parar)
"""
from __future__ import annotations

import argparse
import functools
import html
import http.server
import json
import os
import sys

BASE = os.path.dirname(os.path.abspath(__file__))
OUT_DIR = os.path.join(BASE, "out")


def tarjeta(nombre):
    ruta = os.path.join(OUT_DIR, nombre)
    titulo, nivel, piezas = html.escape(nombre), "", ""
    try:
        with open(os.path.join(ruta, "paquete.json"), "r", encoding="utf-8") as fh:
            pkg = json.load(fh)
        titulo = html.escape("%s — %s" % (pkg.get("pilar", "?"), pkg.get("tema", "?")))
        loc = pkg.get("archivos_locales", {})
        nivel = html.escape("nivel " + loc.get("nivel", "?"))
        if os.path.exists(os.path.join(ruta, "portada.png")):
            piezas += "<img src='%s/portada.png' loading='lazy'>" % nombre
        if os.path.exists(os.path.join(ruta, "reel.mp4")):
            piezas += ("<video src='%s/reel.mp4' controls preload='none'></video>" % nombre)
        if os.path.exists(os.path.join(ruta, "narracion.wav")):
            piezas += ("<audio src='%s/narracion.wav' controls preload='none'></audio>" % nombre)
    except Exception:
        piezas = "<p>paquete incompleto</p>"
    return ("<article><h2>%s</h2><p class='nivel'>%s · %s</p>%s"
            "<p><a href='%s/paquete.json'>manifiesto</a></p></article>") % (
                titulo, html.escape(nombre), nivel, piezas, nombre)


class Galeria(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *args):
        pass

    def do_GET(self):
        if self.path in ("/", "/index.html"):
            try:
                packs = sorted(
                    d for d in os.listdir(OUT_DIR)
                    if os.path.isdir(os.path.join(OUT_DIR, d)) and not d.startswith("."))
            except Exception:
                packs = []
            cuerpo = "\n".join(tarjeta(p) for p in packs) or "<p>Sin packs. Corre: py factory.py --demo</p>"
            pagina = ("<!DOCTYPE html><html lang='es'><head><meta charset='utf-8'>"
                      "<meta name='viewport' content='width=device-width,initial-scale=1'>"
                      "<title>TECH-LIBRARY - Galeria local</title><style>"
                      "body{background:#08080a;color:#f4f4f5;font-family:Arial,sans-serif;"
                      "max-width:900px;margin:auto;padding:24px}"
                      "h1{color:#8b5cf6}.nivel{color:#a1a1aa}article{background:#101014;"
                      "border:1px solid #232330;border-radius:10px;padding:16px;margin:16px 0}"
                      "img,video{max-width:100%;border-radius:8px;display:block;margin:8px 0}"
                      "a{color:#8b5cf6}</style></head><body>"
                      "<h1>TECH-LIBRARY - Galeria local</h1>" + cuerpo + "</body></html>")
            datos = pagina.encode("utf-8")
            self.send_response(200)
            self.send_header("Content-Type", "text/html; charset=utf-8")
            self.send_header("Content-Length", str(len(datos)))
            self.end_headers()
            self.wfile.write(datos)
            return
        super().do_GET()


def main(argv=None):
    ap = argparse.ArgumentParser(description="Galeria local TECH-LIBRARY")
    ap.add_argument("--port", type=int, default=8765)
    args = ap.parse_args(argv)
    os.makedirs(OUT_DIR, exist_ok=True)
    servidor = http.server.ThreadingHTTPServer(
        ("127.0.0.1", args.port),
        functools.partial(Galeria, directory=OUT_DIR))
    print("Galeria en http://127.0.0.1:%d  (Ctrl+C para parar)" % args.port)
    try:
        servidor.serve_forever()
    except KeyboardInterrupt:
        pass
    return 0


if __name__ == "__main__":
    sys.exit(main())
