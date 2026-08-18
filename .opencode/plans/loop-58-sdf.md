# Plan loop-58 — Capability `sdf` (SDF + ray marching, núcleo procedural)

## Contexto
- Backlog STATE.md fila 58 (plan aprobado sesión principal): primitivas SDF (sphere/box/torus/capsule/plane) + ops (union/intersection/subtract/smooth) + ray-march planner + GLSL codegen + HTML canvas autocontenido (patrón codevfx) + tool `sdf_render` + wiring llm.ts/index.ts.
- Fuente: `learning/sources/fundamentos-programacion.md` §A12-A13 (descargado por la sesión r57b; verificado 18/08).
- Patrón a replicar: `packages/core/src/tools/codevfx.ts` (renderEffectHtml → HTML autocontenido sin assets, GLSL como comentario, reactividad, determinista).
- Concurrencia: r57b-OVERRIDE ACTIVA en tarea 57b (touching docs/skills/opencode.json — NO packages/core). Lock retomado por r58-UTEC-5260 (status ACTIVA, touching propio). Regla: verificar `git status` de llm.ts/index.ts antes de tocarlos; si están sucios → NO wiring, dejar documentado.

## Objetivo
Implementar la capability `sdf` en `packages/core/src/tools/sdf.ts`: dominio puro determinista (zod-free, patron codevfx/growth) con:

1. `SDF_PRIMITIVES` (5) + `SDF_OPS` (4: union/intersection/subtract/smooth con k).
2. Primitivas evaluables: `sdSphere/sdBox/sdTorus/sdCapsule/sdPlane` (matemática estándar IQ, dominio público) + `evalSdf(primitives, ops, root, p)` con ops tree.
3. `planSdfScene(input)` → `SdfScenePlan` { primitives normalizadas, ops, root, camera {fov,distance,tilt}, steps, epsilon, maxDist, palette derivada, aspect, formula humana, glsl } — validación: ≥1 primitiva, radios > 0, ops refs válidas, fov 30-120, steps 16-256.
4. `sdfSceneGlsl(plan)` → GLSL codegen (sd funcs + ops + main de ejemplo).
5. `rayMarchPlan(plan)` → planner: steps/epsilon/maxDist clampados, resolución sugerida (max 480px), samples, estimación determinista de coste por frame.
6. `renderSdfHtml(plan, opts)` → HTML5 canvas 2D autocontenido: ray marching software (ImageData), drag→rotar, wheel→zoom, GLSL como comentario, a11y (role img + aria-label + title), sin URLs ni `<script src>`, Dark Obsidian.
7. Namespace `export const sdf = {...}`.

## Archivos a tocar (SOLO estos)
- CREAR `packages/core/src/tools/sdf.ts`
- CREAR `packages/core/src/tools/sdf.test.ts`
- CREAR `.opencode/plans/loop-58-sdf.md` (este)
- CREAR `docs/RAZONAMIENTO-SDF.md` (análisis + mapeo §A12-13)
- MODIFICAR (wiring, SOLO si limpios) `packages/core/src/ai/llm.ts` + `packages/core/src/tools/index.ts`
- MODIFICAR al cierre: `STATE.md` (fila 58 DONE), `loop-run-log.md` ([P/I/V/R] append), `learning/LEARNINGS.md` (lección)

## NO hacer
- NO tocar archivos de r57b (opencode.json, LOOP.md, AGENTS.md, skills/ultraia-request, STATE.md/run-log hasta el cierre con verificación de git log).
- NO tocar el batch staged de #25 (124 archivos) ni LEARNINGS.md si está staged por otra sesión.
- NO Three.js ni WebGL en el render (patrón: canvas 2D + ImageData, cero deps).
- NO fetch/IO en el dominio (keyless, determinista).

## Criterios (scoped → FULL)
- Scoped: `npx vitest run src/tools/sdf.test.ts` (packages/core) + `npx tsc --noEmit -p packages/core/tsconfig.json` → 0 errores.
- FULL por commit: `npm run typecheck` → `npm run lint` → `npm run test` → `npm run build` (limpiar .next antes; matar dev servers si hay).
- Commit A: pathspec explícito de los archivos del plan (NUNCA `git add .`; el índice contiene batch #25).
- Commit B: bitácora (STATE.md fila 58 DONE + run-log [I/V/R]) — verificar `git log --oneline -3 -- loop-run-log.md STATE.md` ANTES (regla iter-41/56).

## Tolerancias / riesgos
- Flakes red conocidos (Tunetank content.live, yt-dlp audiolibrary): reintento máx 3.
- Si llm.ts/index.ts están sucios al llegar al wiring: diferir wiring, documentar (precedente cloud loop-25).
- Raza de bitácora: si r57b absorbe mi append → no reescribir, dejar evidencia.

## Esfuerzo / prioridad
- ~350 líneas sdf.ts + ~250 test + docs. Prioridad P1 (backlog aprobado, fila 58).