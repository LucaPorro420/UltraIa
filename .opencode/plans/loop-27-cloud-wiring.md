# Plan loop-27 — Wiring capability `cloud` en llm.ts/index.ts

## Contexto
- Tarea #27 (UltraIA Cloud, commit `046dfcf`) implementó `packages/core/src/tools/cloud.ts`
  (dominio + adapters + CloudService + tool `cloud_files` + handler) y dejó **DIFERIDO** el
  registro en `ai/llm.ts` + export en `tools/index.ts` porque esos archivos estaban sucios por
  la sesión concurrente #25 (media-automation). STATE.md → High Priority.
- Hoy `git status`: `llm.ts` y `index.ts` están LIMPIOS (sin diff). El blocker desapareció.
- `cloud.ts` ya exporta `cloudTools` (schema + description) y `createCloudFilesHandler(adapter)`
  para que el wiring sea un añadido trivial (comentado en el propio archivo, líneas 10-13).

## Objetivo
Registrar la capability `cloud` → tool `cloud_files` en `ai/llm.ts` y exportar el namespace
`cloud` en `tools/index.ts`, siguiendo el patrón exacto de `screenflow` (iteración 24).

## Pasos
1. `packages/core/src/tools/index.ts`:
   - `export * from './cloud'`
   - `import * as cloud from './cloud'` (namespace ya exporta `cloudTools`, `cloudFilesTool`, ...)
   - agregar `cloud` al objeto `tools`
   - agregar entrada `cloud:` en `TOOL_DESCRIPTIONS`
   - agregar `'cloud'` al union type `Capability`
2. `packages/core/src/ai/llm.ts`:
   - import: `import { cloudFilesTool, createCloudFilesHandler, LocalCloudAdapter, R2CloudAdapter } from '../tools/cloud';`
   - registro `if (opts.tools?.includes('cloud'))`: `tools.cloud_files = tool({ description: cloudFilesTool.description, parameters: cloudFilesTool.inputSchema, execute: ... })`
   - adapter runtime: `LocalCloudAdapter(process.env.ULTRAIA_CLOUD_DIR ?? join(process.cwd(), '..', '..', '.ultraia', 'cloud'))`; si `CLOUDFLARE_R2_WORKER_URL && CLOUDFLARE_R2_TOKEN` → `R2CloudAdapter` (mismo patrón que `apps/web/src/app/api/cloud/providers.ts`).

## Archivos a tocar
- `packages/core/src/tools/index.ts`
- `packages/core/src/ai/llm.ts`
- `.opencode/plans/loop-27-cloud-wiring.md` (este plan)
- `loop-run-log.md` + `STATE.md` (registro del ciclo)

## NO tocar (sesiones concurrentes)
- `recorder.ts`/`automation.ts`/tests, `docs/AUTOMATION-WEB.md`, `docs/RAZONAMIENTO-MEDIA-AUTOMATION.md`,
  `learning/sources/media-automation.md`, `scripts/web-automation.py`
- `blueprint.ts`/`blueprint.test.ts`, `reach.ts`/`reach.test.ts`, `shared/domain.ts` (modificados,
  sin commitear, de la sesión game-dev)
- `DOCS_TODO.md`, `enlaces.txt`

## Criterios de verificación
- Scoped: `npx vitest run packages/core/src/tools/cloud.test.ts` → 27 PASS
- FULL (orden CI): `npm run typecheck` → `npm run lint` → `npm run test` → `npm run build`
  (antes del build: matar dev servers; si `.next` stale → borrar)
- Commit: staging explícito de los archivos del plan, NUNCA `git add .`

## Riesgos
- Sesión concurrente #25/game-dev puede tocar llm.ts/index.ts a mitad del ciclo → guardar diff
  antes; si se ensucia, aislar y restaurar (patrón iteración 25).
- `process.cwd()` en tests de core = `packages/core` → `..\..` = repo root (igual que providers.ts
  que usa cwd=apps/web). LocalCloudAdapter es fail-soft si el dir no existe (tests lo verifican).

## Esfuerzo
Bajo (añadido trivial ~60 líneas en 2 archivos + registros).