# UltraIa

> Plataforma IA integral: agentes, generación audiovisual, publicación automática y
> runtime de escritorio. En fase de prototipo activo con vistas a lanzamiento.

## Descripción general

UltraIa es un monorepo (npm workspaces) que combina un **app web** (Next.js 15 + Tailwind v4 +
Vercel AI SDK), un **núcleo de dominio** (TypeScript con Prisma), un **motor de generación**
(Gen-Engine en Python) y un **runtime de escritorio** (`@ultraia/runtime`). Su lógica central es
un **sistema operativo de mundos mediáticos** (OMAG): con una idea entra un plan de director,
generadores de imagen/video/audio (keyless-first, sin API keys obligatorias), críticos que
evalúan sincronía e identidad, y un bucle de corrección automática (máx 5 iteraciones).

Principio rector: **keyless-first con degradación elegante** — todo funciona sin API keys usando
servicios gratuitos; las claves opcionales (MEIGEN, EXA, YOUTUBE, TIKTOK, GEN_ENGINE_URL) solo
activan providers premium.

## Lógica general

```
apps/web (Next.js)  ────  packages/core (dominio, tools, OMAG, AutoPub, Prisma)
        │                          │
        ▼                          ▼
  webhooks :8000        @ultraia/runtime (desktop, Local API 127.0.0.1)
        │                          │
        ▼                          ▼
  Gen-Engine :8100 (Python, keyless-first)   Desktop Fase D (launcher + host WebView2)
```

## Capacidades actuales (estado 15/08/2026)

- **Agentes de IA** (`bp-admin-*`): 8 agentes con capability `skills` (plan/build/test/review/
  ship/simplify), `memory` (memoria Fable-5: 6 ops con version guards, tags stated/observed/
  inferred, persistencia atómica), `content` (publicación), más herramientas de web
  (AgentReach), música, audio, publicación y g0dm0d3 (parsing/auto-tune de respuestas).
- **OMAG v0.1 expandido**: MediaField (entidades con identidad persistente, eventos con efectos
  causales), timeline compartido con sincronía (<0.1s offset), memorias, generadores keyless
  (imagen pollinations/meigen, video storyboard, audio edge-tts 14 idiomas + música Tunetank +
  síntesis procedural WAV sin deps), vocabulario de cámara MOTIONS por shot, y long-form
  Project→Act→Sequence→Scene→Shot para guiones 60–180s con MasterTimeline.
- **AutoPub F1–F5 completos**: motor de ideas `topics` (RSS + DuckDuckGo, dedupe bigram,
  cola `TopicBrief` persistente) → enrutador `contenido` (redactor/guionista determinista,
  multi-idioma es/ar, TTS edge-tts → narración mp3, guion largo OMAG 60s+) → presentación
  unificada `present` (paquete por canal con branding Dark Obsidian/Neo Violet) → distribución
  `publish` (adaptadores YouTube resumable v3 y TikTok Direct Post, cola `Publication` con
  aprobación híbrida: video/imagen → DRAFT humano; texto → auto) → métricas y mejora
  (KPIs por canal, `media_score` pre-pub, feedback post-pub → señales al modelo).
- **Loop PIVR**: harness de desarrollo continuo (plan → implementar → verificar → reiniciar)
  con agentes `piv-plan`/`piv-build`/`loop-triage`, driver `scripts/loop_piv.py` (flags
  `--cycles/--plan-only/--gate-only/--triage/--no-commit/--dry-run`) y gates CI duales
  (scoped + FULL). 20 iteraciones completadas, todas GREEN.
- **@ultraia/runtime** (Fases A–C): runtime local con módulos lazy (`load ONLY WHEN NEEDED`),
  memoria con persistencia y eviction, health/recovery, command executor con allowlist y
  roles, y **Local API HTTP/WS** en 127.0.0.1 (token de sesión timing-safe, origin solo
  loopback, rate limit 120 req/min, body cap 64 KiB, eventos por topic).
- **Desktop Fase D**: SHELL_DECISION MVP WebView2 + launcher validado end-to-end — el host
  nativo (`webview2-host.exe`, C#/WinForms compilado con csc del .NET Framework) compila,
  inicializa el runtime Evergreen, navega al dashboard real y reporta su versión
  (`--host-check` OK). Fallback `msedge --app` si el host no está disponible.
- **Gen-Engine** (Python): API local en `:8100` con TTS (edge-tts) y providers intercambiables;
  la web lo detecta en boot (`GEN_ENGINE_URL`) y registra music/video providers si responde
  (sin engine → keyless: Tunetank música + storyboard video).
- **Sistema learning/**: memoria de verdad verificada aparte (`learning/truth/` + `verify.py`,
  16/16 casos PASS) con fuente cruda de enlaces del usuario en `learning/sources/`
  (p. ej. system prompt Fable-5 → capability `memory`).

## Quickstart

Requisitos: Node >= 20, Python >= 3.10, ffmpeg (opcional, `winget install Gyan.FFmpeg`).

```bash
# 1. Instalar dependencias y levantar TODO (setup + web :3000 + webhooks :8000 + gen-engine :8100)
python start.py

# 2. Solo web (dev server):
npm run dev            # o: python start.py --web

# 3. Verificación de salud del stack:
python start.py --check-connections
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

Estado actual: **555/555 PASS** (core 362 + runtime 193) — typecheck, lint, test y build
TODO verde (verificado 15/08/2026).

## Hoja de ruta (pendientes reales)

- **Gen-Engine F5**: entrenamiento real de difusión (E0–E5, roadmap documentado en
  `04-pipeline-ultraia/plan-de-implementacion.md`) — requiere GPU / decisión humana.
- **AutoPub F4+**: adaptadores Meta (IG Reels/Threads), X API v2 y LinkedIn (app review
  humana para el acceso a las APIs).
- **AutoPub F3**: branding kit editable (hoy es determinista Dark Obsidian/Neo Violet).
- **Desktop Fase D paso 4+**: persistencia de la ventana (bounds/perfil), upgrade path a
  Tauri 2; Fase E (empaquetado/instalador) tras decisión de shell.
- **Documentación**: seguir el protocolo de `enlaces.txt` (análisis de fuentes → capability).

## Descargables

- `PrototypeREADME.pdf` — este documento en PDF (generado con `scripts/md2pdf.py`, stdlib
  puro, sin dependencias; regenerar con `python scripts/md2pdf.py PrototypeREADME.md --out PrototypeREADME.pdf`).
- `learning/memory/ultraia_memory.zip` — memoria de aprendizaje verificada (esquemas truth +
  lecciones; cargar con `python learning/scripts/restore_memory.py summary`).

## Notas

- Sin API keys requeridas para el uso base; consultar `.env.example` para las opcionales.
- Los commits/pushes del loop requieren aprobación humana (nunca push automático).
- Docs de referencia: `AGENTS.md` (guía de agentes), `docs/AUTO-PUBLICACION.md`,
  `desktopFase/ARCHITECTURE.md` + `desktopFase/docs/`, `DEPLOY.md` (hosting gratuito),
  `docs/RAZONAMIENTO-FABLE5.md` (análisis de fuentes de razonamiento).