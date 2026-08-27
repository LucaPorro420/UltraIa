# Plan: loop-127-goal-runner — Meta-agente `/goal` para UltraIa

## Contexto
El usuario pidió un "iniciante para usar un agente chat donde le pida algo y lo realice" y
luego aclaró: el `/goal` debe ser el **conductor autónomo de todo UltraIa**, usando TODAS sus
partes (memoria, mente/LLM, orquestador, planificador, creadores, mensajeros). Es un meta-agente
que, dado un objetivo + lista de tareas, ejecuta cada tarea encadenando contexto y despachando
a las capabilities reales del proyecto hasta terminar.

## Objetivo
1. Motor puro y testeable en `packages/core/src/tools/goal.ts`: `runGoal({ goal, tasks, complete,
   dispatch, toolNames })` → bucle por tarea, llama al modelo (`complete`) para decidir
   (responder o invocar tool vía JSON `{tool,args}`), despacha (`dispatch`), acumula memoria,
   y devuelve `{ results, done }`.
2. Tests deterministas con modelo + dispatch mockeados (`goal.test.ts`).
3. Exportar `goal` en `tools/index.ts`.
4. Comando `/goal` en `apps/web/src/app/api/chat/route.ts`: parsea objetivo+tareas, corre
   `runGoal` con `complete` real (modelo configurado vía `resolveModel` + `generateText`) y un
   `dispatch` curado que mapea nombres de tool a funciones reales de subsystems (memoria,
   creadores, mensajeros, planner, research). Presenta el reporte por el path de streaming
   existente (`chatStream`) para no romper la UI.

## ARCHIVOS A TOCAR
- `.opencode/plans/loop-127-goal-runner.md` (este plan, nuevo)
- `packages/core/src/tools/goal.ts` (nuevo — motor puro)
- `packages/core/src/tools/goal.test.ts` (nuevo — 8+ tests)
- `packages/core/src/tools/index.ts` (añadir `export * from './goal';`)
- `apps/web/src/app/api/chat/route.ts` (rama `/goal` + handler `handleGoalCommand`)

## RECURSOS / PRESUPUESTO
- Sin nuevas dependencias (reusa `resolveModel`/`generateText` de 'ai' ya en web).
- Modelo: el configurado en la versión del agente (`version.model`).

## NO-hacer
- NO tocar `packages/core/src/ai/llm.ts` (zona de conflicto de la sesión #25).
- NO registrar `goal_run` como tool de agente en llm.ts (se difiere hasta pausar #25).
- NO push (requiere aprobación explícita).

## Criterios de verificación (scoped + FULL)
- Scoped: `npm run test` pasa los nuevos `goal.test.ts`; `tsc` de core OK.
- FULL (CI order): `npm run typecheck` → `npm run lint` → `npm run test` → `npm run build`,
  todos GREEN. Matar dev servers antes de build.
- `/goal` parsea `goal` + tareas y usa `dispatch` real sobre un subconjunto curado.

## TOLERANCIAS
- `maxStepsPerTask` default 5 (el modelo puede encadenar varios tool-calls por tarea).
- Error de un tool → la tarea queda `status:'error'` con el mensaje; no aborta el goal.
- Si el modelo no devuelve JSON válido → se trata como `answer` (texto).

## Riesgos
- Sesión #25 puede revertir `index.ts` (y raramente la ruta del chat). Mitigación: commitear
  inmediatamente tras gates GREEN y, si #25 revierte, re-aplicar desde
  `%TEMP%\opencode\wip-quarantine-20260826\` con hash-check (patrón iter-58/loop-46).
- `generateText` de 'ai' debe estar disponible en web; si typecheck falla, fallback a
  `fetch` OpenAI-compatible (como el starter `scripts/goal-runner.mjs`).

## Esfuerzo / Prioridad
- Esfuerzo: M (motor ~120 LOC + ruta ~80 LOC + tests).
- Prioridad: P1 (feature pedido y aprobado por el usuario).

## Predicción
Gates GREEN tras implementar; `goal.test.ts` 8+ PASS; `/goal` disponible en el chat como
comando que orquesta subsystems reales. Commit local `feat(tools): add /goal autonomous
runner engine + chat command` (sin push).
