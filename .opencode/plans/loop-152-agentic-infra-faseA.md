# PLAN: Infraestructura Agéntica + Fase A Observabilidad (tarea #152 de STATE.md, prioridad P1)

Fecha: 2026-08-28 · Modo: P-P→P-B · Patrón: Bucle IA 4 fases (Sensado→Razonamiento→Acción→Ajuste) · Presupuesto: 1 iteración / ~40K tokens

## Contexto
- Usuario pide infraestructura agéntica completa (6 capas: Orquestación LangGraph/CrewAI/MS Agent/LlamaIndex; Cerebro Ollama/OpenAI/Anthropic/Groq; Routing Semantic Kernel/LCEL; Sandbox E2B; Chat/Memoria Chainlit/Streamlit/Mem0; Observabilidad Langfuse/LiteralAI) + "implementa plugins e MCPs y analiza el proyecto, ve mejorando lo necesario".
- UltraIa YA tiene 60+ capabilities deterministas, harness plugin, 10 providers LLM (ollama/groq ya en llm.ts), 4 memorias, vault, qdrant — no necesita duplicar frameworks Python.
- Skills instaladas esta sesión: langfuse (14.1K), build-mcp-app (5.1K), mem0 (2K), crewai getting-started (6K). sandbox-agent falló por nombre (rivet solo expone rivet-actors/agentos/workflows).
- Se requiere Fase A primero (observabilidad es el GAP crítico que cierra el loop de mejora) + ejemplo vivo de las 6 capas como artefacto reproducible.

## SPEC (S-D integrado — fase P-P)
- **Entradas:** config env (`LANGFUSE_HOST`, `LANGFUSE_PUBLIC_KEY`, `LANGFUSE_SECRET_KEY`, `E2B_API_KEY` opcional), tool args JSON.
- **Salidas:** 
  - `tools/observability.ts` — tracer Langfuse portado (principios, nada copiado): `createObservabilityTracer`, `traceStep`, `traceGeneration`, `flush`, keyless fail-soft.
  - `tools/agentic.ts` — puente agéntico determinista que demuestra las 6 capas sin deps Python: `planAgenticGraph` (LangGraph-style nodos+edges), `planCrew` (CrewAI-style roles+tasks), `planRagPipeline` (LlamaIndex-style loaders→index→query), `routeIntent` (SK/LCEL-style), `planSandbox` (E2B-style), `planMemory` (Mem0/Chainlit-style).
  - `docs/AGENTIC-INFRA-2026.md` — análisis + matriz necesario/dispensable.
  - `Task/agentic-demo.ts` — demo que genera artefactos en `resultTask/agentic/` (trazas + grafos).
- **Criterios de aceptación:**
  - Gates FULL verdes (typecheck 0, lint 0, test 1823+ nuevos, build 50 páginas).
  - Nuevos tests: observability 14+ agentic 16+ = 30 nuevos, todos deterministas, sin red.
  - Sin `fetch` real en tests (inyectable), sin tokens hardcodeados.
  - `observability` exportado como capability `observability` en `tools/index.ts` + tool `observability_trace` en `ai/llm.ts` (gated por `opts.tools`).
  - `agentic` exportado como capability `agentic` con tool `agentic_plan`.

## DESIGN (S-D integrado — fase P-P)
- **Arquitectura:** dos módulos puros en `packages/core/src/tools/` siguiendo patrón `harness.ts`/`prioritize.ts`: estado inmutable + funciones puras + zod schemas + fetch inyectable.
- **observability.ts:** `ObservabilityConfig {host, publicKey, secretKey, enabled, flushAt}` + `TraceStep {name, input, output, latencyMs, cost, metadata}` → `ingestBody` compatible Langfuse `/api/public/ingestion` (batch). `createObservabilityTracer(config, fetch?)` retorna `{trace, flush}` con buffer y `enabled=false` si faltan keys (fail-soft keyless-first, igual que publish/cloud).
- **agentic.ts:** `AgenticGraph {id, nodes:[{id,kind,agent,tool}], edges:[{from,to,condition?}], entry}` + validador DAG (Kahn) + `planCrew {roles:[{name,goal,tools}], tasks:[{id,role,objective,dependsOn?}]}` + `planRagPipeline {loaders, chunk, embed, store}` + `routeIntent(intent)→capability` + `planSandbox {lang, code, timeout}` + `planMemory {kind, query}`. Todo serializable JSON.
- **Diagrama opcional:** data-flow de las 6 capas → `docs/diagrams/agentic-infra.svg` vía `diagram` capability si tiempo.

## LEARN (L-T integrado — fase P-P)
- **Verdad verificada:** `learning/truth/` (54 docs), `LEARNINGS.md` lección "port ORIGINAL de principios, nada copiado" + "keyless-first fail-soft".
- **Memoria semántica:** `semantic-memory` search sobre langfuse/E2B ya existe (0 hits — confirma GAP).
- **Gaps que cierra:** observabilidad (Fase A), sandbox aislado (Fase B pendiente), MCP server (Fase C pendiente) — este plan cierra el primero y deja puente para los otros dos.
- **Fracasos previos:** `BodyInit` Uint8Array (78d25e0), `export *` colisión TS2308 (qdrant-memory) — evitar ambos.

## TEST (L-T integrado — fase P-P)
- **observability.test.ts:** 14 tests — config disabled sin keys, enabled con keys, traceStep buffer, traceGeneration, flush batch shape, flush fail-soft sin fetch, clone no muta, cap 100 steps.
- **agentic.test.ts:** 16 tests — graph validates DAG / detects cycle, crew roles, rag pipeline, routeIntent maps, sandbox plan, memory plan, idempotencia (misma seed → mismo JSON).
- **Scoped:** `npm run typecheck -w @ultraia/core` + `vitest run packages/core/src/tools/observability.test.ts packages/core/src/tools/agentic.test.ts`
- **FULL:** `npm run typecheck → lint → test → build` (limpiar `.next` si build OOM, matar dev server antes).

## MEJORAS A ADICIONAR
- Observabilidad trazable para cerrar el loop de mejora (generación → trace → métrica → playbook).
- Puente agéntico como ejemplo vivo de las 6 capas sin arrastrar Python — sirve como plantilla para quien quiera migrar a LangGraph/CrewAI reales luego.
- Doc operativa `AGENTIC-INFRA-2026.md` con matriz necesario/dispensable y cómo probar cada capa (keyless vs con key).

## TECNOLOGÍAS EVALUADAS
- **Langfuse SDK oficial** (`langfuse` npm, 14.1K installs skill) — evaluada, elegida como referencia para el port. Decisión: port determinista sin dep `langfuse` (igual que `qdrant-memory` no depende de `qdrant` npm). Motivo: cero deps, testable, keyless-first.
- **E2B SDK** (`@e2b/code-interpreter`) — evaluada, no instalada (77 installs skill). Decisión: adapter fetch-inyectable, no dep. Motivo: sandbox es red, no lógica.
- **MCP SDK** (`@modelcontextprotocol/sdk`) — evaluada vía `build-mcp-app` (5.1K). Decisión: diferir MCP server a Fase C (requiere `packages/runtime/src/api/mcp.ts` + spec Streamable HTTP). Este plan no toca runtime.
- **CrewAI/LangGraph Python** — evaluados (6K/5.5K). Decisión: NO instalar Python, portar principios en TS. Motivo: stack es TS/Next.js, Python rompería gates y añade 500MB.
- **Mem0** (2K) — evaluada, portada como `planMemory` sin llamar a API. Decisión: no dep, fail-soft.
- **Chainlit/Streamlit** — evaluados (2.8K). Decisión: DISPENSABLES — ya tienes Next.js chat + mobile Expo.

## Objetivo
- Entregar Fase A observabilidad operativa + puente agéntico de las 6 capas como ejemplo reproducible, con 30 tests y gates FULL verdes, sin tocar WIP concurrente.

## Pasos
1. Crear `packages/core/src/tools/observability.ts` — tracer Langfuse port (zod schemas, buffer, batch, fetch inyectable, fail-soft).
2. Crear `packages/core/src/tools/observability.test.ts` — 14 tests deterministas.
3. Crear `packages/core/src/tools/agentic.ts` — puente 6 capas (graph/crew/rag/route/sandbox/memory) + validador DAG.
4. Crear `packages/core/src/tools/agentic.test.ts` — 16 tests deterministas.
5. Wirear `tools/index.ts` — `export *` observability/agentic + `TOOL_DESCRIPTIONS` + `Capability` union.
6. Wirear `packages/core/src/ai/llm.ts` — tools `observability_trace` + `agentic_plan` (gated por `opts.tools`, fetch inyectable, zod params).
7. Crear `docs/AGENTIC-INFRA-2026.md` — análisis 6 capas + matriz + cómo probar.
8. Crear `Task/agentic-demo.ts` — demo que escribe `resultTask/agentic/` (traces.json + graph.json + crew.json + rag.json).
9. Gates: scoped typecheck + tests → FULL typecheck/lint/test/build (kill dev, clean .next si OOM) → commit pathspec.

## Archivos a tocar (staging explícito)
- `packages/core/src/tools/observability.ts` — NUEVO
- `packages/core/src/tools/observability.test.ts` — NUEVO
- `packages/core/src/tools/agentic.ts` — NUEVO
- `packages/core/src/tools/agentic.test.ts` — NUEVO
- `packages/core/src/tools/index.ts` — wiring exports + TOOL_DESCRIPTIONS + Capability
- `packages/core/src/ai/llm.ts` — wiring 2 tools (observability_trace, agentic_plan)
- `docs/AGENTIC-INFRA-2026.md` — NUEVO
- `Task/agentic-demo.ts` — NUEVO
- `.opencode/plans/loop-152-agentic-infra-faseA.md` — este plan

## RECURSOS / PRESUPUESTO
- Tools: fetch inyectable, zod, node:* (existe en core), `vite-node` para demo.
- Skills: langfuse, build-mcp-app (instaladas), harness/loop-piv.
- Presupuesto: ~3h / 40K tokens. Sin costo LLM (tests deterministas).

## NO-hacer (guardas explícitas)
- NO tocar `.env`, `auth/`, `payments/`, `secrets/`, `credentials/`.
- NO tocar `packages/runtime/src/api/` (Fase C MCP queda para siguiente iteración).
- NO instalar deps Python (`langgraph`, `crewai`, `llama-index`) ni npm `langfuse`/`@e2b`.
- NO tocar WIP concurrente: `geom.ts`, `recordly.ts`, `procedural-client.tsx`, `llm.ts` ajeno más allá del wiring aditivo (verificar diff antes de commit).
- NO `git add .` — solo los 8 archivos listados.

## Criterios de verificación
- Scoped: `npm run typecheck -w @ultraia/core` 0 + `vitest run observability.test.ts agentic.test.ts` 30/30.
- FULL antes de commit: `npm run typecheck` 0 → `npm run lint` 0 → `npm run test` (core 1823+30=1853, runtime 193) → `npm run build` 50 páginas (si OOM local, validar en CI).
- Tests esperados: 30 nuevos (observability 14, agentic 16), total repo ~1883.

## TOLERANCIAS
- Build OOM local con 256MB free es tolerado si `npm run typecheck/lint/test` verdes — se marca "build OMITIDO-dev-server" y se valida en CI (precedente iter-146).
- Si `vitest` da fallos raros → limpiar `node_modules/.vite` antes de diagnosticar.
- Máx 3 intentos por gate RED; si persiste → escalar a High Priority, no commitear rojo.

## Riesgos / guardas
- Riesgo: llm.ts en edición concurrente → guardar diff aditivo, no sobrescribir bloque ajeno; verificar `git diff` es solo wiring.
- Riesgo: `.next` corrupto por dev zombie → matar `next dev` + `Remove-Item .next` antes de build.
- Riesgo: import de `node:*` en core ya resuelto por `serverExternalPackages` en next.config.ts — no afecta.

## Esfuerzo estimado
- Medio — 8 archivos, 30 tests, 2 wirings, 1 doc, 1 demo. Patrón ya dominado (harness/prioritize/vault).

## Prioridad
- P1 — desbloquea observabilidad (Fase A) y deja ejemplo de las 6 capas para decidir Fases B/C.
