#!/usr/bin/env python3
"""build-prototipo.py — empaqueta UltraIa en un ZIP portable (web standalone + desktop).

Artefacto: `UltraIa-Prototipo.zip` usable out-of-the-box en Windows:
  - web/      → Next.js standalone (server.js + node_modules minimizados + .next/static +
                public/ + prisma/dev.db con seed admin + .env generado)
  - desktop/  → launcher.mjs (spike Fase D, con --web-dir) + dist compilado (runtime+core
                CJS, DLLs vendor WebView2, webview2-host.exe)
  - UltraIa.bat → arranque 1 clic (launcher con --web-dir; fallback navegador)
  - INSTRUCCIONES.txt → guía en español

Cero dependencias (stdlib puro — DNA keyless-first del proyecto).

Uso:
  python scripts/build-prototipo.py                # build web + empaqueta + zip + check
  python scripts/build-prototipo.py --skip-build   # reusa .next existente
  python scripts/build-prototipo.py --out <dir>    # directorio de salida (default: raíz)
  python scripts/build-prototipo.py --check-zip <archivo.zip>   # valida el artefacto
"""

import argparse
import os
import shutil
import subprocess
import sys
import zipfile

REPO = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
APP = os.path.join(REPO, "apps", "web")
LAUNCHER = os.path.join(REPO, "desktopFase", "launcher")
DB_SRC = os.path.join(REPO, "packages", "core", "prisma", "dev.db")
TOP = "UltraIa-Prototipo"  # carpeta raíz dentro del zip

REQUIRED_IN_ZIP = [
    f"{TOP}/UltraIa.bat",
    f"{TOP}/INSTRUCCIONES.txt",
    f"{TOP}/web/server.js",
    f"{TOP}/web/.env",
    f"{TOP}/web/prisma/dev.db",
    f"{TOP}/web/.next/static/",
    f"{TOP}/desktop/launcher.mjs",
    f"{TOP}/desktop/dist/webview2-host.exe",
    f"{TOP}/desktop/dist/packages/runtime/src/runtime.js",
]


def log(msg):
    print(f"[build-prototipo] {msg}")


def build_web():
    log("corriendo npm run build (web workspace)…")
    res = subprocess.run(["npm", "run", "build"], cwd=REPO, shell=True)
    if res.returncode != 0:
        sys.exit(f"npm run build falló (exit {res.returncode})")


def copy_tree_skip_junctions(src, dst):
    """Copia src -> dst saltando junctions (evita ciclos self-referenciales del alias
    @ultraia/core de dist/). Los junctions se re-materializan aparte como copias reales."""
    for root, dirs, files in os.walk(src):
        rel = os.path.relpath(root, src)
        target = dst if rel == "." else os.path.join(dst, rel)
        os.makedirs(target, exist_ok=True)
        for d in list(dirs):
            if os.path.isjunction(os.path.join(root, d)):
                dirs.remove(d)
        for f in files:
            shutil.copy2(os.path.join(root, f), os.path.join(target, f))


def copy_tree_materialize(src, dst, _visited=None):
    """Copia src -> dst SIGUIENDO junctions (materializa el contenido real del destino).

    El standalone de Next 15 en Windows/monorepo usa junctions en node_modules/;
    un copytree normal o un zip los escribiría vacíos (los skips de os.walk).
    Con realpath visitados se evitan ciclos (junctions self-referenciales).
    """
    if _visited is None:
        _visited = set()
    real = os.path.realpath(src)
    if real in _visited:
        return
    _visited.add(real)
    for root, dirs, files in os.walk(src, followlinks=False):
        rel = os.path.relpath(root, src)
        target = dst if rel == "." else os.path.join(dst, rel)
        os.makedirs(target, exist_ok=True)
        for d in list(dirs):
            dp = os.path.join(root, d)
            if os.path.isjunction(dp):
                dirs.remove(d)
                real_d = os.path.realpath(dp)
                if real_d not in _visited:
                    copy_tree_materialize(real_d, os.path.join(target, d), _visited)
        for f in files:
            shutil.copy2(os.path.join(root, f), os.path.join(target, f))


def stage(out_dir):
    """Copia web standalone + desktop al directorio de staging.

    Next 15 en monorepo anida la app: `.next/standalone/apps/web/` (server.js + .next/),
    con node_modules/ y packages/ en la raíz del standalone. Se FUSIONA todo en `web/`
    (server.js en la raíz del zip) — validado empíricamente (GET /login 200).
    """
    web_out = os.path.join(out_dir, "web")
    desktop_out = os.path.join(out_dir, "desktop")
    standalone = os.path.join(APP, ".next", "standalone")
    if not os.path.exists(standalone):
        sys.exit(f"ERROR: no hay build standalone en {standalone} (corre sin --skip-build)")

    nested = os.path.join(standalone, "apps", "web")
    if os.path.exists(os.path.join(nested, "server.js")):
        app_src, root_src = nested, standalone
    elif os.path.exists(os.path.join(standalone, "server.js")):
        app_src, root_src = standalone, None
    else:
        sys.exit("ERROR: server.js no encontrado dentro del standalone")

    log(f"copiando standalone -> {web_out} (fusionado)...")
    # Materializa junctions del standalone (Next 15 en Windows usa junctions en
    # node_modules) para que el zip contenga el contenido real.
    copy_tree_materialize(app_src, web_out)
    if root_src:
        for extra in ("node_modules", "packages"):
            src = os.path.join(root_src, extra)
            if os.path.isdir(src):
                copy_tree_materialize(src, os.path.join(web_out, extra))
    # Red de seguridad: el tracing de Next puede dejar `next/` podado (sin
    # package.json); dentro del repo resuelve subiendo al node_modules raíz, pero
    # en el zip (fuera del repo) el server.js no arrancaría. Completar desde el repo.
    next_out = os.path.join(web_out, "node_modules", "next")
    if os.path.isdir(next_out) and not os.path.exists(os.path.join(next_out, "package.json")):
        log("next/ sin package.json -> complementando con node_modules/next del repo")
        copy_tree_materialize(os.path.join(REPO, "node_modules", "next"), next_out)
    # El .env que Next copia al standalone puede contener claves locales → se elimina;
    # el .env del prototipo se escribe más abajo (solo PORT/HOSTNAME/DATABASE_URL).
    env_leak = os.path.join(web_out, ".env")
    if os.path.exists(env_leak):
        os.remove(env_leak)
    # Estáticos públicos (standalone NO los incluye)
    static_src = os.path.join(APP, ".next", "static")
    if os.path.isdir(static_src):
        shutil.copytree(static_src, os.path.join(web_out, ".next", "static"),
                        dirs_exist_ok=True)
    # public/ (incluye PrototypeREADME.pdf)
    if os.path.isdir(os.path.join(APP, "public")):
        shutil.copytree(os.path.join(APP, "public"), os.path.join(web_out, "public"),
                        dirs_exist_ok=True)
    # DB con seed (admin/admin) — el server.js corre con cwd=web/ → file:./prisma/dev.db
    if not os.path.exists(DB_SRC):
        sys.exit("ERROR: packages/core/prisma/dev.db no existe (corre npm run db:migrate + seed)")
    os.makedirs(os.path.join(web_out, "prisma"), exist_ok=True)
    shutil.copy2(DB_SRC, os.path.join(web_out, "prisma", "dev.db"))
    log("dev.db embebida (seed admin/admin)")

    # .env generado (sin claves reales; PORT/HOSTNAME los fija también el launcher)
    env_lines = [
        "# UltraIa Prototipo — .env generado por scripts/build-prototipo.py",
        'PORT=3000',
        'HOSTNAME=127.0.0.1',
        'DATABASE_URL="file:./prisma/dev.db"',
        'APP_URL=http://127.0.0.1:3000',
        '# LLM: default ollama (local). Para respuestas reales usa:',
        '# ULTRAIA_PROVIDER=openai + OPENAI_API_KEY=<tu key>',
        'ULTRAIA_PROVIDER=ollama',
        '# Opcionales: MEIGEN_API_TOKEN, EXA_API_KEY, GEN_ENGINE_URL,',
        '# YOUTUBE_ACCESS_TOKEN, TIKTOK_ACCESS_TOKEN, GOOGLE_API_KEY, DEEPSEEK_API_KEY',
    ]
    with open(os.path.join(web_out, ".env"), "w", encoding="utf-8") as fh:
        fh.write("\n".join(env_lines) + "\n")

    log(f"copiando desktop -> {desktop_out} ...")
    copy_tree_skip_junctions(LAUNCHER, desktop_out)
    # Re-materializar los junctions del dist como copias reales (una sola pasada,
    # su destino real puede contener junctions anidados -> copy_tree_skip_junctions)
    dist_src = os.path.join(LAUNCHER, "dist")
    dist_out = os.path.join(desktop_out, "dist")
    for junction_rel in ("node_modules/@ultraia/core", "node_modules/@ai-sdk"):
        jpath = os.path.join(dist_src, junction_rel)
        if os.path.isjunction(jpath):
            real = os.path.realpath(jpath)
            if os.path.isdir(real):
                copy_tree_skip_junctions(real, os.path.join(dist_out, junction_rel))
                log(f"junction re-materializado: {junction_rel}")
    return web_out, desktop_out


def write_bat(out_dir):
    bat = r"""@echo off
setlocal
cd /d "%~dp0"
title UltraIa Prototipo
echo [UltraIa] Arrancando la web (Next.js standalone) + ventana de escritorio...
node "desktop\launcher.mjs" --web-dir "web" --web-port 3000
if errorlevel 1 (
  echo [UltraIa] Launcher no disponible; abriendo la web en el navegador...
  start "" "http://127.0.0.1:3000"
  cd web
  rem Prisma 6 resuelve `file:` contra el schema del build -> ruta absoluta en runtime
  set "DATABASE_URL=file:%CD:\=/%/prisma/dev.db"
  node server.js
)
pause
"""
    with open(os.path.join(out_dir, "UltraIa.bat"), "w", encoding="utf-8", newline="\r\n") as fh:
        fh.write(bat)


def write_instrucciones(out_dir):
    txt = r"""UltraIa — Prototipo empaquetado (Web + Desktop)
=====================================================

QUÉ ES
  Prototipo funcional de UltraIa: plataforma IA (agentes, generación audiovisual OMAG,
  publicación automática) con app web de producción y ventana de escritorio nativa
  (WebView2). Sin API keys obligatorias (keyless-first).

REQUISITOS
  - Windows 10/11 (el host de escritorio es win-x64). Linux/macOS: usa la web con
    `cd web && node server.js` y abre http://127.0.0.1:3000 en tu navegador.
  - Node.js 20+ (solo para arrancar; no instala nada).
  - Edge o WebView2 Runtime (viene con Windows 11; en Windows 10 se auto-instala).

CÓMO USARLO (1 clic)
  1. Descomprime UltraIa-Prototipo.zip en cualquier carpeta.
  2. Doble clic en `UltraIa.bat` → se abre la ventana de UltraIa.
  3. Login demo: usuario `admin` / contraseña `admin` (8 agentes bp-admin-*).

  La web también queda disponible en http://127.0.0.1:3000 (login desde el navegador).

QUÉ HAY DENTRO
  web/      App Next.js standalone (server.js) + DB SQLite embebida (prisma/dev.db)
  desktop/  Launcher de escritorio (launcher.mjs + dist + webview2-host.exe + DLLs)
  web/.env  Configuración (puerto, DB, proveedor LLM)

API KEYS OPCIONALES (edita web/.env y reinicia)
  - Respuestas LLM reales:  ULTRAIA_PROVIDER=openai  +  OPENAI_API_KEY=<key>
                            (o google/deepseek/ollama local)
  - Imágenes premium:       MEIGEN_API_TOKEN=<key>
  - Búsqueda web premium:   EXA_API_KEY=<key>
  - Publicación YouTube:    YOUTUBE_ACCESS_TOKEN=<token>
  - Publicación TikTok:     TIKTOK_ACCESS_TOKEN=<token>
  - Gen-Engine remoto:      GEN_ENGINE_URL=http://<host>:8100
  Sin claves: todo funciona en modo keyless (pollinations/meigen públicas, edge-tts,
  Tunetank música, storyboard video).

SOLUCIÓN DE PROBLEMAS
  - Puerto 3000 ocupado: cambia PORT en web/.env y usa `node desktop\launcher.mjs
    --web-dir web --web-port <puerto>` (o abre http://127.0.0.1:<puerto>).
  - La ventana no abre: el launcher degrada a msedge --app; si tampoco hay Edge,
    abre la web manualmente en el navegador.
  - Correr la web a mano (sin launcher): setea la DB absoluta primero:
    `set DATABASE_URL=file:%CD:\=/%/prisma/dev.db` y luego `node server.js`.
  - Windows SmartScreen: "Más información → Ejecutar de todas formas" (script propio,
    sin firma).
  - La DB se resetea regenerando el zip; para conservar datos, copia web/prisma/dev.db.

REGENERAR EL ZIP (en el repo fuente)
  python scripts/build-prototipo.py

NOTAS
  - Prototipo Windows-only para el escritorio; la web corre en cualquier SO.
  - Los tokens nunca se incrustan; edítalos en web/.env tras descomprimir.
  - Más docs: PrototypeREADME.md / PrototypeREADME.pdf dentro de web/public/.
"""
    with open(os.path.join(out_dir, "INSTRUCCIONES.txt"), "w", encoding="utf-8") as fh:
        fh.write(txt)


def zipdir(src_dir, zip_path):
    log(f"zip -> {zip_path} ...")
    with zipfile.ZipFile(zip_path, "w", zipfile.ZIP_DEFLATED, compresslevel=6) as z:
        for root, _dirs, files in os.walk(src_dir):
            for f in files:
                full = os.path.join(root, f)
                rel = os.path.relpath(full, src_dir)
                z.write(full, os.path.join(TOP, rel).replace("\\", "/"))


def check_zip(zip_path):
    try:
        with zipfile.ZipFile(zip_path) as z:
            bad = z.testzip()
            names = set(z.namelist())
    except (zipfile.BadZipFile, OSError) as err:
        print(f"md2pdf-style check: {zip_path}: ZIP inválido ({err}) -> FALLO")
        return 1
    missing = [r for r in REQUIRED_IN_ZIP if not any(n.startswith(r) for n in names)]
    size_mb = os.path.getsize(zip_path) / (1024 * 1024)
    ok = bad is None and not missing
    print(f"[check-zip] {os.path.basename(zip_path)}: {size_mb:.1f} MB, "
          f"entradas={len(names)}, corruptas={bad}, faltantes={missing or 'ninguna'} -> "
          f"{'OK' if ok else 'FALLO'}")
    return 0 if ok else 1


def main():
    # Consola Windows con cp1252: evita UnicodeEncodeError en prints
    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")
        sys.stderr.reconfigure(encoding="utf-8", errors="replace")
    ap = argparse.ArgumentParser(description="Empaqueta UltraIa en un ZIP portable")
    ap.add_argument("--skip-build", action="store_true", help="reusa .next existente")
    ap.add_argument("--out", default=REPO, help="directorio de salida (default: raíz del repo)")
    ap.add_argument("--check-zip", metavar="ZIP", help="valida el artefacto y sale")
    args = ap.parse_args()

    if args.check_zip:
        return check_zip(args.check_zip)

    staging = os.path.join(args.out, ".prototipo-stage")
    if os.path.exists(staging):
        shutil.rmtree(staging)
    os.makedirs(staging)

    if not args.skip_build:
        build_web()
    stage(staging)
    write_bat(staging)
    write_instrucciones(staging)

    zip_path = os.path.join(args.out, "UltraIa-Prototipo.zip")
    if os.path.exists(zip_path):
        os.remove(zip_path)
    zipdir(staging, zip_path)
    shutil.rmtree(staging)
    return check_zip(zip_path)


if __name__ == "__main__":
    sys.exit(main())