# RAZONAMIENTO-KGRAPH.md — Knowledge Graph builder (port de los principios de graphify)

**Fecha**: 20/08/2026 · **Iteración**: 80 (kgraph)
**Estado**: IMPLEMENTADA (dominio puro + tests + wiring a llm.ts/index.ts). Cluster-at-scale (Qdrant/LLM enrichment) diferido (ver "Pendiente").

## Contexto

`graphify` (safishamsi/graphify, MIT) construye un **knowledge graph de un codebase** para reducir el coste de contexto del LLM (claim: ~71x menos tokens que leer el repo). Combina:
- Parseo de **código** (tree-sitter) → nodos símbolo/archivo + edges de import/call.
- Parseo de **docs** (LLM) → conceptos + edges de co-ocurrencia.
- Salida `graph.json` + `GRAPH_REPORT.md` (god nodes, surprising connections, suggested questions).

UltraIa ya tiene `knowledge-graph.ts` de la sesión concurrente #25 (do-not-touch). Esta iteración NO reimplementa eso: hace un **port ORIGINAL de los PRINCIPIOS** como capability `kgraph`, determinista, keyless-first, cero deps, sin LLM obligatorio (el enrichment LLM queda como `AMBIGUOUS` fail-soft).

## Contrato implementado (`packages/core/src/tools/kgraph.ts`)

- **Puro/determinista** (patrón cloud.ts/video-edit.ts):
  - `slug(s)` — normaliza a id estable (minúsculas, diacríticos, guiones).
  - `fileKind(path)` — code por extensión conocida, doc por defecto.
  - `parseCode(path, content)` — nodos `sym:`/`file:` + edges `EXTRACTED` (imports vía `from`/`require`, calls por región de definición).
  - `parseDoc(path, content)` — nodos `concept:`/`heading:`/`file:` + edges `INFERRED` (co-ocurrencia ventana deslizante + heading→concept), stopwords es/ar/en.
  - `buildGraph({files})` — orquesta, normaliza ids, **dedupe de nodos** (conceptos compartidos conectan docs) y edges.
  - `analyzeGraph(g)` — grados, **god nodes** (top-5), **surprising connections** (cross-type), **suggested questions**.
  - `buildGraphJson` / `buildGraphReport` (GRAPH_REPORT.md) / `buildGraphSvg` (Dark Obsidian, `role="img"` + `aria-labelledby`).
- **Provenance tags**: `EXTRACTED` (código, cierto) / `INFERRED` (doc, probabilístico) / `AMBIGUOUS` (reservado para enrichment LLM futuro; nunca emitido hoy → fail-soft).
- **Cero ejecución real** en tests: todo es argv/string generation; el scan por `path` usa `node:fs/promises` solo en runtime (fail-soft).

## Wiring

- `ai/llm.ts`: `if (opts.tools?.includes('kgraph'))` registra `tools.kgraph_build` (acciones `build`/`report`/`svg`/`analyze`; input `filesJson` o `path`).
- `tools/index.ts`: `export * from './kgraph'` (sin colisión TS2308) + `import * as kgraph` + `tools.kgraph` + `TOOL_DESCRIPTIONS.kgraph` + `Capability 'kgraph'`.
- Tests: `kgraph.test.ts` (~22) + `kgraph.wiring.test.ts` (4, contrato público).

## Mapeo (implementado / parcial / pendiente)

| graphify | kgraph | Estado |
|---|---|---|
| code parser (tree-sitter) | regex/AST-lite (symbols/imports/calls) | IMPLEMENTADO (aprox.) |
| doc parser (LLM) | co-ocurrencia determinista + heading→concept | IMPLEMENTADO (sin LLM) |
| graph.json | `buildGraphJson` | IMPLEMENTADO |
| GRAPH_REPORT.md | `buildGraphReport` | IMPLEMENTADO |
| god nodes / surprising / questions | `analyzeGraph` | IMPLEMENTADO |
| SVG visual | `buildGraphSvg` (Dark Obsidian a11y) | IMPLEMENTADO |
| cluster de escala (Qdrant) | — | PENDIENTE (no requerido para la capability) |
| enrichment LLM (edges AMBIGUOUS) | reservado, fail-soft | PENDIENTE (hook para #25) |

## Lección / diseño

- **Determinismo sobre fidelidad**: el parser de código no necesita tree-sitter para la capability; regex de símbolos + región de calls basta y es portable (cero deps nativas).
- **Provenance first**: separar `EXTRACTED` (cierto) de `INFERRED` (probabilístico) habilita filtros de confianza en retrieval sin revertir el grafo.
- **Sin LLM obligatorio**: la capability es útil offline; el enrichment queda como extensión `AMBIGUOUS` que otro agente (#25) puede llenar sin romper el contrato.
- **NO tocar `knowledge-graph.ts`**: sesión #25 lo posee; kgraph es complementario (cross-corpus docs+código, determinista), no competitivo.
