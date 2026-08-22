# RAZONAMIENTO-BRAINPAGE.md

Análisis y mapeo del patrón **brain.md** (`learning/sources/brain-md.md`, MindMux, Apache-2.0)
aplicado a UltraIa como capability `brainpage` (iter-81).

## Fuente

`brain.md` es una capa de memoria persistente para coding agents: un directorio de páginas
Markdown (`./brain` o `brainRoot` configurable) donde cada página lleva un `compiled_truth`
(entendimiento actual, reescribible) + un `timeline` (append-only, cadena de evidencia).
Principios rectores:

1. **Correct by construction, no validator** — el CLI es el único escritor; `update-truth`
   reescribe la verdad y registra el porqué en UNA escritura atómica → la verdad no puede
   cambiar sin dejar rastro. Las dos cosas que un validador solía guardar se vuelven
   estructuralmente imposibles de romper.
2. **Exactly one brain, location-independent** — un solo brain; todo comando resuelve su
   ubicación (vía `brainRoot`); las tools nunca crean un segundo brain sombra.
3. **Pure files, portable** — Markdown + un Node script; vive en el repo y viaja en git.

## Mapeo implementado

| brain.md | `brainpage.ts` (UltraIa) |
|---|---|
| `brain init` | `initBrain(root?)` → crea `.ultraia/brainpage/pages/` + `BRAIN.md` (idempotente) |
| `create-page --id --category --title` | `createPage(root, {id, category, title, summary})` |
| `read-page <id>` | `readPage(root, id)` → `{truth, timeline}` |
| `update-truth --id --summary` | `updateTruth(root, id, summary)` → **atómico**: rewrite truth + append timeline en un `atomicWrite` (temp + rename) |
| `append-timeline --id --kind --summary` | `appendTimeline(root, id, kind, summary)` |
| `list-pages` | `listPages(root)` |
| `reindex` | `reindex(root)` → `index.json` con metadata |
| `lint-links` | `lintLinks(root)` → detecta `[[id]]`/`ref:<id>` rotos |
| frontmatter generado | `serializePage`/`parsePage` (frontmatter manual, sin dep yaml) |

## Decisiones de diseño

- **Nombre `brainpage` (no `brain`)** — `brain.ts`/`brain.test.ts` pertenecen a la sesión
  concurrente #25 (DO-NOT-TOUCH). El port es ORIGINAL (principios, no código) y vive en un
  archivo nuevo `brainpage.ts` + directorio `.ultraia/brainpage/` para no colisionar con un
  `brain/` real ni con el feature de #25.
- **Atómico garantizado** — `atomicWrite` escribe a `<file>.<pid>.tmp` y hace `rename` (atómico
  en el mismo FS). Así `updateTruth` cumple la invariante "truth cambia solo con rastro".
- **keyless / determinista / cero deps** — igual que kgraph. Los timestamps aceptan `now`
  inyectado para tests reproducibles.
- **path-traversal-safe** — `normalizeId` rechaza `..`, `/`, `\`, espacios; el `id` nunca es
  una ruta.
- **Wiring aditivo** — `llm.ts` registra `brainpage_manage` solo si `opts.tools` incluye
  `'brainpage'`; `tools/index.ts` exporta el namespace + descriptor + `Capability 'brainpage'`.
  No se toca ningún archivo de #25.

## Verificación (gates FULL)

- `brainpage.test.ts` (22 tests): normalizeId, initBrain idempotente, create/read/duplicate/
  invalid, updateTruth atómico (truth+timeline, determinista), appendTimeline, listPages,
  reindex, lintLinks (roto/no roto), parse/serialize round-trip.
- `brainpage.wiring.test.ts` (3 tests): descriptor en TOOL_DESCRIPTIONS, namespace en `tools`,
  `Capability 'brainpage'` válido.
- typecheck/lint/test/build verdes (build sin dev servers).

## Lección reafirmada

Port de "principios" (no de código): reimplementar la idea con la API y los nombres propios de
UltraIa evita arrastrar deps ajenas y colisiones de namespace (ver kgraph, g0dm0d3, codevfx).
`export *` es seguro cuando el módulo nuevo no re-exporta símbolos de otros (sin TS2308).
