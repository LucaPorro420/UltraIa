# UltraIa MVP v0.1 — Plan de ejecución (copia personal)

> Archivo de referencia personal. No es parte del flujo de trabajo del repo.

## Producto
Plataforma SaaS donde el usuario describe una tarea en lenguaje natural, UltraIa genera un agente de IA a medida (prompt, modelo, herramientas, criterios de evaluación) y el agente se mejora automáticamente a partir del feedback de uso con aprobación humana (human-in-the-loop).

Sin claims falsos: no se entrena ni fine-tunea en el MVP. Se usan LLMs frontera con salidas estructuradas. "Aprende de la IA" = pipeline de refinamiento basado en feedback real + evals LLM-as-judge con gate de regresión.

## Stack
- Monorepo npm workspaces: `apps/web` + `packages/core`
- Next.js 15 App Router + Tailwind v4 + Vercel AI SDK (provider-agnostic, OpenAI default)
- Prisma + SQLite en dev (sin Docker en esta máquina) → Postgres en prod
- Auth: credenciales + bcryptjs, sesiones httpOnly (token en DB)
- Tests: Vitest (LLM mockeado) · CI: GitHub Actions (lint → typecheck → test → build)

## Entregables de esta iteración
1. Scaffold monorepo + config
2. Schema Prisma (User, Session, Workspace, AgentBlueprint, AgentVersion, Conversation, Message, Feedback, EvalRun, EvalCase, ApiKey)
3. packages/core: blueprints, feedback, evals (LLM-as-judge), pipeline de mejora, tools (calculadora segura), auth, tests
4. Web: landing, login/registro, dashboard, Agent Builder, chat streaming, feedback, aprobar/rechazar versiones, evals, API keys
5. API externa por agente (/api/v1) con API key scoped + rate limiting
6. CI + README + commit inicial

## Supuestos
- Claves LLM del usuario en runtime (OPENAI_API_KEY); tests con mock
- UI en inglés, lista para i18n
- Sin deploy en esta iteración (local); Vercel + Postgres después

## Verificación
- `npm run db:generate` · `npm run db:migrate`
- `npm run typecheck` · `npm run lint` · `npm run test` · `npm run build`
