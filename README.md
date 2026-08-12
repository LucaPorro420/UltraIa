# UltraIa

**AI that creates AI and learns from AI.**

Describe a task in plain language → UltraIa designs a purpose-built AI agent (system prompt, model, tools, evaluation rubric) → chat with it or call it via a scoped API key → it improves itself from real usage feedback, always gated by regression evaluations and human approval.

## Stack

- Monorepo (npm workspaces): `apps/web` (Next.js 15 App Router + Tailwind v4 + Vercel AI SDK) and `packages/core` (domain logic, Prisma, tests).
- Database: Prisma + SQLite in dev (portable to Postgres in production).
- LLM: OpenAI-compatible by default (`@ai-sdk/openai`); swap providers via the AI SDK.

## Setup

```bash
npm install
cp .env.example .env          # root: for Prisma CLI
cp .env.example apps/web/.env # Next.js runtime (same values)
npm run db:migrate            # creates packages/core/prisma/dev.db
npm run dev                   # http://localhost:3000
```

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

1. **Generate** — `packages/core/src/domain/blueprint.ts` turns a task description into a validated blueprint via structured LLM output: system prompt, recommended model, tools, rubric (weighted criteria), guardrails, and regression eval inputs. Stored as `AgentBlueprint` + `AgentVersion` v1 (ACTIVE).
2. **Run** — chat streams through `/api/chat` (`apps/web/src/app/api/chat/route.ts`) with the active version's prompt and tools (a safe arithmetic calculator is the only tool so far). External callers use `POST /api/v1/agents/:id/chat` with an `x-api-key` (scoped, hashed at rest, rate limited). Agents can also be made **public** (per-agent toggle in the UI): the same endpoint then works without a key, rate limited per IP instead.
3. **Learn** — BAD feedback and failed eval cases feed the improvement pipeline (`packages/core/src/domain/improve.ts`): the LLM proposes a new system prompt → a PENDING version is created → approval runs **regression evals** (LLM-as-judge against the rubric; the new version must not regress vs the current one, per `regressionGate`) before promotion. Force-approve exists for overrides.

## Notes / limitations (MVP v0.1)

- No fine-tuning — "learns from AI" is eval-gated prompt refinement with human approval (intentional).
- SQLite for local dev; switch `provider` to Postgres + a hosted DB for production.
- Single-workspace model; multi-tenant, billing, and i18n are roadmap items.
- `AGENT.md` holds the master operating prompt (canonical); `AGENTS.md` is the condensed agent instructions.
