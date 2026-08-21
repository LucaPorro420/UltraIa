# RAZONAMIENTO-QDRANT-MEMORY.md — FASE 4: persistencia externa de la memoria verificada

**Fecha**: 20/08/2026 · **Iteración**: 76 (plan del agente de autoaprendizaje, FASE 4)
**Estado**: IMPLEMENTADA (dominio + tests + runner real; wiring a llm.ts/index.ts CERRADO en iter-78;
**embeddings densos reales (signed feature hashing, dim 1024) en iter-79** — cierra el último pendiente).

## Contexto

El diseño SACD/NASA (learning/sources/sacd-nasa.md, `docs/RAZONAMIENTO-SACD.md`) propone
Qdrant/Chroma para "memoria semántica y experiencial". `semantic-memory.ts` (iter-72) resolvió
la recuperación en **memoria pura** (hash bag + coseno) — suficiente para el corpus local, pero
sin persistencia entre sesiones ni escala. La FASE 4 cierra esa brecha: las lecciones verificadas
(`learning/truth/*.json`) se persisten en un **Qdrant real** (Docker, `sacd_system/`) con el
esquema que ya usaba `nucleo_nasa.py` (colección `memoria_experiencial`, vector dim 4, Cosine).

## Contrato implementado (`packages/core/src/tools/qdrant-memory.ts`)

- **Puro/determinista** (patrón cloud.ts/video-edit.ts):
  - `embedDense4(text)` — vector denso dim 4 derivado del embedding esparcido (4 buckets por
    hash, normalizado). Estable entre procesos; sin deps.
  - `pointIdFor(docId)` — id entero positivo estable (djb2, uint31) para upsert idempotente.
  - `buildQdrantPoint(doc)` — punto completo (id + vector + payload con tipo/fuente/texto/respuesta).
  - `planMemorySync(corpus, remoteIds)` — diff puro: crear/actualizar/borrar/sinCambio, orden id asc.
  - `buildUpsertBody` / `buildSearchBody` — cuerpos JSON inspeccionables.
- **Cliente REST fail-soft keyless** (`createQdrantClient`):
  - `collectionExists` (404 = no existe, respuesta válida), `ensureCollection` (PUT idempotente
    con esquema fijo), `upsertPoints` (PUT ?wait=true), `search` (POST, ordena score desc),
    `deletePoints` (DELETE por ids). Fetch **inyectable** (tests con fake, cero red).
  - Timeout AbortController 5s; errores → `{ok:false, razon}` (nunca lanza).
- `syncMemoryToQdrant(client, corpus, remoteIds)` — orquestador: asegura colección → upsert
  crear+actualizar → borra retirados; resumen accionable vía `memorySyncSummary`.

## Runner real (`Task/sync-qdrant.ts`)

- `vite-node Task/sync-qdrant.ts` — sincroniza TODO `learning/truth/*.json` contra Qdrant.
- Flags: `--dry-run` (solo plan), `--url=<base>`, `--search "<query>"` (búsqueda top-5).
- Salida: `resultTask/qdrant/memory-sync.json` + `README.md` (idempotente).

## Verificación (20/08/2026, Qdrant real en :6333)

- Sync real: **49 docs → 49 puntos** upserted; colección green (50 puntos con el 1 de nucleo_nasa.py).
- `--search "area del circulo"` → recupera "Calcula el area de un circulo de radio 7" en top-3 (0.954).
- Tests: `qdrant-memory.test.ts` **25 PASS** (fake fetch, sin red).
- Gates FULL (con cuarentena del WIP ajeno roto — protocolo ronda 19/08):
  typecheck 0 · lint 0 · test **1195 PASS** (core 1002/1002 + runtime 193/193) · build 0.
- Cuarentena de 5 archivos ajenos (research.ts, vault.ts, vault.test.ts, pdfsearch.ts,
  pdfsearch.test.ts) restaurada **byte-exacta** (SHA-256 verificado).

## Pendiente

- ~~**Wiring** en `ai/llm.ts` + `tools/index.ts`~~ → **CERRADO en iter-78 (20/08/2026)**:
  capability `qdrant_memory` → tool **`qdrant_memory_sync`** con 4 acciones (`plan` diff puro sin
  red, `sync` ensure+upsert+delete, `search` top-k por significado, `stats` corpus + config +
  alcanzabilidad); el corpus por defecto sale de `semanticMemory.loadTruthAuto()` y se puede
  sustituir con `corpusJson`. En `tools/index.ts` el re-export es **explícito** (no `export *`):
  `qdrant-memory.ts` re-exporta `TruthDoc` y `tokenize` de `semantic-memory`, así que un
  `export *` habría dado TS2308 (mismo patrón que el fix `MemoryHit` de iter-72). Tests de
  wiring: `qdrant-memory.wiring.test.ts` (4).
- ~~Fila 76 en STATE.md / entrada en loop-run-log.md~~ → **registradas en iter-77** (fila 76 con
  hash `f675e14` + entrada `[R]`).
- ~~Embeddings reales~~ → **CERRADO en iter-79 (21/08/2026)**: el vector denso dim 4 NO
  discrimina (coseno medio 0.9055 entre pares distintos del corpus real de 54 docs) y dejaba
  **38 de 54 casos invisibles** (formato "verdad verificada" sin `prompt` → texto `''` → vector
  nulo). Dos fixes: (1) `caseSearchText` compone el texto buscable desde `CASE_TEXT_FIELDS`
  (`note`/`usage`/`source`/...) cuando no hay `prompt`; (2) `embedDense` (signed feature hashing,
  Weinberger 2009 — `hash % dim` con signo `+1/-1`, normalizado) reemplaza a `embedDense4` en la
  colección **`memoria_experiencial_v2`** (dim 1024, Cosine). `embedDense4`/`memoria_experiencial`
  se conservan como **v1 legacy** (consumidor Python `nucleo_nasa.py` + rollback). La recuperación
  `searchExternalMemory` hace dos etapas: candidatos por vector denso (recall@10 = 1.000) +
  rescoring con el coseno esparcido EXACTO del payload. `Task/bench-embeddings.ts` mide el corpus
  real (leave-one-out, sin etiquetas): r@1 texto/respuesta/mutada = 100%/85.2%/98.1%, coseno medio
  0.032 (criterio <= 0.35) — **ACEPTADO**.
- Decide si `sacd_system/` Qdrant se levanta siempre con el dev server o a demanda (no bloqueante).

## Lecciones

- Qdrant devuelve **404** en GET de colección inexistente → es una respuesta VÁLIDA (no error):
  el cliente debe distinguir 404 de otros fallos (devolver `status` en el resultado).
- djb2 con un char de diferencia al final del string produce hashes **consecutivos**
  (`'truth_demo_1'` vs `'truth_demo_2'` difieren en 1) — en tests, los ids "retirados" deben
  elegirse fuera del rango del corpus para no colisionar.
- El diff por ids remotos requiere conocer el estado remoto; Qdrant no expone ids por GET simple,
  por eso `planMemorySync` acepta `remoteIds` (checkpoint previo en memory-sync.json) y el upsert
  por id hace el sync idempotente de todos modos.