# Loop 52 — Screenflow mejoras: hot watch + cola Publication (local)

## Contexto
- Screenflow (capability `screenflow`) ya tiene:
  - `resolveHotWatch` — detecta scripts JSON nuevos en `.ultraia/hot`
  - `buildPublicationPackage` — crea `PublicationPackage` canal `blog` desde un run
  - Runner CLI (`Task/run_screenflow.ts`) — ejecuta pipeline completo (dry-run OK)
  - Dominio publicaciones (`packages/core/src/domain/publications.ts`) — `createPublication` con Prisma
- **Falta**: hot watch **runner** que vigile la carpeta, ejecute scripts y cree la Publication en la cola (blog → auto-approve).

## Objetivo
1. **Hot watch runner** (`Task/screenflow-hot-watch.ts`):
   - Poll `.ultraia/hot` cada N segundos (configurable, default 10s)
   - Usa `resolveHotWatch` para detectar nuevos `*.json`
   - Para cada nuevo: ejecuta `run_screenflow.ts` (spawn) con `--dry-run=false`
   - Si éxito: `createPublication` (blog, auto-approve) + `guardarPaqueteEnCloud` (opcional)
   - Mueve el script procesado a `.ultraia/hot/done/` (o borra)
   - Logs estructurados + fail-soft (un script fallido no tumba el watch)
   - Flags: `--interval`, `--once` (un solo barrido), `--db` (usa Prisma), `--cloud` (inyecta CloudService)
2. **Tests**: unitarios (`resolveHotWatch` ya tiene tests) + integración del runner (mock spawn + Prisma in-memory).
3. **Docs**: `docs/SCREENFLOW.md` sección hot watch + cola.
4. **Gates FULL** intactos.

## ARCHIVOS A TOCAR
- `Task/screenflow-hot-watch.ts` (NUEVO — runner del hot watch)
- `packages/core/src/tools/screenflow.ts` (si hace falta helper para spawn/runner)
- `packages/core/src/tools/screenflow.test.ts` (tests nuevos del runner)
- `docs/SCREENFLOW.md` (sección hot watch + cola)

## Criterios
- Scoped: typecheck core 0, lint 0, test screenflow 22+ (nuevos tests runner).
- FULL: typecheck/lint/test/build EXIT 0.
- Runner: `node_modules\.bin\vite-node.cmd Task/screenflow-hot-watch.ts --once` → detecta 1 script, ejecuta, crea Publication en DB.

## Riesgos
- Spawn del runner real (`run_screenflow.ts`) en tests → usar mock/in-memory.
- Prisma en tests → usar `@prisma/client` mock o DB SQLite en memoria (ya hay patrón en `publications.test.ts`).
- Concurrencia hot folder → `resolveHotWatch` es idempotente, mover archivo tras procesar evita duplicados.

## Esfuerzo
Medio (runner + tests + docs ≈ 45 min).