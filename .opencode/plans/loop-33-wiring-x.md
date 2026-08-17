# Plan loop-33 — AutoPub F4 wiring del canal X

## Contexto
- Iteración 32 (`8bc63b8`) entregó `createXAdapter`. Ahora el canal X debe ser alcanzable
  desde la cola de publicaciones y la tool del agente.
- `publishDue` usaba `createDefaultPublishers()` (YT+TikTok); la tool `publish_submit` filtraba
  `toYoutube`/`toTiktok` con un ternario sin rama X.

## Objetivo
Canal X en: `createDefaultPublishers({includeX})` (retrocompatible), `publishDue`
(includeX:true, fail-soft sin token) y tool `publish_submit` (param `toX`).

## Pasos (EJECUTADOS — commit 4a0aa78)
1. `tools/publish.ts`: `createDefaultPublishers(opts?: { includeX?: boolean } = {})` —
   default sin X (los tests existentes de publishToAll esperan 2).
2. `domain/publications.ts`: `publishDue` → `createDefaultPublishers({ includeX: true })`.
3. `ai/llm.ts` `publish_submit`: description menciona X; schema `toX: z.boolean().optional()`;
   adapters `createDefaultPublishers({ includeX: true })`; filtro ternario con rama X.
4. Tests: `publish.test.ts` +2 (default 2; includeX → 3 con X fail-soft),
   `publications.test.ts` +1 (resultado ok platform 'x' → PUBLISHED vía markPublished).

## Archivos a tocar
- packages/core/src/tools/publish.ts (+ test)
- packages/core/src/domain/publications.ts (+ test)
- packages/core/src/ai/llm.ts

## Criterios de éxito
- Vitest 54/54 (publish 27 + publications 29), tsc parcial 0 errores, eslint limpio.
- Gates FULL pendientes hasta árbol limpio (#25).

## Riesgos
- Nada de `createDefaultPublishers()` sin includeX en colas → default inalterado (test de
  regresión añadido).
- llm.ts tocado por #25? No — publish_submit no está en su lista (verificado).

## Esfuerzo
- Bajo (~40 líneas).
