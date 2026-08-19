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

El bucle PIVR implementa el **bucle IA de 4 fases** (skill `ultraia-request`): cada ciclo es
**Sensado → Razonamiento → Acción → Ajuste**, mapeado así en los puntos del loop:

| Fase IA | Punto PIVR | Qué hace |
|---------|-----------|----------|
| **Entrada (Sensado)** — leer el estado real, leer el problema | **P pasos 1-3 + pre-flight** | Leer `STATE.md` + `learning/LEARNINGS.md` + `loop-run-log.md` + `loop-constraints.md`; lock (concurrency-guard); `git status`; tomar la primera tarea `pendiente`. NUNCA inventar estado |
| **Proceso (Razonamiento)** — elegir la acción, predecir qué pasará | **P pasos 4-5** | Escribir el plan (plantilla ampliada: contexto, objetivo, pasos, ARCHIVOS A TOCAR, RECURSOS/PRESUPUESTO, NO-hacer, criterios scoped+FULL, TOLERANCIAS, riesgos, esfuerzo, prioridad P0-P5) + PREDICCIÓN del resultado esperado + resumen `[P]` en `loop-run-log.md`. No editar código |
| **Ejecución (Acción)** — aplicar la decisión, cambiar el estado | **I pasos 6-11** | Leer el plan del archivo; pre-flight `git status --porcelain`; ejecutar con las tools del proyecto (workspaces, worktree si aplica); staging EXPLÍCITO (`git add <archivos del plan>`, NUNCA `git add .`); commit por iteración con mensaje `feat|fix|chore(scope): <descripción>` |
| **Ajuste (Aprendizaje)** — medir (recompensa/error), guardar el dato, ajustar reglas | **V pasos 12-17 + R pasos 18-21** | Gates en orden CI: `npm run typecheck` → `npm run lint` → `npm run test` → `npm run build`; gates duales (scoped en iteraciones intermedias, FULL en cada commit); antes del build: matar dev servers (`taskkill /T /F`); commit SOLO con gates GREEN (si RED → máx 3 intentos, luego escalar a High Priority); opcional verifier (`loop-verifier` → APPROVE/REJECT); evidencia en `loop-run-log.md` + `STATE.md` (tarea DONE + commit hash + tests) + lección en `learning/LEARNINGS.md`; si V=GREEN → siguiente ciclo inmediato; si REJECT → reinyectar el error al plan (máx 3 intentos por ítem, luego High Priority); JSON de presupuesto por ciclo (formato loop-budget: tokens Y tiempo); al terminar el backlog o agotar límites → reportar en `STATE.md` |

### Auto-conmutación Plan→Build

- El driver `scripts/loop_piv.py` emite automáticamente la "petición" de build al terminar P
  (`opencode run --agent piv-build "<plan>"` pasando la RUTA del plan file), simulando la
  instrucción del humano. Flags: `--cycles N`, `--gate-only`, `--plan-only`, `--triage`,
  `--no-commit`, `--dry-run`.
- En-sesión: el agente sigue el protocolo sin esperar confirmación (autorización permanente del
  usuario, 15/08/2026), respetando SIEMPRE los gates humanos de push/merge (nunca push automático).
- Kill switch: si `STATE.md` o `loop-run-log.md` contienen `loop-pause-all`, el bucle se detiene.
## Fuente de enlaces (enlaces.txt) — 15/08/2026

El usuario deja URLs en `enlaces.txt` (raíz) para que se analicen y se apliquen al proyecto
("utiliza la url de enlaces.txt para mejorar y aprender otro modelo de razonamiento"). Protocolo:
1. Descargar la fuente cruda a `learning/sources/<slug>.md` (curl, idempotente).
2. Analizar (índice de secciones + leer las secciones relevantes; delegar con explore si es grande).
3. Extraer patrones transferibles → `docs/RAZONAMIENTO-<SLUG>.md` (análisis + mapeo implementado/pendiente).
4. Implementar lo accionable como ciclo PIVR (capability/tool/tests) + lecciones en `learning/LEARNINGS.md`.
5. La fuente queda commiteada en `learning/sources/` (precedentes: claude-fable-5-system-prompt.md → capability `memory`; diagram-design.md → capability `diagram`, 17/08/2026; video-use.md + video-use-SKILL.md → capability `video_edit`, 17/08/2026).

## Capability diagram (17/08/2026)

- **Patrón diagram-design** (fuente: enlaces.txt → `learning/sources/diagram-design.md`, análisis `docs/RAZONAMIENTO-DIAGRAM-DESIGN.md`): `packages/core/src/tools/diagram.ts`
  — generador determinista de diagramas editoriales **HTML/SVG autocontenidos** (sin JS, sin deps, offline).
  Kinds: `timeline` / `data-flow` / `architecture` / `loop`; variantes `minimal-dark` (Dark Obsidian)
  y `full-editorial`; tamaños `doc-inline` (800) / `doc-wide` (1200).
- Reglas portadas (testeables): coords/gaps ÷4 (`round4`), hairlines 1px, sin sombras, border-radius ≤10px,
  accent solo en 1-2 focos, a11y (`role="img"` + `aria-labelledby` + `title`/`desc` primeros hijos, IDs
  prefijados por diagrama para inline seguro), sin `<script>` ni recursos externos. 22 tests.
- Registro: capability `diagram` → tool `diagram_render` en `ai/llm.ts` (schema zod con events/steps/nodes/
  edges/hub/stations/writeBacks + variant/size). Export en tools/index.ts (`diagram`).
- Generador: `node_modules\.bin\vite-node.cmd Task/generate-diagrams.ts` → `resultTask/diagrams/`
  (timelines de los 2 motion-specs + pipeline Motion Engine) y `docs/diagrams/` (roadmap-2026,
  desktop-architecture, gen-engine-pipeline + README índice). Regeneración idempotente y determinista.

## Capability video_edit (17/08/2026)

- **Patrón video-use** (fuente: enlaces.txt → `learning/sources/video-use.md` + `video-use-SKILL.md`,
  análisis `docs/RAZONAMIENTO-VIDEO-USE.md`, referencia `vendor/video-use/` sin .git):
  `packages/core/src/tools/video-edit.ts` — port ORIGINAL de los PRINCIPIOS (nada de código copiado,
  attribution header). Superficie de razonamiento: `packTranscript` → takes_packed (~12KB, frases
  `[start-end]` + speaker, break en ≥0.5s/cambio speaker) — el modelo lee, no mira.
- 12 hard rules de producción (HARD_RULES): subtítulos LAST; extract por segmento + concat lossless
  `-c copy`; fades audio 30ms por frontera (`FADE_MS=0.03`); silencios ≥400ms limpios / 150-400ms
  verificables / <150ms inseguros (`silenceSafety`); padding 30-200ms (`paddingOk`); self-eval máx 3
  (`MAX_SELF_EVAL_ATTEMPTS`). `buildEdl` valida in<out, ≥50ms, overlaps (warnOnly opcional);
  `renderFfmpeg` genera argv ffmpeg determinista (grade warm-cinematic/neutral-punch/none por
  segmento, `-movflags +faststart`); `selfEvalEdl` → DURATION_MISMATCH/UNSAFE_CUT/UNSAFE_GAP +
  score 0-100; `timelineViewSvg` → composite SVG editorial Dark Obsidian (a11y, sin JS).
- Registro: capability `video_edit` → tools `video_edit_pack` / `video_edit_edl` / `video_edit_render` /
  `video_edit_selfeval` / `video_edit_timeline` en `ai/llm.ts`. Export en tools/index.ts (`videoEdit`).
- Keyless-first: transcribe con provider configurable (Gemini si `GOOGLE_API_KEY`; si no, captions
  manuales) — nunca inventar timestamps. El render real corre en runner/scripts (ffmpeg instalado),
  nunca en tests.
- Demo: `node_modules\.bin\vite-node.cmd Task/video-edit-demo.ts` → `resultTask/edl/download-{2,5}-mp4/`
  (takes_packed.md, edl.json, render.sh, render.steps.txt, selfeval.json, timeline.svg) + índice en
  `resultTask/README.md`. Tests: video-edit.test.ts 29 PASS.
- LECCIÓN REAFIRMADA (fallo real este ciclo): jamás Get-Content/-replace/Set-Content sobre archivos
  del repo (PS 5.1 colapsa líneas y corrompe UTF-8) — usar la tool Write; no mezclar edit+bash en
  paralelo sobre el mismo archivo.

## Capability screenflow (17/08/2026)

- **ScreenFlow**: pipeline de grabación de pantalla automatizado (petición del usuario): Captura
  (ffmpeg gdigrab segmentado, CRF 18, pista de silencio fallback) → Acciones (ActionScript JSON
  declarativo, `scripts/screenflow/actions.py` con pyautogui + Playwright opcional, fail-soft retry
  máx 3) → Edición (reutiliza `video_edit`) → Publicación local (`.ultraia/recordings/<run-id>/`:
  final.mp4 + master.mkv + final.webm + poster.png + manifest.json + report.md; nomenclatura
  `YYYYMMDD-HHMMSS-<slug>-v<N>.mp4` + `latest.mp4`) → Continuidad (`state.json` resume idempotente,
  retry máx 3, fail-soft, scheduling schtasks/cron).
- `packages/core/src/tools/screenflow.ts` — dominio puro determinista (zod): `validateActionScript`
  (tipos, bounds, duración estimada, anti-runaway 90min), `planRuns` (segmentación por pasos),
  `buildFfmpegCapture` (argv gdigrab), `buildOutputNaming`, `buildManifest`, `scheduleCmd`
  (schtasks/cron), `resolveState` (start/resume/give-up). Tests: screenflow.test.ts 22 PASS —
  CERO ejecución real (argv generation only, --dry-run en el runner).
- Registro: capability `screenflow` → tools `screenflow_plan` / `screenflow_capture` /
  `screenflow_schedule` / `screenflow_state` en `ai/llm.ts`. Export en tools/index.ts (`screenflow`).
- Runner: `node_modules\.bin\vite-node.cmd Task/run_screenflow.ts <script.json> [--dry-run] [--run-id=...]`
  (+ `scripts/screenflow/schedule.ps1` para tareas diarias). Docs: `docs/SCREENFLOW.md`.
- .gitignore: `.ultraia/recordings/`, `logs/`, `screenshots/`.
- Pendiente: allowlist real de `exec` (hoy fail-soft con warning), watch de carpeta `hot/`, y
  conexión opcional con la cola `Publication` canal `'local'` para métricas.

## Capability cloud + nube gratis 2026 (17/08/2026)

- **Pedido del usuario**: cloud + dominio gratis + app review + mejoras de coste; "haz todas"
  (stacks Cloudflare/Vercel/Supabase + híbrido; dashboard + nube personal de archivos; guías + MVP
  en paralelo). Commit `046dfcf` — 17 archivos, 1866 insertions.
- **`packages/core/src/tools/cloud.ts`** — dominio puro determinista (patrón screenflow): `CloudError`,
  `EXT_TYPES` (41 extensiones en 7 categorías), `MIME_BY_EXT`, `MAX_UPLOAD_BYTES` 100 MiB,
  `CLOUD_LAYOUT` (9 carpetas), `isSafePath` (canónico minúsculas, sin `..`/`\`/nulos), `normalizeCloudPath`,
  `sanitizeFileName` (espacios→guiones, quita guiones antes Y después de puntos, slice 240),
  `classifyFile`, `validateUpload`, `humanSize` (unidades **binarias** KiB/MiB/GiB — 100 MiB = "100 MiB"),
  `planCloudLayout`, `buildCloudManifest`, adapters `InMemoryCloudAdapter` / `LocalCloudAdapter`
  (escritura atómica tmp+rename, fail-soft list/read/stat, list recursivo ≤4 niveles) /
  `R2CloudAdapter` (fetch inyectable, Bearer, PUT/DELETE/HEAD, publicUrl opcional), `CloudService`
  (upload→drafts por defecto, list/manifest/remove/stat), tool `cloud_files` (op
  list/upload/read/remove/stat, contentB64) + `createCloudFilesHandler(adapter)`. Tests: cloud.test.ts
  **27 PASS** (antes 31: 4 colapsados por raza de borrado; contador real 27).
- **API web (auth)**: `GET /api/cloud/status` (estado de proveedores local/r2/supabase/vercel, NUNCA
  secretos, presupuesto $0/mes) · `GET|DELETE /api/cloud/files` (lista + manifest; DELETE body {path})
  · `POST /api/cloud/upload` (multipart File + dir, 413 >100 MiB). Página `/cloud` (dark obsidian):
  `cloud-client.tsx` con drag&drop, stats (archivos/almacenado/tipos), copiar ruta, borrar, 3 guías.
  `humanSize` duplicado local en el client (cloud.ts usa `node:*` → NO importable desde client bundle).
  Nav: entrada `Cloud` (lucide Cloud) tras Builder. tsconfig web: alias `@ultraia/cloud` →
  `../../packages/core/src/tools/cloud.ts`.
- **`docs/CLOUD-FREE-2026.md`** — guía con datos VERIFICADOS 17/08/2026 (websearch): Cloudflare
  Workers 100k req/día + D1 5GB + R2 10GB egress $0 + dominio `.pages.dev` = $0 estable SIN cláusula
  comercial; Vercel Hobby = **"no commercial use"**; Supabase Free = 500MB Postgres + 1GB files +
  5GB egress + 50k MAU, **auto-pausa 7 días** + sin backups; Render Free = spin-down 15min + cold
  starts 30-60s + **Postgres gratis expira a los 30 días**; **X API v2 Free = 17 posts/24h POR APP**
  (el 1,500/mes era API 1.1 legacy) sin app review; **Meta/IG: app review NO requerida para negocio
  propio** (Standard Access, docs updated 2026-06-30; `instagram_business_content_publish` +
  `instagram_basic`; límite de duplicados subió en 2026); TikTok Content Posting API = aprobación
  humana; YouTube OAuth canal propio OK; LinkedIn pendiente de verificar. Parts 1-7: registro
  Cloudflare/Vercel/Supabase/Render + dossier app reviews + plantilla .env + presupuesto $0.
- **`cloudflare/`** — `worker.ts` R2 stateless (contrato GET/HEAD/PUT/DELETE `/files*`, Bearer
  CLOUD_TOKEN, CORS, límite 100 MiB) + `wrangler.toml` + `README.md` (deploy: `npx wrangler deploy`).
  `.env.cloud.example` (todo comentado, nada obligatorio). `.gitignore` + `.ultraia/cloud/`.
- **Wiring DIFERIDO (High Priority)**: registro de capability `cloud` en `ai/llm.ts` + export en
  `tools/index.ts` NO se hizo — `llm.ts`/`index.ts` estaban sucios por la sesión concurrente #25
  (recorder/automation) y commitearlos habría incluido refs a archivos ajenos. `cloudTools` +
  `cloudFilesTool` + `createCloudFilesHandler` ya exportados para wiring trivial post-#25.
- **Gates 17/08**: typecheck ✅ lint ✅ test **655/655** (core 462 incl. 27 cloud + runtime 193) ✅
  build ✅ (39 páginas, `/cloud` en manifest). LECCIÓN CONFLICTO: la sesión concurrente #25 borró los
  archivos cloud 5+ veces (también `.next` corrupto → TS6053). Mitigación: watcher de restauración
  en %TEMP% (backup + restore ≤2s) + commit apenas gates verdes. Si vuelve a pasar: coordinar
  sesiones con el usuario. LEY: `git add` explícito de 17 archivos (nunca `.`), NO tocar archivos
  de la sesión concurrente (recorder/automation/docs AUTOMATION-WEB/RAZONAMIENTO-MEDIA-AUTOMATION/
  web-automation.py/launcher.mjs/plans loop-26/STATE.md/run-log/DOCS_TODO/enlaces.txt).
- **Pendiente loop-25**: conectar `/cloud` con la cola `Publication` (subir paquete listo desde
  publicaciones → media/videos) y con la capability `video_edit` (guardar EDL/renders); docs
  mini-guía en `docs/CLOUD-FREE-2026.md` Part 8 (acceder al cloud por CLI/agentes).
- **Cloud CLI + tareas diferidas (17/08/2026, iteración 28 `b152b40`)**: `scripts/cloud-cli.py`
  (stdlib puro: layout/list/upload/remove/stat/manifest/self-test; réplica del contrato cloud.ts
  — 42 extensiones en 7 categorías, layout 9 carpetas, límite 100 MiB, humanSize binario;
  verificado: ruff/pyflakes/py_compile OK, self-test 25/25) + `scripts/cloud-cli.test.py`
  (suite e2e 11/11, tempdir aislado, `py -3.12 scripts/cloud-cli.test.py`) + `docs/CLOUD-CLI-GUIDE.md`
  (la "Part 8" en archivo propio, sin tocar CLOUD-FREE-2026.md). Wiring de la capability `cloud`
  COMPLETO por sesión concurrente (`7315d4d`: llm.ts + index.ts — NO duplicar; evidencia en
  `docs/TAREA-WIRING-CLOUD.md`). **Comando `pull` (iteración 29 `f2e2b5b`)**: descarga cloud→disco
  (destino archivo/carpeta/cwd, dry-run, fail-soft, atómico) — e2e 16/16. **Tareas loop-25
  APLICADAS (iteración 30, autorización usuario)**: `guardarPaqueteEnCloud` en publications.ts
  (respaldo media+paquete JSON en cloud inyectable; targetPath por tipo vía CLOUD_DIR_BY_EXT —
  CORRECCIÓN: CloudService.upload sin targetPath va a drafts, NO clasifica; bd71299, 26/26) +
  `guardarEdicionEnCloud` en video-edit.ts (EDL/self-eval/timeline → exports/edl, render →
  media/videos; d548e2f, 32/32) + wiring `POST /api/publications` con CloudService (R2 si env,
  si no local `.ultraia/cloud`; e30bd89). LECCIÓN: JSDoc `/**` con `//` internos no cierra el
  bloque — tsc se traga la definición; usar `//` puros. **Pendientes cloud loop-25: CERO**.
  CORRECCIÓN: EXT_TYPES tiene **42** extensiones (no 41 — el texto de TOOL_DESCRIPTIONS en index.ts heredó el número viejo).

## Capability harness (17/08/2026, iteración 34 `325aab6`)

- **Patrón deepseek-harness** (fuente: enlaces.txt → `learning/sources/deepseek-harness.md`, repo
  deepseek-ai/deepseek-harness MIT; análisis `docs/RAZONAMIENTO-DEEPSEEK-HARNESS.md`):
  `packages/core/src/tools/harness.ts` — port ORIGINAL de los PRINCIPIOS ("everything is a plugin").
- `createHarness` (boot con validación de dependencias topológica Kahn, `run`, `tick` con reloj
  inyectable, `shutdown` inverso fail-soft con unwind y dump), `defineSeam` (register/resolve),
  plugins `echoTool` + `counterScheduler`, state namespaced por plugin, efectos reversibles
  trackeados para unwind. Tool `harness_manage` (acciones boot/run/tick/dump/shutdown; runtime
  PERSISTENTE por sesión). 19 tests. Lección: el runtime de la tool debe vivir en el scope que
  persiste entre llamadas (fuera del execute) — declararlo dentro shadowea y TS narrowing
  degenera a 'never'.
- AutoPub F4 wiring canal X (iteración 33 `4a0aa78`): `createDefaultPublishers({includeX})`
  retrocompatible, `publishDue` con X, tool `publish_submit` con `toX` — canal X completo (4/4).
- AutoPub F4 paso 5 (iteración 35 `b28b0a9`, sesión principal): adapters Meta —
  `createInstagramAdapter` (Graph API v21 container flow REELS: media→media_publish, caption cap
  2200) + `createThreadsAdapter` (Graph API v1.0: threads→threads_publish, text cap 500) +
  `PublishInput.videoUrl?` + helper `formBody` + tokens env `IG_ACCESS_TOKEN`/`IG_USER_ID`/
  `THREADS_ACCESS_TOKEN`/`THREADS_USER_ID` + 13 tests (43/43 scoped). Meta sin app review para
  negocio propio (verificado en CLOUD-FREE-2026.md).

## Capability growth (17/08/2026, iteración 36 `2212389`)

- **Patrón VidRush + Abacus.AI** (fuentes: enlaces.txt URLs nuevas → `learning/sources/vidrush-ai.md`
  + `abacus-ai.md` compactas; análisis `docs/RAZONAMIENTO-VIDRUSH-ABACUS.md`). Ambos convergen en:
  **perfil de canal → experimentos de UNA variable → playbook que compone victorias** (VidRush
  "Modeled on your channel" + aprobación del plan antes de generar; Abacus "Autonomous YouTube
  Influencer Agent").
- `packages/core/src/tools/growth.ts` — dominio puro determinista (zod): `analyzeChannel(samples)`
  → `ChannelProfile` (pacingAvgSeg, cutCadence, onScreenTextDensity, hookLengthAvg, thumbnailStyle
  clasificado texto-grande/closeup/comparativo/mixto); `planExperiments(perfil, kpis, max)` —
  UNA variable por experimento, peor KPI primero, hipótesis/control/test/decisionRule (+5 pts);
  `buildPlaybook(canal, signals)` — victoria = test > control +5, pares control/test SECUENCIALES
  (cada par = 1 experimento, `Math.min` de longitudes), peso acumulado por victoria, dedupe por
  canal+recomendación, orden por peso desc. 19 tests.
- Registro: capability `growth` → tool `growth_plan` (acciones profile/experiments/playbook) en
  `ai/llm.ts`. Export en tools/index.ts (`growth`). Cierra el pendiente F5 de AutoPub (promoción
  vía signals) en dominio puro — `buildPlaybook` se alimentaría de `publicationSignals`.

## Capability telegram + APIS-GRATIS-2026 (17/08/2026, iteración 37 `e8a11e1` + wiring `5fc19ea`)

- **Patrón OpenClaw** (fuente: enlaces.txt → `learning/sources/openclaw.md`, MIT ~387k stars,
  análisis `docs/RAZONAMIENTO-OPENCLAW.md`). OpenClaw = agente personal con Gateway local
  (valida la Fase B del runtime: token auto-generado, loopback, input no confiable) + canales
  de mensajería. Pedido del usuario: **lista de APIs gratuitas verificadas** →
  `docs/APIS-GRATIS-2026.md` (Telegram Bot API GRATIS total verificado 2026: mensajes
  ilimitados, uso comercial, video 50MB, storage gratis con file_id; Discord/Slack gratis;
  **WhatsApp NO**: marketing $0.025/msg US, free tier 1000 conv/mes DEPRECADO; keyless ya
  integradas: pollinations/edge-tts/Tunetank/DDG/r.jina/Exa; opcionales Brave 2000/mes,
  Firecrawl 500/mes, ElevenLabs 10k/mes).
- `packages/core/src/tools/telegram.ts` — `createTelegramAdapter` (implementa
  `PublisherAdapter`: publish/validate fail-soft, fetch inyectable, options con precedencia
  `??` sobre env `TELEGRAM_BOT_TOKEN`/`TELEGRAM_CHAT_ID`); `buildMultipartBody` (multipart
  manual sin deps, boundary + CRLF), `truncateCaption` (1024 chars sin cortar pares
  surrogate), `buildTelegramCaption` (bilingüe es/ar), cap 50MB, 429 → `retry_after` en
  reason. 21 tests.
- **Wiring COMPLETO**: union `PublishPlatform` + 'telegram' · `createDefaultPublishers
  ({includeTelegram})` · tool `publish_submit` con `toTelegram` (rama switch) · export
  `createTelegramAdapter` en namespace publish · markPublished fluye (PublishResult).
- **Canal en la cola Publication (iteración 39)**: `TopicChannel`/`PresentChannel` ganan
  `'telegram'` (topics/present: FORMAT_BY_CHANNEL '9:16 video', HORARIO_SUGERIDO
  'mar/jue/sab 18:00', captionFor cap 1000, visualFor 9:16 sin srt); `CANALES_CON_APROBACION`
  + telegram (video → DRAFT humano); `publishDue` con `includeTelegram: true`; z.enum CANALES
  + telegram en `/api/publications`; canal es String en Prisma (sin migración). 158/158 scoped.
- **Adapters Discord + Slack (iteración 41)**: `tools/discord.ts` (`createDiscordAdapter`:
  webhook env `DISCORD_WEBHOOK_URL` validado `/api/webhooks/{id}/{token}`, multipart
  `file`+`payload_json`, límite 10 MiB gratis/25 boost, caption cap 2000, 204→ok) +
  `tools/slack.ts` (`createSlackAdapter`: bot `xoxb-` env `SLACK_BOT_TOKEN` + `SLACK_CHANNEL`,
  `files.upload` Bearer multipart file+channels+title+initial_comment, límite 1 GiB, caption
  cap 4000, JSON `{ok,error}` fail-soft). Union `PublishPlatform` + discord/slack ·
  `createDefaultPublishers({includeDiscord, includeSlack})` · `CANALES_CON_APROBACION` +
  discord/slack (video → DRAFT) · TopicChannel/PresentChannel + discord/slack (9:16,
  horarios 'lun/mie/vie 19:00'/'mar/jue 09:00'). 17+17 tests. WIRING COMPLETO (iteración 42):
  tool `publish_submit` con `toDiscord`/`toSlack` (ramas switch + includeDiscord/includeSlack)
  + descriptor publish 8 plataformas en index.ts + enrutador CTA_BY_CANAL es/ar exhaustivo.
  96/96 scoped (telegram 21 + publish 48 + publications 27).
- **Guía operativa (iteración 44)**: `docs/CANALES-CONFIG-2026.md` — tabla resumen
  canal/variables/coste/dónde + paso a paso por canal (Telegram BotFather, Discord webhook,
  Slack app, YouTube OAuth2, TikTok, X, Meta IG/Threads sin app review) + cómo probar
  (API cola / publish_submit / adapter aislado vite-node). `.env.example` raíz con las 13
  variables exactas (verificadas contra `process.env.*` de los adapters; X solo
  `X_ACCESS_TOKEN`).
- NOTA coordinación: el wiring se hizo cuando la sesión concurrente liberó
  publish.ts/llm.ts/index.ts (su wiring Meta `a223417`); antes, los archivos estaban sucios.
- Pendiente: canal enum Prisma para programar Telegram por cola; adapters discord/slack;
  TikTok @studioeditionoficial (enlaces.txt 811) — página anti-bot (solo referencia).

## App móvil + capability codevfx (17/08/2026, loop-45 `f106546` + `b4d7695`)

- **App móvil Android/iOS (pedido usuario)**: `apps/mobile` — Expo SDK 57 (RN 0.86,
  expo-router, TypeScript), workspace `@ultraia/mobile`, tema Dark Obsidian, token en
  SecureStore. Cliente de la API REST de apps/web (NO importa `@ultraia/core` — Metro no
  resuelve `node:*`). Pantallas: login/registro, dashboard KPIs, cola publicaciones
  (aprobar/rechazar), cloud, blog. Correr: `npm run dev` (web) + `npm run mobile` (expo
  start; QR con Expo Go; base URL auto: `EXPO_PUBLIC_API_URL` o hostUri+3000). Guía:
  `docs/MOBILE.md`. Build: EAS free tier (iOS IPA diferido — requiere Apple Developer
  $99/año, decisión usuario).
- **Auth REST nuevo en web**: `POST /api/auth/login|register` → `{token, expiresAt, user}`
  (token opaco `createSession`, TTL 30 días) + `GET /api/auth/me`. `getCurrentUser(req?)`
  en `apps/web/src/lib/server/context.ts` acepta header `x-ultraia-session` (o
  `Authorization: Bearer`) con fallback cookie `ultraia_session` → TODAS las APIs existentes
  sirven al móvil.
- **npm overrides ELIMINADOS del root** (npm no soporta overrides por workspace; rompía
  mobile): apps/web declara `react@19.1.0` exacto, mobile `react@19.2.3` (RN 0.86). react
  duplicado en el monorepo es INTENCIONAL (expo-doctor lo marca 20/21, ignorar).
- **Capability codevfx** (patr�n Elemental Sandbox VFX � fuente: enlaces.txt Instagram
  DcJDsghiJne ? repo achrefelouafi/LinearAbiltyCastingThreeJS MIT; an�lisis
  docs/RAZONAMIENTO-CODEVFX.md): packages/core/src/tools/codevfx.ts � port ORIGINAL de los
  PRINCIPIOS (nada de c�digo copiado, attribution header): efectos 100% c�digo sin
  texturas/sprites/meshes. planEffect(kind, {intensity, speed}) ? 9 kinds (fire/ice/
  lightning/meteor/beam/ground + void/plasma/frost) con paleta base/acento/energ�a, f�sica
  (gravedad/viento/fricci�n � fuego sube, beam no cae), part�culas escaladas por intensidad,
  GLSL hand-written por kind y hotkeys Q/W/E/R/F/X/V/C/B; colorimetryAnalyze (HSL + calor +
  coherencia: spread sat =35 y calor =1.2 + dominante por luminancia); curvatureShade (0-1,
  luz/lightDir); perspectivePlan (fov desde distancia + offsets parallax por capa);
  renderEffectHtml ? HTML5 canvas autocontenido (sin URLs, GLSL como comentario, reacciona a
  pointermove + hotkey). Registro: capability codevfx ? tool vfx_code (acciones plan/
  colorimetria/curvatura/perspectiva/render) en ai/llm.ts. Export en tools/index.ts (codevfx).
  Demo: node_modules\.bin\vite-node.cmd Task/codevfx-demo.ts ? resultTask/codevfx/ (plans,
  colorimetria, curvatura, perspectiva + effects/*.html �9). Tests: codevfx.test.ts 29 PASS.
- LECCI�N 45: npm overrides de react en root rompen el workspace mobile (npm no soporta
  overrides por ruta); cada app declara su react exacto. Metro no resuelve node:* ? el m�vil
  replica los tipos de la API en src/api/types.ts. expo-doctor marca la duplicaci�n react
  (web 19.1.0 / mobile 19.2.3) � intencional en monorepo. Red puro HSL: el hue del rojo
  puro es 0, no 340 (test corregido).

## Ronda de consolidación + travel (18/08/2026, loop-46 `78d25e0` `85c1d26` `9fed227`)

- **Push histórico**: `git push origin master` — 110 commits locales (todo el backlog de
  agosto, incl. los fixes de la sesión concurrente #25) ahora en GitHub
  (github.com/LucaPorro420/UltraIa, rama `master`). Ronda: gates FULL verdes + 3 commits
  propios + push (decisión usuario: push directo ahora; PR draft para features grandes
  en adelante).
- **Fix BodyInit (`78d25e0`)**: `buildMultipartBody` de telegram/discord/slack devuelve
  `Uint8Array` y el fetch usa cast `body as unknown as NonNullable<RequestInit['body']>` —
  `BodyInit` NO existe en core (tsconfig core: `types:["node"]`, `lib:["ES2022"]`); en web
  (lib DOM/ES2022) `Buffer<ArrayBufferLike>`/`Uint8Array<ArrayBufferLike>` no son asignables
  a `BodyInit`. Web typecheck lo exige. (b601ec5 de #25 ya había quitado las extensiones
  `.js` de esos imports — causa original de raza con el dev server.)
- **repomix (`85c1d26`, L825)**: `npm i -D repomix@1.18.0` + script npm `repomix`
  (`--include "packages/core/src,packages/runtime/src,apps/web/src,apps/mobile/src,scripts,Task,start.py"`)
  — empaqueta el repo completo en `repomix-output.xml` (~505k tokens, 336 archivos) para
  dar contexto a cualquier LLM; respeta .gitignore, security check automático (excluye
  p.ej. slack.test.ts por su token de prueba). Output NUNCA commiteado
  (`.gitignore`: `repomix-output.*`). Guía: `docs/REPOMIX.md`.
- **Capability travel (`9fed227`, pedido usuario "tomas de paisajes - videos de viajes")**:
  `packages/core/src/tools/travel.ts` — dominio puro determinista: `planTravelVideo(destino,
  {idioma es/ar, estilo aventura/relax/cultura/naturaleza, duracion 30-60s, escenas 3-7})`
  (hook + escenas con MOTIONS del vocabulario canonico + prompts de imagen 9:16 + narracion
  bilingue + CTA + musica sugerida), `buildTakeManifest` (tomas guardadas de historias ->
  `.ultraia/travel/tomas/<slug>/manifest.json`, slug idempotente), `buildTravelRender` (argv
  ffmpeg determinista: Ken Burns zoompan por escena + xfade encadenado + narracion edge-tts
  + BGM 0.25 -> `travel-<slug>.mp4`, emite render.sh/steps/manifest), `replicateLandscape`
  (N variaciones hora x clima x lente -> URLs pollinations keyless), `travelLeadImage` (still
  9:16). Tool `travel_plan` (acciones plan/toma/render/replicar/lead) en ai/llm.ts bajo
  capability `travel` + export en tools/index.ts (`travel`, `slugifyDestino` — NO usar
  `slugify`/`RenderOptions`: colisionan con present/video-edit). 18 tests.
- **Verificaciones enlaces.txt (18/08)**: L676 tomassporro = perfil IG de paisajes
  (anti-bot, login wall — fuente de tomas, alimenta travel); L678 melisaescobart_ = video
  promocional de VidRush (ya analizado, growth); L793/795 wearebrand.io = marketing web
  (nada accionable); L683/L686/L689/L797/L800 = recursos dev/design (PDFs, certificados,
  doodle pack, fonts — nada accionable); L821 Db_CpPGJxpE = Kage (Three.js scroll-world de
  Meng To, open-source + AI coding skills) -> `learning/sources/kage-threejs.md` +
  `docs/RAZONAMIENTO-TESTTASKSKILLS.md`, aplicacion pendiente en Watch List (landing
  mundo 3D por seccion — decision de producto).
- **Concurrencia #25 (reglas confirmadas esta ronda)**: la sesion concurrente sigue viva
  (commiteo `8ae11bf`/`68f23eb` durante gates). Su WIP (automation/recorder/reach/blueprint/
  shared) tiene 5 tests rojos conocidos y errores TS propios -> aislar a
  `%TEMP%\opencode\wip-quarantine-20260818\` durante gates FULL y restaurar con hash-check
  despues (worktree == index == WIP). Los test files untracked NO quedan en el manifest —
  copiarlos tambien (mismo dir, hash por Get-FileHash). `.next` corrupto recurrente por raza:
  matar node.exe + `Remove-Item .next` antes de cada build; a veces requiere 2 intentos.
LEY: `git add` explicito (nunca `.`), NO tocar DOCS_TODO/blueprint/reach/automation/
   recorder/plans loop-46 ni los untracked de #25 (docs/AUTOMATION-WEB.md,
   docs/RAZONAMIENTO-{GAME-DEV,MEDIA-AUTOMATION}.md, scripts/web-automation.py, ...).
   POST-COMMIT HOOK: `[doc-reminder] anotados N archivo(s) en DOCS_TODO.md` corre solo.

## Skills inventory (18/08/2026, iteración 62)

- `docs/SKILLS-INVENTARIO.md` — inventario completo clasificado: **recomendadas**
  (harness loop-* + ultraia-request + capability skills) / **condicionales** (gstack
  plan/qa/design/investigate/ship — usar según contexto) / **evitadas**.
- **`.opencode/skills-avoid/`** — cuarentena de skills globales evitados: 15 copias de
  referencia de SKILL.md (ios-*, benchmark-models, pair-agent, open-gstack-browser,
  setup-browser-cookies, setup-gbrain, sync-gbrain, landing-report, setup-deploy,
  supabase-postgres-best-practices, AUTOPROGRAM) + `README.md` + `manifest.json`
  (motivo + ruta original + restauración). NO descubierta por opencode (patrón de
  discovery es `.opencode/skills/<name>/SKILL.md`; `skills-avoid` es directorio hermano).
- Reglas: skills del harness son OBLIGATORIOS (no mover a cuarentena); un skill evitado
  NO vuelve a cargarse sin decisión explícita; al instalar skills nuevos de terceros,
  evaluar y actualizar inventario + manifest si aplica.

## Plan fundamentos-de-la-programacion COMPLETO (18/08/2026, ciclos 56-62)

- **Fuente**: learning/sources/fundamentos-programacion.md + docs/RAZONAMIENTO-FUNDAMENTOS-PROGRAMACION.md (ciclo 56, 7044f3a).
- **Harness ultraia-request (57)**: skill de peticion con plantilla 13 campos + config loop JSON (OBJETIVO/METRICA/TARGET/STOP/FAILURE) + bucle IA 4 fases (Sensado->Razonamiento->Accion->Ajuste) + prioridades P0-P5; plantilla plan loop-piv ampliada (RECURSOS/PRESUPUESTO/NO-hacer/TOLERANCIAS); loop-budget con tiempo (early-exit 80/100%). 1f7c4c4 + 8519bb6.
- **Capabilities (dominio puro determinista, keyless, sin ejecucion real; wiring en llm.ts bajo opts.tools?.includes(...))**:
  - **sdf** (58, sesion 57b, 7477187): SDF + ray marching (planSdfScene/sdfSceneGlsl/rayMarchPlan/renderSdfHtml) + tool sdf_render + 31 tests.
  - **videoqa** (59, 8d14835): MAE/MSE/PSNR/SSIM + E_flow + E_total ponderado (a=0.6/b=0.3/g=0.1) + veredicto (PSNR>40dB SSIM>0.95 E_total<0.4) + buildVmafArgv (nunca ejecuta) + tool videoqa_metrics + 31 tests. LECCION: eTotalMax 0.05 incoherente con PSNR>40 (ePixel 48dB = 0.45) -> 0.4.
  - **motion** (60, 82c76fc): flowStats F(x,y,t) + decomposeMotion camara LSQ vs escena (dominant static/camera/scene/mixed por energia explicada) + trajectoryFit Catmull-Rom + planFlowAnalysis argv OpenCV (Farneback/LucasKanade, parse zod aplica defaults) + tool motion_analyze + 20 tests. La sesion 57b cedio la tarea hacia mi (borro mis untracked, luego vio los reescritos y cedio).
  - **replica** (61, 9f996db): orquestador analisis-por-sintesis con ReplicaIO inyectable (dominio puro), coordinateStep determinista, stop conditions (target/maxIterations/patience/timeout reloj inyectable), checkpoints, resumeFrom, fail-soft + tool replica_run (analizar/plan; ejecucion delegada a runner con IO real) + 17 tests. LECCIONES: iterationsUsed = min(iteration+1, max) en loop completo; checkpoint.lastIteration; resume 0-indexado; variable efore capturada por edit -> ReferenceError cascada.
- **Wiring (f8b5e7d)**: tools videoqa_metrics/motion_analyze/replica_run en llm.ts (imports namespace). index.ts (exports/imports/tools/TOOL_DESCRIPTIONS/Capability union videoqa|motion|replica) lo completo la sesion 57b (sin commitear en su worktree).
- **Skills audit (62, sesion 57b, a43ce98)**: .opencode/skills-avoid/ cuarentena 15 SKILL.md + docs/SKILLS-INVENTARIO.md.
- **Seeds activados (b619be5)**: bp-guionista +motion, bp-analista +videoqa, bp-publicador +videoqa, bp-orquestador +sdf/videoqa/motion/replica (seed-admin hereda automaticamente con +skills/content/memory; una sola fuente en seed-data.mjs). Verificado en DB: 16 versions, videoqa en 6, sdf en 2, orquestador 11 caps.
- **Concurrencia**: 3 tasks del plan las completo yo en rafaga (escribir+test+commit antes de colision); sdf y 62 las completo la 57b; las filas 60/61 las marco DONE tras que ella ceda. Regla confirmada: quien commitea primero gana; nunca duplicar; el lock (task 58) es el arbitro.
