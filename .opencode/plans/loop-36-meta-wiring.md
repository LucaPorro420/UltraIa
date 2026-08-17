# Plan loop-36 — AutoPub F4 wiring de Meta (IG + Threads)

## Contexto
- Iteración 35 (`b28b0a9`) entregó `createInstagramAdapter` + `createThreadsAdapter`. Ahora
  Meta debe ser alcanzable desde la cola y la tool (mismo patrón que loop-33 con X).
- `markPublished` no mapea plataformas (guarda resultadoJson completo) → wiring mínimo.

## Objetivo
Meta en: `createDefaultPublishers({includeMeta})` (retrocompatible, default sin Meta),
`publishDue` (includeMeta:true, fail-soft sin token) y tool `publish_submit`
(params `toInstagram`/`toThreads`).

## Pasos
1. `tools/publish.ts`: `createDefaultPublishers(opts?: { includeX?: boolean; includeMeta?: boolean })` —
   base YT+TikTok; includeX → +X; includeMeta → +IG+Threads. Default sin cambios (tests existentes).
2. `domain/publications.ts`: `publishDue` → `createDefaultPublishers({ includeX: true, includeMeta: true })`.
3. `ai/llm.ts` `publish_submit`: description menciona Meta; schema `toInstagram`/`toThreads`
   boolean opcionales; adapters `createDefaultPublishers({ includeX: true, includeMeta: true })`;
   filtro con ramas youtube/tiktok/x/instagram/threads.
4. Tests: `publish.test.ts` +2 (includeMeta → 4 adapters fail-soft; includeX+includeMeta → 5),
   `publications.test.ts` +1 (publishDue con publishFn fake resultado ok platform 'instagram' →
   PUBLISHED; y con 'threads' también ok — uno basta, espejo de iteración 33).

## Archivos a tocar
- packages/core/src/tools/publish.ts (+ test)
- packages/core/src/domain/publications.ts (+ test)
- packages/core/src/ai/llm.ts

## Criterios de éxito
- Vitest 46/46 publish + publications 30/30; tsc parcial 0 errores propios; eslint limpio.
- FULL pendiente árbol limpio (#25 sigue activo).

## Riesgos
- llm.ts lo toca la sesión concurrente (harness ayer): verificar diff ANTES de editar
  (solo debe contener harness_manage + publish_submit regiones).
- Union platform ampliada: los ternarios de publish_submit se reescriben con ramas
  explícitas por plataforma (no ternario anidado).

## Esfuerzo
- Bajo (~40 líneas).