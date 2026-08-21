# Plan loop-63-wirings — Wiring capabilities videoqa/motion/replica (iteración 63)

## Contexto
- Backlog (High Priority STATE.md, anotado por r54 en c22dee8): "wirings pendientes: videoqa (59), motion (60), replica (61) — llm.ts/index.ts LIBRES".
- Las 3 capabilities ya están DONE en dominio (videoqa 8d14835 31/31, motion 82c76fc 20/20, replica 9f996db 17/17) con surfaces `videoqaSurface`/`motionSurface`/`replicaSurface` y comentario "tool se registra en ai/llm.ts — wiring diferido".
- HALLAZGO: la sesión concurrente ya escribió los 3 bloques de tools en `packages/core/src/ai/llm.ts` (working tree, SIN commitear, +139 líneas, 0 borradas): `videoqa_metrics` (metricas/veredicto/vmaf), `motion_analyze` (stats/descomponer/trayectoria/runner), `replica_run` (analizar/plan) + imports `* as videoqa/motion/replica`. Bien implementados (llaman APIs reales de los dominios). NO duplicar: adoptar tal cual.
- Falta SOLO `packages/core/src/tools/index.ts`: exports, tools object, TOOL_DESCRIPTIONS y unión Capability.

## Objetivo
Completar el wiring de las 3 capabilities en index.ts (adoptando el trabajo de llm.ts ya presente), verificar gates FULL y commiteear.

## Pasos
1. index.ts:
   - `export * from './videoqa'; export * from './motion'; export * from './replica';` tras `export * from './sdf';`
   - `import * as videoqa from './videoqa';` + motion + replica tras `import { sdf } from './sdf';`
   - tools object: añadir `videoqa, motion, replica` tras `sdf`.
   - TOOL_DESCRIPTIONS: 3 descriptores nuevos (videoqa/motion/replica) tras el de `sdf`.
   - Unión `Capability`: añadir `| 'videoqa' | 'motion' | 'replica'` tras `| 'sdf'`.
   - FIX documentado (AGENTS.md): TOOL_DESCRIPTIONS.cloud dice "41 allowed extensions" → 42 (EXT_TYPES tiene 42).
2. Verificación scoped: `npx tsc --noEmit` (core) + `npx vitest run src/tools/videoqa.test.ts src/tools/motion.test.ts src/tools/replica.test.ts src/tools/sdf.test.ts`.
3. Gates FULL en orden CI: typecheck → lint → test → build (matar node.exe + limpiar .next antes del build).
4. Commits:
   - `feat(core): wiring capabilities videoqa/motion/replica (llm.ts bloques adoptados de la sesion concurrente + index.ts exports/tools/descriptors/Capability + fix 41->42 extensiones cloud)` — pathspec: llm.ts + index.ts.
   - `chore(loop-63): bitacora ...` — STATE.md + loop-run-log.md.
5. Lock → CERRADA-ITER63. Sin push.

## Archivos a tocar (SOLO estos)
- packages/core/src/ai/llm.ts (ya modificado por sesión concurrente — adopto, verifico, commiteo)
- packages/core/src/tools/index.ts (mi trabajo)
- .opencode/plans/loop-63-wirings.md (este plan)
- STATE.md, loop-run-log.md (bitácora)

## NO hacer
- No reescribir los bloques de llm.ts (son de la sesión concurrente; verifico solo que compilen).
- No tocar batch staged #25 ni LEARNINGS.md; `git commit -m ... -- <paths>` SIEMPRE.
- No crear tests nuevos (dominios ya testeados; el wiring no añade lógica).
- No tocar FundamentosDeLaProgramcon.txt ni .ultraia/loop/ (untracked).
- No hacer wirings de otras capabilities pendientes.

## Criterios
- Scoped: tsc core 0 errores + vitest videoqa/motion/replica/sdf GREEN.
- FULL: typecheck/lint/test/build EXIT 0 (con core completo, runtime incluido).

## Riesgos
- Raza con sesión concurrente: verificar `git log --oneline -1` y estado de llm.ts/index.ts ANTES de commitear; re-verificar diff de llm.ts (que solo contenga los +139 de los bloques).
- TS2308 (colisión de exports): los dominios exportan tipos con nombres comunes (FlowVector, ReplicaResult...) — `export *` puede colisionar; si tsc reporta, renombrar con prefijo (precedente SdfVec3).

## Esfuerzo / Prioridad
- Bajo (wiring mecánico). P0 (desbloquea High Priority).