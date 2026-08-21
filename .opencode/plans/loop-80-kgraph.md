# Plan — Iteración 80: Knowledge Graph builder (`kgraph`, port de `graphify`)

**Fecha**: 21/08/2026 · **Modo**: build (aprobado en plan mode, "iniciar")

## Contexto
- Backlog 1–79 DONE. `enlaces.txt` pendientes (IG/FB) bloqueados por humano. Las 2 fuentes
  diferidas en iter-74 (`brain-md.md`, `graphify.md`) mapean a módulos de la sesión concurrente #25
  (`brain.ts`/`knowledge-graph.ts` → do-not-touch). `graphify` es portable sin colisión: nuevo
  módulo `kgraph.ts` + capability `kgraph` (verificado: cero refs a `kgraph` en el repo).
- Complementa el stack de memoria (semantic-memory = vector, qdrant = experiencial, vault = archivos)
  con **estructura de grafo + navegación con reducción de tokens** (patrón graphify: 71× menos
  tokens por query). Port ORIGINAL de los PRINCIPIOS (NO código copiado), keyless-first, determinista.

## Archivos a tocar (todos NEW / aditivos)
- `packages/core/src/tools/kgraph.ts` — dominio puro/determinista, cero deps, keyless-first.
- `packages/core/src/tools/kgraph.test.ts` — ~22 tests.
- `packages/core/src/tools/kgraph.wiring.test.ts` — 4 tests (descriptor/namespace/Capability/export).
- `packages/core/src/ai/llm.ts` — `if (opts.tools?.includes('kgraph'))` → tool `kgraph_build`
  (acciones build/report/svg/analyze) — merge ADITIVO (no tocar bloques #25).
- `packages/core/src/tools/index.ts` — `export * from './kgraph'` + `import * as kgraph` +
  namespace en `tools` + `TOOL_DESCRIPTIONS.kgraph` + union `Capability` `'kgraph'`.
- `docs/RAZONAMIENTO-KGRAPH.md` — análisis + mapeo implementado/parcial/pendiente + diseño provenance.
- `.opencode/plans/loop-80-kgraph.md` — este plan.

## NO-hacer (do-not-touch #25)
`brain.ts`, `brain.test.ts`, `knowledge-graph.ts`, `knowledge-graph.test.ts`, recorder,
automation, media-synthesis, vault internos. Merge en `llm.ts`/`index.ts` es **aditivo**.

## Diseño (`kgraph.ts`)
- `parseCode` (regex/AST-lite, cero deps): nodos `sym:`/`file:` + edges `EXTRACTED`
  (imports vía `from`/`require`, calls vía región de definición).
- `parseDoc` (`.md/.txt/.rst`): nodos `concept:`/`heading:`/`file:` + edges `INFERRED`
  (co-ocurrencia en ventana deslizante + heading→concept), stopwords es/ar/en.
- `buildGraph`: orquesta, normaliza ids (`slug`), dedupe nodos (conceptos compartidos entre
  docs → conexión cross-doc) y edges.
- `analyzeGraph`: god nodes (grado máx), surprising connections (cross-type, score), suggested questions.
- `buildGraphJson` / `buildGraphReport` (`GRAPH_REPORT.md`) / `buildGraphSvg` (Dark Obsidian, a11y).
- Provenance tags `EXTRACTED`/`INFERRED`/`AMBIGUOUS` (AMBIGUOUS reservado para enrichment LLM futuro, fail-soft).
- Sin LLM obligatorio; `opts.model` es hook futuro (degrada a determinista).

## Criterios
- Scoped: `vitest kgraph.test.ts` (~22 PASS) + `kgraph.wiring.test.ts` (4) + `tsc core --noEmit` 0.
- FULL (orden CI): typecheck 0 → lint 0 → test 0 (core ~1312 = 1286+26, runtime 193) → build 0.

## Predicción
gates GREEN; `kgraph_build` operativo; `GRAPH_REPORT.md` generable desde corpus sintético;
commit + bitácora con fila 80 en STATE.md.

---

## TOMA DE CONTROL — RECUPERACIÓN (21/08/2026 19:50, sesión r80-UTEC-5695-20260821-PIVB)

### Evidencia de abandono de la sesión original (#25)
- Plan escrito 18:08:06; implementación completa escrita entre 18:09:59 y 18:14:55
  (kgraph.ts 12.274 B, kgraph.test.ts, kgraph.wiring.test.ts, wiring en llm.ts/index.ts,
  RAZONAMIENTO-KGRAPH.md). Última escritura del árbol: 18:14:55.
- Dos observaciones independientes sin progreso: r79-COWORK 18:58 ("WIP ajeno de kgraph,
  NO tocado") y esta sesión 19:27/19:49 (mtimes idénticos). 95+ min estático = sesión
  interrumpida antes de correr gates ni commitear (cero refs a iter-80 en run-log).
- Precedentes aplicables: iter-77 recuperó iter-75 idéntica situación; "quien commitea
  primero gana" (36/42); lección LEARNINGS 20/08: "trabajo implementado != trabajo
  commiteado" — verificar scoped tests + tsc + grep de símbolos ajenos ANTES de commitear.

### SPEC de la recuperación (lo que ESTA iteración garantiza)
1. Verificar que el WIP existente cumple el plan original: vitest kgraph.test.ts +
   kgraph.wiring.test.ts GREEN, tsc core 0 propios.
2. El diff de llm.ts/index.ts contiene SOLO kgraph (+46/+10 líneas verificadas con git diff)
   — sin arrastre de símbolos #25 (brain/knowledge-graph/recorder/automation).
3. Completar huecos si los hay (máx 3 intentos de fix; si RED persistente → High Priority).
4. Gates FULL en orden CI y commit CON PATHSPEC solo de los archivos del plan.
5. Fila 80 en STATE.md DONE con hash real + entrada [P]/[I]/[V]/[R] en bitácora + JSON presupuesto.

### MEJORAS A ADICIONAR (respecto al plan original)
- Aterrizaje verificado de la capability `kgraph`: capa de GRAFO del stack de memoria
  (semantic-memory=vector, qdrant=experiencial, vault=archivos, kgraph=estructura+navegación).
- Sin cambios de diseño sobre lo ya escrito por #25 salvo defecto demostrable (no duplicar,
  no rediseñar: la toma es de verificación/aterrizaje).

### TECNOLOGÍAS EVALUADAS
- Fuente graphify (learning/sources/graphify.md, diferida en iter-74): principios portados
  por #25 (parse code/doc regex-lite cero deps, provenance EXTRACTED/INFERRED, god nodes,
  SVG Dark Obsidian). Neo4j descartado para este ciclo (sacd_system queda como referencia
  Docker paralela — misma decisión que iter-69).

### RECURSOS / PRESUPUESTO
- Presupuesto ciclo: ~40 min / dentro del cap diario (10 ciclos, 100k tokens, 6h).
- Tools: vitest core, tsc --noEmit, npm gates FULL, git pathspec.

### NO-hacer (ampliado)
- NO tocar: DOCS_TODO.md (hook post-commit auto-generado), resultTask/qdrant/* (artefactos
  e2e regenerados por 79b), SACD-P2..P6/, RoadMapLearning/ (material usuario sin analizar),
  brain.ts/knowledge-graph.ts/recorder/automation (#25), .env*/auth/payments/secrets.
- NO push/merge. NO borrar .next innecesariamente (lección RED CAÍDA; comprobar red si se
  requiere limpiar). NO crear segundo plan file de task 80 (check-13 colisión).

### PREDICCIÓN (falsable, medible)
- Scoped: vitest kgraph → ~26 PASS (22+4); tsc core EXIT 0. Si falla algo, ≤3 fixes.
- FULL: typecheck 0 / lint 0 / test ≈1312 total (1286 baseline +26) / build 0 (44 págs).
- Commit pathspec (~7 archivos código+docs+plan) + commit bitácora (STATE.md + run-log).
- Riesgo principal: tests del WIP interrumpido no compilan/pasan → fix ≤3 intentos.

### TOLERANCIAS
- Si kgraph.test.ts tiene fallos puntuales: arreglar en el propio archivo (es del plan).
- Si el wiring de llm.ts/index.ts estuviera incompleto: completarlo aditivamente.
- Si >3 intentos de fix o conflicto con sesión reanimada (#25 mtime nuevo): CEDE — liberar
  lock, registrar SKIP en bitácora, escalar a High Priority.
