# loop-61-replica.md — Capability `replica` (orquestador análisis-por-síntesis)

- **Task ID**: 61 (STATE.md fila 61, fuente FundamentosDeLaProgramacion §A21/26-37)
- **Fecha**: 18/08/2026 · Ciclo PIVR 61 (patrón bucle IA 4 fases × 3 pasadas C1/C2/C3)
- **Sesión**: r57b-OVERRIDE-915455659 (plan preparado en fase P mientras r58-UTEC-5260
  mantiene el lock en task 58 sdf + wiring en llm.ts/index.ts)

## Contexto (Sensado)

- r58-UTEC-5260 ACTIVA: sdf.ts/sdf.test.ts untracked (mtime 20:15-20:30), llm.ts M con
  `tools.sdf_render` (línea 1044) + index.ts M con `export * from './sdf'` + sdf en tools
  (líneas 26/55/57/113/148) — r58 está EN MEDIO del wiring sdf. NO tocar llm.ts/index.ts.
- 59 videoqa DONE (8d14835, 31 tests) SIN wiring; 60 motion DONE (82c76fc, 20 tests) SIN
  wiring. Los 3 wirings (videoqa/motion/sdf) quedan para el primero que libere llm.ts/index.ts.
- `replica.ts` NO existe (verificado). Gap: orquestador análisis-por-síntesis (Bloque A §A21/26-37).
- Patrón: dominio puro determinista (videoqa/motion/sdf) + tool con zod + wiring diferido.

## Objetivo (Razonamiento)

Capability `replica` en `packages/core/src/tools/replica.ts`:

1. **`ReplicaOrchestrator`** — loop análisis-por-síntesis: `analyze` (entrada: target
   frames/features) → `generate` (propone θ params vía generative o tabla) → `compare`
   (E_total = videoqa/metrics contra target) → `optimize` (ajuste de θ por gradiente
   numérico simple o grid local). Estado explícito por iteración.
2. **Stop conditions**: target alcanzado (E_total < umbral) OR máx 100 iteraciones OR
   mejora < 0.001 × 5 consecutivas (precedente: umbrales coherentes videoqa).
3. **Checkpoints**: estado serializable por iteración (θ, E_total, historial), resume
   desde checkpoint.
4. **Presupuestos**: maxIters, time budget (tick por iteración), max params.
5. **Fail → diagnóstico**: si no converge, devolver estado + métricas + diagnóstico
   (qué métrica no baja, estancamiento, divergencia).
6. **Integración**: usa generative (o funciones puras de síntesis), videoqa (métricas
   pixel), motion (E_flow), sdf (render sintético) — imports de capabilities ya
   commiteadas (videoqa/motion) o WIP ajeno (sdf → import dinámico/lazy o opcional).
7. Tool `replica_run` (capability `replica`) + wiring en llm.ts/index.ts (DIFERIDO).
8. Tests ~25-30 (deterministas, loop con reloj inyectable, sin ejecutar Python).

## ARCHIVOS A TOCAR

| Archivo | Acción |
|---|---|
| `packages/core/src/tools/replica.ts` | NUEVO — orquestador puro determinista + schemas zod |
| `packages/core/src/tools/replica.test.ts` | NUEVO — tests (~25-30) |
| `packages/core/src/ai/llm.ts` | WIRING capability `replica` → tool `replica_run` (SOLO cuando llm.ts/index.ts estén limpios de r58) |
| `packages/core/src/tools/index.ts` | WIRING export `replica` (idem) |
| `STATE.md` | fila 61 DONE + High Priority + banner |
| `loop-run-log.md` | bitácora [P]/[I]/[V]/[R] |
| `learning/LEARNINGS.md` | lección si aplica |

## RECURSOS/PRESUPUESTO

- Tiempo: objetivo < 75 min (C1 ~30 min, C2 ~20 min, C3 ~15 min, gates ~10 min). time_cap_s = 4500.
- Sin ejecución real de Python/ffmpeg en tests. Loop puro con reloj inyectable.

## NO-hacer

- NO tocar llm.ts/index.ts mientras r58 los tenga modificados (verificar `git status` antes).
- NO importar sdf.ts directamente si sigue WIP ajeno (usar imports opcionales o lazy).
- NO ejecutar el loop de optimización con números reales no deterministas (solo funciones puras).
- NO `git add .` — pathspec explícito siempre.
- NO duplicar videoqa/motion/sdf: replica los ORQUESTA, no reimplementa métricas.

## CRITERIOS (gates)

- **Scoped (C1/C2)**: `npx vitest run packages/core/src/tools/replica.test.ts` → todos PASS
  (predicción: 25-30/25-30) + `npx tsc --noEmit -p packages/core/tsconfig.json` sin errores
  propios.
- **FULL (C3, tras liberación de r58)**: `npm run typecheck` → `npm run lint` →
  `npm run test` → `npm run build` TODOS verdes (orden CI).
- Commit: `feat(core): capability replica - ...` con pathspec explícito.

## TOLERANCIAS

- Convergencia: E_total < target (default 0.05) o mejora < 0.001 × 5 → stop.
- Máx 100 iteraciones (constante MAX_ITERS, configurable por opciones).
- Checkpoint: JSON serializable, resume idéntico (mismo θ, mismo historial).
- Diagnóstico: enum `converged | max_iters | stalled | diverged` + razón legible.
- θ params: schema zod estricto (números finitos, rangos definidos).

## RIESGOS

- **Colisión con r58** (llm.ts/index.ts y posible replica.ts si ella la toma) — verificar
  lock + git status ANTES de implementar; si `replica.ts` aparece untracked ajeno → CEDER
  (precedente iter-58/60, sin duplicar).
- sdf.ts WIP ajeno: si replica necesita sdf para render sintético, usar import lazy con
  try/catch (fail-soft) o solo las capabilities commiteadas (videoqa/motion).
- Loop no determinista si se usa Math.random — usar PRNG inyectable (generative prng).

## ESFUERZO / PRIORIDAD

- Esfuerzo: M+ (orquestador + integración + tests).
- Prioridad: P1 (gap final del plan aprobado; cierra el bloque A del transcript).
- Depende de: 58 sdf (WIP), 59 videoqa (DONE), 60 motion (DONE) — puede implementarse con
  imports opcionales y completar al liberar.

## PREDICCIÓN (Proceso del bucle IA — qué esperar al ejecutar)

- C1: 25-30 tests; primera pasada 22-27 PASS, fallos típicos de tolerancias de stop
  conditions (ajustar en C2, precedente videoqa 29/31 → 2 fixes).
- C2: 100% PASS scoped + tsc core 0 errores propios.
- C3: FULL verdes; core total ≈ 218 + 31(sdf?) + 31(videoqa) + 20(motion) + ~28(replica).
- Riesgo principal: si r58 aún wirea llm.ts → wiring queda DIFERIDO en fila 61 (como 59/60).

## Estado del plan

- [ ] PENDIENTE DE EJECUCIÓN (escrito 18/08 21:55; r58 ACTIVA en wiring sdf)