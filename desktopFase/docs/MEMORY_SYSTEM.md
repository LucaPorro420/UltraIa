# Sistema de Memoria Local (Fase A)

`MemoryManager` + `JsonFileMemoryPersistence` (`packages/runtime/src/memory.ts`).

> Cross-ref: versión canónica verificada en `desktopFase/MEMORY_SYSTEM.md` (mismo contrato).
> Historial de movimientos y totales: `docs/HISTORIAL-PROYECTO.md`.

## Modelo

Entradas `MemoryEntry` (`types.ts`): `{ id, type, source, content, importance (0..1),
confidence (0..1), createdAt, updatedAt, projectId?, moduleId?, hash }`.

Tipos reales: `PROJECT | ARCHITECTURE | MODULE | TASK | ERROR | SOLUTION | DECISION |
LEARNING | USER_PREFERENCE | PERFORMANCE` (10 tipos, no los 7 de este doc antes del 15/08).

## Persistencia

- `.ultraia/memory/entries.json` — **un solo JSON** (no "uno por archivo"), vía
  `JsonFileMemoryPersistence` (default). `MemoryPersistence` inyectable (Fase C:
  adaptador a `@ultraia/core` / SQLite).
- **Dedup por hash sha256 del CONTENIDO** (`hashContent` → hex truncado a 16 chars):
  `store()` reutiliza la entrada existente y sube `importance`/`confidence` al máximo.
  Dedup NO incluye type/source — solo content.
- `init()` idempotente (carga al boot); `persist()` escribe solo si hay cambios (dirty),
  y solo entradas con `importance >= persistThreshold` (default **0.3**).
- Fallos de disco se registran sin romper el runtime.

## Scoring y eviction

- `score(entry, query)`: `importance × 0.5^(ageMs / halfLifeMs)` (half-life default **7 días**)
  + `+0.25 × tokens de query coincidentes` cuando hay query.
- `maxEntries` default **2000**: al superarlo, se evictan las de menor score
  (`evictIfOver`), sin tocar el resto.
- `search()`: filtra por tipos/importancia, ordena por score, `limit` default 20,
  descarta `score <= 0`.

## Selección de contexto

`ContextSelector` (`context.ts`) empaqueta contexto para el LLM con presupuesto:

- `select(items, {budgetChars=8000, maxItems=25})`: ordena por score, incluye lo que
  cabe en el presupuesto (coste = `text.length + 2`), conserva el top aunque exceda.
- `selectFromMemory(memory, {query, types, importanceMin=0.3, budgetChars})`: filtra por
  tipos + importancia; con query, exige que **algún token** aparezca en
  `content + source + type`.
- Devuelve `{ selected, text, usedChars, dropped }` — el prompt builder lo consume
  (Fase B: también expuesto vía `GET /memory` de la Local API).

## Aprendizaje (Fase E)

La memoria del runtime se conectará a `learning/` del repo (verdad verificada aparte,
`learning/truth/` + `verify.py`). La integración se hará vía adapter, sin tocar `packages/core`.

## Historial

- 15/08/2026: contrato corregido contra el código (tipos reales, entries.json único,
  hash solo de content, persistThreshold 0.3, maxEntries 2000, halfLife 7 días).