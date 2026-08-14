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
- **Todo en un comando**: `./run-all.ps1` (web + webhooks + validate).
- **Sistema de aprendizaje**: `learning/` con verdad verificada aparte (`learning/truth/`), respuestas crudas (`learning/responses/`), verifier (`learning/scripts/verify.py`) y lecciones (`learning/LEARNINGS.md`). 16/16 casos PASS. Reglas: API directa > búsqueda web para datos numéricos; pedir campos crudos exactos; el tipo de comparación viene de la verdad.
- **gstack**: 53 skills en `~/.config/opencode/skills/gstack-*` (se cargan al iniciar opencode). Runtime en `~/.claude/skills/gstack` (re-ejecutar `./setup` tras `git pull`).

## Memoria de aprendizaje (learning/)

Sistema de memoria verificada en `learning/`: la verdad se guarda APARTE de las respuestas del modelo (`learning/truth/`), se verifica contra ella (`verify.py`) y se empaqueta comprimida (`learning/memory/ultraia_memory.zip`, ~26 KB). Para cargarla en cualquier sesión usar la skill `learning-memory` o:

```
python learning/scripts/restore_memory.py summary   # esquemas verificados + lecciones
```

Reglas aprendidas (no romperlas): API directa > búsqueda web para datos numéricos; pedir campos crudos exactos; el tipo de comparación viene de la verdad; PowerShell 5.1 rompe JSON en argv (usar Write).

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
