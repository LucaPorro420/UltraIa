# UltraIa

> Plataforma IA integral: agentes, generación audiovisual, publicación automática y
> runtime de escritorio. En fase de prototipo activo con vistas a lanzamiento.

## Descripción general

UltraIa es un monorepo (npm workspaces) que combina un **app web** (Next.js 15 + Tailwind v4 +
Vercel AI SDK), un **núcleo de dominio** (TypeScript con Prisma), un **motor de generación**
(Gen-Engine en Python) y un **runtime de escritorio** (`@ultraia/runtime`). Su lógica central es
un **sistema operativo de mundos mediáticos** (OMAG): con una idea entra un plan de director,
generadores de imagen/video/audio (keyless-first, sin API keys obligatorias), críticos que
evalúan sincronía e identidad, y un bucle de corrección automática.

## Capacidades actuales

- **Agentes de IA** (`bp-admin-*`): 8 agentes con skills de planificación, build, test, review,
  ship y simplify (capability `skills`), más herramientas de web (AgentReach), música, audio,
  publicación y g0dm0d3 (parsing/auto-tune de respuestas).
- **OMAG v0.1**: MediaField (entidades con identidad persistente, eventos con efectos causales),
  timeline compartido, memorias, generadores keyless (imagen pollinations/meigen, video
  storyboard, audio edge-tts + síntesis procedural WAV) y críticos con corrección (máx 5 iteraciones).
- **AutoPub**: pipeline idea → contenido → presentación → distribución. Cola `Publication`
  persistente (Prisma), calendario (`POST /api/publications/publish-due`), adaptadores
  YouTube/TikTok (resumable v3 / Direct Post) y blog propio en `/blog`.
- **Loop PIVR**: harness de desarrollo continuo (plan → implementar → verificar → reiniciar) con
  agentes `piv-plan`/`piv-build`/`loop-triage`, driver `scripts/loop_piv.py` y gates CI duales.
- **@ultraia/runtime** (Fases A–B): runtime local con módulos lazy, memoria con persistencia,
  health/recovery, y Local API HTTP/WS en 127.0.0.1 con token de sesión.
- **Gen-Engine** (Python): API local en `:8100` con TTS (edge-tts) y providers intercambiables;
  la web lo detecta en boot (`GEN_ENGINE_URL`).

## Lógica general

```
apps/web (Next.js)  ──►  packages/core (dominio, tools, OMAG, AutoPub, Prisma)
        │                          │
        ▼                          ▼
  webhooks :8000             @ultraia/runtime (desktop, Local API)
        │
        ▼
  Gen-Engine :8100 (Python, keyless-first)
```

Principio rector: **keyless-first con degradación elegante** — todo funciona sin API keys usando
servicios gratuitos; las claves opcionales (MEIGEN, EXA, YOUTUBE, TIKTOK) solo activan providers
premium.

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
```

Verificación del repo (orden CI):

```bash
npm run typecheck && npm run lint && npm run test && npm run build
```

## Hoja de ruta (capacidades planificadas)

- **AutoPub F2/F5**: enrutamiento brief → redactor/guionista con manifest JSON; KPIs y
  `media_score` pre-publicación con feedback al modelo.
- **AutoPub F4+**: adaptadores Meta (IG Reels/Threads), X API v2 y LinkedIn.
- **Gen-Engine F5**: entrenamiento real de difusión (E0–E5, roadmap documentado) con
  GPU/decisión humana.
- **Desktop Fase D**: shell WebView2 + Local API (upgrade path a Tauri 2).
- **Cola de briefs persistente** para AutoPub F1.

## Notas

- Sin API keys requeridas para el uso base; consultar `.env.example` para las opcionales.
- Los commits/pushes del loop requieren aprobación humana (nunca push automático).
- Docs de referencia: `AGENTS.md` (guía de agentes), `docs/AUTO-PUBLICACION.md`,
  `desktopFase/ARCHITECTURE.md`, `DEPLOY.md` (hosting gratuito).