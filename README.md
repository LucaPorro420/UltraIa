# UltraIa

**AI that creates AI and learns from AI.**

Describe a task in plain language → UltraIa designs a purpose-built AI agent (system prompt, model, tools, evaluation rubric) → chat with it or call it via a scoped API key → it improves itself from real usage feedback, always gated by regression evaluations and human approval.

## Stack

- Monorepo (npm workspaces): `apps/web` (Next.js 15 App Router + Tailwind v4 + Vercel AI SDK) and `packages/core` (domain logic, Prisma, tests).
- Database: Prisma + SQLite in dev (portable to Postgres in production).
- LLM: OpenAI-compatible by default (`@ai-sdk/openai`); swap providers via the AI SDK.

## Setup

Fastest path — one command does everything (prereqs check, install, `.env`, DB migrate, then web + webhooks):

```bash
python start.py        # full setup + both services
python start.py --web  # web only
python start.py --validate  # validate the Arabic pipeline
```

Manual setup, step by step:

```bash
npm install
cp .env.example .env          # root: for Prisma CLI
cp .env.example apps/web/.env # Next.js runtime (same values)
npm run db:migrate            # creates packages/core/prisma/dev.db
npm run dev                   # http://localhost:3000
```

See `QUICKSTART.md` for the full checklist (prereqs, API keys, verification).

Set `OPENAI_API_KEY` (and optionally `ULTRAIA_MODEL`) in `apps/web/.env` for real agent generation.

## Commands

| Command | Purpose |
| --- | --- |
| `npm run dev` | Dev server |
| `npm run build` / `npm run start` | Production build / serve |
| `npm run typecheck` | tsc across all workspaces |
| `npm run lint` | ESLint (web) |
| `npm run test` | Vitest unit tests (core, LLM mocked) |
| `npm run db:generate` / `npm run db:migrate` / `npm run db:studio` | Prisma |

Verification order: `typecheck → lint → test → build` (mirrored in CI).

## How it works

1. **Generate** — `packages/core/src/domain/blueprint.ts` turns a task description into a validated blueprint via structured LLM output: system prompt, recommended model, tools, evaluation rubric (weighted criteria), guardrails, and regression eval inputs. Stored as `AgentBlueprint` + `AgentVersion` v1 (ACTIVE).
2. **Run** — chat streams through `/api/chat` (`apps/web/src/app/api/chat/route.ts`) with the active version's prompt and tools (a safe arithmetic calculator is the only tool so far). External callers use `POST /api/v1/agents/:id/chat` with an `x-api-key` (scoped, hashed at rest, rate limited). Agents can also be made **public** (per-agent toggle in the UI): the same endpoint then works without a key, rate limited per IP instead.
3. **Learn** — BAD feedback and failed eval cases feed the improvement pipeline (`packages/core/src/domain/improve.ts`): the LLM proposes a new system prompt → a PENDING version is created → approval runs **regression evals** (LLM-as-judge against the rubric; the new version must not regress vs the current one, per `regressionGate`) before promotion. Force-approve exists for overrides.

## Features

- **Chat history** — conversations persist per agent; the chat UI lists past conversations, lets you open one or start a new chat, and titles each conversation from its first message. `GET /api/conversations?agentId=` and `GET /api/conversations/:id/messages` back this.
- **Weighted evaluation** — the LLM judge scores each rubric criterion (0–1); the overall score is the weight-weighted average, so rubric weights actually drive the regression gate.
- **API key management** — list keys (with a `ua_…` prefix and last-used time) and revoke them from the UI (`GET`/`DELETE /api/agents/:id/apikeys`).
- **Version rollback** — promote any past version back to ACTIVE from the version history (transaction-safe in `activateVersion`).
- **Extended improvement proposals** — the improvement engine may also suggest a different model, tool set, guardrails, or rubric when the evidence justifies it.
- **Design system** — Dark Obsidian tokens (`@theme` en Tailwind v4), tipografías Inter +
  Plus Jakarta Sans + JetBrains Mono (`next/font`), primitivas `components/ui`, y sistema de
  motion GSAP + Lottie (hero, features, chat, loader del builder, roadmap SVG). Fuentes de
  verdad: `DESIGN.md`, `docs/design-dna.json`, `apps/web/MASTER.md`.
- **Skills de diseño & motion** — 5 Claude Code Skills instaladas (Design DNA, GSAP, Three.js,
  Motion Design, Genjutsu) en `.opencode/skills/` (proyecto) y `~/.config/opencode/skills/`
  (global), más la skill propia `ultraia-design-system`. Detalle en `CHANGES.md`.

## Notes / limitations (MVP v0.1)

- No fine-tuning — "learns from AI" is eval-gated prompt refinement with human approval (intentional).
- SQLite for local dev; switch `provider` to Postgres + a hosted DB for production.
- Single-workspace model; multi-tenant, billing, and i18n are roadmap items.
- Rate limiting for the v1 API is in-memory per process (resets on restart); trust `x-forwarded-for`/`x-real-ip` only when `ULTRAIA_TRUST_PROXY=1`.
- `AGENT.md` holds the master operating prompt (canonical); `AGENTS.md` is the condensed agent instructions.

## Documentation / Descargables

- **DESCRIPCION.md** — descripción total del proyecto desde la perspectiva del usuario admin/final (qué puedes usar, sin tecnología ni código): `DESCRIPCION.md`
- **PrototypeREADME.md** — prototipo al estado real (capacidades, quickstart, hoja de ruta de pendientes): `PrototypeREADME.md`
- **PrototypeREADME.pdf** — descargable del prototipo (generado con `scripts/md2pdf.py`, stdlib puro):
  - Repo: `PrototypeREADME.pdf`
  - Web (servido por Next.js desde `apps/web/public/`): `http://localhost:3000/prototype-readme.pdf`
- **Memoria de aprendizaje verificada** — `learning/memory/ultraia_memory.zip` (cargar con `python learning/scripts/restore_memory.py summary`)
- **UltraIa-Prototipo.zip** — prototipo empaquetado Web+Desktop (Next.js standalone + DB embebida con login demo `admin`/`admin` + launcher WebView2 + `UltraIa.bat` de 1 clic; Windows 10/11; regenerable con `python scripts/build-prototipo.py`)
- Guías: `QUICKSTART.md`, `DEPLOY.md` (hosting gratuito), `docs/AUTO-PUBLICACION.md`, `docs/RAZONAMIENTO-FABLE5.md`, `desktopFase/ARCHITECTURE.md` + `desktopFase/docs/`
