# Plan loop-72 — FASE 1: Capability `autolearn` (núcleo del agente de autoaprendizaje)

## Contexto
Pedido del usuario (20/08/2026): "agente de autoaprendizaje que automatice el autoprogramado,
buscar nueva información y mejorar" + usar clouds/Docker si aporta. Plan aprobado en 4 fases.
FASE 1 = la capability `autolearn` en dominio puro determinista: sensar (leer lecciones/verdad/
backlog) → detectar gaps → priorizar (RICE simplificado) → generar el plan de mejora
(autoprogramado: el agente escribe su propio plan con patrón loop-piv) → métricas del ciclo.

## Objetivo
Iteración 72: `packages/core/src/tools/autolearn.ts` (0 deps nuevas, keyless, determinista) +
tool `autolearn` (acciones scan/gaps/plan/metrics) + ~20 tests + docs
(RAZONAMIENTO-AUTOLEARN.md + learning/sources/autolearn.md). Wiring en llm.ts/index.ts con
cuarentena del WIP ajeno (mismo patrón iter-69) + commit con pathspec.

## Pasos
1. Plan file (este).
2. `packages/core/src/tools/autolearn.ts` — dominio puro:
   - `parseLearnings(text)` → `LearningEntry[]` (líneas `- **...** (fecha, ciclo N)` o bullets)
   - `scanTruthStats(docs: TruthDoc[])` → {total, fuentes, tipos} (reusa corpusStats si aplica)
   - `detectGaps({ learnings, truth, backlog, sources, razonamientos })` → `Gap[]`
     (tema_sin_truth / leccion_sin_implementar / source_sin_analizar / backlog_pendiente)
   - `prioritizeWork(items, { impact, effort, confidence })` → score RICE = (impact*confidence)/effort
   - `buildImprovementPlan(gaps, priorities)` → `LearnPlan` {objetivo, pasos, archivos, criterios,
     prioridad} con patrón loop-piv (scoped/FULL)
   - `learningMetrics(...)` → KPIs (lecciones, truth, gaps, tasaMejora)
   - `autolearn` namespace export
3. `autolearn.test.ts` — determinista, sin red, ~20 casos.
4. Wiring: llm.ts (bloque `if (opts.tools?.includes('autolearn'))` → tool `autolearn_run`) +
   index.ts (export/import/descriptor/union Capability 'autolearn').
   OJO: llm.ts/index.ts del worktree tienen WIP ajeno `creativo` → cuarentena byte-exact
   (%TEMP%\opencode\wip-quarantine-20260820) + checkout HEAD + wiring sobre limpio + commit +
   restauración post-commit.
5. Docs: `docs/RAZONAMIENTO-AUTOLEARN.md` (mapeo implementado/pendiente del agente completo) +
   `learning/sources/autolearn.md` (diseño del agente, fuente).
6. Evidencia: fila 72 STATE.md + entrada loop-run-log.md + lección LEARNINGS si aplica.
7. Gates FULL en orden CI (typecheck → lint → test → build; matar node + .next antes del build).
8. Commit con pathspec (NUNCA `git add .`) + restaurar cuarentena byte-exacta.

## ARCHIVOS A TOCAR
- .opencode/plans/loop-72-autolearn.md (nuevo)
- packages/core/src/tools/autolearn.ts (nuevo)
- packages/core/src/tools/autolearn.test.ts (nuevo)
- packages/core/src/ai/llm.ts (wiring — cuarentena WIP ajeno)
- packages/core/src/tools/index.ts (wiring — cuarentena WIP ajeno)
- docs/RAZONAMIENTO-AUTOLEARN.md (nuevo)
- learning/sources/autolearn.md (nuevo)
- STATE.md, loop-run-log.md (evidencia)

## NO-hacer
- NO tocar WIP ajeno: creativo.ts, creativo.test.ts, automation.ts, recorder.ts,
  media-synthesis/*, reach.ts, topics.ts, present.ts, enrutador.ts, motion.test.ts,
  publish.test.ts (D staged), reach.test.ts (D staged), vfx-generator.test.ts (D staged),
  .env*, DOCS_TODO.md, docs de #25.
- NO `git add .` ni `-A`. NO push/merge. NO instalar deps. NO migraciones.
- NO tocar el orquestador OMAG ni el runtime en esta fase (FASE 2 desbloquea runtime).

## Criterios
- Scoped: vitest autolearn.test.ts PASS (todos los casos nuevos).
- FULL: typecheck → lint → test → build TODOS verdes.
- Commit 1 solo, mensaje `feat(core): capability autolearn (agente de autoaprendizaje) (iter-72)`.

## TOLERANCIAS / RIESGOS
- WIP ajeno en llm.ts/index.ts: cuarentena selectiva + restauración byte-exact (patrón iter-69).
- El runtime del worktree NO tendrá autolearn hasta la FASE 2 (merge aditivo) — documentado.
- PS 5.1: NO Set-Content sobre archivos del repo; JSON con BOM rompe.
- Vitest caché stale tras editar → limpiar node_modules/.vite antes de diagnosticar.

## Esfuerzo / Prioridad
- Prioridad P0 (pedido explícito del usuario). Esfuerzo: 1 ciclo.