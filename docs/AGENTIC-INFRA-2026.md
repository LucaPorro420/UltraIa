# Infraestructura Agéntica 2026 — Análisis UltraIa

> Análisis del pedido "infraestructura agéntica" (6 capas) vs el stack real de UltraIa (61 capabilities, harness, qdrant, vault). Fecha: 2026-08-28.

## Resumen ejecutivo

UltraIa **ya es** una infraestructura agéntica completa en TypeScript puro. Las 6 capas pedidas se mapean así:

| Capa pedida | Estado en UltraIa | Veredicto |
|---|---|---|
| **1. Orquestación** LangGraph / CrewAI / MS Agent Framework / LlamaIndex | `harness.ts` (DeepSeek "everything is a plugin", Kahn), `agent-loop.ts`, `autopub`, `genesis`, 11 `bp-*` agents | **Portado** — no instalar Python. `agentic.ts` demuestra grafo+crew+RAG como plan JSON |
| **2. Cerebro** Ollama / OpenAI / Anthropic / Groq | `ai/llm.ts` con 10 providers (ollama/lmstudio/openai/google/deepseek/qwen/openrouter/groq/mistral/together/huggingface) + fallback ollama→lmstudio + timeout 120s | **Ya cubierto** — Ollama local (`llama3.1`) + Groq (`llama-3.1-8b-instant`) operativos |
| **3. Routing** Semantic Kernel / LCEL | `model-orchestrator.ts` + `skills.ts` | **Portado** — `routeIntent` + `planLcelChain` en `agentic.ts` |
| **4. Sandbox** E2B Code Interpreter | `runtime/CommandExecutor` (allowlist) | **Fase B pendiente** — `planSandbox` con `E2B_API_KEY`→nube, sin key→local allowlist |
| **5. Chat/Memoria** Chainlit / Streamlit / Mem0 | `semantic-memory` + `qdrant-memory` (1024d) + `memory-fs` + `brainpage` + `vault` — 4 sistemas | **Portado** — `planMemory` (store mem0/qdrant/memory-fs/brainpage), Chainlit/Streamlit **dispensables** (tienes Next.js+Expo) |
| **6. Observabilidad** Langfuse / LiteralAI | `metrics.ts` KPIs pero sin traces por step | **Fase A — GAP crítico** → `observability.ts` (port Langfuse, 14.1K installs skill) |

## Matriz necesario / dispensable

| Tecnología | Installs skill | Fuente | Decisión | Motivo |
|---|---|---|---|---|
| `langfuse/skills@langfuse` | 14.1K | langfuse oficial | **Instalar** | Cierra gap traces/costo |
| `anthropics/claude-plugins-official@build-mcp-app` | 5.1K | anthropics oficial | **Instalar** | Patrón para exponer 60 tools como MCP (Fase C) |
| `rivet-dev/skills@sandbox-agent` | 10.1K (rivet-actors) | Rivet | **Inspiración** | Sandbox aislado |
| `mem0ai/mem0@mem0` | 2K | mem0ai oficial | Opcional | 5º memoria, redundante con qdrant (1K free) |
| `langchain-ai/langchain-skills@langgraph-cli` | 5.5K | langchain-ai | Dispensable | Harness ya cubre grafo cíclico |
| `crewaiinc/skills@getting-started` | 6K | crewaiinc | Dispensable | Roles ya en `bp-*` + `planCrew` |
| `streamlit/agent-skills` | 2.8K | streamlit | Dispensable | Next.js+Expo ya es tu UI |
| `github/awesome-copilot@semantic-kernel` | 1.7K | github | Dispensable | TS puro, no .NET |
| `E2B` SDK | 77 | computesdk | Fase B | Adapter fetch-inyectable, no dep npm |

## Cómo probar cada capa (keyless-first)

```bash
# 1. Grafo agéntico (LangGraph-style) — keyless
npx vite-node -e "import {planAgenticGraph} from './packages/core/src/tools/agentic.ts'; console.log(planAgenticGraph({entry:'start',nodes:[{id:'start',kind:'router'},{id:'a',kind:'agent'}],edges:[{from:'start',to:'a'}]}))"

# 2. Crew (CrewAI-style)
npx vite-node -e "import {planCrew} from './packages/core/src/tools/agentic.ts'; console.log(planCrew({roles:[{name:'researcher',goal:'investigar'}],tasks:[{id:'t1',role:'researcher',objective:'buscar'}]}))"

# 3. RAG (LlamaIndex-style)
npx vite-node -e "import {planRagPipeline} from './packages/core/src/tools/agentic.ts'; console.log(planRagPipeline({loaders:['web'],chunk:{size:1000,overlap:100},embed:'local',store:'qdrant'}))"

# 4. Observabilidad (Langfuse) — keyless fail-soft sin keys, con keys hace flush real
# Sin keys:
npx vite-node Task/agentic-demo.ts
# Con Langfuse Cloud (https://cloud.langfuse.com → Create API keys):
# LANGFUSE_PUBLIC_KEY=pk-lf-... LANGFUSE_SECRET_KEY=sk-lf-... npx vite-node Task/agentic-demo.ts

# 5. Sandbox — sin E2B_API_KEY → local allowlist, con key → E2B nube
# 6. Memoria — sin MEM0_API_KEY → qdrant, con key → mem0 (fail-soft)
```

## Demo

`Task/agentic-demo.ts` genera `resultTask/agentic/`:
- `trace.json` — trace Langfuse simulado (spans + generation + score, sin red)
- `graph.json` — grafo validado (orden Kahn)
- `crew.json` — crew con validación
- `rag.json` — pipeline RAG
- `route.json` — routing de intención
- `sandbox.json` — plan sandbox (local vs e2b)
- `memory.json` — plan memoria
- `manifest.json` — índice idempotente

Determinista y keyless — misma seed → mismos bytes (fnv1a idéntico en re-ejecución).

## Siguientes fases

- **Fase B** (sandbox real): `tools/sandbox.ts` con `E2B_API_KEY` + fetch inyectable, wiring `sandbox_run` + adapter `E2BSandboxAdapter` que respeta `CommandExecutor` allowlist.
- **Fase C** (MCP server): `packages/runtime/src/api/mcp.ts` expone `tools/*` como MCP `tools/list` + `tools/call` sobre `LocalApiServer` (127.0.0.1 + token), spec Streamable HTTP 2025-03, usando patrón `build-mcp-app`.

## Skills instaladas esta sesión

```bash
npx skills add langfuse/skills@langfuse -g -y          # 14.1K ✅
npx skills add anthropics/claude-plugins-official@build-mcp-app -g -y # 5.1K ✅
npx skills add mem0ai/mem0@mem0 -g -y                   # 2K ✅
npx skills add crewaiinc/skills@getting-started -g -y   # 6K ✅
# rivet-dev/skills@sandbox-agent — nombre desactualizado, disponibles: rivet-actors/agentos/workflows
```
