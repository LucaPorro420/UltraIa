# RAZONAMIENTO-GENESIS — Genesis Autonomous Engineering Engine en UltraIa

> Fuente: `learning/sources/genesis-deepseek.md` (DeepSeek "Genesis" share pegado
> por el usuario). Fecha de integración: 22/08/2026 (iteración 75).

## 1. Qué es

Un **Genesis Project Manifest** es un contrato JSON ejecutable que gobierna un
bucle de ingeniería de software autónoma: define objetivo, stack, pipeline,
quality gates, autonomía (niveles 0-3), memoria, release y condiciones de parada.
El "motor" lee el manifiesto y calcula la **siguiente acción de ingeniería de
mayor valor validada** (FINAL PRINCIPLE), en lugar de "generar código" a ciegas.

## 2. Qué NO es (decisión de diseño)

El share proponía "construir UltraIa desde cero" con `init_ultraia.ps1` y
archivos placeholder (`blueprint.ts`, `improve.ts`, `eval.ts`, `feedback.ts`,
`llm.ts`). **Esos módulos ya existen en UltraIa y son sofisticados** (dominio
real con Prisma, Vercel AI SDK, evaluación con regresión, etc.). Recrearlos
habría sido un paso atrás. Por eso la integración se limita a la **capa de
contrato declarativo**, que es el aporte genuino y no redundante del share.

## 3. Implementación (capability `genesis`)

Archivo: `packages/core/src/tools/genesis.ts` (dominio puro, determinista,
keyless, sin ejecución real — patrón de las capabilities del Bloque A/fundamentos).

Superficie:
- `parseManifest(input)` — valida con zod, fail-soft (`{ok:false, error}`).
- `autonomyLevel(manifest)` — 0-3 (default 0).
- `qualityGates(manifest)` — extrae las gates del manifiesto.
- `prioritizeTasks(tasks)` — fórmula Genesis, bloqueadores primero.
- `checkStopConditions(state, manifest)` — las 10 stop conditions del §18.
- `nextEngineeringAction(manifest, state, tasks?)` — FINAL PRINCIPLE.
- `buildGenesisPlan(manifest, state, tasks?)` — artefacto tipo loop-piv.

Wireado como tool `genesis_run` (acciones `validate|gates|prioritize|stop|next|plan`)
en `ai/llm.ts` bajo `opts.tools?.includes('genesis')`, y exportado en
`tools/index.ts` (`genesis` namespace + descriptor + `Capability` union `'genesis'`).

## 4. Relación con `autolearn` (META-IA)

`autolearn` (iter-74) ya prioriza con RICE simplificado y la matriz META-IA.
`genesis` es la **capa de gobernanza declarativa** por encima: el Manifiesto
declara las puertas, la autonomía y cuándo parar; `autolearn` sigue siendo el
motor de detección de gaps. Juntos cierran el "motor de mentalidad" que pidió
el usuario: el proyecto se auto-mejora siguiendo un contrato explícito.

## 5. Tests

`packages/core/src/tools/genesis.test.ts` (≥22 tests): parse/validate, autonomía,
gates, fórmula de priorización (orden + bloqueadores), las 10 stop conditions,
next action (STOP / task / pipeline step), plan, namespace. Todos deterministas.

## 6. Uso

```
genesis_run(validate, manifestJson)        -> parsed | {ok:false,error}
genesis_run(gates, manifestJson)            -> gates[] + autonomyLevel
genesis_run(prioritize, tasksJson)          -> prioritized[]
genesis_run(stop, stateJson, manifestJson)  -> {stop, reason}
genesis_run(next, manifestJson, stateJson)  -> {action, rationale}
genesis_run(plan, manifestJson, stateJson)  -> GenesisPlan
genesis_run(run, manifestJson, stateJson, tasksJson) -> GenesisCycleResult
genesis_run(eval, manifestJson, resultadosJson) -> {passed, gates[]}
genesis_run(propose, manifestJson, stateJson, tasksJson) -> {proposal, nextAction, topTaskId}
```

CLI: `npm run genesis -- [--manifest path] [--max-iter N] [--dry-run] [--propose]`.
`--propose` escribe `.ultraia/genesis/proposal.md` (Markdown reviewable, no muta el repo).

## 7. Pendiente / extensión natural

- Un runner (`scripts/genesis.py` o TS) que ejecute el bucle REAL leyendo un
  `genesis.json` y disparando `autolearn`/habilidades del proyecto. **Hecho** (`scripts/genesis-run.ts`, iter-84/87).
- Persistir el estado del bucle en `.ultraia/genesis/` (iteración, repairAttempts). **Hecho**.
- Conectar `quality_gates` con los gates npm reales (typecheck/lint/test/build). **Hecho** (runner ejecuta los gates vía `npm run ...`).
- `propose`: artifact reviewable de la próxima mejora. **Hecho** (iter-88).
