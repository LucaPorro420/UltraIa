# Loop 46 — Consolidación del árbol sucio + FULL verde

## Contexto
- 17-18/08/2026: dos sesiones concurrentes (#25 media-automation + game-dev) dejaron 26
  archivos sin commitear en `master`. El repo lleva 2 días sin FULL gates verdes.
- El usuario confirmó 18/08: **la sesión concurrente ya terminó** → consolidar el árbol.
- Reglas del bucle: staging explícito, commit solo con gates GREEN, máx 3 intentos por
  item roto, sin push sin aviso.

## Objetivo
Volver el repo a estado FULL verde (typecheck → lint → test → build) con `git status`
limpio, clasificando cada archivo sucio como: commit (work completo), fix (error TS
menor corregible) o revert (roto sin arreglo viable en 3 intentos → escalar).

## Pasos
1. Inventario: ver diff/estado de los 26 archivos → clasificar en 3 grupos.
2. Grupo A (commit): docs de media-automation/game-dev (AUTOMATION-WEB.md,
   RAZONAMIENTO-*, sources, web-automation.py) si están completos.
3. Grupo B (fix mínimo): blueprint.ts (Capability sin importar), reach.ts (provider
   literal), recorder.test.ts/automation.test.ts (races) — corregir solo el error,
   sin refactor.
4. Grupo C (diffs triviales): publish/telegram/discord/slack (.js→sin ext) — commitear
   si pasan gates (edge-compat del bundle).
5. Gates FULL en orden CI; limpiar `.next` stale y matar dev servers antes del build.
6. Commit de consolidación + bitácora (verificar `git log` antes — lección dd505cc).

## ARCHIVOS A TOCAR
- Inventario (26): ver `git status --porcelain` → decidir uno a uno.
- Fixes posibles: packages/core/src/domain/blueprint.ts, tools/reach.ts,
  tools/recorder.test.ts, tools/automation.test.ts.
- El resto: stage explícito tal cual está (sin tocar contenido).

## Criterios
- Scoped: typecheck core EXIT 0 (0 errores propios restantes) + suite core 739/739.
- FULL: npm run typecheck → lint → test → build, todos EXIT 0.
- `git status --porcelain` limpio después del commit.

## Riesgos
- Tests de recorder con race promise-first/testTimeout (fallos intermitentes) → máx 3
  intentos; si no ceden, aislar con decisión humana (no deshabilitar tests para CI verde).
- Diffs de la sesión concurrente con contenido inacabado (blueprint/reach) → si el fix
  mínimo no alcanza en 3 intentos, REVERTIR solo esos archivos y anotar en bitácora.

## Esfuerzo
Bajo (inventario + fixes menores + gates FULL ≈ 30-45 min).
