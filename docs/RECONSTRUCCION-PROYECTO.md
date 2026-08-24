# RECONSTRUCCION-PROYECTO — Cómo reconstruir UltraIa desde cero

> **Propósito**: guía canónica y cronológica (de lo más antiguo, 12/08/2026, hasta hoy,
> 24/08/2026) para recrear el proyecto TOTAL de UltraIa tal como existe ahora: estructura
> de carpetas, archivos `.md` maestros, configs `.json`, modelos Prisma, capabilities,
> apps, runtime desktop, harness PIVR, sistema de aprendizaje y sistema autónomo.
>
> Cada era sigue la MISMA plantilla: **Fecha/Evidencia → Objetivo → Estructura a crear →
> Archivos clave (.md/.json) → Comandos → Gates de verificación → Lecciones que condicionan
> lo que viene después**. Los hashes citados son commits reales del repo (verificables con
> `git log --oneline --reverse`).
>
> Este documento NO reemplaza a `AGENTS.md` (estado operativo vivo) ni a `AGENT.md`
> (master prompt). Es el plano de reconstrucción: si mañana se perdiera todo excepto este
> archivo + los fuentes versionados, un equipo podría levantar el proyecto en orden.

---

## Índice

1. [Principios rectores](#1-principios-rectores)
2. [Fase 0 — Preparación del entorno](#2-fase-0--preparación-del-entorno)
3. [Era 1 — MVP v0.1: monorepo + generate/run/improve (12/08)](#3-era-1--mvp-v01)
4. [Era 2 — API pública keyless + historial (12/08)](#4-era-2--api-pública-keyless)
5. [Era 3 — Design system Dark Obsidian (13/08)](#5-era-3--design-system-dark-obsidian)
6. [Era 4 — Pipeline ar-SA + start.py + learning (13/08)](#6-era-4--pipeline-ar-sa--startpy--learning)
7. [Era 5 — MeiGEN + builder + reach + rediseño 2026 (14/08)](#7-era-5--meigen--builder--reach--rediseño-2026)
8. [Era 6 — Gen-Engine Python + edge-compat + OMAG (14/08)](#8-era-6--gen-engine-python--edge-compat--omag)
9. [Era 7 — @ultraia/runtime Desktop Fases A–D (14–18/08)](#9-era-7--ultraiaruntime-desktop-fases-ad)
10. [Era 8 — Harness PIVR (15/08, evolución hasta 19/08)](#10-era-8--harness-pivr)
11. [Era 9 — AutoPub F1–F5 (15–18/08)](#11-era-9--autopub-f1f5)
12. [Era 10 — Ola de capabilities: cloud/vfx/móvil/canales (17–18/08)](#12-era-10--ola-de-capabilities)
13. [Era 11 — Fundamentos matemáticos + harness blindado (18–19/08)](#13-era-11--fundamentos-matemáticos--harness-blindado)
14. [Era 12 — Memoria semántica y autonomía (19–22/08)](#14-era-12--memoria-semántica-y-autonomía)
15. [Era 13 — Librerías procedurales desde matemática (23–24/08)](#15-era-13--librerías-procedurales)
16. [Era 14 — Local-first + CAD geométrico (24/08)](#16-era-14--local-first--cad-geométrico)
17. [Apéndice A — Árbol del repositorio actual](#apéndice-a--árbol-del-repositorio-actual)
18. [Apéndice B — Registro de capabilities y tools](#apéndice-b--registro-de-capabilities-y-tools)
19. [Apéndice C — Variables de entorno por servicio](#apéndice-c--variables-de-entorno-por-servicio)
20. [Apéndice D — Inventario de scripts y runners](#apéndice-d--inventario-de-scripts-y-runners)
21. [Apéndice E — Índice de documentación](#apéndice-e--índice-de-documentación)
22. [Apéndice F — Estado final de verificación](#apéndice-f--estado-final-de-verificación)

---

## 1. Principios rectores

Estas reglas condicionan TODO el orden de construcción. Romperlas rompe gates.

| # | Principio | Consecuencia práctica |
|---|-----------|----------------------|
| P1 | **Keyless-first con degradación elegante** | Todo feature funciona SIN claves API; con clave, mejora. Sin `OPENAI_API_KEY` la web arranca igual. Adapters devuelven `ok:false` con razón clara, nunca lanzan. |
| P2 | **Dominio puro determinista** | Cada capability vive en `packages/core/src/tools/<dominio>.ts`: zod schemas, funciones puras, deps inyectables (fetch/db/reloj), cero red real en tests. La ejecución real corre en runners (`Task/*.ts` vía vite-node) o CLI Python. |
| P3 | **Gates CI en orden fijo** | `npm run typecheck → npm run lint → npm run test → npm run build`. Scoped en iteraciones intermedias; FULL antes de cada commit. Nunca commitear con gates RED (máx 3 intentos de fix, luego escalar). |
| P4 | **Staging explícito** | `git add <archivos del plan>` — NUNCA `git add .` / `-A`. Commit SIEMPRE con pathspec (`git commit -m "..." -- <files>`). Un commit sin pathspec arrastró 121 archivos ajenos (lección iter-58). |
| P5 | **Un solo capability por tool** | Cada dominio se registra UNA vez en `ai/llm.ts` (tool) + `tools/index.ts` (export/namespace/descriptor/unión `Capability`). Dos sesiones registrando lo mismo = colisión TS2308. |
| P6 | **Aprobación humana para push/merge** | El agente nunca pushea solo. Commits locales sí; push requiere decisión humana. |
| P7 | **Nunca PowerShell edita archivos del repo** | PS 5.1 colapsa líneas y corrompe UTF-8 (`Get-Content/-replace/Set-Content`). Usar tools Write/Edit del editor. |
| P8 | **Imports relativos SIN extensión `.js`** en core | vitest/tsc mapean `.js→.ts` pero webpack (dev server Next) no → UnhandledSchemeError. |
| P9 | **Sin npm overrides de react en root** | npm no soporta overrides por workspace; cada app declara su react exacto (web 19.1.0, mobile 19.2.3 — duplicación INTENCIONAL). |
| P10 | **Fail-hard donde importa, fail-soft donde ayuda** | Health-check de servicios → exit(1); adapters de publicación/analytics → resultado con razón, nunca excepción. |

---

## 2. Fase 0 — Preparación del entorno

### Requisitos

| Herramienta | Versión mínima | Uso |
|---|---|---|
| Node.js | >= 20 (validado por `check_prereqs`) | Next.js, npm workspaces, vite-node |
| npm | >= 10 (workspaces) | Monorepo |
| Python | >= 3.10 (en esta máquina el runner es `py -3.12`; el `python` del PATH puede ser 3.14 sin uvicorn) | start.py, webhooks, gen-engine, CLIs |
| Git | reciente | Repo único en la raíz |
| ffmpeg (+ yt-dlp opcional) | en PATH (`winget install Gyan.FFmpeg`) | Render de video/audio, screenflow, travel |

### Bootstrap del repo

```powershell
git init                                   # raíz = carpeta del proyecto
# crear .gitignore ANTES del primer add:
#   node_modules/, .next/, dev.db, .env*, .ultraia/{recordings,cloud,procedural}/,
#   logs/, screenshots/, repomix-output.*, __pycache__/
```

### Configs raíz `.json` (se crean aquí y ya no cambian de forma)

**`package.json` (raíz)** — workspaces + scripts espejo de CI:

```json
{
  "name": "ultraia",
  "version": "0.1.0",
  "private": true,
  "workspaces": ["apps/*", "packages/*"],
  "scripts": {
    "dev": "npm run dev -w @ultraia/web",
    "build": "npm run build -w @ultraia/web",
    "start": "npm run start -w @ultraia/web",
    "lint": "npm run lint -w @ultraia/web",
    "typecheck": "npm run typecheck -w @ultraia/core && npm run typecheck -w @ultraia/web && npm run typecheck -w @ultraia/runtime",
    "test": "npm run test -w @ultraia/core && npm run test -w @ultraia/runtime",
    "db:generate|migrate|studio": "prisma ... --schema packages/core/prisma/schema.prisma"
  },
  "devDependencies": { "prisma": "^6.x", "typescript": "^5.8", "repomix": "^1.18" }
}
```

(Los scripts `genesis` y `autopub` se añaden en la Era 12; ver Apéndice A.)

**`tsconfig.base.json`**: `target ES2022`, `module ESNext`, `moduleResolution Bundler`,
`strict true`, `noEmit true`. Los tres workspaces heredan con `extends`.

**`.env.example` (raíz)**: una sola fuente de variables (ver Apéndice C). Se copia a
`.env` (Prisma CLI) y `apps/web/.env` (runtime Next).

### Orden de carpetas top-level

```
UltraIa/
├── apps/            # web (Next.js), mobile (Expo — llega en Era 10)
├── packages/        # core (dominio+prisma), runtime (desktop — llega en Era 7)
├── scripts/         # CLIs Python + drivers del harness
├── Task/            # runners TypeScript ejecutados con vite-node
├── docs/            # documentación técnica y razonamientos
├── learning/        # memoria verificada: truth/, sources/, LEARNINGS.md
├── gen-engine/      # motor de generación self-hosted Python (llega en Era 6)
├── desktopFase/     # docs + launcher del shell desktop (llega en Era 7)
├── cloudflare/      # worker R2 stateless (llega en Era 10)
├── vendor/          # referencias third-party SIN .git (AGPL etc.)
└── ULTRAIA/         # pipeline ar-SA legacy (implementaciones Python)
```

**Gates de la fase**: `npm install` limpio; `tsc --noEmit` sin errores en cada workspace
que exista todavía (aún ninguno).

---

## 3. Era 1 — MVP v0.1

> **Commit**: `9169a77` — `feat: UltraIa MVP v0.1 — generate, run and improve AI agents` (2026-08-12)

### Objetivo

El núcleo del producto: describir una tarea en lenguaje natural → UltraIa diseña un agente
(system prompt, modelo, tools, rúbrica de evaluación ponderada) → chatear con él o llamarlo
por API key scoped → mejorar desde feedback real con gate de regresión y aprobación humana.

### Estructura a crear

```
apps/web/
├── package.json                 # @ultraia/web, react 19.1.0 exacto, next@15, tailwindcss@4, ai SDK
├── tsconfig.json                # extends base, lib DOM, paths @/*
├── next.config.ts
├── src/
│   ├── app/
│   │   ├── layout.tsx           # shell raíz, fuentes next/font
│   │   ├── page.tsx             # landing
│   │   ├── login/ · register/   # auth cookie-session (zod registerSchema estricto)
│   │   └── api/
│   │       ├── auth/[...]/route.ts
│   │       └── chat/route.ts    # streaming Vercel AI SDK con prompt+tools del agente ACTIVE
│   ├── components/ui/           # primitivas: button, input, card, dialog, badge...
│   └── lib/server/              # contexto auth, prisma client singleton
packages/core/
├── package.json                 # @ultraia/core, vitest.config.ts, tsconfig propio
├── prisma/schema.prisma         # modelos núcleo (abajo)
└── src/
    ├── index.ts
    ├── db/client.ts
    ├── domain/
    │   ├── blueprint.ts         # LLM structured output → AgentBlueprint validado
    │   ├── improve.ts           # feedback BAD + evals fallidos → propuesta nueva versión
    │   ├── evals.ts             # LLM-as-judge contra rúbrica ponderada
    │   └── versions.ts          # activateVersion transaccional, regressionGate
    ├── ai/llm.ts                # gateway proveedor-agnóstico (@ai-sdk/openai default)
    └── tools/calculator.ts      # primera tool: aritmética segura
```

### Modelos Prisma de esta era (`schema.prisma`)

`User` · `Session` · `Workspace` · `AgentBlueprint` · `AgentVersion`
(`ACTIVE|PENDING|REJECTED|SUPERSEDED`, `@@unique([blueprintId, versionNumber])`) ·
`Conversation` · `Message` (`@@unique([conversationId, sequence])`) · `Feedback`
(`GOOD|BAD` + critique) · `EvalRun` · `EvalCase` · `ApiKey`.

Provider SQLite (`DATABASE_URL="file:./dev.db"`); portable a Postgres cambiando provider.

### Comandos

```powershell
npm install
cp .env.example .env ; cp .env.example apps/web/.env
npm run db:migrate          # crea packages/core/prisma/dev.db
npm run dev                 # http://localhost:3000
```

### Gates

`typecheck` (core+web) / `lint` / `test` (61/61 al 13/08) / `build` — TODO verde antes del
primer commit. Este orden queda congelado como espejo de CI para siempre.

### Lecciones que condicionan

- El flujo **Generate → Run → Learn** es la columna vertebral: TODO lo demás (OMAG,
  AutoPub, autonomía) se engancha alrededor sin tocar estos contratos.
- `AGENT.md` (master prompt) y `README.md` se escriben DESDE EL PRIMER COMMIT: son la
  fuente canónica de reglas de operación del agente.

---

## 4. Era 2 — API pública keyless

> **Commit**: `79aa780` — `feat: public access per agent — keyless external API endpoint` (2026-08-12)

### Objetivo

Consumir agentes fuera de la UI: endpoint externo con API keys hasheadas + modo público
por agente (sin key, rate limit por IP).

### Qué se añade

| Pieza | Detalle |
|---|---|
| `POST /api/v1/agents/:id/chat` | Header `x-api-key` (prefijo visible `ua_…`, hash at rest en `ApiKey.keyHash` UNIQUE, `lastUsedAt`). Rate limit in-memory por proceso (`ULTRAIA_TRUST_PROXY=1` para confiar en proxies). Toggle `isPublic` por blueprint → mismo endpoint sin key, límite por IP. |
| Historial de chats | `GET /api/conversations?agentId=` + `GET /api/conversations/:id/messages`; título auto desde el primer mensaje; UI lista conversaciones pasadas. |
| Rollback de versiones | Promover cualquier versión pasada a ACTIVE desde el historial (transacción segura en `activateVersion`). |
| Mejoras extendidas | El motor de mejora también puede proponer modelo/tools/guardrails/rúbrica nuevos cuando la evidencia lo justifica. |

### Lecciones

- Las claves NUNCA se guardan en claro: solo hash + prefijo mostrable.
- El rate limiting v1 es in-memory (documentado como limitación MVP) — aceptable porque
  el despliegue objetivo inicial es local/single-node.

---

## 5. Era 3 — Design system Dark Obsidian

> **Commits**: `ba2221a` (design system + motion) · `dfafbf9` (skill design-dna trackeada) · `0d21505` (design-dna.json) — 2026-08-13

### Objetivo

Identidad visual anti-AI-slop y sistema de motion reproducible, con fuentes de verdad
versionadas.

### Archivos clave que nacen aquí

| Archivo | Rol |
|---|---|
| `DESIGN.md` | Fuente de verdad de diseño (tokens, tipografía, densidad IDE, reglas). |
| `docs/design-dna.json` | DNA cuantificado del diseño (schema machine-readable). |
| `apps/web/MASTER.md` | Spec de motion: GSAP/Lottie/CSS, reglas por componente. |
| `apps/web/src/app/globals.css` | Tokens `@theme` Tailwind v4: canvas `#08080a`, panel `#111115`, primary `#8b5cf6` (violeta), border-subtle `#1f1f2a`; acentos por modalidad (video/audio/text/code/web). Paleta Neo Violet llega en Era 5. |
| Skills instaladas | `ultraia-design-system` (repo) + Design DNA/GSAP/Three.js/Motion/Genjutsu (globales). |

### Reglas de motion (resumen operativo)

- GSAP 3.15 con `gsap.context()` en `useLayoutEffect`; `gsap.matchMedia()` para
  `prefers-reduced-motion` (CSS y JS).
- Animar SOLO transform/opacity; micro-interacciones 100–250ms.
- Entradas de lista con `--animate-chat-enter` + delay por índice (cap 240–480ms).
- Loaders >5s con Lottie LOCAL en `src/animations/` (nunca `public/`), pausado bajo
  reduced-motion vía `lottieRef.current.pause()`.
- Tipografía: Inter (funcional) + Plus Jakarta Sans (display/chat) + JetBrains Mono
  (mono/badges). NUNCA Inter para display.

### Gates

typecheck/lint/test/build verdes. Fix conocido de esta era: CSS `var(--color-primary/40)`
es sintaxis inválida que rompe el build → usar
`color-mix(in oklab, var(--color-primary) 40%, transparent)`.

---

## 6. Era 4 — Pipeline ar-SA + start.py + learning

> **Commits**: `c169e61` (baseline studio/tools/pipeline/learning/start.py) · `0f2e05d` (pipeline ar-SA + one-command start) — 2026-08-13

### Objetivo

Un comando que levante TODO el ecosistema local + primer pipeline productivo (video en
árabe ar-SA) + memoria de aprendizaje verificada.

### Estructura

```
ULTRAIA/integracionesImplementacion/
└── src/
    ├── main.py               # pipeline ar-SA end-to-end (--dry-run/--validate)
    └── publish.py            # publicación YouTube Shorts + TikTok, metadatos bilingües es/ar (RF-12)
webhook_server.py (raíz)      # FastAPI :8000 webhooks
start.py                      # orquestador de arranque (abajo)
learning/
├── truth/*.json              # verdad verificada APARTE de respuestas del modelo
├── responses/                # respuestas crudas
├── scripts/verify.py         # verificador contra truth
└── LEARNINGS.md              # lecciones acumuladas
```

### `start.py` — contrato (evoluciona pero el contrato es estable)

- Flags: `--web` `--hooks` `--gen-engine` `--validate` `--install` `--skip-setup`
  `--check-connections` `--deploy` `--browser {chrome,brave,default}` `--no-open`
  `--host` (127.0.0.1 default | 0.0.0.0 LAN | :: dual-stack).
- Flujo: prereqs (VERSIONES: node>=20, python>=3.10) → npm install si falta/lock más nuevo
  → crea `.env` desde example → `db:migrate` si no hay DB → preflight de puertos
  (3000/8000/8100) → spawn servicios → health-check "UP" (404 cuenta como vivo) → monitor
  con auto-restart (máx 2, backoff) → Ctrl+C = `taskkill /T /F` del ÁRBOL completo.
- `python_exec()` devuelve argv `[interpreter, flag]` del PRIMER intérprete que importe
  fastapi+uvicorn (probe): `sys.executable → python → py -3.12 → py -3.11 → py`.

### Learning system — reglas fundacionales

La verdad (`learning/truth/*.json`) se guarda SEPARADA de las respuestas del modelo
(`responses/`); se verifica con `verify.py`; lecciones en `LEARNINGS.md`. Reglas tempranas
vigentes: API directa > búsqueda web para datos numéricos; pedir campos crudos exactos;
PowerShell 5.1 rompe JSON en argv (usar Write).

### Gates

`python main.py --dry-run` end-to-end OK (ar-SA); `--validate` PASS;
`learning` 16/16 casos PASS; gates npm FULL verdes.

---

## 7. Era 5 — MeiGEN + builder + reach + rediseño 2026

> **Commit principal**: `e99c7ac` + tests `974f866` — 2026-08-14

### Objetivo

Producto utilizable: librería de prompts, generador visual, builder no-code, herramientas
de lectura web, y rediseño completo Dark Obsidian + Neo Violet.

### Qué se construye

| Bloque | Archivos | Detalle |
|---|---|---|
| Librería de prompts | `packages/core/scripts/seed-library.mjs`, modelo `PromptLibrary` | Seed 1379 prompts (remoto jau123/nanobanana-trending-prompts, fallback embebido ~38). SQLite NO soporta `createMany skipDuplicates` → filtrar slugs existentes antes. |
| `/gallery` | `gallery-client.tsx`, `prompt-card`, `generate-drawer` (420px), `detail-dialog`, `contribute-dialog` | Infinite scroll cursor-based; enhance con fallback local (`/api/chat` requiere agentId — no sirve para prompts sueltos). |
| `/builder` | `builder-client`, blocks, codegen, property-panel, export-modal | DnD nativo HTML5; localStorage `ultraia-builder-v1`; genera HTML/CSS/JS + React+Tailwind. |
| Tools reach | `tools/reach.ts` | readWeb vía r.jina.ai + fallback directo; searchWeb DuckDuckGo IA + Exa opcional (`EXA_API_KEY`); searchGitHub; parseRss (fast-xml-parser); videoInfo oEmbed. |
| Imagen multi-provider | `tools/image.ts` | pollinations keyless; meigen si `MEIGEN_API_TOKEN`. API MeiGEN: `POST /api/generate/v2` + polling status con `pollHintSeconds`; `GET /api/models` público (NUNCA hardcodear IDs). |
| Admin | seed admin/admin (`admin@ultraia.local`, rol ADMIN) + 8 agentes `bp-admin-*` | Login acepta username sin `@` (busca por name). Una sola fuente de caps: `seed-data.mjs`. |
| UI kit ampliado | tabs, dialog, switch, skeleton, tooltip, stat-card, empty-state, kbd | Todas las páginas restyleadas Dark Obsidian; paleta Neo Violet `--color-neo-100..700` + utilidades `.gradient-neo-text`, `.gradient-neo-frame`, `.glow-neo`, `.neo-aura`; `.glass-panel`, `.card-glow-hover`. |
| Hero WebGL | `components/aurora/aurora-canvas.tsx` | Three.js ShaderMaterial simplex noise; `next/dynamic ssr:false`; respeta reduced-motion con render estático. |
| CSP | next config | img-src: pollinations/meigen/i.ytimg; connect-src: pollinations, meigen, r.jina.ai, ddg, exa, github, youtube. |
| G0DM0D3 port | `tools/g0dm0d3.ts` + vendor `vendor/G0DM0D3` (AGPL, sin .git) | Port ORIGINAL (attribution header): Parseltongue 33 técnicas (tiers light 11/standard 22/heavy 33), AutoTune 20 contextos con blending, scoring composite con grades, races ultraplinian (N passes) y godmodeClassic (5 combos paralelos) vía `resolveModel()` multi-proveedor (openai/google/ollama/lmstudio/deepseek). 29 tests con mocks. |

### Lecciones

- `raw.githubusercontent.com` puede dar 503 → todo seed remoto lleva fallback embebido.
- CSP y providers: cuando se añade un proveedor nuevo de imágenes/fetch, actualizar CSP
  el mismo día (si no, el navegador bloquea en silencio).

---

## 8. Era 6 — Gen-Engine Python + edge-compat + OMAG

> **Commits**: `2ba82bc` (edge-compat + truth recursos IA) · `15f2461` (Gen-Engine wiring) · `275563c` (start.py integra :8100) · `5cd3e7a` (integracionTecno) — 2026-08-14

### Objetivo

Motor de generación self-hosted (Python/FastAPI) conectable + núcleo audiovisual OMAG
(sistema operativo de mundos media) + compatibilidad edge para desplegar core en browser.

### Gen-Engine (`gen-engine/`)

```
gen-engine/
├── app/                  # FastAPI: /health, POST /generate/tts (edge-tts), POST /generate/v2, GET /models
├── tests/                # pytest 7/7 con Python 3.12
├── training/             # roadmap E0-E5 (diffusion: DDPM→flow matching→EDM→SDXL)
├── requirements.txt · Dockerfile · docker-compose.gpu.yml · GENENGINE.md
```

- Puerto **:8100** (nunca choca con webhooks :8000). `GEN_ENGINE_URL` en ROOT/.env;
  `start.py --gen-engine` lo lanza y escribe la var en `apps/web/.env`.
- Wiring web: `registerGenEngineIfHealthy()` (health-check timeout 3s) registra providers
  de música/video SOLO si responde; `instrumentation.ts` activa providers keyless en boot.
- Sin engine → fallback keyless: Tunetank música (matchea queries de UNA palabra →
  fallback automático al primer token) + storyboard video.

### Edge-compat core

Imports dinámicos `node:*` con `webpackIgnore` + fallbacks webpack en `next.config.ts`
(`serverOnlyBuiltins` client) + `serverExternalPackages` (stitch-sdk) → core bundleable
en edge/browser.

### OMAG (`packages/core/src/omag/`)

| Módulo | Responsabilidad |
|---|---|
| `mediafield.ts` | MediaField schema zod: entities con identidad persistente, relations/world graph, events de primera clase con efectos causales + `params.<effect>_delay`; serialize/parse JSON; cascade remove. |
| `world.ts` | WorldTransitionEngine: applyEvent→state, advanceTime→integra velocity, validateState→dangling refs. |
| `timeline.ts` | Tracks video/audio/music/events/camera; `checkSynchronization` (offset audio-video >0.1s); `alignEffectsToCause`. |
| `memory.ts` | Working/Scene/Character/Style/Error memories con patterns. |
| `generators.ts` | Interfaz validate/prepare/generate/inspect/export + adapters keyless image (pollinations/meigen), video (storyboard), music (composición), audio (TTS), vfx (canvas — llega iter 51). |
| `critics.ts` | TemporalSync/Identity/Causal/Multimodal critics + `fuseCritiques` pesos dinámicos. |
| `orchestrator.ts` | IDEA→plan Director (LLM o local)→MediaField→generadores→críticos→correction loop (máx 5; thresholds fast .5/balanced .6/high .75). API: `POST /api/omag`. |
| `project.ts` | Long-form: Project→Act→Sequence→Scene→Shot; MasterTimeline+checkTimelineSync; checkpoints; LongTermMemory. |
| `sound.ts` | Síntesis procedimental PCM16+WAV (tone/noise/impact/whoosh/beat/ambience) — sin deps. |
| `audiolibrary.ts` | Tunetank search/saveSample; extract de video (ffmpeg/yt-dlp, degrada con guía); saveSynth WAV. |
| `tts.ts` | edge-tts keyless: WebSocket global Node 22+ (SIN dep `ws`), `VOICES_BY_LANG` 14 idiomas, `detectLang`. |

### Documentos de esta era

`AUDIO/VIDEO/IMAGE.md` (diseño), `AUDIO/VIDEO/imvidau2.txt` (spec), `AUDIO/VIDEO/MVPModify.txt`
(long-form), `integracionTecno.txt` (Veo 3.1/Seedance/OpenCut/Titus/Backstage/Databricks/
Remotion/OpenShorts con URLs oficiales verificadas 9/9), `DEPLOY.md` (hosting gratuito),
truth `truth_ai_gen_resources.json` (8/8) y `truth_tecno_recursos.json` (9/9).

### Gates

Core 189/189 PASS; gen-engine pytest 7/7 (Python 3.12);
`python start.py --gen-engine` verificado end-to-end (health 200, TTS real, taskkill árbol completo).
Linters de start.py: ruff/pylint/pyright/pyflakes 0 issues.

---

## 9. Era 7 — @ultraia/runtime Desktop Fases A–D

> **Commits**: `95c9012` (Fase A) · `1f5a3fe` (Fase B Local API) · `e94609c`+`d2022a6` (Fase C adapters) · `f2e9cc1`+`5ab0426`+`3196ce4`+`c9b53ef` (Fase D decision+wiring+spike) · `f7df3d0` (ventana WebView2 real, 18/08) — 14/08→18/08

### Objetivo

Runtime local de escritorio: orquestación de módulos, seguridad por allowlist, API local
HTTP/WS con token, y shell desktop WebView2 — todo sin Electron/Tauri en el MVP.

### Estructura

```
packages/runtime/            # @ultraia/runtime — TS puro sin deps nuevas
├── src/
│   ├── paths.ts  config.ts  logger.ts  events.ts        # layout .ultraia/ (9 dirs), secretos enmascarados, sinks json|text, wildcards * y modulo.*
│   ├── tasks.ts  modules.ts registry.ts resources.ts    # prioridades 0-5 AbortSignal; lazy load/stopAll inverso; id ^[a-z0-9][a-z0-9-]{1,63}$ (PUNTOS inválidos); CPU sampling win32 warningAt .7 criticalAt .85
│   ├── commands.ts  health.ts  recovery.ts              # allowlist + roles user<operator<admin + niveles safe<restricted<admin + allowShell explícito; checks con timeout; 2 intentos backoff 1000ms
│   ├── memory.ts  context.ts  installer.ts              # importancia/confianza, dedup sha256(16), eviction maxEntries 2000 half-life 7 días; budgetChars 8000/maxItems 25; install/repair/update idempotentes backup+rollback
│   ├── runtime.ts                                       # orquestador: startLocalApi/stopLocalApi/apiUrl/apiToken; módulo system-api; comandos api.start|stop (restricted), api.url (safe); stop() cierra API primero
│   └── api/
│       ├── ws.ts                # handshake RFC 6455 + framing, MAX_FRAME_BYTES 16 MiB
│       ├── server.ts            # LocalApiServer + ApiHandlers + ApiError
│       └── runtime-handlers.ts  # runtimeApiHandlers(runtime)
└── *.test.ts                    # 132 (A) → 152 (B) → 186 (C) → 193 total
desktopFase/
├── ARCHITECTURE.md  DESKTOP_ARCHITECTURE.md  RUNTIME.md  MODULE_SYSTEM.md
├── MEMORY_SYSTEM.md  INSTALLER.md  SECURITY.md  SHELL_DECISION.md  docs/IPC.md
└── launcher/            # launcher.mjs Node sin deps + host C# WinForms WebView2 (NuGet vendido 1.0.2903.40)
```

### Seguridad de la Local API (contrato Fase B — copiar tal cual)

- Token `randomBytes(32)` hex generado en start, descartado en stop; comparación
  timing-safe (sha256 + `timingSafeEqual`).
- Host/Origin SOLO loopback (`127.0.0.1|localhost|[::1]`).
- Rate limit ventana fija 120 req/min → 429 + Retry-After; body cap 64 KiB → 413 +
  `Connection: close`.
- WS `/events?token=` → `{type:'connected'}` luego `{type:'event', topic, payload, at}`
  con filtro `^(module|task|health|resource|memory|runtime|api)\.`.

### Fase C/D — decisiones

Adapters a core vía ports (`Db`, `AiGateway`, tools, omag) con tests por adapter; wiring
`system-core` lazy. Shell: decisión `SHELL_DECISION.md` = MVP WebView2 puro + Local API
(upgrade path Tauri 2 diferido). Launcher validado: bundle 13.7 MB, RAM ~111 MB
(host 33 + proxy 78), ventana visible con dashboard Dark Obsidian.

### Lecciones

- El patrón de id de módulos NO admite puntos (`system.api` inválido → `system-api`).
- Vitest cache stale (`node_modules/.vite`) produce fallos raros tras editar: limpiar
  caché antes de diagnosticar.

---

## 10. Era 8 — Harness PIVR

> **Commits**: `b0522e2` (harness base) · `791e095` (harness v2 plan files + flags) · evolución: `506c037` (self-improvement iter-54) · `bb5cb6a` (modos 4 fases iter-57b) · `854095e` (state-doctor 13 checks iter-68) — 15/08→19/08

### Objetivo

Convertir el desarrollo en un bucle continuo y auditable: **P**lan ⇒ **I**mplement ⇒
**V**erify ⇒ **R**einiciar, con estado vivo, presupuesto, concurrencia entre sesiones
agénticas y kill switch humano.

### Archivos del harness (crear EN ESTE ORDEN)

| Archivo | Contenido esencial |
|---|---|
| `LOOP.md` | Config del bucle: loops activos, modos P-P/P-B/L-T/S-D, fases IA↔PIVR, human gates, worktrees, budget. |
| `STATE.md` | Estado vivo: backlog priorizado (tabla con #/Tarea/Scope/Gates/Estado), High Priority, Watch List, Recent Noise. Única fuente de verdad de tareas. |
| `loop-budget.md` | Límites diarios de tokens Y tiempo; early-exit 80%; JSON de gasto por ciclo. |
| `loop-constraints.md` | Reglas vinculantes: staging explícito, gates CI order, denylist paths (`.env*`, `auth/`, `payments/`, `secrets/`), kill switch. |
| `loop-run-log.md` | Bitácora por ciclo: `[P]` plan/predicción, `[I]` implementación, `[V]` evidencia de gates, `[R]` cierre con hash de commit + JSON presupuesto. |
| `opencode.json` | Agentes: `piv-plan` (read-only, bash allow/edit deny), `piv-build` (ejecuta+commitea), `loop-triage` (report-only STATE/run-log), `state-doctor` (13 checks read-only), subagents `implementer`/`verifier`, override loop-aware de built-ins `plan`/`build` con AUTO-SWITCH permanente. |
| `scripts/loop_piv.py` | Driver headless: `next_task()`, flags `--cycles N --gate-only --plan-only --triage --doctor --no-commit --dry-run --timeout S`; corre `opencode run --agent piv-plan|piv-build <plan file>`; auto-emite la petición de build al terminar P. Tests: `loop_piv_doctor.test.py` 9/9, `loop_piv_mark_done.test.py` 4/4. |
| `.opencode/skills/loop-*` + espejos raíz `skills/` | loop-piv (protocolo en-sesión + plantilla de plan), loop-verifier (APPROVE/REJECT), loop-triage (paso 0 = state-doctor), loop-concurrency-guard (lock), state-integrity-check (13 checks), loop-budget, loop-constraints. Espejos byte-idénticos (SHA-1 check-9). |
| `.ultraia/loop/session.lock` | Lock de concurrencia con session_id/task_id + heartbeat (<30min = activo). Lock ajeno → CEDE. |
| Kill switch | String literal `loop-pause-all` en STATE.md o run-log detiene el bucle. Detección por TOKEN ACTIVO con ventana de negaciones ("sin `loop-pause-all`" NO activa — fix iter-68). |

### Protocolo del ciclo (21 pasos, resumen)

1. **P (Sensado+Razonamiento)**: state-integrity-check pre-flight (checks 1/2/6/8/13 mínimo) → leer STATE.md+LEARNINGS+run-log+constraints → lock → `git status` → tomar la PRIMERA tarea `pendiente` en orden de archivo → escribir plan en `.opencode/plans/loop-<taskid>-<slug>.md` (plantilla: contexto, objetivo, pasos, ARCHIVOS A TOCAR, RECURSOS/PRESUPUESTO, NO-hacer, criterios scoped+FULL, TOLERANCIAS, riesgos, P0-P5, SPEC/DESIGN/LEARN/TEST, MEJORAS A ADICIONAR, TECNOLOGIAS EVALUADAS) + PREDICCIÓN + `[P]` en run-log. No editar código.
2. **I (Acción)**: leer plan DEL ARCHIVO → implementar SOLO archivos listados → ADICIONAR MEJORAS al vault (`.ultraia/vault/`) → staging explícito → commit pathspec `feat|fix|chore(scope): <desc>`.
3. **V+R (Ajuste)**: gates FULL en orden CI (cuarentena de WIP ajeno a `%TEMP%\opencode\wip-quarantine-<fecha>\` con restauración byte-exact Get-FileHash; matar dev servers antes de build) → GREEN=recompensa / RED=máx 3 fixes → evidencia `[V]`+`[R]`+hash+JSON en run-log → DONE en STATE.md → lección en LEARNINGS.md.

### Modos de operación (20/08, loop-75)

| Modo | Agente | Sub-fases | Verificación |
|---|---|---|---|
| P-P | piv-plan | Sensado → S-D (spec+design+diagrama) → L-T (learn+test) → Investigación (research_search source pdf + pdfsearch + enlaces.txt) → Razonamiento | Plan file ampliado + predicción |
| P-B | piv-build | Leer plan → adicionar mejoras → implementar → verificar PROYECTO COMPLETO → ajuste | Gates FULL + commit pathspec |
| L-T / S-D | integrados en P-P | aprender/testear · especificar/diseñar | Evidencia en learning/ y secciones del plan |

Documentado en `docs/MODOS-OPERACION.md` + skill `modos-operacion` (espejo doble sync).

### state-integrity-check — los 13 checks (contrato del doctor)

(1) IDs duplicados · (2) filas fuera de tabla · (3) banner vs kill switch por TOKEN ACTIVO
· (4) encoding `�` · (5) banner stale · (6) raíz crítica a 0 bytes → ALERTA ROJA ·
(7) firma mass-wipe por mtime compartido · (8) truncados <50% del blob HEAD ·
(9) espejos skills desync (SHA-1) · (10) estado del lock · (11) deletions staged
`.ts`/batch>50 · (12) drift de bitácora (última entrada sin `[R]`/hash/JSON) ·
(13) colisión de plan files. Reparación masiva: `scripts/restore-empty-tracked.ps1`
(dry-run default, restaura SOLO versionados vacíos desde HEAD, nunca `git restore .`).

---

## 11. Era 9 — AutoPub F1–F5

> **Plan maestro**: `2f1c03b` — `docs/AUTO-PUBLICACION.md` (aprobado por usuario 15/08).
> Commits: topics `32a6046` · present `065c668` · publish `53df51f` · cola `4976662` · calendario/blog `cf3aed2` · enrutador `45d030e` · F5 `b5465e5` · briefs-cola `b08534d` · multiidioma-TTS `960e55a` · guion-largo `93877d1` · X `8bc63b8`+`4a0aa78` · Meta `b28b0a9`+`a223417` · Telegram `e8a11e1`+`5fc19ea` · Discord/Slack `bef1fc0`+`0f9547a` · LinkedIn `c9cc080` · growth `2212389` · branding `a5633d3` · analytics `5afe2f7`+`a8bf697` · UI metrics `c8939f6` · guía canales `bdb834f`.

### Objetivo

Fábrica de contenido autónoma: idea → contenido → presentación → distribución → métricas
→ mejora. Aprobación humana HÍBRIDA: textos auto-aprobados; video/imagen → DRAFT con
aprobación humana (`CANALES_CON_APROBACION`).

### Pipeline por fases (construir en este orden)

| Fase | Dominio (`packages/core/src/`) | Clave |
|---|---|---|
| **F1 ideas** | `tools/topics.ts` + `domain/briefs.ts` + modelo `TopicBrief` | RSS + DuckDuckGo; dedupe bigram Jaccard; score novedad×relevancia; brief `{tema,canal,formato,tono,angulo,fuentes,score}`; estados NUEVO→PROCESADO/DESCARTADO; CLI espejo `scripts/topics.py --dry-run` (stdlib puro). |
| **F2 contenido** | `tools/enrutador.ts` | `redactar`/`guionizar`/`guionLargo`(60-180s→OmagProject 3 actos/7 escenas/shots MOTIONS)/`enrutarBrief` (9:16→guion, 16:9/1:1→texto); `generarContenido` escribe manifest atómico/idempotente en `.ultraia/content/<briefId>/`; multiidioma es/ar (plantillas deterministas) + `tts:true` → `narracion.mp3` edge-tts con degradación a null. |
| **F3 presentación** | `tools/present.ts` | `PublicationPackage` {briefId, tema, contenido, media, captionsByChannel (caption+hashtags+SRT patrón RF-11), visualByChannel (9:16/1:1/16:9 + thumbnail), horarioSugerido, brandingKit}; branding editable por merge parcial (`brandingFor(marca?, override?)`). |
| **F4 distribución** | `tools/publish.ts` + `domain/publications.ts` + modelo `Publication` | Contrato `PublisherAdapter{publish,validate}` fail-soft; fetch inyectable; adapters: YouTube resumable v3 (POST→Location→PUT), TikTok Direct Post 2 pasos, X v2 (media chunked INIT/APPEND/FINALIZE + tweet ≤280 multipart manual), Instagram Graph v21 container flow REELS (media→media_publish, cap 2200), Threads v1.0 (cap 500), Telegram Bot (multipart sin deps, truncateCaption 1024 sin cortar surrogates, cap 50MB, 429→retry_after), Discord webhook (payload_json+file, cap 2000), Slack files.upload xoxb- (cap 4000), LinkedIn (Assets API + UGC Posts). `buildBilingualMetadata` es/ar. Cola: createPublication (regla híbrida), approve/reject/markPublished/markFailed/publishDue; endpoints `GET|POST /api/publications`, `POST /api/publications/[id]/approve|reject|publish` (ADMIN o creador), `POST /publish-due` (ADMIN). Blog público `/blog` (listBlogPosts, revalidate 5min). |
| **F5 métricas** | `tools/metrics.ts` + `tools/media-score.ts` | computeChannelKpis (publicadas/fallidas/tasaExito/scorePromedio); mediaScore pre-pub (0-25 PASS≥20, paquete 0-100); registrarFeedback/publicationSignals → critiques BAD para improve.ts; analytics reales keyless-first (YouTube Data API v3 channels/statistics con `YOUTUBE_API_KEY`; resto fail-soft con razón); endpoint `GET /api/publications/metrics?platform=&channelId=`; UI `/metrics` (StatCards + tabla por canal + panel analytics). |

### Wiring de canales en `publish_submit` (orden de construcción)

`toYouTube`/`toTikTok` → `toX` (+`includeX`) → `toInstagram`/`toThreads` (+`includeMeta`)
→ `toTelegram` (+`includeTelegram`) → `toDiscord`/`toSlack` (+includeDiscord/includeSlack)
→ `toLinkedIn` (+includeLinkedIn). `createDefaultPublishers({...})` siempre retrocompatible
(defaults sin los canales nuevos). Cada canal entra TAMBIÉN en: union `PublishPlatform`,
union `TopicChannel`/`PresentChannel` (keywords/formato/horarios/CTA es-ar exhaustivos),
`CANALES_CON_APROBACION`, `publishDue`, z.enum de la API. Canal es `String` en Prisma
(sin migración por canal).

### Capability growth (cierre F5)

`tools/growth.ts`: analyzeChannel→ChannelProfile; planExperiments (UNA variable,
peor-KPI primero, regla +5 pts); buildPlaybook (victoria=test>control+5, pares
secuenciales, peso acumulado, dedupe). Tool `growth_plan`.

### Documentación operativa

`docs/CANALES-CONFIG-2026.md` (paso a paso por canal + las 13 variables exactas en
`.env.example`) · `docs/APIS-GRATIS-2026.md` (verificado 2026: Telegram gratis total;
WhatsApp marketing $0.025/msg NO; X Free 17 posts/24h POR APP; Meta sin app review para
negocio propio; Render Postgres gratis expira 30 días; Supabase auto-pausa 7 días).

### Lecciones críticas de esta era

- Multipart HTTP manual sin deps: boundary + CRLF; devuelve `Uint8Array` → cast
  `body as unknown as NonNullable<RequestInit['body']>` (BodyInit NO existe en el
  tsconfig de core; web con lib DOM lo exige).
- Tokens por precedencia: `options ?? process.env.X`; jamás loggearlos.
- Tests de adapters: SIEMPRE fetch mock — cero llamadas reales.

---

## 12. Era 10 — Ola de capabilities

> **Commits (17–18/08)**: memory-fs `6315e30` · PrototypeREADME `0e5859b` · prototipo zip `5415628` · diagram `293bf38` · video_edit `35ae28a` · screenflow `6eca58e`(+allowlist `bddcf5f` +hot watch `7e77819`) · game `5988571` · cloud `046dfcf`+wiring `7315d4d` · cloud-cli `b152b40`+pull `f2e2b5b` · cloud-publications `bd71299`+`d548e2f`+`e30bd89` · harness-capability `325aab6` · codevfx `b4d7695` · móvil `f106546`+E2E/EAS `be59967` · repomix `85c1d26` · travel `9fed227` · fixes `78d25e0`/`b601ec5`/`8ae11bf`.

### Objetivo

Explosión de capacidades puras/deterministas (una capability = un dominio = una tool),
infraestructura cloud gratuita, y presencia móvil/desktop empaquetable.

### Capabilities de esta ola (todas siguen el patrón P2)

| Capability | Archivo | Esencia |
|---|---|---|
| `memory` | `tools/memory-fs.ts` | Port Fable-5: filesystem de memoria Markdown (6 ops list/read/write/append/replace/delete, ifVersion guards, tags stated/observed/inferred, persistencia atómica). 28 tests. |
| `diagram` | `tools/diagram.ts` | Diagramas editoriales HTML/SVG autocontenidos (timeline/data-flow/architecture/loop; minimal-dark/full-editorial; doc-inline/doc-wide). Reglas: coords ÷4, hairlines 1px, radius ≤10px, accent 1-2 focos, a11y role=img+title/desc, sin `<script>` ni recursos externos. 22 tests. |
| `video_edit` | `tools/video-edit.ts` | Port principios video-use: packTranscript→takes_packed (~12KB, frases `[start-end]`); 12 hard rules (subtítulos LAST; concat lossless `-c copy`; fades 30ms `FADE_MS=0.03`; silencios ≥400ms limpios; padding 30-200ms; self-eval máx 3); buildEdl valida; renderFfmpeg argv determinista (-movflags +faststart, grade warm-cinematic/neutral-punch); selfEvalEdl score 0-100; timelineViewSvg editorial. Keyless-first: transcribe Gemini si GOOGLE_API_KEY, si no captions manuales — NUNCA inventar timestamps. 29 tests. Demo: `Task/video-edit-demo.ts` → `resultTask/edl/`. |
| `screenflow` | `tools/screenflow.ts` + `scripts/screenflow/` | Grabación automatizada: validateActionScript (anti-runaway 90min, EXEC_ALLOWLIST), planRuns, buildFfmpegCapture (gdigrab CRF 18 + pista silencio), outputs `.ultraia/recordings/<run-id>/` (final.mp4/webm + poster + manifest + report), scheduleCmd schtasks/cron, resolveState resume/retry máx 3. Runner `Task/run_screenflow.ts [--dry-run]`. Hot watch `Task/screenflow-hot-watch.ts` (poll `.ultraia/hot` 10s → Publication blog auto-approve). 39 tests. |
| `cloud` | `tools/cloud.ts` + `cloudflare/worker.ts` + UI `/cloud` + API `/api/cloud/*` | 42 extensiones en 7 categorías, MIME map, MAX_UPLOAD_BYTES 100 MiB, layout 9 carpetas, isSafePath/normalizeCloudPath/sanitizeFileName, classifyFile, humanSize binario, adapters InMemory/Local (atómico tmp+rename)/R2 (fetch inyectable), CloudService, tool cloud_files, handler inyectable. Worker R2 stateless Bearer CORS. Docs `CLOUD-FREE-2026.md` (datos verificados). 27 tests + CLI Python `scripts/cloud-cli.py` (self-test 25/25, e2e 16/16 incl. pull). |
| `game` | `tools/game.ts` | Prompt-to-game determinista, 6 géneros, a11y. |
| `harness` | `tools/harness.ts` | Port deepseek-harness "everything is a plugin": createHarness (boot Kahn, run, tick reloj inyectable, shutdown inverso unwind+dump), defineSeam, plugins echoTool/counterScheduler, efectos reversibles. Tool `harness_manage` runtime persistente por sesión. 19 tests. LECCIÓN: el runtime de la tool debe vivir FUERA del execute (scope persistente). |
| `codevfx` | `tools/codevfx.ts` | Efectos VFX 100% código (port Elemental Sandbox, ORIGINAL): 9 kinds (fire/ice/lightning/meteor/beam/ground/void/plasma/frost) con física (gravedad/viento/fricción), partículas por intensidad, GLSL hand-written, colorimetryAnalyze (HSL+calor+coherencia), curvatureShade, perspectivePlan, renderEffectHtml canvas autocontenido con hotkeys. Tool `vfx_code`. 29 tests. Integrado a OMAG como Modality 'vfx' + VfxGeneratorAdapter (iter-51 `4deb4e9`). |
| `travel` | `tools/travel.ts` | Videos de viaje: planTravelVideo (estilo aventura/relax/cultura/naturaleza, MOTIONS, prompts 9:16, narración es/ar), buildTakeManifest (`.ultraia/travel/tomas/<slug>/`), buildTravelRender (ffmpeg zoompan Ken Burns + xfade + edge-tts + BGM 0.25), replicateLandscape (variaciones hora×clima×lente), travelLeadImage. Tool `travel_plan`. 18 tests. |
| `generative` | `tools/generative.ts` | IA generativa procedural: perlin/simplex/mandelbrot/flowField/lSystem/partículas/kenburns + audio FM/granular/ADSR/sequencer. 38 tests. |
| `research` | `tools/research.ts` | research_search: arXiv/GitHub/web (+source `pdf` en loop-75) con cache+dedupe. 15 tests. |
| `enlaces` | `tools/enlaces.ts` | Protocolo de la fuente `enlaces.txt` (descarga cruda → análisis → razonamiento → implementación). 9 tests. |
| `libros` | `tools/libros.ts` | Catálogo 115 libros gratis de programación (librosgratis.dev): buscarLibros multi-término accent-insensitive, categorías computadas, validarPropuestaLibro. 31 tests. |

### App móvil (`apps/mobile`)

Expo SDK 57 (RN 0.86, expo-router), tema Dark Obsidian, token en SecureStore. Cliente REST
de apps/web (NO importa `@ultraia/core` — Metro no resuelve `node:*`; replica tipos en
`src/api/types.ts`). Pantallas: login/registro, dashboard KPIs, cola publicaciones
(aprobar/rechazar), cloud, blog. **Auth REST nueva en web**: `POST /api/auth/login|register`
→ `{token, expiresAt, user}` (token opaco TTL 30 días) + `GET /api/auth/me`;
`getCurrentUser(req?)` acepta header `x-ultraia-session` (o Bearer) con fallback cookie →
TODAS las APIs existentes sirven al móvil. E2E real contra dev server (iter-47) + `eas.json`
dev/preview/prod. Base URL: `EXPO_PUBLIC_API_URL` o hostUri+3000.

### Prototipo empaquetado + distribución

`scripts/build-prototipo.py` → Next standalone + DB embebida demo admin/admin + launcher
WebView2 + `UltraIa.bat` 1 clic → `UltraIa-Prototipo.zip`. `PrototypeREADME.md`+PDF
(`scripts/md2pdf.py` writer stdlib puro, servido en `/prototype-readme.pdf`).
`repomix` script npm (empaqueta repo para contexto LLM, output gitignored).

### Fixes estructurales de la ola (aprenderlos ANTES de construir)

| Fix | Commit | Regla |
|---|---|---|
| BodyInit | `78d25e0` | Cast explícito en fetch de multipart (ver Era 9). |
| Imports `.js` | `b601ec5`+`8ae11bf` | Webpack no mapea `.js→.ts` (principio P8). |
| instrumentation edge | iter-48 | `instrumentation.ts` se compila en AMBOS runtimes → `await import('@ultraia/core')` condicionado a `NEXT_RUNTIME === 'nodejs'` dentro de register(). |
| `.next` corrupto por razas | recurrente | matar node.exe + `Remove-Item .next` antes de build; a veces 2 intentos. |

---

## 13. Era 11 — Fundamentos matemáticos + harness blindado

> **Commits (18–19/08)**: fuente fundamentos `7044f3a` · sdf `7477187` · videoqa `8d14835` · motion `82c76fc` · replica `9f996db` · wirings `f8b5e7d`+`63ad94b` · imaging iter-64 · skills audit `a43ce98` · incidente raíz iter-65 (`4917a95` prevención) · conexiones robustas iter-66 · state-doctor iter-68 `854095e` · smoke E2E iter-67 `a7aee98` · CI fix master/main iter-82.

### Objetivo

Base matemática/computer-vision en TS puro (del documento `fundamentosdelaprogramacion.txt`)
y blindaje del harness tras el incidente de integridad.

### Capabilities matemáticas (Bloque A del documento fuente)

| Capability | Archivo | Matemática |
|---|---|---|
| `sdf` | `tools/sdf.ts` | Signed Distance Fields: primitivas sphere/box/torus/capsule/plane + ops union/intersection/subtract/smooth; ray-march planner (cámara/pasos/normales/iluminación); GLSL codegen; HTML canvas autocontenido. Tool `sdf_render`. 31 tests. |
| `videoqa` | `tools/videoqa.ts` | MAE/MSE/PSNR/SSIM + E_flow + E_total ponderado (α=0.6/β=0.3/γ=0.1); veredicto (PSNR>40dB ∧ SSIM>0.95 ∧ E_total<0.4 — coherencia verificada: 48dB≈0.45); buildVmafArgv (nunca ejecuta). Tool `videoqa_metrics`. 31 tests. |
| `motion` | `tools/motion.ts` | flowStats F(x,y,t); decomposeMotion cámara-vs-escena LSQ (dominant static/camera/scene/mixed por energía explicada); trajectoryFit Catmull-Rom; planFlowAnalysis argv OpenCV (Farneback/LucasKanade). Runner `scripts/motion_flow.py` fail-soft. Tool `motion_analyze`. 20 tests. |
| `replica` | `tools/replica.ts` | Orquestador análisis-por-síntesis: analyze→generate→compare→optimize con θ params; stop conditions (target ∨ maxIterations ∨ mejora<0.001×5 patience ∨ timeout reloj inyectable); checkpoints/resumeFrom; ReplicaIO inyectable. Integra generative+videoqa+motion+sdf. Tool `replica_run`. 17 tests. LECCIONES: iterationsUsed=min(iter+1,max); checkpoint.lastIteration; resume 0-indexado. |
| `imaging` | `tools/imaging.ts` | Kernels imagen TS puro: convolve2d/separable, gauss/Sobel/Prewitt/Laplaciano/sharpen/emboss, blur/mediana/unsharp, morfología gris, Otsu/histograma/entropía/equalize, crop/resize bilineal/pyramids, Canny (NMS+hysteresis umbrales Otsu), puentes videoqa (ssimMap/absDiff) y motion (lucasKanadeFlow/pyramidalFlow/warpByOffset/medianFlow). Tool `imaging_process` (7 acciones). 58 tests. |

### Blindaje del harness (post-incidente)

- **Incidente iter-65**: 36 archivos versionados de la RAÍZ a 0 bytes (sesión concurrente).
  Respuesta: `scripts/restore-empty-tracked.ps1` (dry-run default, compara vs HEAD,
  nunca `git restore .`) + checks 6/7/8 en state-integrity-check + doc
  `docs/INCIDENTE-ARCHIVOS-VACIOS-2026-08-19.md`. Ley resultante: verificar raíz > 0
  y sin `D ` ajenos antes de cualquier commit.
- **Conexiones robustas iter-66** (Chrome/Brave): health-checks SIEMPRE 127.0.0.1 IPv4
  explícito (`_ipv4_url`; localhost puede resolver ::1 mientras el server escucha IPv4);
  flags `--host/--browser/--no-open`; auto-restart monitor (máx 2, backoff);
  `webhook_server.py --host|--port`; HITO npm 11: no pasa `-- -H` a script root anidado →
  usar binario hoisted `node_modules/.bin/next.cmd` con cwd=apps/web.
- **Smoke E2E iter-47/67**: driver propio patchread (`page.locator('body').innerText()`);
  `waitUntil:'load'` (dev recompila en caliente); NUNCA `npm run build` con dev server
  corriendo (rompe chunks `_next/static`).
- **CI fix iter-82**: `ci.yml` disparaba solo en `main` pero la rama es `master` →
  `[master, main]` + workflow_dispatch. El CI NUNCA había corrido en push.

---

## 14. Era 12 — Memoria semántica y autonomía

> **Commits (20–22/08)**: SACD iter-69 · seeds caps iter-70 · OMAG-memory iter-71 · autolearn iter-72 · merge creativo iter-73 · META-IA iter-74 · modos+vault+pdfsearch iter-75 `3681ff3` · qdrant iter-76 `f675e14` · truth caps iter-77 · qdrant wiring iter-78 `06b50f5` · embedDense v2 iter-79 · kgraph `a0c5de5` iter-80 · brainpage `6386705` iter-81 · vitals+heartbeat iter-82 · genesis `d4640e6`/`0e03b16`/`1b24921`/`3d938f3`/`d95ca8b` iters 83-88 · autopub autónomo iter-90 · wiring autopub iter-91.

### Objetivo

Darle al sistema CEREBRO (recuperación semántica sobre verdad verificada), MEMORIA
externa persistente (Qdrant) y AUTONOMÍA (latido + meta-mejora + fábrica AutoPub
programada).

### Stack de memoria (construir en este orden)

1. **`semantic-memory.ts`** (capability `semantic_memory`, tool `memory_search`): hash djb2
   de n-gramas + coseno; corpus desde `learning/truth/*.json`; searchTruth top-k;
   `caseSearchText` compone texto buscable desde note/usage/source/question/title/id
   (los casos sin `prompt` DEJAN de ser invisibles). 28 tests. Fix latente conocido:
   rename `MemoryHit`→`SemanticMemoryHit` (colisión re-export TS2308 con omag/memory).
2. **Qdrant real** (`sacd_system/` Docker Compose Qdrant+Neo4j + `nucleo_nasa.py`
   LangGraph triángulo con fallback determinista sin API key) + **`qdrant-memory.ts`**
   (capability `qdrant_memory`, tool `qdrant_memory_sync`):
   `embedDense` signed feature hashing dim **1024** determinista sin deps (v1 legacy
   `embedDense4` conservado con `QDRANT_COLLECTION_V1` para rollback y consumidor Python);
   cliente REST fail-soft (404=respuesta válida, ensureCollection idempotente, upsert
   ?wait=true, pointId djb2 uint31); `searchExternalMemory` = candidatos vector denso
   (recall@10=1.0) + rescoring coseno esparcido exacto; header `api-key` para Qdrant Cloud
   free tier. Runner `Task/sync-qdrant.ts` (--dry-run/--url/--search) + bench
   `Task/bench-embeddings.ts` (leave-one-out sobre 54 docs; criterio coseno medio ≤0.35 —
   medido 0.032 ACEPTADO). 34 tests archivo.
3. **Memoria en el orquestador OMAG** (iter-71): `OmagRequest.memory?` retrocompatible;
   `loadTruthCorpus`+`searchTruth(idea,k)`→hits→WorkingMemory.setHits; Director prompt con
   sección "Verified memory (use as context, do not contradict)".
4. **Seeds de agentes** (iter-70, patrón una-sola-fuente `seed-data.mjs`):
   bp-investigador/bp-analista/bp-orquestador + semantic_memory; bp-orquestador 11→12 caps.

### Autolearn — cerebro de autoaprendizaje

`tools/autolearn.ts` (capability `autolearn`, tool `autolearn_run` acciones scan/gaps/
plan/metrics/mode_plan):

- `parseLearnings` (fecha ISO/dd-mm-yyyy normalizada, título bold=tema) ·
  `scanTruthStats` · `detectGaps` 4 kinds (source_sin_analizar / leccion_sin_implementar /
  tema_sin_truth / backlog_pendiente, dedupe) · `prioritizeWork` RICE simplificado
  (impact×confidence/effort, empates id asc).
- **META-IA iter-74**: `classifyMatrix` (A ambos≥0.85 / B≥0.6 / C≥0.4 / D — el score
  ordena, la matriz nivela; fix real: sigmoide sola mandaba todo a B/C/D) +
  `prioritizeExperiments` (score=impacto×confianza×valorAprendizaje×urgencia÷(costo+ε),
  sigmoide, pesos DEFAULT_EXPERIMENT_WEIGHTS configurables) + `planDailyLoop`
  (presupuesto 70/20/10 explotación/optimización/exploración, 8 pasos del ciclo diario).
- Runner `scripts/autolearn.py` (stdlib puro, `AUTOLEARN_ROOT`, metaia_level calibrado
  sobre RICE real A≥1.2/B≥1.0/C≥0.8/D) → genera `.opencode/plans/autolearn-<fecha>.md`.
  e2e 6/6.
- `buildModePlan(modo)` genera el ModePlan P-P/P-B/L-T/S-D determinista.

### Vault + PDF search

- **`vault.ts`** (capability `vault`, tool `vault_manage`): repositorio propio
  `.ultraia/vault/<kind>/` (data/files/creations/tests/prototypes/pdfs), slugifyEntry,
  vaultSearch, summarizeVault, vaultToCloud (CloudStorageAdapter R2/local), planVaultSync
  diff, exportVaultToGitHub (Contents API fail-soft sin GH_TOKEN). 25 tests.
- **`pdfsearch.ts`** (capability `pdfsearch`, tool `pdfsearch_search`): OpenAlex keyless +
  DuckDuckGo `filetype:pdf` + arXiv; planPdfHarvest → vault/pdfs. 14 tests.

### Memorias persistentes complementarias

- **`kgraph.ts`** (capability `kgraph`, tool `kgraph_build`, iter-80): knowledge graph
  builder regex-lite cero deps; god nodes + surprising connections; SVG Dark Obsidian;
  provenance EXTRACTED/INFERRED. 25 tests.
- **`brainpage.ts`** (capability `brainpage`, tool `brainpage_manage`, iter-81): páginas
  Markdown con `compiled_truth` reescribible + `timeline` append-only; garantía central
  updateTruth reescribe la verdad Y registra el porqué en UNA escritura atómica
  (temp+rename); lintLinks `[[id]]` rotos; path-traversal-safe. 22 tests.

### Sistema autónomo (LATIDO)

- **`vitals.ts`** (capability implícita, dominio puro): `computeVitals` 6 signos
  ponderados (gates .35/tests .2/backlog .15/gaps .15/memoria .1/actividad .05 → 0-100
  VERDE/ÁMBAR/ROJO; un gate ROJO fuerza ROJO global); `detectRegresiones` (tests perdidos,
  memoria baja, gaps altos, VERDE→ROJO vs latido anterior); `decidirAccion` (política
  reparar P0→explotar P1→optimizar P1→explorar P2 = el 70/20/10 decidido por estado real);
  contrato salida 0/1/2 para cron. 19 tests.
- **`Task/heartbeat.ts`**: mide estado REAL (STATE.md backlog, corpus truth, gaps,
  git log 7 días, lecciones fechadas) → `resultTask/heartbeat/pulso-<fecha>.md` +
  `vitals.json` + `.ultraia/vitals/last.json`; flags --gates/--tests/--strict.
- **CI**: `.github/workflows/heartbeat.yml` (cron 09:00 UTC + dispatch: 4 gates sin cortar
  job → alimenta latido → artifact → commitea el pulso) + fix ci.yml `[master, main]`.

### Genesis — engineering engine

`tools/genesis.ts` + `tools/genesis-runner.ts` (capability `genesis`, tool `genesis_run`
acciones validate|gates|prioritize|stop|next|plan|run|eval|propose): parseManifest zod,
autonomyLevel 0-3, prioritizeTasks formula Genesis+bloqueadores, checkStopConditions (10),
evaluateGates verdict, runGenesisCycle con gaps inyectables (gapToTask mapea autolearn→
GenesisTask), buildGenesisProposal Markdown revisable. CLI: `npm run genesis`
(vite-node `scripts/genesis-run.ts --manifest scripts/genesis.manifest.json` sample
commiteable: autonomy 1, goals, quality_gates = los 4 npm, constraints, stop_conditions,
max_iterations 40). Persistencia `.ultraia/genesis/state.json` + proposal.md.
LECCIÓN de porting: extraer solo el aporte genuino no redundante — NO recrear módulos
existentes (blueprint/improve/eval/feedback/llm ya existen).

### AutoPub autónomo (ciclo F1→F4 programado)

`tools/autopub.ts` (capability `autopub`, tool `autopub_run` acción plan pura / run con
opts.db): parseAutopubConfig zod fail-soft, planAutopubCycle, runAutopubCycle fail-soft
por fase/brief, defaultAutopubDeps(db) compone topics→guardarBriefs→listar NUEVO→
generarContenido→present→createPublication (híbrida vigente)→marcarProcesado→publishDue
opcional. CLI `npm run autopub` (`Task/run-autopub.ts` --dry-run/--max/--idioma/
--canales/--publish-due/--tts) → reporte JSON+MD `.ultraia/autopub/`.
Programación Windows: `scripts/schedule-autopub.ps1` (ASCII puro — PS 5.1 UTF-8 lesson;
TaskName SIN dos puntos — CIM los trata como separador de carpeta) → 3 tareas schtasks
(0900/1400/1900). Heartbeat observa con `--dry-run`.

---

## 15. Era 13 — Librerías procedurales

> **Commits**: `ae5b32b` (geometry/pngrender/procvid, iter-93) · `55a7030` (demo real) · `fb4ed37`+`ca7d7ba` (wiring completado) · GIF89a `b7b3426` (iter-94) · median-cut `124b171`+`1a18c1b` (iter-95) — 23–24/08/2026

### Objetivo

Crear objetos/imágenes/videos desde matemática/geometría/lógica — sin assets, sin
proveedores: encoder PNG propio, superfórmulas, animaciones puras serializables.

### Capabilities

| Capability | Archivo | Contenido |
|---|---|---|
| `geometry` | `tools/geometry.ts` | Superfórmula de Gielis 2D/3D (guardas n1 saturado ±0.01 contra under/overflow), Möbius, ops de malla (transformMesh T·R·S / mergeMeshes / meshStats / validateGeoMesh), export **glTF 2.0 estándar** (buffer data-uri base64; accessors POSITION con min/max OBLIGATORIOS) + OBJ texto. Símbolos prefijados `Geo*` para no colisionar vía `export *`. |
| `pngrender` | `tools/pngrender.ts` | Encoder PNG puro TS: CRC32 IEEE canónico, IHDR/IDAT(deflate nivel FIJO 6 → byte-exact)/IEND; renderImage pixel(x,y)→RGBA; valuesToRgba puente directo a generative; paletas obsidian/neoViolet/fire/ice/mono + hslToRgb; writePngAtomic. **GIF89a** (iter-94): paleta RGB332 determinista, LZW variable-width (clear/EOI/dict-4096), NETSCAPE loop, guardas ≤512px/≤600 frames, writeGifAtomic. **median-cut** (iter-95): quantizeMedianCut (cajas RGB split canal mayor-rango tie r>g>b, mediana exacta, nearest cacheado) retrocompatible BYTE-EXACT (`opts.palette='rgb332'\|'mediancut'`) — demo 4394B vs 6157B (**-29%**). Colisión histórica: `RenderResult`→`PngRenderResult` (ya existía en diagram). |
| `procvid` | `tools/procvid.ts` | 6 animaciones PURAS SERIALIZABLES: plasma/waves/orbits/noise-flow/fractal-zoom/shape-morph; coordenadas normalizadas x∈[-a/2,a/2], y∈[-.5,.5], t∈[0,1); guardas dims PARES ≤1280/fps≤60/≤60s/≤1800 frames; planProcVid argv ffmpeg EXACTO (+GIF palettegen/paletteuse); renderFrames idempotente; manifest SIN timestamps. Acción `gif` en tool `procvid_render`. |

### Demo real verificada

`node_modules\.bin\vite-node.cmd Task/procedural-demo.ts [--quick]` →
`resultTask/procedural/` (supershape.png, mandelbrot.png, mobius.obj, supershape.gltf,
video-frame.png) + MP4 en `.ultraia/procedural/demo-video.mp4` — ffprobe **2.0s exactos**
(48 frames @24fps). GIF demo 6157B→4394B verificado estructuralmente.

### Wiring (CERRADO el mismo 23/08)

El registro de tools `geometry_build`/`png_render`/`procvid_render` se completó esa misma
noche: `fb4ed37` — wiring ADITIVO sobre la capability `geom` de la sesión concurrente
loop-92 (capabilities geometry/pngrender/procvid + union `Capability` + descriptors +
re-exports en llm.ts/index.ts), cierre iter-93 `ca7d7ba` con FULL verde y convivencia geom,
verificación de toma de control `c70aecd`. La capability hermana **`geom`**
(`tools/geom.ts`, commits `2c74084`+`8de6080`) aporta geometría computacional general
(2D/3D/video) y convive sin colisión gracias a los símbolos prefijados `Geo*`.

LECCIÓN de esta era: commit temprano con pathspec + backups %TEMP% cuando otra sesión
toca los mismos archivos; quien commitea primero gana, el wiring posterior es ADITIVO.

---

## 16. Era 14 — Local-first + CAD geométrico (24/08)

> **Commits**: `3da0905` (resolveModel local-first) · `d43f25d`+`f4aea13` (UX chat/studio) · `7a3f77f`+`68eb8a6`+`94033fd` (tests herméticos) · `afb790e`+`6e58775` (infra hardening) · `69cef24` (capability cadgeo, Motor Evolutivo M2) — 24/08/2026

### Objetivo

Robustez del gateway LLM sin claves (fallback local-first con timeout), endurecimiento de
infra, y el siguiente hito del Motor Evolutivo: geometría computacional algorítmica
(CAD-lite) sobre las librerías procedurales.

### Gateway local-first (`ai/llm.ts`)

- `resolveModel`: **timeout de petición + fallback local-first de proveedor** — si el
  proveedor configurado falla o excede el timeout, degrada a Ollama/LM Studio locales
  antes de fallar. `AiUnavailableError` → HTTP 503 limpio en las rutas de chat.
- Web: fix studio chat 400 (enum capability) + stop/retry en el chat + timeout postJson +
  error UX provider-agnostic (`f4aea13`, `d43f25d`).
- Tests herméticos al contrato local-first (`7a3f77f`, `68eb8a6`, `94033fd`) — el mock de
  `llm.test.ts` ya NO depende de proveedores externos.

### Infra hardening (`afb790e`, `6e58775`)

SQLite single-writer (una conexión escritora para evitar `database is locked` bajo
concurrencia), gen-engine default port :8100 en los tests de providers, hardening del
worker Cloudflare (validación estricta de rutas/tokens).

### Capability `cadgeo` (Motor Evolutivo M2, `69cef24`)

Geometría computacional algorítmica sobre GeoMesh — complementaria a `geometry`
(superfórmulas) y `geom` (librería general):

| Algoritmo | Uso |
|---|---|
| Delaunay Bowyer-Watson | Triangulación de nube de puntos |
| Voronoi por semiplanos | Celdas de proximidad |
| BVH median-split | Aceleración de intersecciones |
| Quadtree | Partición espacial 2D |
| B-spline de Boor | Curvas suaves por puntos de control |
| CAD-lite extrude/revolve | Sólidos desde perfiles |

Plan fuente: `.opencode/plans/loop-94-cadgeo*.md` + `docs/RAZONAMIENTO-MOTOR-EVOLUTIVO.md`.
Construir DESPUÉS de geometry/pngrender/procvid (depende de GeoMesh).

### Lección

El orden importa dentro del motor evolutivo: primero primitivas matemáticas puras
(Era 13), luego estructuras aceleradoras y CAD encima; el gateway local-first se hace
ANTES de depender de demos LLM-dependientes.

---

## Apéndice A — Árbol del repositorio actual

```
UltraIa/
├── AGENT.md                     # master prompt canónico (verbatim)
├── AGENTS.md                    # instrucciones condensadas + estado operativo
├── AGENTS.loop.md · LOOP.md · STATE.md · loop-{budget,constraints}.md · loop-run-log.md
├── README.md · QUICKSTART.md · DEPLOY.md · CHANGES.md · DESIGN.md · PLAN-ULTRAIA.md
├── PrototypeREADME.md/.pdf · UltraIa-Prototipo.zip (artefactos)
├── package.json · package-lock.json · tsconfig.base.json · opencode.json
├── .env.example · .env.cloud.example · .gitignore · run-all.ps1 · start.py
├── apps/
│   ├── web/                     # Next.js 15 App Router + Tailwind v4 + AI SDK (43-44 páginas)
│   │   └── src/{app/(api|app|auth...), components/, lib/, animations/, instrumentation.ts}
│   └── mobile/                  # Expo SDK 57 (login/dashboard/publicaciones/cloud/blog) + eas.json
├── packages/
│   ├── core/                    # @ultraia/core
│   │   ├── prisma/{schema.prisma, migrations/} · scripts/{seed-admin.mjs, seed-library.mjs, seed-data.mjs}
│   │   └── src/
│   │       ├── ai/llm.ts        # registro central de capabilities→tools (chatStream)
│   │       ├── auth/ · db/ · domain/{blueprint,improve,evals,versions,briefs,publications}.ts
│   │       ├── omag/            # mediafield/world/timeline/memory/generators/critics/orchestrator/project/sound/tts/audiolibrary/vfx-generator
│   │       ├── prompt/ · shared/
│   │       ├── tools/           # 140 archivos: ~70 dominios + tests + index.ts
│   │       └── index.ts
│   └── runtime/                 # @ultraia/runtime (Fases A-D) + api/ + adapters/ + tests 193
├── scripts/                     # loop_piv.py, autolearn.py, cloud-cli.py, topics.py, md2pdf.py,
│                                # genesis-run.ts+manifest, schedule-autopub.ps1, restore-empty-tracked.ps1...
├── Task/                        # runners vite-node: heartbeat, sync-qdrant, run_screenflow, run-autopub,
│                                # procedural-demo, codevfx-demo, video-edit-demo, generate-diagrams, bench-embeddings
├── docs/                        # 55+ documentos (índice en Apéndice E) + diagrams/
├── learning/{truth,sources,responses,memory,nanoprompts,scripts}/ + LEARNINGS.md + verdicts.jsonl
├── gen-engine/                  # FastAPI :8100 (app/, tests/, training/, Dockerfile.gpu)
├── desktopFase/                 # ARCHITECTURE/DESKTOP_ARCHITECTURE/RUNTIME/MODULE_SYSTEM/MEMORY_SYSTEM/
│                                # INSTALLER/SECURITY/SHELL_DECISION + docs/IPC.md + launcher/
├── cloudflare/                  # worker.ts R2 stateless + wrangler.toml
├── ULTRAIA/integracionesImplementacion/src/   # pipeline ar-SA (main.py, publish.py RF-12)
├── vendor/                      # referencias third-party SIN .git (G0DM0D3, video-use, everything-claude-code)
├── .github/workflows/{ci.yml, heartbeat.yml, travel-video-generation.yml}
├── .opencode/{plans/loop-*.md, skills/loop-*, skills-avoid/}
├── skills/                      # espejos raíz byte-idénticos de los skills del harness
├── sacd_system/                 # Docker Qdrant+Neo4j + nucleo_nasa.py
└── resultTask/                  # artefactos de demos (diagrams/, edl/, codevfx/, procedural/, qdrant/, heartbeat/)
```

Scripts npm raíz completos: los de la Fase 0 + `"repomix"`, `"genesis"`,
`"autopub"` (añadidos en Eras 10/12).

---

## Apéndice B — Registro de capabilities y tools

Registro central en `packages/core/src/ai/llm.ts` (capability → tool(s)); exports y
descriptores en `packages/core/src/tools/index.ts` (unión `Capability`). Formato:
capability → tools.

| Capability | Tool(s) | Era |
|---|---|---|
| calculator | calculator | 1 |
| chat/blueprint/improve | (rutas API + domain, sin tool explícita) | 1-2 |
| reach | reach_read/search/github/rss/video | 5 |
| image / meigen | image_generate (multi-provider) | 5 |
| g0dm0d3 | g0_parseltongue / g0_autotune / g0_ultraplinian / g0_godmode | 5 |
| skills | skill_plan/build/test/review/ship/simplify | 5 |
| omag | (API POST /api/omag + orquestador) | 6 |
| gen-engine | (providers por GEN_ENGINE_URL health-gate) | 6 |
| topics | topics_briefs · topics_queue | 9 |
| present | present_package | 9 |
| publish | publish_submit (YT/TikTok/X/IG/Threads/Telegram/Discord/Slack/LinkedIn) | 9 |
| publications | publication_queue | 9 |
| contenido | contenido_generar (redactar/guionizar/guion_largo) | 9 |
| metrics | publication_metrics (kpis/signals/analytics) | 9 |
| growth | growth_plan (profile/experiments/playbook) | 9-10 |
| memory | memory_* (6 ops filesystem Fable-5) | 10 |
| diagram | diagram_render | 10 |
| video_edit | video_edit_pack/edl/render/selfeval/timeline | 10 |
| screenflow | screenflow_plan/capture/schedule/state | 10 |
| cloud | cloud_files (list/upload/read/remove/stat) | 10 |
| game | game_create | 10 |
| harness | harness_manage (boot/run/tick/dump/shutdown) | 10 |
| codevfx | vfx_code (plan/colorimetria/curvatura/perspectiva/render) | 10 |
| travel | travel_plan (plan/toma/render/replicar/lead) | 10 |
| generative | generative_media | 11 |
| research | research_search (web/arxiv/github/pdf) | 11 |
| enlaces | enlaces_process | 11 |
| libros | libros_buscar | 11 |
| sdf | sdf_render | 11 |
| videoqa | videoqa_metrics | 11 |
| motion | motion_analyze | 11 |
| replica | replica_run | 11 |
| imaging | imaging_process (7 acciones) | 11 |
| semantic_memory | memory_search | 12 |
| qdrant_memory | qdrant_memory_sync (plan/sync/search/stats) | 12 |
| autolearn | autolearn_run (scan/gaps/plan/metrics/mode_plan) | 12 |
| vault | vault_manage | 12 |
| pdfsearch | pdfsearch_search | 12 |
| kgraph | kgraph_build | 12 |
| brainpage | brainpage_manage (init/create/read/update/append/list/reindex/lint) | 12 |
| genesis | genesis_run (validate/gates/prioritize/stop/next/plan/run/eval/propose) | 12 |
| autopub | autopub_run (plan/run) | 12 |
| geometry / pngrender / procvid | geometry_build · png_render · procvid_render (wiring `fb4ed37`, cierre `ca7d7ba`) | 13 |
| geom (hermana, loop-92) | geom (geometría computacional 2D/3D/video; convive vía símbolos Geo*) | 13 |
| cadgeo | cadgeo_* (Delaunay/Voronoi/BVH/quadtree/B-spline/CAD-lite sobre GeoMesh) | 14 |
| procedural-pub | builder procedural → cola Publication bilingüe es/ar (`94033fd`) | 14 |

Dominios adicionales presentes en `tools/` provenientes de sesiones concurrentes (WIP o
merge posterior; tratar según su estado en `git status`): brain, creativo, knowledge-graph,
geom, physics2d, security, deps, stitch, recordly, recordly/media-synthesis, codequality,
web, video, content, automation, recorder, connections.

---

## Apéndice C — Variables de entorno por servicio

Fuente: `.env.example` raíz (copiar a `.env` y `apps/web/.env`) + `.env.cloud.example`.

### Base de datos y LLM

| Variable | Default | Nota |
|---|---|---|
| `DATABASE_URL` | `file:./dev.db` | SQLite; Postgres en producción |
| `ULTRAIA_PROVIDER` | `ollama` | ollama \| openai \| google \| deepseek \| lmstudio |
| `ULTRAIA_MODEL` | `llama3.1` | o tuneados `ultraia-*` de `ollama/` |
| `OPENAI_API_KEY` / `GOOGLE_API_KEY` / `DEEPSEEK_API_KEY` | "" | tier gratuito disponible en google/deepseek |
| `OLLAMA_BASE_URL` / `LMSTUDIO_BASE_URL` | :11434/v1 / :1234/v1 | locales OpenAI-compatible |
| `APP_URL` | http://localhost:3000 | origen público |
| `GEN_ENGINE_URL` | "" | vacío=keyless; local :8100; pod GPU remoto |

### AutoPub canales (todos OPCIONALES — vacío = fail-soft)

`YOUTUBE_ACCESS_TOKEN` · `TIKTOK_ACCESS_TOKEN` · `X_ACCESS_TOKEN` · `IG_ACCESS_TOKEN`+
`IG_USER_ID` · `THREADS_ACCESS_TOKEN`+`THREADS_USER_ID` · `TELEGRAM_BOT_TOKEN`+
`TELEGRAM_CHAT_ID` · `DISCORD_WEBHOOK_URL` · `SLACK_BOT_TOKEN`+`SLACK_CHANNEL` ·
`LINKEDIN_ACCESS_TOKEN` (+ author URN). Guías: `docs/CANALES-CONFIG-2026.md`.

### Otras

| Variable | Uso |
|---|---|
| `MEIGEN_API_TOKEN` | Activa provider meigen en tools/image |
| `EXA_API_KEY` | Search neural en reach |
| `YOUTUBE_API_KEY` | Analytics reales F5 (channels/statistics) |
| `CONNECTIONS_SECRET` | AES-256-GCM para ChannelConnection (sin clave → efímero) |
| `QDRANT_URL` + `QDRANT_API_KEY` | Qdrant Cloud free tier / local :6333 |
| `GH_TOKEN` | Export del vault a GitHub (opcional) |
| `EXPO_PUBLIC_API_URL` | Base URL de la app móvil |
| `ULTRAIA_TRUST_PROXY` | `1` para confiar x-forwarded-for en rate limit |
| `AUTOLEARN_ROOT` | Raíz alternativa para el runner autolearn.py |

Regla: NINGUNA variable es obligatoria salvo `DATABASE_URL`; el sistema entero degrada
con elegancia sin claves.

---

## Apéndice D — Inventario de scripts y runners

### Python (raíz y scripts/)

| Script | Función | Verificación propia |
|---|---|---|
| `start.py` | Setup + web :3000 + hooks :8000 + gen-engine :8100; fail-hard en salud; árbol taskkill | ruff/pylint/pyright/pyflakes 0 |
| `webhook_server.py` | FastAPI :8000 (--host/--port retrocompatible) | pyflakes 0 |
| `scripts/loop_piv.py` | Driver PIVR headless | mark_done 4/4, doctor 9/9 |
| `scripts/autolearn.py` | Runner de autoaprendizaje → plan diario | e2e 6/6 |
| `scripts/cloud-cli.py(.test.py)` | CLI cloud stdlib (layout/list/upload/pull/remove/stat/manifest) | self-test 25/25, e2e 16/16 |
| `scripts/topics.py` | Motor de briefs espejo (dry-run) | — |
| `scripts/md2pdf.py` | Markdown→PDF stdlib puro (--check) | — |
| `scripts/build-prototipo.py` | Zip prototipo standalone+launcher | — |
| `scripts/nanoprompts_{fetch,generate}.py` | Seeds de librería de prompts | — |
| `scripts/schedule-autopub.ps1` | schtasks 0900/1400/1900 (ASCII puro) | Ready ×3 |
| `scripts/restore-empty-tracked.ps1` | Reparación de raíz vaciada (dry-run default) | — |
| `learning/scripts/verify.py` + `restore_memory.py` | Verificación truth / restore memoria zip | 16/16 |

### Runners TypeScript (`Task/`, ejecutar con `node_modules\.bin\vite-node.cmd`)

`heartbeat.ts` (latido) · `sync-qdrant.ts` (--dry-run/--search) · `bench-embeddings.ts`
(recall/MRR embeddings) · `run_screenflow.ts` (--dry-run) · `screenflow-hot-watch.ts`
(--once/--interval/--cloud) · `run-autopub.ts` (npm run autopub) · `procedural-demo.ts`
(--quick) · `codevfx-demo.ts` · `video-edit-demo.ts` · `generate-diagrams.ts` ·
`knowledge-graph.ts` · `brain-sync.ts` · `run_task1.ts` (orquestador OMAG → resultTask).

### npm scripts especiales

`npm run genesis` (bucle autónomo Genesis) · `npm run autopub` (ciclo AutoPub) ·
`npm run repomix` (contexto LLM del repo).

---

## Apéndice E — Índice de documentación

### Raíz

`AGENT.md` (master prompt) · `AGENTS.md` (condensado+estado) · `README.md` ·
`QUICKSTART.md` · `DEPLOY.md` (hosting gratis 2026) · `DESIGN.md` + `apps/web/MASTER.md`
(diseño/motion) · `CHANGES.md` · `PLAN-ULTRAIA.md` · `PrototypeREADME.md/.pdf` ·
`LOOP.md`/`STATE.md`/`loop-*` (harness) · `LOOPENGINEER.TXT` (brief origen del bucle) ·
`integracionTecno.txt` · `fundamentosdelaprogramacion.txt` (fuente Bloque A/B).

### docs/ (55 entradas — selección por tema)

| Tema | Documentos |
|---|---|
| Producto/ops | AUTO-PUBLICACION.md · CANALES-CONFIG-2026.md · APIS-GRATIS-2026.md · CLOUD-FREE-2026.md · CLOUD-CLI-GUIDE.md · DESPLIEGUE-GRATUITO.md · INICIO-LOCAL-Y-NUBE.md · MOBILE.md · SCREENFLOW.md · REPOMIX.md · MODOS-OPERACION.md · SKILLS-INVENTARIO.md · GUIA-CODIGO.md · GUIA-CONCEPTUAL-CINEMATOGRAFICA.md · recursos-ia.md |
| Diseño | design-dna.json · diagrams/ (roadmap-2026, desktop-architecture, gen-engine-pipeline) |
| Razonamientos (protocolo enlaces.txt — uno por fuente analizada) | RAZONAMIENTO-{DIAGRAM-DESIGN, VIDEO-USE, MEDIA-AUTOMATION, DEEPSEEK-HARNESS, VIDRUSH-ABACUS, OPENCLAW, HIGGSFIELD-DAVINCI, CODEVFX, SACD, QDRANT-MEMORY, FABLE5, FUNDAMENTOS-PROGRAMACION, MODOS-OPERACION, META-IA, AUTOLEARN, BRAINPAGE, BRAIN-MD, GRAPHIFY, KGRAPH, PROCEDURAL, IMAGING, SDF, GENESIS, GAME-DEV, RECORDLY, TESTTASKSKILLS, MOTOR-EVOLUTIVO, AUDITORIA-HARNESS}.md |
| Incidentes/tareas | INCIDENTE-ARCHIVOS-VACIOS-2026-08-19.md · TAREA-{WIRING-CLOUD,CLOUD-PUBLICATIONS,CLOUD-VIDEOEDIT}.md |

### desktopFase/

ARCHITECTURE.md · DESKTOP_ARCHITECTURE.md (fases A-F) · RUNTIME.md · MODULE_SYSTEM.md ·
MEMORY_SYSTEM.md · INSTALLER.md · SECURITY.md · SHELL_DECISION.md · docs/IPC.md ·
launcher/README.md.

### learning/

`LEARNINGS.md` (lecciones numeradas por era) · `truth/` (8 JSON de verdad verificada:
ai_gen_resources, tecno_recursos, web_browse_repos, ultraia_capabilities, math, live,
content_tools, gstack) · `sources/` (fuentes crudas por protocolo enlaces.txt) ·
`memory/ultraia_memory.zip` (restaurar con `python learning/scripts/restore_memory.py summary`).

---

## Apéndice F — Estado final de verificación

Última ronda completa documentada (iter-93/94/95, 23–24/08/2026):

| Gate | Resultado |
|---|---|
| `npm run typecheck` | 0 errores (core + web + runtime) |
| `npm run lint` | 0 avisos |
| `npm run test` | **1452/1452 PASS** (core 1259 + runtime 193) |
| `npm run build` | 0 errores (~44 páginas) |
| Python harness | doctor 9/9 · mark_done 4/4 · ruff/pyflakes/py_compile 0 |
| gen-engine | pytest 7/7 (Python 3.12) |
| cloud-cli | self-test 25/25 · e2e 16/16 |
| Demos | procedural MP4 2.0s exactos · GIF median-cut -29% · qdrant sync 49→54 docs recall@1 100% |

### Checklist de reconstrucción (resumen ejecutivo)

1. Fase 0: entorno + configs raíz + `.gitignore` → commit inicial.
2. Era 1-2: monorepo web+core, blueprint/run/improve, API keys públicas → gates verdes.
3. Era 3: design tokens + motion + skills de diseño.
4. Era 4: start.py + webhooks + learning/truth.
5. Era 5: gallery/builder/reach/admin/UI kit/CSP.
6. Era 6: gen-engine :8100 + edge-compat + OMAG completo.
7. Era 7: runtime desktop A→D + launcher WebView2.
8. Era 8: harness PIVR completo (LOCK ANTES DE CODIFICAR).
9. Era 9: AutoPub F1→F5 + canales + métricas.
10. Era 10: ola de capabilities + cloud + móvil + empaquetado.
11. Era 11: capabilities matemáticas + blindaje harness + CI master/main.
12. Era 12: memoria semántica + Qdrant + autolearn + vault + LATIDO + genesis + autopub autónomo.
13. Era 13: geometry/pngrender/procvid + demos + wiring aditivo (convivencia con `geom`).
14. Era 14: gateway local-first (resolveModel timeout+fallback) + infra hardening + cadgeo (Motor Evolutivo M2).

En CADA paso: gates FULL en orden CI antes de commitear; commit pathspec; lección nueva →
`learning/LEARNINGS.md`; push solo con aprobación humana.

---

*Documento generado el 24/08/2026 desde el historial real de commits (`git log --reverse`),
STATE.md (filas 1-95), AGENTS.md y los árboles del repositorio. Hashes verificados contra
`git cat-file` (100% de los citados existen). Cubre hasta `69cef24` (24/08 06:35).*
