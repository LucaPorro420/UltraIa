# UltraIa

AI product under active development. The repository is a working monorepo (npm workspaces): `apps/web` (Next.js 15 App Router + Tailwind v4 + Vercel AI SDK) and `packages/core` (domain logic, Prisma, Vitest). It has manifests, build/test/lint config, and CI. `AGENT.md` is the verbatim master prompt and the canonical source of the operating rules below; this file (`AGENTS.md`) is the condensed agent instruction set.

## Operating mode (condensed from AGENT.md)

Act as a world-class, multidisciplinary expert entity — Senior Software Architect, CTO, Head of Product, Offensive/Defensive Cybersecurity Specialist, QA/Testing Engineer, Data Scientist & ML/AI Engineer, DevOps/SRE, UX/UI Designer, International Business Strategist — to plan, build, secure, and commercialize software of any kind, in any language, market, or industry.

1. **Discovery & Strategy** — validate problem, market, competition, value proposition, feasibility; tailor by region, language, regulation (GDPR, CCPA, LGPD) and culture; requirements, roadmap, prioritized backlog (RICE/MoSCoW).
2. **Architecture & Design** — stack chosen by use case with no preference bias; monolith / microservices / serverless / event-driven / hybrid; security & privacy by design from the first diagram.
3. **Development** — clean, documented, tested, maintainable code in any required language/framework/platform; SOLID, design patterns, clean architecture, ecosystem best practices.
4. **AI/ML** — design, train, fine-tune, deploy models (LLMs, vision, NLP, recommender, time series); integrate via RAG, agents, embeddings, model APIs; optimize (quantization, distillation, prompt engineering, bias mitigation); MLOps (data/model versioning, drift monitoring, retraining).
5. **Security** — OWASP Top 10, STRIDE threat modeling, pentesting, hardening; secrets management, authN/authZ (OAuth2, OIDC, JWT, MFA), encryption at rest/in transit; dependency/CVE/SCA audits.
6. **Testing & QA** — unit, integration, E2E, load/stress, security, usability strategies plus AI evals and red-teaming; automated in CI/CD with coverage/quality gates.
7. **Infrastructure** — cloud (AWS/GCP/Azure/multi) or on-prem, containers, Kubernetes, IaC (Terraform); observability: logs, metrics, tracing, alerting, incident response.
8. **Product & Expansion** — monetization (SaaS, freemium, licensing, marketplace, API-as-a-service); region-specific pricing and cost analysis; go-to-market, localization, landing pages, sales collateral; KPIs/OKRs, post-launch support.
9. **Legal & Compliance** — flag data privacy, IP, open-source licensing, AI regulation (EU AI Act) by region (not binding legal advice).

### Operating rules
- Ask essential clarifying questions (goal, audience, budget, timeline, team, constraints, geography) before assuming.
- Be direct, technically precise, actionable; engineering-grade language, no marketing fluff.
- State explicitly when critical information is missing; never invent it.
- Present alternatives with pros/cons when multiple valid paths exist.

## Repo facts / gotchas

- Git repo root is this folder (`UltraIa`), not `C:/` — never run `git add .` from outside this folder.
- Verified working project: run `npm run db:migrate`, then `npm run typecheck`, `npm run lint`, `npm run test`, `npm run build`. Verification order mirrors CI: `typecheck → lint → test → build`.
- `.gitignore` exists and ignores `node_modules`, `.next`, `dev.db`, and env files.
- `AGENT.md` is the full master prompt; treat it as canonical if in doubt about operating rules.

## gstack (installed)

gstack (github.com/garrytan/gstack) está instalado como suite de skills de opencode en `~/.config/opencode/skills/gstack-*` (runtime en `~/.claude/skills/gstack`). Actúa como un equipo virtual: ingeniero, CEO, designer, planificador, tester, y release engineer. Los skills son Markdown (SKILL.md) y se cargan con la herramienta `skill` usando su nombre (`gstack-plan-ceo-review`, `gstack-qa`, ...).

Mapeo de roles → skills (usar según la fase):

| Rol | Skill | Cuándo |
|---|---|---|
| CEO (dirige) | `gstack-office-hours`, `gstack-plan-ceo-review` | reframear el producto, retar alcance antes de construir |
| Planificador | `gstack-autoplan`, `gstack-plan-eng-review`, `gstack-spec` | plan revisado (CEO→design→eng), arquitectura, diagramas |
| DevelopDesign | `gstack-design-consultation`, `gstack-plan-design-review`, `gstack-design-shotgun`, `gstack-design-html` | sistema de diseño, mockups, HTML producible |
| Ingeniero | `gstack-plan-eng-review`, `gstack-design-html`, `gstack-review` | arquitectura, implementación, revisión de código |
| Tester | `gstack-qa`, `gstack-qa-only`, `gstack-browse` | QA en navegador real, bug reports |
| Verifica | `gstack-review`, `gstack-benchmark`, `gstack-canary`, `gstack-devex-review` | review de PR, perf, post-deploy |
| Corrige | `gstack-review` (auto-fix), `gstack-investigate` (root cause), `gstack-qa` (fix + regresión) | arreglar bugs con verificación |
| Seguridad | `gstack-cso` | OWASP Top 10 + STRIDE |
| Release | `gstack-ship`, `gstack-land-and-deploy` | PR, deploy, verificación en producción |

Ciclo recomendado para features: `gstack-plan-ceo-review` → `gstack-plan-eng-review` → implementar → `gstack-review` → `gstack-qa` → `gstack-ship`. En modo no interactivo los skills corren con flags `-q`/`--no-prefix`; consultar el SKILL.md de cada uno para su invocation exacta.

## Estado operativo (verificado 13/08/2026)

- **Monorepo**: `npm run typecheck`, `npm run lint`, `npm run test` (61/61 PASS), `npm run build` — TODO verde. Arranque web: `npm run dev`.
- **Pipeline árabe**: `python main.py --dry-run` end-to-end OK (ar-SA); validación `python main.py --validate`. Falta solo: claves API reales en `.env` y `ffmpeg` en PATH (`winget install Gyan.FFmpeg`) para render/assembly real.
- **Todo en un comando**: `python start.py` (setup + web :3000 + webhooks :8000; flags
  `--web`, `--hooks`, `--validate`, `--install`, `--skip-setup`, `--check-connections`).
  Preflight de puertos + health-check "UP" tras arranque; en Windows usa `npm_exec()` (npm.cmd).
  Alternativa: `./run-all.ps1` (web + webhooks + validate).
- **start.py robustecido (14/08/2026)**: `python_exec()` prefiere `python` sobre `py` (el launcher
  `py` apunta a Python 3.14 donde NO está fastapi/uvicorn). `http_ok()` trata 404 como "servidor
  vivo" (el webhook server no tiene ruta `/` — antes el health-check de :8000 fallaba siempre).
  NOTA (14/08/2026): Python 3.14.7 (py launcher) YA tiene fastapi+uvicorn instalados; `python`
  (3.12.10) sigue siendo el intérprete por defecto preferido en `python_exec()`.
  `wait_healthy(url, service, proc)` distingue "proceso murió antes de responder" vs "no responde".
  `terminate()` mata el ÁRBOL completo en Windows (`taskkill /T /F`) — clave para no dejar `next dev`
  huérfano (el `terminate()` antiguo solo mataba npm.cmd y dejaba 2 dev servers duplicados).
  `deps_outdated()` corre `npm install` si node_modules falta o si package-lock es más nuevo que
  `node_modules/.package-lock.json` (ya no instala solo si node_modules no existe → refleja deps nuevas
  como `three`). `check_prereqs()` valida VERSIONES (node >= 20, python >= 3.10), no solo existencia.
  Fallo en health-check o muerte de un servicio → `sys.exit(1)` (fail-hard) + shutdown limpio.
  `--deploy` corre `npm run build` + imprime guía de hosting gratuito (ver `DEPLOY.md`).
- **start.py limpio a 0 issues de lint (14/08/2026)**: pylint, ruff, pyflakes y pyright pasan sin
  errores (antes 32+5+1 = 38 en el IDE). Fixes: docstrings en todas las funciones, líneas < 100 chars,
  `subprocess.run(check=...)` explícito, excepciones específicas en vez de `except Exception`,
  `import urllib.error` (bug latente: se usaba sin importar — pyright lo detectaba), argumento
  `_name` renombrado en `terminate`, `main()` refactorizada (extraídas `cmd_validate/cmd_install/
  cmd_deploy/cmd_single/cmd_full/monitor_loop/spawn_and_watch`). Linters a correr: `python -m ruff
  check start.py`, `python -m pylint start.py --score=no`, `python -m pyright start.py`,
  `python -m pyflakes start.py`.
- **DEPLOY.md (14/08/2026)**: guía de deploy gratuito 2026 (Vercel recomendado para Next.js, Netlify,
  Render, Cloudflare Pages, GitHub Pages) + notas del webhook server (Render/Railway/localtunnel) y
  de secrets. Generada desde el post de Instagram @sanskaar.ai (Db-xGaekmeE).
- **CSS build fix (14/08/2026)**: `var(--color-primary/40)` en globals.css rompía `npm run build`
  (sintaxis inválida, `Unexpected token Delim('/')`) → reemplazado por
  `color-mix(in oklab, var(--color-primary) 40%, transparent)`. Los 4 checks del repo pasan:
  typecheck / lint / test (93/93) / build.
- **Sistema de aprendizaje**: `learning/` con verdad verificada aparte (`learning/truth/`), respuestas crudas (`learning/responses/`), verifier (`learning/scripts/verify.py`) y lecciones (`learning/LEARNINGS.md`). 16/16 casos PASS. Reglas: API directa > búsqueda web para datos numéricos; pedir campos crudos exactos; el tipo de comparación viene de la verdad.
- **gstack**: 53 skills en `~/.config/opencode/skills/gstack-*` (se cargan al iniciar opencode). Runtime en `~/.claude/skills/gstack` (re-ejecutar `./setup` tras `git pull`).
- **MeiGEN + librería (14/08/2026)**: seed `seed-library.mjs` cargó 1379 prompts (fuente remota jau123/nanobanana-trending-prompts; fallback embebido ~38 si raw.githubusercontent da 503; SQLite NO soporta `skipDuplicates` en createMany — filtrar slugs existentes antes). API MeiGEN: `POST /api/generate/v2` (Bearer `meigen_sk_*`, polling `GET /api/generate/v2/status/:id` con `pollHintSeconds`), `GET /api/models` público (no hardcodear IDs). `tools/image.ts` multi-provider (pollinations keyless / meigen si `MEIGEN_API_TOKEN`).
- **AgentReach (14/08/2026)**: `packages/core/src/tools/reach.ts` (readWeb vía r.jina.ai + fallback directo, searchWeb DuckDuckGo IA + Exa opcional con `EXA_API_KEY`, searchGitHub, parseRss con fast-xml-parser, videoInfo oEmbed). Registrada como tools `reach_*` en `ai/llm.ts` + ruta `/api/tools/reach`.
- **Admin**: `user: admin` / `psw: admin` (email `admin@ultraia.local`, rol ADMIN, 8 agentes `bp-admin-*` públicos). Login acepta username sin `@` (busca por `name`). Login/registro con zod: register usa `registerSchema` estricto (email válido).
- **UI (14/08/2026)**: shell IDE en `(app)/layout.tsx` (sidebar 280px, nav client en `components/app-shell/nav.tsx`, logout en `(app)/actions.ts`), UI kit ampliado (`tabs, dialog, switch, skeleton, tooltip, stat-card, empty-state, kbd`), `/gallery` (gallery-client + prompt-card + generate-drawer + detail-dialog + contribute-dialog; infinite scroll cursor-based, drawer 420px, enhance local fallback — `/api/chat` requiere agentId y no sirve para prompts sueltos), `/builder` (builder-client + blocks + codegen + property-panel + export-modal; DnD nativo HTML5, localStorage `ultraia-builder-v1`, genera HTML/CSS/JS + React+Tailwind). Todas las páginas restyleadas a Dark Obsidian.
- **CSP (14/08/2026)**: img-src permite image.pollinations.ai, images.meigen.ai, i.ytimg.com; connect-src permite pollinations, meigen, r.jina.ai, duckduckgo, exa, github, youtube.
- **Rediseño 2026 + skills (14/08/2026)**: pase híbrido (Dark Obsidian + glass/glow 2026) sobre TODO el app shell. Nuevas utilidades en globals.css: `.glass-panel` (blur 12px + hairline top), `.card-glow-hover` (lift 2px + glow primary 150ms `--ease-ultra`), `.gradient-neo-frame-strong`, focus-visible ring global. Hero landing con WebGL aurora real: `components/aurora/aurora-canvas.tsx` (Three.js + ShaderMaterial simplex noise; importado con `next/dynamic` ssr:false en landing-hero para no inflar el bundle — el shader respeta prefers-reduced-motion con render estático). Pipeline de agente: `components/app-shell/skill-pipeline.tsx` (Plan→Build→Test→Review→Ship→Simplify, stagger GSAP) integrado en dashboard. Skills reales: `packages/core/src/tools/skills.ts` (`runSkill(kind, {task, context})` llama al modelo configurado; kinds plan/build/test/review/ship/simplify), registradas como tools `skill_*` en `ai/llm.ts` bajo capability `skills` (ya activa en los 8 agentes admin vía seed-admin.mjs). Deps nuevas: `three` + `@types/three` en apps/web. Login/register: form con `name="email"` (acepta username); `input[name="identifier"]` ya NO existe.
- **Smoke test (14/08/2026)**: driver propio patchright (createRequire + `page.locator('body').innerText()`) — 13/13 PASS con dev server limpio. IMPORTANTE: NO correr `npm run build` mientras el dev server corre (rompe chunks `_next/static` con 404/MIME errors; matar TODOS los procesos node `next dev` antes — hubo 2 servers duplicados). `waitUntil: 'load'` en vez de 'networkidle' (dev server recompila en caliente). Sesión logueada redirige `/register` y `/login` → dashboard (esperado).
- **OMAG Core v0.1 (14/08/2026)**: Fase 2 del diseño `AUDIO/VIDEO/IMAGE.md` implementada en `packages/core/src/omag/` (spec `AUDIO/VIDEO/imvidau2.txt`). MediaField schema zod (`mediafield.ts`: entities con identidad persistente, relations/world graph, events de primera clase con effects causales + `params.<effect>_delay`; serialize/parse JSON; `removeEntity` hace cascade de relations+events); `WorldTransitionEngine` (`world.ts`: applyEvent→state, advanceTime→integra velocity, validateState→dangling refs); Timeline compartido (`timeline.ts`: tracks video/audio/music/events/camera, `checkSynchronization` detecta offset audio-video >0.1s, `alignEffectsToCause` resetea delays); memorias (`memory.ts`: Working/Scene/Character/Style/Error con patterns); generators (`generators.ts`: interfaz validate/prepare/generate/inspect/export + adapters keyless image (pollinations/meigen), video (storyboard), music (composición) — reemplazables por Gen-Engine); critics (`critics.ts`: TemporalSync/Identity/Causal/Multimodal + `fuseCritiques` con pesos dinámicos por prioridad); `OmagOrchestrator` (`orchestrator.ts`): IDEA→plan Director (LLM o local)→MediaField→generadores→críticos→correction loop (max 5, thresholds fast .5/balanced .6/high .75), memorias pobladas en cada iteración. API: `POST /api/omag` (auth, idea+quality+modalities+maxIterations). Tests 152/152 PASS (19 nuevos OMAG). Sin entrenamiento: los generadores son render backends (keyless) — el núcleo es el sistema operativo del mundo.
- **OMAG audiovisual expandido (14/08/2026)**: mejoras portadas del MVP Python de CreationsApp + spec long-form `AUDIO/VIDEO/MVPModify.txt`. NUEVO: modalidad `audio` (TTS edge-tts keyless en `omag/tts.ts`: `VOICES_BY_LANG` 14 idiomas, `detectLang`, `edgeTtsAudio` con WebSocket global de Node 22+ — SIN dep `ws`; `AudioGeneratorAdapter` en `generators.ts`); música real keyless (`tools/music.ts` `TunetankMusicProvider` → `searchMusic` single-word, fallback automático a `composeMusic`; se activa global en runtime vía `apps/web/src/instrumentation.ts` → `setDefaultMusicProviderEnabled(true)`, en tests queda OFF); vocabulario de cámara por shot (`prompt/director.ts`: `MOTIONS` 16 movimientos del banco prompts-videos.md, `motions[]` por shot + `motion` retrocompatible, `normalizeMotion` canoniza espacios→guiones); long-form scaffolding (`omag/project.ts`: `Project→Act→Sequence→Scene→Shot`, `MasterTimeline`+`checkTimelineSync` offset>0.1s, `WorldCheckpoint`+`MemoryCheckpointStore`+`checkpointFromField`, `LongTermMemory` — MVP-0.3 base, orquestador intacto); síntesis procedimental desde cero (`omag/sound.ts`: tone/noise/impact/whoosh/beat/ambience → PCM16+WAV, sin deps ni ffmpeg); `AudioLibrary` (`omag/audiolibrary.ts`: search Tunetank, saveSample mp3, `extractAudioFromVideo` sampler — requiere ffmpeg/yt-dlp, degrada con guía `winget install Gyan.FFmpeg`, saveSynth WAV); tools de agente `audio_search`/`audio_synth` en `ai/llm.ts` (capability `audio`). `/api/omag` acepta `audio` en modalities. Tests 187/187 PASS (35 nuevos). LECCIÓN VERIFICADA: Tunetank MCP solo matchea queries de UNA palabra → `searchMusic`/`searchSfx`/provider hacen fallback al primer token.
- **Gen-Engine Fase 5 wiring (14/08/2026)**: `registerGenEngineIfHealthy()` en `tools/gen-engine.ts` (health-check `/health` con timeout 3s, registra `setMusicProvider`+`setVideoProvider` solo si responde; providers con `baseUrl` parametrizable). `apps/web/src/instrumentation.ts` lo activa en runtime nodejs cuando `GEN_ENGINE_URL` está seteada (sin engine → keyless: Tunetank música + storyboard video). `.env.example` gana `GEN_ENGINE_URL` (NOTA: webhook server de start.py usa :8000 — si corren juntos, cambiar el puerto del engine). Core: 189/189 PASS (2 nuevos). Gen-Engine Python: 7/7 PASS con Python 3.12 (`& "...\Python312\python.exe" -m pytest tests -q` en `gen-engine/`; `python` en shell resuelve a 3.14 sin pytest). edge-compat: imports dinámicos `node:*` con `webpackIgnore` + fallbacks webpack en `next.config.ts` (serverOnlyBuiltins client) + `serverExternalPackages` con stitch-sdk → core bundleable en edge/browser. ffmpeg y yt-dlp YA instalados (win) → `audiolibrary.test.ts` es ffmpeg-aware (`hasCommand('ffmpeg')` decide el patrón esperado).

## Memoria de aprendizaje (learning/)

Sistema de memoria verificada en `learning/`: la verdad se guarda APARTE de las respuestas del modelo (`learning/truth/`), se verifica contra ella (`verify.py`) y se empaqueta comprimida (`learning/memory/ultraia_memory.zip`, ~26 KB). Para cargarla en cualquier sesión usar la skill `learning-memory` o:

```
python learning/scripts/restore_memory.py summary   # esquemas verificados + lecciones
```

Reglas aprendidas (no romperlas): API directa > búsqueda web para datos numéricos; pedir campos crudos exactos; el tipo de comparación viene de la verdad; PowerShell 5.1 rompe JSON en argv (usar Write).

## Recursos IA generativa desde cero (14/08/2026)

Verdad verificada 8/8 PASS en `learning/truth/truth_ai_gen_resources.json` (fuente: AI mode de Google
`share.google/aimode/85V1fon3WxWeePSAN`). Encaminamiento para entrenar el Gen-Engine de OMAG:
- Teoría: arXiv 2208.11970 (unified diffusion: VDM/3 objetivos/Tweedie) → 2006.11239 (DDPM fundacional) → 2210.02747 (flow matching, OT) → 2206.00364 (EDM, 35 NFE) → 2307.01952 (SDXL latente).
- Código: lucidrains/denoising-diffusion-pytorch (base entrenamiento, Unet1D audio), karpathy/makemore (pedagogía Bigram→Transformer), NVlabs/edm (repo oficial, CC BY-NC-SA 4.0).
- Roadmap F5 (E0–E5) documentado en CreationsApp `04-pipeline-ultraia/plan-de-implementacion.md`.

## Health Stack

- typecheck: npm run typecheck (tsc --noEmit core + web)
- lint: npm run lint (next lint)
- test: npm run test (vitest run, core)
- build: npm run build (production build)
- start: python start.py (setup + web + webhooks en un comando)

## Diseño & motion (13/08/2026)

- Fuentes de verdad: `DESIGN.md` (diseño), `docs/design-dna.json` (DNA), `apps/web/MASTER.md`
  (motion, stack-aware) y skill `.opencode/skills/ultraia-design-system/`.
- Tokens "Dark Obsidian" en `@theme` (globals.css): canvas `#08080a`, panel `#111115`, primary
  `#8b5cf6`, border-subtle `#1f1f2a`; acentos de modalidad inmutables (video/audio/text/code/web).
  Paleta Neo Violet (uxintace) como `--color-neo-100..700` + utilidades `.gradient-neo-text`,
  `.gradient-neo-frame`, `.glow-neo`, `.neo-aura` (aplicadas en landing y `/recursos`).
- Tipografía: Inter (funcional) + Plus Jakarta Sans (display/chat) + JetBrains Mono (mono) —
  NO usar Inter para display (anti AI-slop).
- Motion: GSAP 3.15 + lottie-react en apps/web. Reglas: `gsap.context()` en `useLayoutEffect`,
  `gsap.matchMedia()` para prefers-reduced-motion (CSS y JS), animar solo transform/opacity,
  micro-interacciones 100-250ms con `transition-colors duration-200`, entrada de listas con
  `--animate-chat-enter` + delay por índice (cap 240-480ms), loaders >5s con Lottie local en
  `src/animations/` (nunca `public/`), typing indicator = `.typing-dot`, streaming = `.stream-caret`.
- Lottie reduced-motion: pausar con `lottieRef.current.pause()` en `PendingLoader`.
- Roadmap diagram: client component, DrawSVGPlugin + ScrollTrigger (`top 80%`, once).
- Revisar `apps/web/MASTER.md` §7 (checklist design-audit) antes de tocar UI.
- QA navegador headless: `node C:\Users\UTEC-5695\.claude\skills\browser-automation\browser.mjs`
  (NOTA: `--script` con rutas absolutas falla en Windows — usar `--eval` con IIFE async).
