# RAZONAMIENTO-GRAPHIFY.md — grafo de conocimiento del proyecto (patrón graphify)

**Fecha**: 20/08/2026 · **Iteración**: 77 · **Fuente**: `learning/sources/graphify.md`
**Origen**: websearch 20/08/2026 — repo `safishamsi/graphify` (MIT, ~106k stars, CLI `graphifyy`;
rama v5 soporta Claude Code/Codex/OpenCode/Cursor/Gemini CLI; 227 commits). Verificación:
[websearch] 20/08/2026. También se leyó el actual `vsrc/safishamsi-graphify`.
**Estado**: IMPLEMENTADO (dominio puro `knowledge-graph.ts` + 18 tests + runner
`Task/knowledge-graph.ts`; wiring a llm.ts/index.ts DIFERIDO por concurrencia).

## Qué es graphify

Un skill de Claude Code que convierte **cualquier carpeta** (código, docs, papers, imágenes) en
un **grafo de conocimiento consultable**: `graph.json` persistente + `GRAPH_REPORT.md` +
`graph.html` (vis.js) + `obsidian/` + `wiki/`. El agente lee el grafo en vez de releer archivos
crudos (~71x menos tokens por consulta según el repo). Edge cases: **god nodes** (conceptos por
donde pasa todo), **comunidades** (Leiden), **conexiones sorprendentes** (score compuesto:
code-paper > code-code), **preguntas sugeridas**, cache SHA256 para `--update` incremental,
`--neo4j` (cypher.txt), `--mcp`.

## Principios portados (los que implementamos en `packages/core/src/tools/knowledge-graph.ts`)

1. **Todo edge lleva tag honesto**: `EXTRACTED` (encontrado explícito en la fuente),
   `INFERRED` (deducido por co-ocurrencia) o `AMBIGUOUS` (dudoso — sin corroboración). El grafo
   nunca confunde "lo que encontramos" con "lo que adivinamos". Nuestra variante: AMBIGUOUS =
   el concepto solo aparece en UNA fuente.
2. **Doble pase de construcción**: registrar todas las fuentes primero, decidir tags después —
   así el tag de un edge no depende del orden de procesamiento (lección real del test).
3. **La co-ocurrencia corrobora, no degrada**: si un edge ya es EXTRACTED, co-ocurrencias
   posteriores suman peso pero nunca lo bajan a INFERRED.
4. **Cache SHA256**: `planGraphUpdate(cache, files)` → `{changed, removed, unchanged}` — solo
   reprocesar lo que cambió (igual que el sync de Qdrant de la FASE 4).
5. **Salidas listas para consumir**: reporte Markdown, cypher Neo4j (solo generación, nunca
   ejecuta), wiki por comunidad — todo determinista y sin LLM en el camino.
6. **Comunidades deterministas**: greedy de modularidad simple (vecinos compartidos ponderados,
   ≤20 iteraciones) — sin dep de NetworkX/Leiden, con el mismo resultado entre ejecuciones.

## Mapeo a UltraIa

| Principio graphify | En UltraIa | Notas |
|---|---|---|
| graph.json persistente | `KnowledgeGraph {nodes, edges}` + runner | `resultTask/graph/graph.json` |
| edges EXTRACTED/INFERRED/AMBIGUOUS | `EdgeTag` con doble pase | honestidad de evidencia |
| god nodes | `godNodes(g, k)` grado desc | empates por id (determinista) |
| comunidades (Leiden) | `findCommunities(g)` greedy | sin deps, determinista |
| conexiones sorprendentes | `surprisingConnections(g, k)` | cross-kind ×2, rareza |
| preguntas sugeridas | `suggestedQuestions(g, k)` | relleno genérico si el grafo es pobre |
| cache SHA256 / --update | `planGraphUpdate` | mismo patrón qdrant-memory |
| GRAPH_REPORT.md | `graphReportMarkdown` | god nodes + comunidades + sorpresas + preguntas |
| cypher.txt (Neo4j) | `buildNeo4jCypher` | solo genera, no ejecuta |
| wiki/ | `buildWikiMarkdown` | índice por comunidad |
| graph.html (vis.js) | `graph.svg` (Dark Obsidian, sin JS) | a11y, offline — patrón diagram.ts |
| --mcp | DIFERIDO | tool `graph_manage` cuando llm.ts se libere |
| extracción con LLM | keyless (tokenize + bigrams) | el dominio NO depende del extractor |

**Fuera del alcance (decidido)**: vis.js/html interactivo (SVG estático del proyecto es
consistente con diagram.ts), watch de carpetas, y la extracción LLM (el runner keyless es la
demostración; el dominio acepta `FileExtract` de cualquier extractor futuro).

## Runner real (`Task/knowledge-graph.ts`)

- `vite-node Task/knowledge-graph.ts` → lee `learning/sources/*.md` (kind `paper`) +
  `docs/RAZONAMIENTO-*.md` (kind `doc`) + `learning/truth/*.json` (kind `note`), extrae
  conceptos (tokenize + bigrams, filtro de plantilla, **concepto solo si aparece en ≥2
  fuentes**) y relaciones `[[...]]`, construye el grafo y escribe
  `resultTask/graph/{graph.json, GRAPH_REPORT.md, wiki/index.md, cypher.txt, graph.svg,
  README.md}` (idempotente).
- Verificado 20/08/2026 sobre 62 fuentes reales: **173 nodos, 1452 edges** (1449 INFERRED +
  3 AMBIGUOUS), **9 comunidades**. God nodes: sources, instagram, readme, estado, líneas...

## Verificación

- Tests: `knowledge-graph.test.ts` **18 PASS** (dedupe, EXTRACTED con peso corroborado,
  INFERRED por co-ocurrencia, AMBIGUOUS de una sola fuente, edge auto descartado, god nodes,
  comunidades deterministas, sorpresas cross-kind, preguntas con relleno, stats, cache SHA256,
  report/cypher/wiki).
- Gates FULL de la iteración (con cuarentena del WIP ajeno roto — protocolo ronda 19/08):
  typecheck 0 · lint 0 · test **1228 PASS** (core 1035/1035 + runtime 193/193) · build 0.
  (35 tests nuevos: brain 17 + knowledge-graph 18.)

## Pendiente

- **Wiring**: capability `knowledge_graph` → tool `graph_manage` (acciones build/report/cypher/
  wiki/plan) en `ai/llm.ts` + export en `tools/index.ts` — diferido (mismo patrón qdrant-memory).
- Extractor con LLM opcional: el dominio acepta `FileExtract`; con el proveedor configurado se
  podrían extraer conceptos/relaciones de mejor calidad y re-ejecutar el runner.

## Lecciones

- El tag de un edge se decide con el PANORAMA COMPLETO de fuentes (doble pase), no mientras se
  construye: decidir sobre datos parciales produce AMBIGUOUS falsos (lección real del test
  `relations explicitas -> EXTRACTED`).
- La extracción keyless de conceptos produce ruido de plantilla ("fuente", "fecha",
  "iteración") → stop-list + umbral de ≥2 fuentes; el DOMINIO (lo testeado) no depende del
  extractor, así el pipeline puede mejorar sin tocar los tests.