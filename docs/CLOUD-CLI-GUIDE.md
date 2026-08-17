# UltraIA Cloud CLI — Guía de uso (`scripts/cloud-cli.py`)

> Creada 17/08/2026 (sesión ultraia-dev, ciclo "no invadir #25").
> Complemento de `docs/CLOUD-FREE-2026.md` (guía de la nube gratis) y de la capability
> `cloud` (`packages/core/src/tools/cloud.ts`): este CLI da acceso a la nube **sin
> servidor web ni API** — solo el directorio local `.ultraia/cloud/` (o R2 vía la app).

---

## 1) QUÉ ES y POR QUÉ EXISTE

`cloud-cli.py` es un cliente de línea de comandos de UltraIA Cloud en modo local:

- **QUÉ ES**: replica en Python (stdlib puro, cero deps) el contrato del dominio TS
  `cloud.ts` — layout canónico de 9 carpetas, validación de rutas seguras, 42
  extensiones en 7 categorías, límite de 100 MiB, tamaños binarios y `manifest.json`.
- **PARA QUÉ**: subir/consultar/borrar media y entregables desde scripts, cron,
  agentes o terminal — sin arrancar `next dev` ni autenticarse.
- **POR QUÉ**: el stack cloud del proyecto es *keyless-first y $0*; un CLI sin
  servidor encaja con ese principio y con el patrón existente (`scripts/topics.py`).

**IMPORTANTE — sincronización**: el contrato (extensiones, layout, límite) debe
mantenerse IDÉNTICO al de `packages/core/src/tools/cloud.ts`. Si se cambia allí,
cambiar aquí (y viceversa). El `self-test` y `cloud-cli.test.py` validan la lógica,
no la sincronía — la revisión es humana.

---

## 2) Requisitos

- Python ≥ 3.10 (verificado con 3.12). Solo stdlib.
- Sin instalación: se ejecuta directo desde el repo.

```powershell
# Verificación de salud (25 checks de lógica pura)
py -3.12 scripts/cloud-cli.py self-test

# Suite e2e completa (11 tests; corre en tempdir, no toca el repo)
py -3.12 scripts/cloud-cli.test.py
```

---

## 3) Comandos

| Comando | Qué hace | Exit codes |
|---|---|---|
| `layout` | Muestra las 9 carpetas canónicas | 0 |
| `list [base]` | Lista archivos + tamaños (recursivo, ≤4 niveles) | 0 |
| `upload <archivo> [carpeta]` | Copia al cloud validando extensión/tamaño; carpeta opcional | 0 ok / 2 error |
| `remove <path>` | Borra (pide confirmación; `--yes` la omite) | 0 ok / 2 error |
| `stat <path>` | Metadatos de un archivo | 0 ok / 2 error |
| `pull <path> [destino]` | Descarga un archivo del cloud al disco (destino = archivo o carpeta; default: cwd) | 0 ok / 2 error |
| `manifest` | Genera `manifest.json` agregado en la raíz cloud | 0 |
| `self-test` | Auto-verificación de la lógica pura | 0 ok / 1 fallo |

Flags globales (antes o después del subcomando): `--dir <raíz>` · `--dry-run` ·
`--json` · `--quiet` · `--yes`.

### 3.1 Ejemplos

```powershell
# 1. Ver el layout canónico
py -3.12 scripts/cloud-cli.py layout

# 2. Subir un video final (clasificación automática → media/videos, nombre saneado)
py -3.12 scripts/cloud-cli.py upload "C:\renders\Mi Video Final.mp4"

# 3. Subir a carpeta explícita
py -3.12 scripts/cloud-cli.py upload brief.json briefs

# 4. Listar todo en JSON (para consumir desde scripts)
py -3.12 scripts/cloud-cli.py list --json

# 5. Inventario máquina-legible
py -3.12 scripts/cloud-cli.py manifest --json

# 6. Borrar un archivo (dry-run primero, luego real)
py -3.12 scripts/cloud-cli.py remove media/videos/viejo.mp4 --dry-run
py -3.12 scripts/cloud-cli.py remove media/videos/viejo.mp4 --yes

# 7. Descargar del cloud al disco (destino = archivo, carpeta o default cwd)
py -3.12 scripts/cloud-cli.py pull media/videos/final.mp4 "D:\renders\final.mp4"
py -3.12 scripts/cloud-cli.py pull media/images/thumb.png "D:\out\"   # dentro de la carpeta
py -3.12 scripts/cloud-cli.py pull exports/edl/entrevista.json        # → ./entrevista.json

# 8. Raíz cloud alternativa (por defecto: <repo>/.ultraia/cloud)
py -3.12 scripts/cloud-cli.py --dir D:\nube list
```

### 3.2 Comportamiento verificado (testeado)

- **Sanitización**: `Mi Clip 2026.mp4` → `mi-clip-2026.mp4` (minúsculas, espacios→guiones).
- **Clasificación automática**: `.mp4`→`media/videos/`, `.mp3`→`media/audio/`,
  `.png`→`media/images/`, `.py`→`scripts/`, `.json`→`drafts/` (data no tiene carpeta
  propia en el layout → fallback drafts, igual que la web).
- **Seguridad**: rechaza `..`, `\`, rutas con mayúsculas, destinos fuera del layout.
- **Límite**: 100 MiB por archivo (mismo tope que `POST /api/cloud/upload`).
- **Escritura atómica**: copia a `<archivo>.tmp` y `rename` (nunca un archivo a medias).

---

## 4) Integración (casos de uso)

### 4.1 Agentes (tools `cloud_files` de la capability `cloud`)

El CLI es el *espejo offline* de la tool `cloud_files` que los agentes usan vía
`ai/llm.ts` (adapter local o R2 por env). Ambos operan sobre el mismo layout —
lo que un agente sube por API, el CLI lo ve en disco y viceversa.

### 4.2 AutoPub (publicaciones)

Flujo recomendado para un paquete listo para publicar:

```powershell
# 1. El paquete generado (manifest + media) se sube a la nube
py -3.12 scripts/cloud-cli.py upload package.json exports
py -3.12 scripts/cloud-cli.py upload final.mp4 media/videos

# 2. Verificar que el inventario quedó bien
py -3.12 scripts/cloud-cli.py list exports --json
```

> Pendiente (backlog): conectar la cola `Publication` directamente con el cloud
> (ver `docs/TAREA-CLOUD-PUBLICATIONS.md`).

### 4.3 Programación (cron / schtasks)

```powershell
# Diario a las 02:00 (Windows)
schtasks /Create /TN "UltraIa-Cloud-Manifest" /SC DAILY /ST 02:00 `
  /TR "py -3.12 C:\repo\scripts\cloud-cli.py manifest --quiet"
```

---

## 5) Verificación y gates

| Chequeo | Comando | Estado |
|---|---|---|
| Sintaxis | `py -3.12 -m py_compile scripts/cloud-cli.py` | ✅ |
| Lint | `py -3.12 -m ruff check scripts/cloud-cli.py` (+ `.test.py`) | ✅ 0 issues |
| Lint extra | `py -3.12 -m pyflakes scripts/cloud-cli.py` | ✅ |
| Lógica pura | `py -3.12 scripts/cloud-cli.py self-test` | ✅ 25/25 PASS |
| E2E | `py -3.12 scripts/cloud-cli.test.py` | ✅ 16/16 PASS |

> Los gates npm del repo (typecheck/lint/test/build) NO cubren scripts Python;
> los comandos de arriba son su verificación local. El commit de estos archivos
> se hará cuando el árbol del repo esté limpio (gates FULL).

---

## 6) Archivos

| Archivo | Rol |
|---|---|
| `scripts/cloud-cli.py` | El CLI (comentado línea por línea: qué/para qué/por qué) |
| `scripts/cloud-cli.test.py` | Suite e2e (11 tests, tempdir aislado) |
| `docs/TAREA-WIRING-CLOUD.md` | Evidencia del wiring de la capability (superada por commit `7315d4d`) |
| `docs/TAREA-CLOUD-PUBLICATIONS.md` | Tarea diferida: conectar cloud con la cola Publication |
| `docs/TAREA-CLOUD-VIDEOEDIT.md` | Tarea diferida: archivar EDL/self-eval/timeline/render en `exports/` |
| `packages/core/src/tools/cloud.ts` | Contrato canónico (fuente de verdad) |
