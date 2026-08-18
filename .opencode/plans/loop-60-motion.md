# loop-60-motion.md — Capability `motion` (análisis de movimiento)

- **Task ID**: 60 (STATE.md fila 60, fuente FundamentosDeLaProgramacion §A9-11/14)
- **Fecha**: 18/08/2026 · Ciclo PIVR 60 (patrón bucle IA 4 fases × 3 pasadas C1/C2/C3)
- **Sesión**: r57b-OVERRIDE-915455659 (plan preparado en fase P mientras r58-UTEC-5260
  mantiene el lock en task 58 sdf; NO ejecutar hasta que r58 libere o el lock expire > 30 min)

## Contexto (Sensado)

- La sesión concurrente r58-UTEC-5260 está ACTIVA en task 58 (sdf): `sdf.ts` mtime
  20:30:59 18/08, wiring `tools.sdf_render` YA en llm.ts + `export * from './sdf'` en
  index.ts. Ella también cerró 59 (videoqa, commit 8d14835; **wiring videoqa DIFERIDO** —
  puede tomarlo en cualquier momento).
- **NO tocar `packages/core/src/ai/llm.ts` ni `packages/core/src/tools/index.ts` mientras
  r58 esté ACTIVA** (precedente iter-58: mi sdf.ts fue sobrescrita por raza de escritura).
- `motion.ts` NO existe (verificado 20:35). Gap confirmado: fuente §A9-11 (optical flow
  Farnebäck/Lucas-Kanade, trajectory fitting splines/catmull-rom, descomposición
  cámara vs escena, campo F(x,y,t)).
- Patrón a replicar: capabilities previas de la fuente (videoqa 8d14835, sdf en r58) =
  **dominio puro determinista en TS** + runner Python opcional (solo argv/plan, nunca
  ejecutar en tests) + tool con zod + wiring en llm.ts/index.ts.

## Objetivo (Razonamiento)

Capability `motion` en `packages/core/src/tools/motion.ts`:

1. **`planFlowAnalysis`** — plan determinista de análisis de flujo óptico: parámetros
   Farnebäck (pyr_scale, levels, winsize, iterations, poly_n, poly_sigma) y
   Lucas-Kanade (winSize, maxLevel, criteria), salida = spec JSON del runner.
2. **`buildFlowRunnerArgv`** — argv de runner Python/OpenCV (scripts/motion_flow.py)
   que ejecutaría el análisis REAL (nunca se ejecuta en tests — determinista).
3. **`trajectoryFit`** — fitting de trayectorias: splines cúbicas/catmull-rom sobre
   puntos (x,y,t), interpolación, evaluación de error (RMSE), extrapolación limitada.
4. **`decomposeCameraScene`** — descomposición cámara vs escena: movimiento global
   (afín/proyectivo estimado por mediana de vectores) vs residual local (objetos),
   score de cámara vs escena por coherencia de vectores.
5. **`motionField`** — campo F(x,y,t): estructura con grid de vectores + estadísticas
   (magnitud media/máx, dirección dominante por histograma, coherencia).
6. Tool `motion_analyze` (capability `motion`) + wiring en llm.ts/index.ts.
7. Tests ~25-30 (dominio puro, sin ejecutar Python).

## ARCHIVOS A TOCAR

| Archivo | Acción |
|---|---|
| `packages/core/src/tools/motion.ts` | NUEVO — dominio puro + schemas zod |
| `packages/core/src/tools/motion.test.ts` | NUEVO — tests deterministas (~25-30) |
| `scripts/motion_flow.py` | NUEVO — runner Python/OpenCV (stdlib + numpy/opencv opcional, fail-soft, --dry-run) |
| `packages/core/src/ai/llm.ts` | WIRING capability `motion` → tool `motion_analyze` (SOLO cuando r58 libere llm.ts) |
| `packages/core/src/tools/index.ts` | WIRING export `motion` (SOLO cuando r58 libere) |
| `STATE.md` | fila 60 DONE + High Priority + banner |
| `loop-run-log.md` | bitácora [P]/[I]/[V]/[R] |
| `learning/LEARNINGS.md` | lección si aplica |

## RECURSOS/PRESUPUESTO

- Tiempo: objetivo < 60 min (C1 base ~25 min, C2 ajuste ~15 min, C3 consolidación ~10 min, gates ~10 min). time_cap_s = 3600.
- Tokens: presupuesto estándar del ciclo (loop-budget.md).
- Sin GPU, sin ffmpeg, sin ejecución real de Python en tests.

## NO-hacer

- NO tocar llm.ts/index.ts mientras r58 ACTIVA (esperar liberación o lock expirado).
- NO ejecutar OpenCV/Python real en tests (argv/plan only, determinista).
- NO duplicar videoqa (métricas) ni sdf (render): motion es análisis de movimiento.
- NO `git add .` — staging explícito con pathspec (nunca arrastrar el index #25).
- NO pisar el lock de r58 ni mover sus archivos (sdf.ts/sdf.test.ts).

## CRITERIOS (gates)

- **Scoped (C1/C2)**: `npx vitest run packages/core/src/tools/motion.test.ts` → todos PASS
  (predicción: 25-30/25-30) + `npx tsc --noEmit -p packages/core/tsconfig.json` sin errores
  propios (ruido ajeno de r58 permitido SOLO si no son archivos míos).
- **FULL (C3, solo tras liberación de r58)**: `npm run typecheck` → `npm run lint` →
  `npm run test` → `npm run build` TODOS verdes (orden CI).
- Commit: `feat(core): capability motion - ...` con pathspec explícito.

## TOLERANCIAS

- Fitting spline: error RMSE < 1e-6 en puntos interpolados exactos (pasa por los nodos);
  extrapolación > 10% del rango temporal → rechazada (undefined o flag).
- Descomposición: si coherencia global > 0.85 → score cámara alto; si < 0.4 → escena.
- Campo F(x,y,t): grid validado (mismas dimensiones), vectores normalizados opcionales.
- Histograma de direcciones: bin 45° (8 bins), dirección dominante = bin con más masa.

## RIESGOS

- **Colisión de escritura con r58** (llm.ts/index.ts) — mitigación: plan preparado ANTES;
  al ejecutar, verificar lock + git status primero; si r58 sigue ACTIVA, esperar.
- r58 puede tomar la 60 (motion) antes de liberar — si `motion.ts` aparece untracked
  con mtime reciente, CEDER (precedente iter-58, sin duplicar).
- Python runner con imports opcionales — mantener fail-soft (degradación elegante si
  numpy/opencv no están).

## ESFUERZO / PRIORIDAD

- Esfuerzo: M (dominio puro + runner + wiring + tests).
- Prioridad: P1 (gap confirmado de la fuente aprobada; backlog 58-62).
- Orden en cola: 58 (r58) → 59 DONE → **60 esta** → 61 replica (depende de 60+59+58).

## PREDICCIÓN (Proceso del bucle IA — qué esperar al ejecutar)

- C1: 25-30 tests escritos; primera pasada 22-26 PASS, 3-6 fallos por detalles de
  tolerancias (ajustar en C2, precedente videoqa: 29/31 → 2 fixes de umbrales).
- C2: 100% PASS scoped + tsc core sin errores propios.
- C3: gates FULL verdes (esperado: core 218+31(sdf)+31(videoqa)+~28(motion) ≈ 308+ tests
  → número exacto depende del estado de r58).
- Riesgo principal verificado: NO ejecutar si r58 sigue en llm.ts/index.ts.

## Estado del plan

- [ ] PENDIENTE DE EJECUCIÓN (escrito 18/08 20:35; r58 ACTIVA en task 58)