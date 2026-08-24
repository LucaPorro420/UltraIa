# UltraIa

> Plataforma IA integral: agentes, generación audiovisual, publicación automática y
> runtime de escritorio. En fase de prototipo activo con vistas a lanzamiento.

## Descripción general

UltraIa es un monorepo (npm workspaces) que combina un **app web** (Next.js 15 + Tailwind v4 +
Vercel AI SDK), un **núcleo de dominio** (TypeScript con Prisma), un **motor de generación**
(Gen-Engine en Python), una **app móvil** (Expo, Android/iOS) y un **runtime de escritorio**
(`@ultraia/runtime`). Su lógica central es un **sistema operativo de mundos mediáticos** (OMAG):
con una idea entra un plan de director, generadores de imagen/video/audio (keyless-first, sin API
keys obligatorias), críticos que evalúan sincronía e identidad, y un bucle de corrección
automática (máx 5 iteraciones).

Principio rector: **keyless-first con degradación elegante** — todo funciona sin API keys usando
servicios gratuitos; las claves opcionales solo activan providers premium.

## Lógica general

```
apps/web (Next.js)  ────  packages/core (dominio, tools, OMAG, AutoPub, Prisma)
        │                          │
        ▼                          ▼
  webhooks :8000        @ultraia/runtime (desktop, Local API 127.0.0.1)
        │                          │
        ▼                          ▼
  Gen-Engine :8100 (Python, keyless-first)   Desktop Fase D (launcher + host WebView2)

apps/mobile (Expo) ──► REST de apps/web (header x-ultraia-session)
Cerebro: local cada 120 min (schtasks) + nube cada 4 h (GitHub Actions cron)
```

## Capacidades actuales (estado 24/08/2026)

- **Agentes de IA**: 16 blueprints del sistema (investigador, analista, guionista, publicador,
  orquestador…) con capability `skills` (pipeline plan/build/test/review/ship/simplify),
  `memory` (memoria versionada con guards y persistencia atómica), `content`, `semantic_memory`
  (búsqueda semántica sobre verdad verificada) y **58+ herramientas** agrupadas por capacidad:
  búsqueda web/lectura (reach), imagen, video (EDL + ffmpeg argv), audio (TTS 14 idiomas +
  música Tunetank + síntesis WAV), código (builder/codegen), diagramas editoriales, imaging
  (kernels TS puro), motion (flujo óptico), videoqa (PSNR/SSIM/E_total), replica (análisis-por-
  síntesis), sdf/ray-marching, generative (perlin/simplex/mandelbrot/l-system/FM/granular),
  geometry/pngrender/procvid (glTF/OBJ/PNG/GIF puros), codevfx (VFX 100 % código, 12 acciones
  en v2), travel, screenflow + recordly (grabación con auto-zoom), vault, pdfsearch, libros,
  research, enlaces, kgraph (grafo de conocimiento), brainpage (memoria Markdown persistente),
  cloud (archivos Local/R2 + CLI Python), g0dm0d3 (parseltongue/auto-tune/races) y harness.
- **AutoPub F1–F5 completo + ciclo autónomo**: ideas (`topics` RSS/DDG → cola `TopicBrief`) →
  contenido bilingüe es/ar (redactor, guionista 45–60 s, guion largo OMAG 60–180 s con TTS) →
  presentación unificada (paquete por canal con branding) → distribución a **10 canales**
  (YouTube resumable, TikTok Direct Post, X v2, Instagram Reels, Threads, LinkedIn,
  Telegram, Discord, Slack, blog propio) con cola `Publication` y aprobación híbrida
  (video/imagen → DRAFT humano) → métricas (KPIs + analytics reales YouTube) → growth
  (perfil de canal → experimentos de una variable → playbook). Ciclo F1→F4 programado vía
  `scripts/schedule-autopub.ps1` (UltraIA AutoPub 0900/1400/1900) + tool `autopub_run`.
- **Cerebro autónomo (iter-101/102)**: `npm run cerebro` ejecuta un ciclo real (autolearn
  detecta gaps RICE/META-IA → prioriza → genera plan); tarea programada Windows
  `UltraIa-Cerebro` cada 120 min + workflow nube `.github/workflows/cerebro.yml` cada 4 h
  (corre aunque el PC esté apagado, commitea evidencia a `resultTask/cerebro/`).
- **Salud y auto-mejora**: capability `vitals` (6 signos ponderados 0-100 VERDE/ÁMBAR/ROJO +
  detección de regresiones + política reparar→explotar→optimizar→explorar), `autolearn`
  (gaps, RICE, matriz META-IA A-D, plan diario 70/20/10), `genesis` (motor de ingeniería
  autónoma: quality gates reales, stop conditions, propuesta revisable) y heartbeat con
  pulso markdown + `vitals.json`.
- **Memoria externa persistente**: `semantic-memory` (corpus desde `learning/truth/*.json`)
  + `qdrant-memory` v2 (embedding denso dim-1024 determinista + rescoring disperso;
  colección `memoria_experiencial_v2`; bench leave-one-out recall@1 = 100 %).
- **OMAG v0.1 expandido**: MediaField (entidades con identidad persistente, eventos causales),
  timeline compartido (<0.1s offset), memorias, generadores keyless (imagen, video storyboard,
  audio edge-tts 14 idiomas, música, síntesis procedural WAV, VFX canvas), vocabulario MOTIONS
  por shot, long-form Project→Act→Sequence→Scene→Shot 60–180 s con MasterTimeline.
- **Loop PIVR**: harness de desarrollo continuo (plan → implementar → verificar → reiniciar)
  con agentes `piv-plan`/`piv-build` (modos P-P/P-B con sub-fases S-D y L-T), `loop-triage`,
  `state-doctor` (13 checks de integridad) y driver `scripts/loop_piv.py`. 103 iteraciones
  documentadas con bitácora `[P]/[V]/[R]` auditable.
- **@ultraia/runtime** (Fases A–C): módulos lazy, memoria con eviction, health/recovery,
  command executor con allowlist y roles, Local API HTTP/WS en 127.0.0.1 (token timing-safe,
  origin loopback, rate limit, body cap, eventos por topic).
- **Desktop Fase D**: ventana WebView2 real operativa (host nativo C#/WinForms, bundle
  13.7 MB, RAM ~111 MB) + fallback `msedge --app`; launcher Node sin deps con `--check`.
- **App móvil**: Expo SDK 57 (Android/iOS) con login/registro, dashboard KPIs, cola de
  publicaciones (aprobar/rechazar), cloud y blog; tema Dark Obsidian; token en SecureStore.
- **Sistema learning/**: verdad verificada aparte (`learning/truth/` + `verify.py`),
  fuentes crudas (`learning/sources/`), lecciones (`LEARNINGS.md`), memoria empaquetada
  (`learning/memory/ultraia_memory.zip`) y sincronización a Qdrant (`Task/sync-qdrant.ts`).

## Quickstart

Requisitos: Node >= 20, Python >= 3.10, ffmpeg (opcional, `winget install Gyan.FFmpeg`).

```bash
# 1. Instalar dependencias y levantar TODO (setup + web :3000 + webhooks :8000 + gen-engine :8100)
python start.py            # flags: --web --hooks --gen-engine --validate --check-connections --clean

# 2. Solo web (dev server):
npm run dev                # o: python start.py --web

# 3. Verificación de salud del stack:
python start.py --check-connections

# 4. Un ciclo del Cerebro autónomo:
npm run cerebro            # o: npm run cerebro:plan (solo plan)
```

Acceso web: `http://localhost:3000` · Login demo: `admin` / `admin`.

## Prototipo de uso inicial

```bash
# Levantar el stack completo (setup automático si es la primera vez)
python start.py

# Probar el loop de desarrollo continuo (plan → build → gates → commit)
python scripts/loop_piv.py --dry-run     # vista previa de comandos
python scripts/loop_piv.py --plan-only   # solo fase P (escribe .opencode/plans/loop-<id>-<slug>.md)
python scripts/loop_piv.py --gate-only   # solo verificación FULL
python scripts/loop_piv.py --triage      # triage report-only (actualiza STATE.md)

# Generar contenido (API OMAG — requiere sesión web)
curl -X POST http://localhost:3000/api/omag \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"idea":"una aurora sobre el desierto","quality":"balanced","modalities":["image","audio"]}'

# Publicación automática (calendario — ADMIN)
curl -X POST http://localhost:3000/api/publications/publish-due -H "Authorization: Bearer <token>"

# Endpoints de la cola de publicaciones (auth: ADMIN o creador)
curl http://localhost:3000/api/publications -H "Authorization: Bearer <token>"
curl -X POST http://localhost:3000/api/publications/<id>/approve -H "Authorization: Bearer <token>"
```

Verificación del repo (orden CI):

```bash
npm run typecheck && npm run lint && npm run test && npm run build
```

Estado actual: **gates FULL verdes** (typecheck / lint / test >1.450 PASS core+runtime /
build 44 páginas) — última ronda completa verificada en las iteraciones 93–102.

## Hoja de ruta (pendientes reales)

- **UltraIa Web IDE V0.1 (APROBADO por el usuario, 24/08)**: convertir toda la web en un
  entorno IDE "todo-en-uno" (paneles redimensionables con `react-resizable-panels`, ya
  instalada, varios agentes/modos simultáneos por ventana), gestión de conexiones de canales
  desde la interfaz (dominio `connections.ts` + tabla `ChannelConnection` YA migrados; falta
  UI/HUD + endpoints), refinamiento gráfico y responsividad web+móvil. Ejecución por fases
  (F1 shell → F2 workspace multi-agente → F4 conexiones → F3 diseño → F5 responsividad).
- **Wiring tools procedurales** (iter-93): registrar `geometry_build`/`png_render`/
  `procvid_render` en llm.ts/index.ts — hunks verificados en cuarentena `%TEMP%\opencode\
  wip-quarantine-20260823\mine\`, aplicar al liberarse la concurrencia.
- **Gen-Engine F5**: entrenamiento real de difusión (E0–E5, roadmap documentado en
  `04-pipeline-ultraia/plan-de-implementacion.md`) — requiere GPU / decisión humana.
- **Desktop Fase D paso 4+**: persistencia de la ventana (bounds/perfil), upgrade path a
  Tauri 2; Fase E (empaquetado/instalador) tras decisión de shell.
- **Documentación**: seguir el protocolo de `enlaces.txt` (análisis de fuentes → capability).

## Descargables

- `DESCRIPCION.md` — descripción total del proyecto desde la perspectiva del usuario
  (sin tecnología ni código; la cara del producto).
- `PrototypeREADME.pdf` — este documento en PDF (generado con `scripts/md2pdf.py`, stdlib
  puro, sin dependencias; regenerar con `python scripts/md2pdf.py PrototypeREADME.md --out PrototypeREADME.pdf`).
- `learning/memory/ultraia_memory.zip` — memoria de aprendizaje verificada (esquemas truth +
  lecciones; cargar con `python learning/scripts/restore_memory.py summary`).
- `UltraIa-Prototipo.zip` — el prototipo se distribuye como paquete Web+Desktop (Next.js
  standalone + DB embebida con login demo `admin`/`admin` + launcher WebView2 + `UltraIa.bat`
  de 1 clic; Windows 10/11; regenerable con `python scripts/build-prototipo.py`).

## Notas

- Sin API keys requeridas para el uso base; consultar `.env.example` para las opcionales.
- Los commits/pushes del loop requieren aprobación humana (nunca push automático).
- Docs de referencia: `AGENTS.md` (guía de agentes), `docs/AUTO-PUBLICACION.md`,
  `desktopFase/ARCHITECTURE.md` + `desktopFase/docs/`, `DEPLOY.md` (hosting gratuito),
  `docs/CEREBRO.md` (cerebro autónomo), `docs/MOBILE.md` (app móvil).
