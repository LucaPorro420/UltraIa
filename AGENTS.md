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
- **start.py robustecido (14/08/2026)**: `python_exec()` ahora devuelve un **argv** (list[str]) del
  PRIMER intérprete que importa fastapi+uvicorn (probe `python -c "import fastapi, uvicorn"`):
  sys.executable → `python` → `py -3.12` → `py -3.11` → `py`. En esta máquina resuelve a
  `["py", "-3.12"]` (Python 3.12.10; el `python` del shell es 3.14 y NO tiene uvicorn — la nota
  anterior que decía lo contrario era falsa). `tool_version()` acepta str|list. Linters a correr:
  `python -m ruff check start.py`, `python -m pylint start.py --score=no`,
  `python -m pyright start.py`, `python -m pyflakes start.py` (0 issues, verificado 14/08/2026).
  `http_ok()` trata 404 como "servidor vivo" (el webhook server no tiene ruta `/`).
  `wait_healthy(url, service, proc)` distingue "proceso murió antes de responder" vs "no responde".
  `terminate()` mata el ÁRBOL completo en Windows (`taskkill /T /F`) — clave para no dejar `next dev`
  huérfano (el `terminate()` antiguo solo mataba npm.cmd y dejaba 2 dev servers duplicados).
  `deps_outdated()` corre `npm install` si node_modules falta o si package-lock es más nuevo que
  `node_modules/.package-lock.json` (ya no instala solo si node_modules no existe → refleja deps nuevas
  como `three`). `check_prereqs()` valida VERSIONES (node >= 20, python >= 3.10), no solo existencia.
  Fallo en health-check o muerte de un servicio → `sys.exit(1)` (fail-hard) + shutdown limpio.
  `--deploy` corre `npm run build` + imprime guía de hosting gratuito (ver `DEPLOY.md`).
- **start.py + gen-engine (14/08/2026)**: nuevo flag `--gen-engine` (solo engine) y el run full
  (`python start.py`) levanta web :3000 + webhooks :8000 + gen-engine en **:8100** (nunca choca con
  webhooks). `gen_engine_url()` lee `GEN_ENGINE_URL` de ROOT/.env (default `http://localhost:8100`);
  `write_gen_engine_env()` escribe `GEN_ENGINE_URL` en apps/web/.env si falta o está vacía para que
  `instrumentation.ts` active los providers al boot. `--check-connections` incluye `report_gen_engine()`.
  VERIFICADO end-to-end 14/08: `python start.py --gen-engine` levanta uvicorn (py -3.12) en :8100,
  `/health` 200 y `POST /generate/tts` devuelve edge-tts real; `taskkill /T /F` mata el árbol completo
  (start.py → py → uvicorn). Linters start.py: ruff/pylint/pyright/pyflakes 0 issues.
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

## integracionTecno.txt (14/08/2026)

Verdad verificada 9/9 PASS en `learning/truth/truth_tecno_recursos.json` (fuente: AI mode de Google
`share.google/aimode/I6dSNWjGoPy4g6suJ`). `integracionTecno.txt` estructurado con URLs oficiales:
- Video con IA: Gemini Omni Flash + Veo 3.1 (ai.google.dev/gemini-api/docs/video, 4K/audio nativo/SynthID),
  CapCut Seedance 2.5 (capcut.com/features/seedance-2-5-for-video-editor, 30s 4K nativo, 50 refs, R2V, 180s beta),
  OpenCut (MIT, rewrite Rust: Editor API + MCP server + headless; usable en opencut-classic).
- OSS Netflix/Spotify: Titus (Apache 2.0, ARCHIVADO 2022 — solo referencia), Backstage (34k stars, CNCF Incubation).
- Toolkits AI: Databricks AI Dev Kit (installer unificado install.sh/ps1 + MCP 40-50 tools; skills vía `databricks aitools install`),
  ColinEberhardt/awesome-ai-developer-tools.
- Video por código: Remotion (55.7k stars; ⚠ licencia propia: gratis <3 empleados, Automators $0.01/render),
  OpenShorts (MIT, Docker: largo→9:16 con whisper+PySceneDetect+Gemini+MediaPipe+FFmpeg; MCP+API+CLI).
- Decisiones: Veo/Seedance = providers premium de video del Gen-Engine; OpenShorts = pipeline 9:16 self-host;
  OpenCut headless+MCP = editor automatizable; patrón Databricks para distribuir skills de los agentes admin.

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
## G0DM0D3 integration (14/08/2026)

- **Vendored**: vendor/G0DM0D3 (AGPL-3.0, sin .git) - referencia del repositorio
  elder-plinius/G0DM0D3 (godmod3.com es el spin-off comercial de crypto, NO el repo).
- **Port** (packages/core/src/tools/g0dm0d3.ts): implementacion ORIGINAL de los conceptos
  (nada de codigo copiado, attribution header). Parseltongue: 33 tecnicas de ofuscacion
  (tiers light 11 / standard 22 / heavy 33, triggers detectados en el query, maps
  LEET/UNICODE/SEMANTIC/MORSE/BRAILLE). AutoTune: 20 contextos con regex + perfiles de
  sampling (temperature/top_p/top_k/penalties), blending hacia balanced si confidence < 0.6,
  boost + repet. penalty si history > 10. Scoring: isRefusal (patrones de rechazo),
  countHedges, scoreResponse (largo/estructura/keywords/numeros), compositeScore
  (quality x filteredness x speed, grades ELITE 90 / EXCELLENT 80 / GOOD 70 / ACCEPTABLE 60 / POOR).
  Races: ultraplinian (N passes = tiers fast 12 / standard 27 / smart 41 / power 53 / ultra 60,
  12 angulos de evaluacion ciclados) y godmodeClassic (5 combos BOUNDARY/CONCISE/STRUCTURED/
  EXPLORATORY/FAST en paralelo) - ambos usan resolveModel() del proveedor configurado
  (openai/google/ollama/lmstudio/deepseek), NO OpenRouter.
- **Tools de agente**: capability `g0dm0d3` en ai/llm.ts -> g0_parseltongue, g0_autotune,
  g0_ultraplinian, g0_godmode. Export en tools/index.ts (+ descripcion y namespace).
- **Tests**: g0dm0d3.test.ts 29 tests (mocks de `ai`/`resolveModel` como skills.test.ts).
  Verificado: typecheck/lint OK, core 218/218 PASS, build OK.

## Fase Desktop (15/08/2026)

- **@ultraia/runtime** (packages/runtime, TS puro sin deps nuevas): Fase A del plan Desktop
  (desktopFase/ARCHITECTURE.md) implementada y verificada. Runtime local: UltraRuntime
  (orquestador), UltraPaths (layout .ultraia/ de 9 directorios), UltraConfig (secretos
  enmascarados en disco, secret() en memoria), UltraLogger (sinks console json|text +
  memoria, child()), UltraEventBus (wildcards * y modulo.*), TaskManager (prioridades 0-5,
  cancelacion cooperativa con AbortSignal), ModuleRegistry (metadata-only, id
  ^[a-z0-9][a-z0-9-]{1,63}$ + version semver-ish, capabilities), ModuleManager (LOAD ONLY
  WHEN NEEDED, lazy, stopAll inverso), ResourceManager (CPU real vía muestreo de busy time
  en win32, warningAt 0.7 / criticalAt 0.85, unloadSuggestions solo en CRITICAL),
  CommandExecutor (allowlist estricto + roles user<operator<admin + niveles
  safe<restricted<admin + allowShell explícito), HealthManager (checks con timeout, estado
  healthy/degraded/unhealthy), Recovery (por módulo: 2 intentos, backoff 1000ms, nunca tumbar
  el runtime), MemoryManager (importancia/confianza, dedup por hash sha256(16), persistencia
  con persistThreshold 0.3, eviction maxEntries 2000, score con recency half-life 7 días),
  ContextSelector (budgetChars 8000 / maxItems 25), Installer (install/uninstall/repair/
  update idempotentes, backup+rollback, prereqs node>=20, offline, nunca sobrescribe .env).
- **Verificación**: typecheck core+web+runtime OK, lint OK, core 218/218 PASS (incluye 29
  tests g0dm0d3) + runtime 132/132 PASS, build OK. LECCIÓN: fallos raros de vitest tras
  editar = caché stale node_modules/.vite (limpiar antes de diagnosticar; afecta core y runtime).
- **Docs**: desktopFase/DESKTOP_ARCHITECTURE.md (fases A-E, Tauri/Electron diferido a Fase D),
  RUNTIME.md (contrato + comandos del sistema), MODULE_SYSTEM.md, MEMORY_SYSTEM.md,
  INSTALLER.md, SECURITY.md (allowlist, 127.0.0.1 + token para la Local API de Fase B).
- **Pendiente Fase B**: Local API HTTP/WS en 127.0.0.1 + token de sesión + origin + rate limit.

## Fase B — Local API (15/08/2026) ✅ IMPLEMENTADA

- **@ultraia/runtime** Fase B completa y verificada: `packages/runtime/src/api/` —
  `ws.ts` (WebSocketConnection: handshake RFC 6455 + framing, MAX_FRAME_BYTES 16 MiB),
  `server.ts` (LocalApiServer + ApiHandlers + ApiError + LocalApiOptions), `runtime-handlers.ts`
  (runtimeApiHandlers(runtime)). Wiring en `runtime.ts`: startLocalApi/stopLocalApi/localApiUrl/
  apiToken; módulo registrado como `system-api` (el patrón de id `^[a-z0-9][a-z0-9-]{1,63}$` NO
  admite puntos → `system.api` inválido); comandos `api.start`/`api.stop` (restricted) y `api.url`
  (safe); `stop()` cierra la API primero. Token `randomBytes(32)` hex, descartado en stopLocalApi();
  comparación timing-safe (sha256 + timingSafeEqual); Host/Origin solo loopback
  (127.0.0.1|localhost|[::1]); rate limit ventana fija default 120 req/min → 429 + Retry-After;
  body cap 64 KiB → 413 con Connection: close; WS `/events?token=` envía {type:'connected'} y luego
  {type:'event', topic, payload, at} con filtro `^(module|task|health|resource|memory|runtime|api)\.`.
  Exports en index.ts: api/ws, api/server, api/runtime-handlers. runtime.test.ts registry.count 2→3.
- **Tests**: api/server.test.ts (11 unit) + api/runtime-api.test.ts (9 integración con UltraRuntime
  real) → runtime 152/152 PASS. Verificación repo completa 15/08: typecheck ✅ lint ✅
  test 370/370 (core 218 + runtime 152) ✅ build ✅.
- **Docs**: desktopFase/docs/IPC.md (contrato Fase B marcado IMPLEMENTADA 15/08/2026),
  ARCHITECTURE.md (Fase B hecha), DESKTOP_ARCHITECTURE.md (B ✅ 152/152), SECURITY.md (raíz y
  docs/ §7 — token timing-safe, origin loopback, rate limit), docs/RUNTIME.md.
- **Pendiente Fase C**: adapters a `@ultraia/core` (db, ai-gateway, tools, omag) vía
  packages/runtime/src/adapters/ con tests por adapter. **Pendiente Fase D**: Shell Desktop.

## AUTO-PUBLICACIÓN (15/08/2026) — plan maestro aprobado

- **Plan**: `docs/AUTO-PUBLICACION.md` — fábrica de contenido: idea → contenido →
  presentación → distribución → métricas → mejora. APROBADO por el usuario; ejecución
  por fases vía loop PIVR (backlog #6–#12 en STATE.md).
- **Base verificada**: publicación real YouTube Shorts + TikTok ya existe en
  `ULTRAIA/integracionesImplementacion/src/publish.py` (RF-12, metadatos bilingües es/ar).
  Agente Publicador (`bp-publicador`) arma el paquete (copy/hashtags/imagen/horario);
  falta el disparo automatizado de publicación (F4).
- **Reglas clave**: keyless-first con degradación elegante; aprobación humana híbrida
  (textos auto; video/imagen por paquete — decisión usuario 15/08/2026); cada canal es
  un adaptador `PublisherAdapter`; cola + calendario en Prisma (D7).
- **Orden recomendado de canales (D1)**: YouTube+TikTok → blog propio (/recursos,
  /gallery) → Meta (IG Reels/Threads, app review) → X API v2 → LinkedIn.
- **Referencias de adaptadores futuros**: vendor `everything-claude-code/skills/x-api`
  (X v2) y `social-publisher` (LinkedIn/IG).
- **F1 Motor de ideas (15/08/2026, iteración 7)**: tool `topics` en
  `packages/core/src/tools/topics.ts` (capability `topics` → tool `topics_briefs`; RSS +
  DuckDuckGo, dedupe bigram Jaccard, score novedad × relevancia de canal, briefs
  `{tema, canal, formato, tono, angulo, fuentes, score}`; 14 tests) + CLI
  `python scripts/topics.py --dry-run` (solo stdlib, mismo esquema de brief, degradación
  elegante por fuente — verificado con HN + Ars Technica). **Tarea 4 (iteración 14)**:
  cola persistente — modelo Prisma `TopicBrief` (estado NUEVO|PROCESADO|DESCARTADO,
  migración add_topic_briefs) + dominio `domain/briefs.ts` (guardarBriefs dedupe tema+canal,
  listarBriefs por score desc, transiciones; 6 tests) + tool `topics_queue`
  (guardar/listar/marcar_procesado/marcar_descartado). Siguiente: F2 tarea 2 (multi-idioma).
- **F3 Presentación unificada (15/08/2026, iteración 8)**: tool `present` en
  `packages/core/src/tools/present.ts` (capability `present` → tool `present_package`):
  `PublicationPackage` {briefId, tema, contenido, media, captionsByChannel (caption +
  hashtags + SRT patrón RF-11), visualByChannel (9:16/1:1/16:9 + thumbnail pollinations),
  horarioSugerido (D2), branding kit Dark Obsidian/Neo Violet}; determinista, keyless,
  13 tests. Pendiente F3: branding kit editable. Siguiente: F4 `PublisherAdapter` +
  YouTube/TikTok en TS (port RF-12).
- **F4 Distribución paso 1 (15/08/2026, iteración 9)**: tool `publish` en
  `packages/core/src/tools/publish.ts` (capability `publish` → tool `publish_submit`):
  `PublisherAdapter` (publish/validate fail-soft) + `createYouTubeAdapter` (resumable v3:
  POST → Location → PUT) + `createTikTokAdapter` (Direct Post 2 pasos: init → PUT) +
  `buildBilingualMetadata` es/ar (port RF-12) + `publishToAll`; tokens vía options o env
  `YOUTUBE_ACCESS_TOKEN`/`TIKTOK_ACCESS_TOKEN`; fetch inyectable, 15 tests con mocks (cero
  llamadas reales). Pendiente F4: cola `Publication` (Prisma) + endpoints + aprobación
  (STATE.md #10).
- **F4 Distribución paso 2 (15/08/2026, iteración 10)**: cola persistente `Publication`
  (Prisma SQLite, migración `add_publication_queue`) + dominio `packages/core/src/domain/
  publications.ts` (createPublication con regla de aprobación híbrida: video/imagen → DRAFT
  con aprobación humana; texto/blog → APPROVED auto; approve/reject/markPublished/
  markFailed/publishDue para el calendario; 15 tests con fake db) + endpoints con auth:
  `GET|POST /api/publications`, `POST /api/publications/[id]/approve|reject|publish`
  (publish fail-soft sin tokens → FAILED con razón; ADMIN o creador). Capability
  `publications` → tool `publication_queue` en llm.ts (usa `opts.db`, Prisma inyectable).
  Pendiente F4: calendario + blog propio (STATE.md #11).
- **F4 Distribución paso 3 (15/08/2026, iteración 11)**: calendario — `POST
  /api/publications/publish-due` (ADMIN) dispara `publishDue(prisma)` (publica APPROVED
  con scheduledAt <= now, fail-soft); página pública `/blog` (server component con
  `listBlogPosts(prisma)` — PUBLISHED/canal blog, tarjetas Dark Obsidian, revalidate 5min).
  Pendiente F4: canales siguientes (Meta/X/LinkedIn).
- **F2 Contenido tarea 1 (15/08/2026, iteración 12)**: enrutador brief→contenido en
  `packages/core/src/tools/enrutador.ts` (capability `contenido` → tool `contenido_generar`):
  `redactar(brief)` (post determinista: título/intro/cuerpo/cierre/CTA por canal, cita
  fuentes), `guionizar(brief)` (guion+storyboard determinista: hook, 5-7 escenas con cámara
  del vocabulario MOTIONS, narración, 45-60s, estilo por tono), `enrutarBrief` (9:16→guion,
  16:9/1:1→texto), `generarContenido(brief,{dir,dryRun,tipo})` → ContentPackage +
  `manifest.json` atómico/idempotente (.ultraia/content/<briefId>/). 16 tests.
- **F2 Contenido tarea 2 (15/08/2026, iteración 15)**: multi-idioma **es/ar** —
  `idioma?: 'es'|'ar'` en `redactar`/`guionizar`/`generarContenido` (plantillas bilingües
  deterministas: CTA_BY_CANAL, CONECTORES, CUERPO_POR_IDIOMA, PLANTILLAS_GUION,
  HOOK_POR_IDIOMA — patrón RF-12) + **TTS edge-tts keyless**: `tts:true` en guiones →
  `edgeTtsAudio` (omag/tts.ts) → `narracion.mp3` (`audioPath`), degradación elegante a
  `null`. Tool `contenido_generar` gana `idioma` + `tts`. 22 tests (6 nuevos).
- **F2 Contenido tarea 3 (15/08/2026, iteración 16)**: **guion largo OMAG 60s+** —
  `guionLargo(brief, idioma, duracionSeg)` (60-180s) → `OmagProject` (Project→Act→
  Sequence→Scene→Shot de omag/project.ts): 3 actos, 7 escenas, shots ~10s MOTIONS,
  `MasterTimeline` sincronizada; `ContenidoTipo` gana `'guion_largo'`, TopicFormat gana
  `'16:9 video'`, enrutarBrief lo mapea; TTS narra hook+escenas → mp3. Tool gana
  `duracionSeg`. 28 tests (6 nuevos). F2 completa (tareas 1-3).
- **F5 Métricas y mejora (15/08/2026, iteración 13)**: KPIs por canal (`tools/metrics.ts`
  `computeChannelKpis`: publicadas/fallidas/pendientes, tasaExito, scorePromedio) +
  endpoint `GET /api/publications/metrics` (ADMIN); media_score pre-pub (`tools/media-score.ts`
  port de media_score.py: `puntuarMedia` 0-25 PASS≥20, `puntuarPaquete` 0-100; createPublication
  persiste mediaScore — migración `add_publication_metrics`); feedback post-pub
  (`registrarFeedback`/`publicationSignals` → critiques BAD para improve.ts) + endpoint
  `POST /api/publications/[id]/feedback` (ADMIN/creador); tool `publication_metrics`
  (capability `metrics`: kpis + signals). 21 tests. Pendiente F5: analytics reales por
  API de canal + promoción automática de agentes vía signals.

## Loop PIVR (Plan ⇒ Implement ⇒ Verificar ⇒ Reiniciar) — 15/08/2026

Harness de desarrollo continuo del proyecto, orquestado por loop-engineering
(`npx @cobusgreyling/loop`, CLI npm v0.1.2 — NO es pip). Archivos del harness:

- `LOOP.md` — configuración del bucle (patrón PIVR, gates, cadencia).
- `STATE.md` — estado vivo: backlog priorizado, High Priority, Watch List, evidencia de verificación.
- `loop-run-log.md` — bitácora de ciclos (P/I/V/R por iteración, commits, tests).
- `loop-budget.md` — límites diarios y kill switch (`loop-pause-all`).
- `loop-constraints.md` — reglas vinculantes del bucle.
- `opencode.json` — agents: `piv-plan` (primary, read-only), `piv-build` (primary, ejecuta+commitea),
  `loop-triage` (primary), `implementer`/`verifier` (subagents); built-ins `plan`/`build` override
  loop-aware.
- `scripts/loop_piv.py` — driver híbrido: ejecuta ciclos vía `opencode run --agent piv-plan|piv-build`
  + gates npm; usable por cualquier modelo/agente.
- `skills/loop-*` (raíz, referencia del scaffold) y `.opencode/skills/loop-*` (cargables) —
  `loop-piv` es el protocolo en-sesión, `loop-verifier` el checker APPROVE/REJECT.
- `.opencode/plans/loop-<taskid>-<slug>.md` — plan file por tarea (plantilla en skill loop-piv);
  piv-build lee el plan DEL ARCHIVO, no del prompt.

### Protocolo del bucle (obligatorio para TODO agente del proyecto)

1. **P — Planificar**: leer `STATE.md` + `learning/LEARNINGS.md` + `loop-run-log.md` +
   `loop-constraints.md`; verificar que la primera tarea sigue `pendiente`; escribir el plan en
   `.opencode/plans/loop-<taskid>-<slug>.md` (plantilla: contexto, objetivo, pasos, ARCHIVOS A
   TOCAR, criterios scoped+FULL, riesgos, esfuerzo) + resumen `[P]` en `loop-run-log.md`. No editar código.
2. **I — Implementar**: leer el plan del archivo; pre-flight `git status --porcelain`; ejecutar con
   las tools del proyecto (workspaces, worktree si aplica); staging EXPLÍCITO (`git add <archivos
   del plan>`, NUNCA `git add .`); commit por iteración con mensaje `feat|fix|chore(scope): <descripción>`.
3. **V — Verificar**: gates en orden CI: `npm run typecheck` → `npm run lint` → `npm run test` →
   `npm run build`. Gates duales: scoped (tests del paquete afectado) en iteraciones intermedias,
   FULL en cada commit. Antes del build: matar dev servers (`taskkill /T /F`). Commit SOLO con
   gates GREEN; si RED → máx 3 intentos, luego escalar a High Priority. Opcional: verifier
   sub-agent (skill `loop-verifier` → APPROVE/REJECT). Registrar evidencia en `loop-run-log.md`
   y `STATE.md` (tarea DONE + commit hash + tests).
4. **R — Reiniciar**: si V=GREEN → siguiente ciclo inmediato (auto plan→build, sin esperar al
   humano); si REJECT → reinyectar el error al plan (máx 3 intentos por ítem, luego escalar a
   High Priority). JSON de presupuesto por ciclo (formato loop-budget). Al terminar el backlog o
   agotar límites → reportar en `STATE.md`.

### Auto-conmutación Plan→Build

- El driver `scripts/loop_piv.py` emite automáticamente la "petición" de build al terminar P
  (`opencode run --agent piv-build "<plan>"` pasando la RUTA del plan file), simulando la
  instrucción del humano. Flags: `--cycles N`, `--gate-only`, `--plan-only`, `--triage`,
  `--no-commit`, `--dry-run`.
- En-sesión: el agente sigue el protocolo sin esperar confirmación (autorización permanente del
  usuario, 15/08/2026), respetando SIEMPRE los gates humanos de push/merge (nunca push automático).
- Kill switch: si `STATE.md` o `loop-run-log.md` contienen `loop-pause-all`, el bucle se detiene.