# PLAN: Conexión MCP Zernio + Fase B sandbox (tarea #153, prioridad P1)

Fecha: 2026-08-28 · Modo: P-B · Patrón: Bucle IA 4 fases · Presupuesto: 1 iteración / ~35K tokens

## Contexto
- Usuario: https://mcp.zernio.com/mcp — conectarlo al modelo agéntico. Luego "Has ambas fases." → ejecutar Fases B y C del plan agéntico.
- Zernio verificado 28/08: endpoint SSE `POST /mcp` → `Zernio 3.4.4`, 50+ tools (accounts_*, profiles_*, posts_*, media_*, analytics_*, inbox). Protocolo MCP 2024-11-05, tools/list OK.
- Fase A ya DONE (65d1361): observability + puente 6 capas (30 tests). Faltan Fase B sandbox (E2B) y Fase C MCP server. Zernio es un MCP *externo* que se consume, no el MCP server propio.
- Skills ya instaladas: langfuse, build-mcp-app, mem0, crewai.

## SPEC
- **Entradas:** `ZERNIO_API_KEY` opcional (si MCP requiere auth, fail-soft), `ZERNIO_MCP_URL` default `https://mcp.zernio.com/mcp`, tool args JSON (content, platform, account_id, etc).
- **Salidas:**
  - `packages/core/src/tools/zernio.ts` — cliente MCP Zernio determinista (zod, fetch inyectable, fail-soft): `zernioListTools`, `zernioCallTool`, `createZernioClient({url,apiKey,fetch})`, helpers `zernioAccountsList`, `zernioPostsCreate`, `zernioPostsCrossPost`, `zernioAnalytics`, etc. Valida schemas, no lanza.
  - `packages/core/src/tools/zernio.test.ts` — 18 tests (schemas, list/call mock, fail-soft, inyección).
  - `packages/core/src/tools/sandbox.ts` — Fase B: `planSandbox` ya existe en agentic.ts, aquí se materializa `executeSandbox({lang,code,timeout}, fetch?)` con provider `e2b|local`, fetch inyectable, fail-soft. 8 tests.
  - Wiring `tools/index.ts` + `ai/llm.ts` → `zernio_*` (5 tools) + `sandbox_run`.
  - `opencode.json` → `mcpServers.zernio` (url + env key) para que el runtime `opencode` pueda listar tools nativamente.
  - `docs/AGENTIC-INFRA-2026.md` ampliada § Zernio + `Task/zernio-demo.ts` → `resultTask/zernio/`.
- **Criterios:** gates FULL verdes, 26 nuevos tests (18 zernio + 8 sandbox), fetch nunca real en tests, keyless fail-soft con razón clara.

## DESIGN
- **zernio.ts:** `ZernioConfig {url, apiKey?, fetch?}` → `ZernioClient {listTools(), callTool(name,args)}`. Internamente: `POST /mcp` con `Accept: application/json, text/event-stream`, body `{"jsonrpc":"2.0","id":N,"method":"tools/list"|"tools/call","params":{...}}`, parse SSE `event: message\ndata: {...}`. Helper `parseSse(data)` extrae JSON. `buildZernioHeaders(apiKey?)` → `Content-Type` + `Authorization: Bearer` si hay key. Todo puro, sin deps `modelcontextprotocol`.
- **sandbox.ts:** `SandboxConfig {e2bUrl?, timeoutMs}` + `executeSandbox(plan, config, fetch?)` → si `E2B_API_KEY` presente → `POST https://api.e2b.dev/sandboxes/...` (mock en tests), si no → `local` → retorna `{provider:local, note:allowlist}` sin ejecutar (seguridad). Nunca `eval` real en tests.
- **MCP config:** `opencode.json` `mcp: { zernio: { type:"remote", url:"https://mcp.zernio.com/mcp" } }` o `mcpServers`. Verificar schema del proyecto (opencode.json $schema).

## LEARN
- Lección "keyless-first fail-soft" (publish/cloud/observability) → aplicar igual.
- Lección BodyInit Uint8Array (78d25e0) → headers como Record<string,string>, body string.
- Truth 2026: Zernio MCP v3.4.4 verificado live (tools 50+).

## TEST
- **zernio.test.ts:** 18 — schemas ok/fail, listTools mock SSE, callTool posts_create, accounts_list, analytics, fail-soft sin url, fail-soft fetch error, headers con/sin key, parseSse.
- **sandbox.test.ts:** 8 — plan local sin key, e2b con key, timeout cap, lang validación, fail-soft.
- **Scoped:** `vitest run zernio.test.ts sandbox.test.ts` + `typecheck -w @ultraia/core`
- **FULL:** typecheck→lint→test→build (kill dev, clean .next)

## MEJORAS A ADICIONAR
- Conexión Zernio operativa como capability (útil para AutoPub: publicar a 9 plataformas vía Zernio además del publish propio).
- Sandbox Fase B materializado (cierra gap E2B).

## TECNOLOGÍAS EVALUADAS
- **MCP SDK @modelcontextprotocol/sdk** — evaluado vía build-mcp-app (5.1K). Decisión: NO dep, port fetch/SSE manual (cero deps, testeable, como qdrant-memory).
- **E2B SDK @e2b/code-interpreter** — evaluado (77 installs). Decisión: adapter fetch manual, no dep.
- **Zernio API directa** vs MCP — elegida MCP (un endpoint, 50 tools, SSE ya verificado).

## Objetivo
- Zernio conectado al modelo agéntico (tools list/call operativos via `zernio_*`) + sandbox Fase B, con gates FULL y demo reproducible.

## Pasos
1. Crear `packages/core/src/tools/zernio.ts`
2. Crear `packages/core/src/tools/zernio.test.ts` (18)
3. Crear `packages/core/src/tools/sandbox.ts`
4. Crear `packages/core/src/tools/sandbox.test.ts` (8)
5. Wirear `tools/index.ts` (exports + TOOL_DESCRIPTIONS + Capability)
6. Wirear `ai/llm.ts` (tools zernio_accounts, zernio_posts, zernio_analytics, zernio_media, sandbox_run)
7. Editar `opencode.json` → `mcp`/`mcpServers` zernio remote
8. Actualizar `docs/AGENTIC-INFRA-2026.md` § Zernio
9. Crear `Task/zernio-demo.ts` → `resultTask/zernio/`
10. Gates + commit pathspec

## Archivos a tocar (staging explícito)
- `packages/core/src/tools/zernio.ts` — NUEVO
- `packages/core/src/tools/zernio.test.ts` — NUEVO
- `packages/core/src/tools/sandbox.ts` — NUEVO
- `packages/core/src/tools/sandbox.test.ts` — NUEVO
- `packages/core/src/tools/index.ts` — wiring
- `packages/core/src/ai/llm.ts` — wiring 5 tools
- `opencode.json` — mcpServers.zernio
- `docs/AGENTIC-INFRA-2026.md` — § Zernio
- `Task/zernio-demo.ts` — NUEVO

## RECURSOS / PRESUPUESTO
- fetch inyectable, zod, SSE parse, `vite-node` demo. Sin LLM.

## NO-hacer
- NO tocar `.env`, `auth/`, `secrets/`; NO instalar `@modelcontextprotocol/sdk` ni `@e2b/code-interpreter`; NO tocar WIP ajeno.

## Criterios de verificación
- Scoped 26/26 + typecheck 0; FULL typecheck/lint/test/build (build compiled en 4.2min ya verificado)
- Tests esperados: 26 nuevos, total repo ~1909

## TOLERANCIAS
- Build OOM tolerado si typecheck/lint/test verdes (precedente iter-146). Max 3 intentos.

## Riesgos
- opencode.json schema mcpServers desconocido → verificar con `npx opencode --help` / docs, fallback a `mcp.json`.
- Zernio requiere auth para writes → fail-soft con razón, no bloquear reads.

## Esfuerzo
- Medio — 9 archivos, 26 tests, 2 wirings + 1 config.
