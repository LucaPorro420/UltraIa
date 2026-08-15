# MEMORY_SYSTEM.md — Memoria estructurada del runtime

Directorio: `.ultraia/memory/` (default `entries.json`). Complementa — no reemplaza —
el loop verificado de `learning/` (verdad para prompts; el runtime alimenta sus fuentes,
no las sobrescribe).

## Tipos de memo

`PROJECT` · `ARCHITECTURE` · `MODULE` · `TASK` · `ERROR` · `SOLUTION` · `DECISION` ·
`LEARNING` · `USER_PREFERENCE` · `PERFORMANCE`

## Entry

```ts
interface MemoryEntry {
  id: string;              // random
  type: MemoryType;
  source: string;          // 'task', 'module:video', 'runtime.stop'...
  content: string;
  importance: number;      // 0..1 (clamp); default 0.5
  confidence: number;      // 0..1 (clamp); default 0.7
  createdAt / updatedAt: string;
  projectId?: string; moduleId?: string;
  hash: string;            // sha256(16) del contenido → dedup
}
```

## Reglas

- **No guardar indiscriminadamente**: `store()` deduplica por hash de contenido
  (actualiza importance/confidence al máximo) y `persist()` solo escribe entradas
  con `importance >= persistThreshold` (default 0.3).
- **Eviction**: con `maxEntries` (default 2000), se evictan las de menor score.
- **Score de recuperación** (`score(entry, query)`): `importance × 0.5^(edad/halfLifeMs)`
  + bonus `+0.25 × tokens de query coincidentes` (recency half-life default 7 días).
- **Nunca volcar toda la memoria**: `search()` filtra por tipos/importancia, ordena por
  score, corta por `limit` (default 20) y descarta score <= 0.

## MemoryReport (cierre de sesión/tarea)

`generateReport({projectId?, includeLowImportance?})` → `{ sections: {Tipo: string[]},
recommendations (top 5 LEARNING), entryCount }`. `UltraRuntime.stop()` agrega un reporte
y guarda un memo `PROJECT` de cierre.

## ContextSelector (presupuesto de contexto)

- `select(items, {budgetChars=8000, maxItems=25})`: ordena por score, incluye hasta
  agotar el presupuesto (coste = longitud del texto), nunca incluye un ítem si no cabe
  tras haber incluido al menos uno; siempre conserva el top aunque exceda el presupuesto.
- `selectFromMemory(memory, {query, types, importanceMin, budgetChars})`: filtra por
  tipos/importancia, puntúa con `memory.score()` y devuelve las entradas seleccionadas
  con `[TIPO] contenido` en `text`.

## Persistencia

`JsonFileMemoryPersistence` (default) o inyectable vía `MemoryManagerOptions.persistence`
/ `RuntimeOptions.memoryPersistence`. `init()` carga al boot; `persist()` escribe solo si
hay cambios (`dirty`).