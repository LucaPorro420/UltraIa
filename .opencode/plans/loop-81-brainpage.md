# Plan — loop-81: capability `brainpage` (port de los principios de brain.md)

**Fecha**: 21/08/2026 · **Iteración**: 81 · **Autoría**: sesión principal (continuación de loop-80)
**Fuente**: `learning/sources/brain-md.md` (MindMux brain.md, Apache-2.0 — diferida de iter-74 junto con graphify.md que ya cerró en loop-80).
**Aprobación**: usuario "A y B" (21/08) — A = continuar loop-81 con brain-md; B = push loop-80 (YA HECHO: `2de1668..80e317a`).

## Contexto

`brain.md` es una capa de memoria persistente para coding agents: un directorio `brain/` de
páginas Markdown, cada una con `compiled_truth` (entendimiento actual, reescribible) + `timeline`
(append-only, cadena de evidencia). La garantía central: **`update-truth` reescribe la verdad y
registra el porqué en UNA escritura atómica** → la verdad no puede cambiar sin dejar rastro.
"Correct by construction, no validator": el CLI es el único escritor.

UltraIa YA tiene `brain.ts` de la sesión concurrente #25 (DO-NOT-TOUCH, ver AGENTS loop-constraints).
Esta iteración NO toca `brain.ts`/`brain.test.ts`: hace un **port ORIGINAL de los PRINCIPIOS** como
capability `brainpage` (archivo nuevo `brainpage.ts`, directorio `.ultraia/brainpage/` para no
colisionar con un `brain/` real ni con el feature de #25).

## Diseño (dominio puro determinista, keyless, cero deps)

`packages/core/src/tools/brainpage.ts`:
- **Tipos**: `BrainPage { id, category, title, createdAt, updatedAt, truth, timeline: TimelineEntry[] }`,
  `TimelineEntry { kind, summary, at }`, `BrainCategory` ('decision'|'architecture'|'constraint'|'learning'|'fact').
- `resolveBrainRoot(root?)` → default `.ultraia/brainpage`.
- `normalizeId(id)` → slug estricto (rechaza `..`/separadores → anti path-traversal).
- `initBrain(root?)` → idempotente: crea `pages/` + `BRAIN.md` (protocolo, doc estática) + `index.json`.
- `createPage(root, {id, category, title, summary})` → página nueva; falla si ya existe (`{ok:false}`).
- `readPage(root, id)` → parsea frontmatter + `## compiled_truth` + `## timeline`; `{ok:false}` si falta.
- `updateTruth(root, id, summary)` → **atómico**: reescribe `compiled_truth` + append timeline
  `{kind:'truth', summary, at}` en un solo `atomicWrite` (temp + rename). Nunca pierde el timeline previo.
- `appendTimeline(root, id, kind, summary)` → append timeline entry (atómico).
- `listPages(root)` → ids de `pages/*.md`.
- `reindex(root)` → `index.json` con metadata por página (id/category/title/updatedAt).
- `lintLinks(root)` → detecta `[[id]]`/`ref:<id>` rotos (página destino inexistente).
- `atomicWrite(filePath, content)` → escribe a `<file>.tmp` y `rename` (garantía atómica en mismo FS).
- `serializePage`/`parsePage` deterministas (frontmatter manual, sin dep yaml).

## Wiring

- `ai/llm.ts`: `if (opts.tools?.includes('brainpage'))` → tool `brainpage_manage`
  (acciones init/create/read/update/append/list/reindex/lint; param `root` default `.ultraia/brainpage`;
  fs vía `node:fs/promises` import dinámico).
- `tools/index.ts`: `export * from './brainpage'` (sin colisión TS2308 — módulo nuevo, símbolos únicos)
  + `import * as brainpage` + `tools.brainpage` + `TOOL_DESCRIPTIONS.brainpage` + `Capability 'brainpage'`.

## Archivos a tocar (explícitos, pathspec)

- `packages/core/src/tools/brainpage.ts` (NUEVO)
- `packages/core/src/tools/brainpage.test.ts` (NUEVO, ~22 tests)
- `packages/core/src/tools/brainpage.wiring.test.ts` (NUEVO, 4 tests)
- `packages/core/src/ai/llm.ts` (wiring tool, ADITIVO)
- `packages/core/src/tools/index.ts` (export/namespace/TOOL_DESCRIPTIONS/Capability, ADITIVO)
- `docs/RAZONAMIENTO-BRAINPAGE.md` (NUEVO, análisis + mapeo)
- `.opencode/plans/loop-81-brainpage.md` (este plan)

## NO-hacer (regla #25)

NO tocar `brain.ts`, `brain.test.ts`, `knowledge-graph.ts`, `knowledge-graph.test.ts`, recorder,
automation, media-synthesis, ni vault internos. El wiring en `llm.ts`/`index.ts` es ADITIVO.

## Criterios de verificación

- **Scoped**: `vitest brainpage.test.ts brainpage.wiring.test.ts` → ~26 PASS; `tsc core --noEmit` 0;
  grep del diff `llm.ts`/`index.ts` contra `brain`/`knowledge-graph`/`recorder`/`automation` → 0 refs ajenas.
- **FULL** (orden CI): typecheck 0 → lint 0 → test (core ~1147 + runtime 193) → build 0 (sin dev servers).
- Predicción: scoped ~26 PASS + tsc 0; FULL typecheck/lint/test/build 0; commit pathspec ~7 archivos.

## Riesgos / mitigación

- Escritura a disco en tests → usar `os.tmpdir()` aislado (sin red, determinista).
- Path-traversal → `normalizeId` rechaza `..` y separadores.
- Índice no debe colisionar con `vault` (#25) → directorio propio `.ultraia/brainpage/`.
