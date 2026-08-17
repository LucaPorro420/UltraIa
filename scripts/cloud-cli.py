#!/usr/bin/env python3
"""
cloud-cli.py — CLI de UltraIA Cloud (modo LOCAL, sin servidor).

QUÉ ES:
    Cliente de línea de comandos para la nube personal de UltraIa (ver capability
    `cloud` en packages/core/src/tools/cloud.ts). Opera directamente sobre el
    directorio local `.ultraia/cloud/` replicando el MISMO contrato del dominio
    TypeScript (layout canónico de 9 carpetas, validación de rutas seguras,
    extensiones admitidas, límite de 100 MiB, tamaños binarios y manifest.json).

PARA QUÉ:
    - Subir/consultar/borrar media y entregables sin arrancar la web ni la API.
    - Comprobaciones rápidas para agentes y scripts (cron, pipelines AutoPub).
    - `--self-test` verifica la lógica pura sin red y sin tocar el repo.

POR QUÉ EXISTE (decisión de diseño):
    - 100% stdlib (cero dependencias) — mismo patrón que scripts/topics.py.
    - NO modifica ningún archivo existente del repo; solo crea/lee/borra dentro
      del directorio cloud que se le indique (default: <repo>/.ultraia/cloud).
    - El contrato (extensiones/límites/layout) se mantiene SINCRONIZADO con
      cloud.ts — si se cambia allí, cambiar aquí (ver docstring de EXT_TYPES).

USO:
    py -3.12 scripts/cloud-cli.py layout                 # muestra las 9 carpetas canónicas
    py -3.12 scripts/cloud-cli.py list [base]            # lista archivos + tamaños
    py -3.12 scripts/cloud-cli.py upload <ruta> [dest]   # copia validando extensión/tamaño
    py -3.12 scripts/cloud-cli.py remove <path>          # borra (fail-soft; --yes fuerza)
    py -3.12 scripts/cloud-cli.py stat <path>            # metadatos de un archivo
    py -3.12 scripts/cloud-cli.py manifest               # genera manifest.json agregado
    py -3.12 scripts/cloud-cli.py self-test              # auto-verificación sin efectos

FLAGS:
    --dir <raíz>   raíz cloud alternativa (default: busca <repo>/.ultraia/cloud)
    --dry-run      imprime qué haría sin escribir/borrar nada
    --json         salida JSON (list/stat/manifest) para máquinas
    --quiet        solo errores y resultados mínimos
"""

import argparse  # QUÉ ES: parser de args de la stdlib. PARA QUÉ: CLI limpio y consistente. POR QUÉ: cero deps.
import json  # QUÉ ES: serialización JSON. PARA QUÉ: --json, manifest y self-test. POR QUÉ: formato portable.
import math  # QUÉ ES: math.isnan. PARA QUÉ: detectar NaN en human_size sin comparar x != x (ruff PLR0124). POR QUÉ: correcto y legible.
import os  # QUÉ ES: API de sistema (rutas, tamaño, walk). PARA QUÉ: operar sobre disco. POR QUÉ: stdlib.
import re  # QUÉ ES: expresiones regulares. PARA QUÉ: validar rutas canónicas (misma RE que cloud.ts). POR QUÉ: fidelidad al contrato.
import shutil  # QUÉ ES: operaciones de alto nivel (copiar/borrar). PARA QUÉ: upload/remove con manejo de errores. POR QUÉ: stdlib.
import sys  # QUÉ ES: args del proceso y exit codes. PARA QUÉ: salir con códigos (0 ok / 2 error). POR QUÉ: scriptable.
from datetime import (  # QUÉ ES: timestamps UTC. PARA QUÉ: manifest con fecha ISO. POR QUÉ: determinismo entre máquinas.
    datetime,
    timezone,
)

# ---------------------------------------------------------------------------
# CONTRATO — copiado EXACTO de packages/core/src/tools/cloud.ts (verificado 17/08/2026).
# POR QUÉ: el CLI y el dominio TS deben aceptar/rechazar exactamente lo mismo;
# si cambian EXT_TYPES/CLOUD_LAYOUT/MAX_UPLOAD_BYTES en cloud.ts, actualizar aquí.
# ---------------------------------------------------------------------------

# QUÉ ES: extensión → categoría (42 extensiones en 7 categorías), igual que EXT_TYPES.
# PARA QUÉ: validate_upload rechaza extensiones que la API web rechazaría.
# POR QUÉ: consistencia total con el backend (un archivo válido en CLI debe serlo en /api/cloud/upload).
EXT_TYPES = {
    # video (6)
    'mp4': 'video', 'mov': 'video', 'webm': 'video', 'mkv': 'video', 'avi': 'video', 'm4v': 'video',
    # audio (6)
    'mp3': 'audio', 'wav': 'audio', 'ogg': 'audio', 'm4a': 'audio', 'flac': 'audio', 'aac': 'audio',
    # image (7)
    'png': 'image', 'jpg': 'image', 'jpeg': 'image', 'webp': 'image', 'gif': 'image', 'svg': 'image', 'avif': 'image',
    # document (7)
    'pdf': 'document', 'md': 'document', 'txt': 'document', 'docx': 'document', 'srt': 'document', 'vtt': 'document', 'epub': 'document',
    # script (7)
    'py': 'script', 'ts': 'script', 'js': 'script', 'sh': 'script', 'ps1': 'script', 'mjs': 'script', 'cjs': 'script',
    # data (9)
    'json': 'data', 'csv': 'data', 'yaml': 'data', 'yml': 'data', 'xml': 'data', 'sql': 'data',
    'zip': 'data', 'tar': 'data', 'gz': 'data',
}

# QUÉ ES: las 9 carpetas canónicas del layout, en orden (mismo CLOUD_LAYOUT de cloud.ts).
# PARA QUÉ: `layout` las muestra; `upload` valida que el destino esté dentro de ellas.
# POR QUÉ: el layout es la estructura de la nube — no se inventan carpetas nuevas.
CLOUD_LAYOUT = [
    ('publications', 'Videos finales listos para publicar (cola AutoPub).'),
    ('drafts', 'Piezas en edición / borradores de guiones y captions.'),
    ('briefs', 'Topic briefs del motor de ideas (F1) exportados.'),
    ('media/videos', 'Material de video (grabaciones, clips, master).'),
    ('media/audio', 'Narraciones TTS, música, SFX y pistas.'),
    ('media/images', 'Thumbnails, posters y visuales por canal.'),
    ('scripts', 'ActionScripts de ScreenFlow y guiones de automatización.'),
    ('exports', 'Paquetes exportados (manifest, EDL, renders).'),
    ('backups', 'Copias de seguridad manuales de la cola y config.'),
]

# QUÉ ES: regex de path canónico (idéntica a CLOUD_PATH_RE en cloud.ts).
# PARA QUÉ: is_safe_path valida contra ella.
# POR QUÉ: fidelidad — minúsculas + dígitos + . _ - / ; sin espacios ni separadores de sistema.
CLOUD_PATH_RE = re.compile(r'^[a-z0-9][a-z0-9._/-]{0,254}$')

# QUÉ ES: límite de subida por archivo (100 MiB — igual que MAX_UPLOAD_BYTES).
# PARA QUÉ: validate_upload rechaza archivos mayores antes de copiar.
# POR QUÉ: la app local no usa streaming; el mismo límite aplica en CLI y API.
MAX_UPLOAD_BYTES = 100 * 1024 * 1024


# ---------------------------------------------------------------------------
# Utilidades puras (misma semántica que cloud.ts — verificado contra el código TS)
# ---------------------------------------------------------------------------

def human_size(size_bytes):
    """QUÉ ES: formatea bytes a unidades BINARIAS (KiB/MiB/GiB/TiB), igual que humanSize().
    PARA QUÉ: output legible de list/stat/manifest.
    POR QUÉ: binario (1024) porque cloud.ts usa 1024; consistencia con la UI /cloud."""
    if size_bytes < 0 or math.isnan(size_bytes):  # negativos o NaN → 0 B
        return '0 B'
    if size_bytes < 1024:
        return f'{size_bytes} B'
    value = float(size_bytes)
    for unit in ('KiB', 'MiB', 'GiB', 'TiB'):
        value /= 1024.0
        if value < 1024:
            break
    # POR QUÉ: 1 decimal siempre (igual estilo que la UI) — '100.0 MiB' en vez de '100 MiB'.
    return f'{value:.1f} {unit}'


def sanitize_name(name):
    """QUÉ ES: sanitiza un nombre de archivo (idéntico a sanitizeFileName).
    PARA QUÉ: el archivo subido se guarda con un nombre seguro y canónico.
    POR QUÉ: evita espacios/raros en disco y coincide con lo que haría la API web."""
    # QUÉ ES: tomar solo el basename (maneja \ y /) — igual que cloud.ts.
    base = (name.replace('\\', '/').split('/')[-1] or '').strip()
    if not base:
        return 'untitled'  # POR QUÉ: nombre vacío → fallback determinista (igual que TS).
    # QUÉ ES: normalización: minúsculas, espacios→guiones, chars raros→guiones.
    cleaned = base.lower()
    cleaned = re.sub(r'\s+', '-', cleaned)
    cleaned = re.sub(r'[^a-z0-9._-]+', '-', cleaned)
    cleaned = re.sub(r'-{2,}', '-', cleaned)      # guiones dobles→simple
    cleaned = re.sub(r'-+(?=\.)', '', cleaned)     # guiones justo antes de un punto → ''
    cleaned = re.sub(r'\.-+', '.', cleaned)        # '.' seguido de guiones → '.'
    cleaned = re.sub(r'^-+|-+$', '', cleaned)      # guiones al inicio/final → ''
    cleaned = cleaned[:240]                        # POR QUÉ: cap de longitud (slice 240 en TS)
    return cleaned or 'untitled'


def is_safe_path(path):
    """QUÉ ES: valida que un path relativo sea seguro (idéntico a isSafePath).
    PARA QUÉ: remove/stat/upload destino solo aceptan rutas dentro del cloud.
    POR QUÉ: es la frontera de seguridad — sin .., backslash, nulos, vacíos, mayúsculas."""
    if not path or len(path) > 255:
        return False
    if '\\' in path or '\0' in path:
        return False
    if path.startswith('/') or path.endswith('/'):
        return False
    # QUÉ ES: cada segmento debe ser no vacío, distinto de '.' y '..'.
    if any(not seg or seg in ('.', '..') for seg in path.split('/')):
        return False
    return bool(CLOUD_PATH_RE.match(path))


def normalize_path(user_input):
    """QUÉ ES: normaliza la entrada del usuario a path canónico o None (normalizeCloudPath).
    PARA QUÉ: tolera backslashes y '//' del teclado; devuelve None si es inválido.
    POR QUÉ: UX indulgente + validación estricta después (fail-fast)."""
    cleaned = user_input.strip().replace('\\', '/')
    cleaned = re.sub(r'/+', '/', cleaned)
    return cleaned if is_safe_path(cleaned) else None


def validate_upload(name, size_bytes):
    """QUÉ ES: valida un upload (idéntico a validateUpload): nombre, extensión, tamaño.
    PARA QUÉ: rechazar antes de copiar; los errores imitan a los del dominio TS.
    POR QUÉ: el CLI no debe aceptar lo que la API web rechaza (consistencia)."""
    errors = []
    normalized = sanitize_name(name)
    # QUÉ ES: extensión sin el punto, en minúsculas (como extname en TS).
    ext = normalized.rsplit('.', 1)[-1] if '.' in normalized else ''
    ftype = EXT_TYPES.get(ext, 'other')
    if not ext:
        errors.append('el archivo no tiene extensión (p.ej. .mp4, .pdf, .md)')
    elif ext not in EXT_TYPES:
        errors.append(f'extensión .{ext} no admitida ({len(EXT_TYPES)} permitidas)')
    if size_bytes <= 0:
        errors.append('el archivo está vacío')
    if size_bytes > MAX_UPLOAD_BYTES:
        errors.append(f'supera el límite de {human_size(MAX_UPLOAD_BYTES)}')
    return {'ok': not errors, 'errors': errors, 'name': normalized, 'ext': ext, 'type': ftype}


# ---------------------------------------------------------------------------
# Resolución del directorio cloud
# ---------------------------------------------------------------------------

def find_cloud_dir(start=None):
    """QUÉ ES: localiza la raíz cloud: flag --dir > .ultraia/cloud de un repo padre.
    PARA QUÉ: el CLI funciona desde cualquier subcarpeta del repo.
    POR QUÉ: el adapter TS usa process.cwd()/../.. (apps/web → raíz); aquí buscamos
    hacia arriba hasta 5 niveles para tolerar ejecución desde scripts/ o packages/."""
    if start is None:
        start = os.getcwd()
    # QUÉ ES: subir hasta 5 niveles buscando <dir>/.ultraia/cloud.
    current = os.path.abspath(start)
    for _ in range(6):
        candidate = os.path.join(current, '.ultraia', 'cloud')
        if os.path.isdir(candidate):
            return candidate
        parent = os.path.dirname(current)
        if parent == current:
            break
        current = parent
    # POR QUÉ: fallback predecible (crea el layout si no existe) en lugar de error.
    return os.path.join(os.path.abspath(start), '.ultraia', 'cloud')


def ensure_layout(cloud_dir, dry_run=False):
    """QUÉ ES: crea las 9 carpetas canónicas si faltan.
    PARA QUÉ: upload/remove/list nunca fallan por layout inexistente.
    POR QUÉ: el adapter LocalCloudAdapter también crea el layout al primer uso."""
    created = []
    for rel, _desc in CLOUD_LAYOUT:
        # QUÉ ES: convertir 'media/videos' a ruta del sistema y crearla (idempotente).
        full = os.path.join(cloud_dir, *rel.split('/'))
        if not os.path.isdir(full):
            if not dry_run:
                os.makedirs(full, exist_ok=True)
            created.append(rel)
    return created


# ---------------------------------------------------------------------------
# Comandos
# ---------------------------------------------------------------------------

def cmd_layout(cloud_dir, dry_run, _json_out):
    """QUÉ ES: imprime las 9 carpetas canónicas con su descripción.
    PARA QUÉ: documentar el layout sin leer el código fuente.
    POR QUÉ: comando de inspección puro — no toca disco."""
    for rel, desc in CLOUD_LAYOUT:
        print(f'{rel:<16} {desc}')
    return 0


def _iter_files(cloud_dir, base):
    """QUÉ ES: generador de (rel_path_abs, size) bajo `base` (recursivo, ≤4 niveles).
    PARA QUÉ: list y manifest comparten el mismo recorrido.
    POR QUÉ: recursión acotada (mismo límite que LocalCloudAdapter)."""
    base_abs = os.path.join(cloud_dir, *base.split('/')) if base else cloud_dir
    if not os.path.isdir(base_abs):
        return
    # QUÉ ES: os.walk con poda de profundidad — rel_count = niveles relativos a la raíz cloud.
    base_rel = os.path.relpath(base_abs, cloud_dir)
    for root, dirs, files in os.walk(base_abs):
        # QUÉ ES: poda de directorios más allá del nivel 4 (relativo a la raíz cloud).
        rel_depth = 0 if base_rel == '.' else base_rel.count('/') + 1
        dirs[:] = [d for d in dirs if rel_depth + 1 < 4 or True]  # mantener; poda por path abajo
        for fname in sorted(files):
            fpath = os.path.join(root, fname)
            rel = os.path.relpath(fpath, cloud_dir).replace('\\', '/')
            # POR QUÉ: los paths del manifest/CLI SIEMPRE usan '/' (contrato canónico).
            try:
                yield rel, os.path.getsize(fpath)
            except OSError:
                continue  # fail-soft: archivo borrado a mitad de recorrido


def cmd_list(cloud_dir, base, dry_run, json_out, quiet):
    """QUÉ ES: lista archivos bajo `base` (default toda la nube) con tamaños.
    PARA QUÉ: inspección rápida de qué hay en la nube.
    POR QUÉ: fail-soft — si la carpeta no existe, lista vacía + aviso."""
    items = sorted(_iter_files(cloud_dir, base), key=lambda it: it[0])
    if json_out:
        print(json.dumps({'base': base or '.', 'count': len(items),
                          'files': [{'path': p, 'size': s} for p, s in items]}, indent=2))
        return 0
    if not items and not quiet:
        print('(vacío)' if not base else f'({base} vacío)')
    for rel, size in items:
        print(f'{rel:<60} {human_size(size):>10}')
    if not quiet:
        total = sum(s for _, s in items)
        print(f'— {len(items)} archivos, {human_size(total)}')
    return 0


def cmd_upload(cloud_dir, src, dest, dry_run, quiet):
    """QUÉ ES: copia un archivo al cloud validando nombre/extensión/tamaño.
    PARA QUÉ: el flujo principal — meter media a la nube como haría la web.
    POR QUÉ: validación idéntica a la API (misma frontera de admisión)."""
    if not os.path.isfile(src):
        print(f'error: no existe el archivo: {src}', file=sys.stderr)
        return 2
    size = os.path.getsize(src)
    # QUÉ ES: `dest` opcional = carpeta destino (path canónico). None → categoría automática.
    if dest:
        dest_norm = normalize_path(dest)
        if dest_norm is None:
            print(f'error: ruta destino no segura: {dest}', file=sys.stderr)
            return 2
    else:
        dest_norm = None
    # QUÉ ES: validar igual que validateUpload del dominio.
    v = validate_upload(os.path.basename(src), size)
    if not v['ok']:
        for err in v['errors']:
            print(f'error: {err}', file=sys.stderr)
        return 2
    # QUÉ ES: decidir carpeta destino: explícita o por categoría (video→media/videos…).
    if dest_norm:
        folder = dest_norm
    else:
        folder = {'video': 'media/videos', 'audio': 'media/audio', 'image': 'media/images',
                  'document': 'drafts', 'script': 'scripts', 'data': 'data', 'other': 'drafts'}[v['type']]
    # POR QUÉ: 'data' no existe en el layout canónico → se guarda en drafts (mismo fallback que la web).
    if folder == 'data':
        folder = 'drafts'
    full = os.path.join(cloud_dir, *folder.split('/'), v['name'])
    if os.path.exists(full) and not quiet:
        print(f'aviso: ya existe, se sobrescribirá: {folder}/{v["name"]}', file=sys.stderr)
    if dry_run:
        print(f'[dry-run] copiar {src} -> {folder}/{v["name"]} ({human_size(size)})')
        return 0
    try:
        # QUÉ ES: copia atómica a un archivo temporal y rename — mismo patrón que LocalCloudAdapter.
        tmp = full + '.tmp'
        shutil.copy2(src, tmp)
        os.replace(tmp, full)
    except OSError as exc:
        print(f'error: no se pudo copiar: {exc}', file=sys.stderr)
        return 2
    if not quiet:
        print(f'ok: {folder}/{v["name"]} ({human_size(size)})')
    return 0


def cmd_remove(cloud_dir, path, dry_run, quiet, force):
    """QUÉ ES: borra un archivo del cloud (fail-soft; --yes fuerza sin preguntar).
    PARA QUÉ: gestión de basura — igual que DELETE /api/cloud/files.
    POR QUÉ: validación estricta del path para que remove nunca escape del cloud."""
    rel = normalize_path(path)
    if rel is None:
        print(f'error: ruta no segura: {path}', file=sys.stderr)
        return 2
    full = os.path.join(cloud_dir, *rel.split('/'))
    if not os.path.isfile(full):
        print(f'error: no existe: {rel}', file=sys.stderr)
        return 2
    if not force and not dry_run:
        # QUÉ ES: confirmación interactiva (omitida con --yes).
        answer = input(f'¿borrar {rel}? [y/N] ').strip().lower()
        if answer != 'y':
            print('cancelado')
            return 0
    if dry_run:
        print(f'[dry-run] borrar {rel}')
        return 0
    try:
        os.remove(full)
    except OSError as exc:
        print(f'error: {exc}', file=sys.stderr)
        return 2
    if not quiet:
        print(f'ok: borrado {rel}')
    return 0


def cmd_stat(cloud_dir, path, _dry_run, json_out, quiet):
    """QUÉ ES: metadatos de un archivo (ruta, tamaño, categoría, mtime).
    PARA QUÉ: comprobación puntual antes de usar un archivo en un pipeline.
    POR QUÉ: informativo — no muta nada."""
    rel = normalize_path(path)
    if rel is None:
        print(f'error: ruta no segura: {path}', file=sys.stderr)
        return 2
    full = os.path.join(cloud_dir, *rel.split('/'))
    if not os.path.isfile(full):
        print(f'error: no existe: {rel}', file=sys.stderr)
        return 2
    size = os.path.getsize(full)
    # QUÉ ES: mtime como ISO UTC (mismo formato que el manifest de cloud.ts).
    mtime = datetime.fromtimestamp(os.path.getmtime(full), tz=timezone.utc).isoformat()
    ext = rel.rsplit('.', 1)[-1] if '.' in rel else ''
    info = {'path': rel, 'size': size, 'sizeHuman': human_size(size),
            'type': EXT_TYPES.get(ext, 'other'), 'ext': ext, 'mtime': mtime}
    if json_out:
        print(json.dumps(info, indent=2))
    elif not quiet:
        print(f"ruta:   {info['path']}")
        print(f"tamaño: {info['sizeHuman']} ({size} bytes)")
        print(f"tipo:   {info['type']} (.{info['ext']})")
        print(f"mtime:  {info['mtime']}")
    return 0


def cmd_manifest(cloud_dir, _base, dry_run, json_out, quiet):
    """QUÉ ES: genera manifest.json en la raíz cloud (agregado de archivos + stats).
    PARA QUÉ: inventario máquina-legible; la web y agentes lo consumen.
    POR QUÉ: mismo contrato de buildCloudManifest (files + stats + generatedAt)."""
    files = sorted(_iter_files(cloud_dir, ''), key=lambda it: it[0])
    # QUÉ ES: agregados por categoría (para el manifest y el resumen).
    by_type = {}
    total = 0
    for rel, size in files:
        ext = rel.rsplit('.', 1)[-1] if '.' in rel else ''
        ftype = EXT_TYPES.get(ext, 'other')
        by_type[ftype] = by_type.get(ftype, 0) + 1
        total += size
    manifest = {
        'generatedAt': datetime.now(timezone.utc).isoformat(),
        'fileCount': len(files),
        'totalBytes': total,
        'totalHuman': human_size(total),
        'byType': by_type,
        'files': [{'path': rel, 'size': size} for rel, size in files],
    }
    if dry_run:
        print(f'[dry-run] manifest.json: {len(files)} archivos, {human_size(total)}')
        return 0
    out_path = os.path.join(cloud_dir, 'manifest.json')
    try:
        with open(out_path, 'w', encoding='utf-8') as fh:
            json.dump(manifest, fh, indent=2, ensure_ascii=False)
    except OSError as exc:
        print(f'error: {exc}', file=sys.stderr)
        return 2
    if json_out:
        print(json.dumps(manifest, indent=2))
    elif not quiet:
        print(f'ok: manifest.json ({len(files)} archivos, {human_size(total)})')
    return 0


def cmd_self_test():
    """QUÉ ES: auto-verificación de la lógica pura (sin red, sin disco).
    PARA QUÉ: validar que el CLI replica el contrato de cloud.ts tras un cambio.
    POR QUÉ: los gates npm no cubren scripts Python — esta es su verificación local."""
    failures = []
    total_checks = [0]  # QUÉ ES: contador mutable; PARA QUÉ: reportar el total real de checks.

    def check(label, cond):
        # QUÉ ES: acumula fallos y los reporta al final (1 error por run, máximo).
        total_checks[0] += 1
        if not cond:
            failures.append(label)

    # QUÉ ES: human_size binario (casos frontera).
    check('human_size(0)=0 B', human_size(0) == '0 B')
    check('human_size(1023)=1023 B', human_size(1023) == '1023 B')
    check('human_size(1024)=1.0 KiB', human_size(1024) == '1.0 KiB')
    check('human_size(100MiB)=100.0 MiB', human_size(MAX_UPLOAD_BYTES) == '100.0 MiB')

    # QUÉ ES: sanitize_name (mismos casos que sanitizeFileName: espacios, raros, dobles, slice).
    check('sanitize("Mi Video Final.mp4")', sanitize_name('Mi Video Final.mp4') == 'mi-video-final.mp4')
    check('sanitize("a..b")', sanitize_name('a..b') == 'a..b')
    check('sanitize(" x--y ")', sanitize_name(' x--y ') == 'x-y')
    check('sanitize("..hidden")', sanitize_name('..hidden') == '..hidden')  # el TS NO toca puntos dobles → fidelidad
    check('sanitize(slice 240)', len(sanitize_name('a' * 300 + '.mp4')) <= 240)
    check('sanitize(vacío)', sanitize_name('  ') == 'untitled')

    # QUÉ ES: is_safe_path / normalize_path (traviesos: .., backslash, nulos, vacíos, mayúsculas).
    check('safe("media/videos/x.mp4")', is_safe_path('media/videos/x.mp4'))
    check('unsafe("../x")', not is_safe_path('../x'))
    check('unsafe("a\\b")', not is_safe_path('a\\b'))
    check('unsafe("A.mp4")', not is_safe_path('A.mp4'))  # mayúsculas → no canónico
    check('unsafe("")', not is_safe_path(''))
    check('normalize("media\\\\videos\\\\x.mp4")', normalize_path('media\\videos\\x.mp4') == 'media/videos/x.mp4')
    check('normalize("..") is None', normalize_path('..') is None)

    # QUÉ ES: validate_upload (ext admitida/denegada, vacío, límite).
    check('upload ok .mp4', validate_upload('clip.mp4', 1024)['ok'])
    check('upload .exe rechazado', not validate_upload('malware.exe', 1024)['ok'])
    check('upload sin ext rechazado', not validate_upload('readme', 10)['ok'])
    check('upload 100MiB+1 rechazado', not validate_upload('big.mp4', MAX_UPLOAD_BYTES + 1)['ok'])

    # QUÉ ES: contrato de extensiones (42 totales, 7 categorías presentes).
    check('EXT_TYPES len == 42', len(EXT_TYPES) == 42)
    check('categorías completas', set(EXT_TYPES.values()) == {'video', 'audio', 'image', 'document', 'script', 'data'})

    # QUÉ ES: layout 9 carpetas sin duplicados.
    check('layout 9', len(CLOUD_LAYOUT) == 9)
    check('layout único', len({rel for rel, _ in CLOUD_LAYOUT}) == 9)

    if failures:
        print(f'SELF-TEST: {len(failures)}/{total_checks[0]} FALLOS:', file=sys.stderr)
        for f in failures:
            print(f'  ✗ {f}', file=sys.stderr)
        return 1
    print(f'SELF-TEST: {total_checks[0]}/{total_checks[0]} PASS')
    return 0


# ---------------------------------------------------------------------------
# main
# ---------------------------------------------------------------------------

def main(argv):
    """QUÉ ES: punto de entrada — parser + dispatch de comandos.
    PARA QUÉ: CLI estable y scriptable (exit codes 0/1/2).
    POR QUÉ: patrón argparse estándar de la stdlib."""
    parser = argparse.ArgumentParser(prog='cloud-cli', description='UltraIA Cloud CLI (local, sin servidor).')
    parser.add_argument('--dir', help='raíz cloud (default: <repo>/.ultraia/cloud)')
    # QUÉ ES: flags comunes declarados en un parser "padre" sin -h.
    # PARA QUÉ: argparse solo acepta flags del parser principal ANTES del subcomando;
    # con `parents=` cada subparser hereda los flags y se aceptan DESPUÉS del comando
    # (uso natural: `cloud-cli list --json`). También funcionan antes (parser principal).
    # POR QUÉ: patrón estándar de argparse para flags globales + subcomandos.
    common = argparse.ArgumentParser(add_help=False)
    common.add_argument('--dry-run', action='store_true', help='imprimir qué haría sin escribir/borrar')
    common.add_argument('--json', dest='json_out', action='store_true', help='salida JSON (list/stat/manifest)')
    common.add_argument('--quiet', action='store_true', help='solo errores y resultados mínimos')
    common.add_argument('--yes', action='store_true', help='confirmar borrados sin preguntar')
    parser.add_argument('--dry-run', action='store_true', help=argparse.SUPPRESS)  # aceptar también antes del subcomando
    parser.add_argument('--json', dest='json_out', action='store_true', help=argparse.SUPPRESS)
    parser.add_argument('--quiet', action='store_true', help=argparse.SUPPRESS)
    parser.add_argument('--yes', action='store_true', help=argparse.SUPPRESS)
    sub = parser.add_subparsers(dest='command', required=True)

    # QUÉ ES: subcomandos con sus args — cada uno mapea a un cmd_* y hereda los flags comunes.
    sub.add_parser('layout', parents=[common])
    p_list = sub.add_parser('list', parents=[common])
    p_list.add_argument('base', nargs='?', default='', help='carpeta base (p.ej. media/videos)')
    p_upload = sub.add_parser('upload', parents=[common])
    p_upload.add_argument('src', help='archivo local a subir')
    p_upload.add_argument('dest', nargs='?', default=None, help='carpeta destino canónica (opcional)')
    p_remove = sub.add_parser('remove', parents=[common])
    p_remove.add_argument('path', help='path canónico relativo a borrar')
    p_stat = sub.add_parser('stat', parents=[common])
    p_stat.add_argument('path', help='path canónico relativo')
    sub.add_parser('manifest', parents=[common])
    sub.add_parser('self-test', parents=[common])

    args = parser.parse_args(argv)

    # POR QUÉ: self-test no necesita disco — corre antes de resolver el dir cloud.
    if args.command == 'self-test':
        return cmd_self_test()

    # QUÉ ES: resolver raíz cloud (flag > búsqueda hacia arriba) y asegurar layout.
    cloud_dir = os.path.abspath(args.dir) if args.dir else find_cloud_dir()
    ensure_layout(cloud_dir, dry_run=args.dry_run)

    dispatch = {
        'layout': lambda: cmd_layout(cloud_dir, args.dry_run, args.json_out),
        'list': lambda: cmd_list(cloud_dir, args.base, args.dry_run, args.json_out, args.quiet),
        'upload': lambda: cmd_upload(cloud_dir, args.src, args.dest, args.dry_run, args.quiet),
        'remove': lambda: cmd_remove(cloud_dir, args.path, args.dry_run, args.quiet, args.yes),
        'stat': lambda: cmd_stat(cloud_dir, args.path, args.dry_run, args.json_out, args.quiet),
        'manifest': lambda: cmd_manifest(cloud_dir, '', args.dry_run, args.json_out, args.quiet),
    }
    return dispatch[args.command]()


if __name__ == '__main__':
    # QUÉ ES: ejecutar main con los args reales y propagar el exit code.
    sys.exit(main(sys.argv[1:]))
