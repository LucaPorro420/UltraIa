# Plan — loop-148: animación procedural `fbm-flow` en `procvid.ts`

> Modo: build (auto-switch autorizado). Continuación de loop-146 (generadores fbm) y
> loop-147 (demo). Cierra el ciclo: el generador `fbm2D` ahora alimenta una animación de
> video procedural REAL. Dominio puro, keyless, determinista — sin tocar `llm.ts`/index/geom
> (sesión concurrente bloqueada, tasks 25/142).

## Contexto
`procvid.ts` ya tiene `'noise-flow'` (Simplex desplazado en el tiempo). Los nuevos
generadores de loop-146 incluyen `fbm2D` (fractal Brownian motion). Añadir `'fbm-flow'`
— misma estructura de flujo pero con fBm en lugar de Simplex — aporta textura fractal más
rica a los videos procedurales del repo, reusando código ya testeado. `procvid.test.ts`
itera sobre `PROCVID_ANIMATIONS` (línea 114), así que el nuevo kind queda cubierto
automáticamente por el test de rango RGB; se añade además un test explícito de
determinismo + diferenciación vs `noise-flow`.

## Objetivo
En `packages/core/src/tools/procvid.ts`:
- Importar `fbm2D` desde `./generative`.
- Agregar `'fbm-flow'` a `PROCVID_ANIMATIONS`.
- Agregar `'fbm-flow': 'neoViolet'` a `DEFAULT_PALETTE`.
- Agregar `case 'fbm-flow'` en `framePixelFn` (params: `scale`, `flowSpeed`, `warp`,
  `octaves`, `persistence`, `lacunarity`; usa `fbm2D` ×2 como el caso `noise-flow`).

En `packages/core/src/tools/procvid.test.ts`:
- Test explícito: `fbm-flow` determinista por (x,y,t) y distinto de `noise-flow`.

## ARCHIVOS A TOCAR
- `packages/core/src/tools/procvid.ts`
- `packages/core/src/tools/procvid.test.ts`
- `.opencode/plans/loop-148-procvid-fbm-flow.md` (este plan)

## NO-hacer
- NO tocar `llm.ts`/`index.ts`/geom/recorderly (sesión concurrente bloqueada).
- NO añadir agent tool / capability (el kind es consumido por el tool `procvid_render` ya existente).
- NO `npm run build` (cambio solo-core; dev server vivo en :3000; gates typecheck/lint/test verdes).

## Pasos
1. Edits en `procvid.ts` (import + array + palette + case).
2. Edit en `procvid.test.ts` (test explícito).
3. Gates: typecheck 0 · lint 0 · test core PASS (incluye cobertura automática de `fbm-flow`).

## Criterios de verificación (scoped + FULL en commit)
- `npm run typecheck` → 0; `npm run lint` → 0; `npm run test -w @ultraia/core` → PASS
  (procvid: rango RGB para todas las animaciones incl. `fbm-flow` + test explícito).

## TOLERANCIAS
- `fbm-flow` usa `fbm2D` con `octaves` clamp 1..8; misma firma de params que `noise-flow`.
- `framePixelFn` sigue siendo función pura cerrada (x,y,t) → RGB 0..255 (sin estado/red).

## Riesgos
- Bajo. Espejo exacto del caso `noise-flow` ya existente y testeado; mismo contrato.

## Esfuerzo
- P1 (pequeño, ~40 LOC + ~12 LOC test).

## Predicción (resultado esperado)
- `PROCVID_ANIMATIONS` incluye `fbm-flow`; test de rango automático lo cubre; test explícito
  PASS; gates verdes. Commit `feat(core): add fbm-flow animation to procvid` con pathspec
  (procvid.ts + procvid.test.ts + plan). Sin push.
