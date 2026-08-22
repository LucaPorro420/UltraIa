# PLAN: Wiring autopub_run en llm.ts/index.ts (tarea #91 de STATE.md, P2)

Fecha: 2026-08-22 · Modo: P-B · Presupuesto: mini-ciclo (~45 min / ≤30k tokens)

## Contexto
- Pendiente vivo de iter-90: la tool de agente `autopub_run` (capability `autopub`) quedó sin
  registrar porque la sesión #89 estaba editando llm.ts/index.ts. AHORA dormida ~3h (mtimes
  17:31 vs 20:24), sin lock ni heartbeat → maniobra de cuarentena legítima (precedentes
  iter-77/80/81 + merge aditivo iter-73/78).

## SPEC / DESIGN
- llm.ts: `import * as autopub from '../tools/autopub';` + bloque `opts.tools?.includes('autopub')`
  → tool `autopub_run` (acciones `plan` puro / `run` con opts.db; configJson fail-soft vía
  parseAutopubConfig). Patrón bloque genesis (L849-907).
- index.ts: `export * from './autopub';` (símbolos todos prefijados — sin colisión TS2308),
  `import * as autopub`, `tools.autopub`, `TOOL_DESCRIPTIONS.autopub`, `Capability | 'autopub'`.
- `autopub.wiring.test.ts` (3 tests, patrón qdrant-memory.wiring.test.ts).

## Maniobra de concurrencia (crítica)
1. Backups byte-exactos YA tomados: `%TEMP%\opencode\wip-quarantine-20260822-iter91\`
   (llm.ts B154E108B476 · index.ts 3F6D66305A1E) + diffs completos capturados en wip89-*.diff.
2. `git checkout HEAD -- llm.ts index.ts` → wiring MÍO sobre limpio.
3. Gates FULL sobre árbol limpio de WIP ajeno.
4. Commit pathspec (llm.ts, index.ts, wiring test, plan, STATE, run-log).
5. Restaurar SUS hunks ENCIMA del nuevo HEAD (re-aplicación de los diffs capturados:
   llm.ts = import + bloque security_scan; index.ts = export/import/tools/descripción/
   Capability 'security'). El worktree final = HEAD_nuevo + su WIP (merge aditivo,
   precedent iter-73) — cuando ella commite, incluirá mi wiring sin conflicto.
6. Verificación post-restauración: grep AMBOS símbolos presentes + tsc scoped rápido.

## Archivos a tocar
- `.opencode/plans/loop-91-autopub-wiring.md`, `packages/core/src/ai/llm.ts`,
  `packages/core/src/tools/index.ts`, `packages/core/src/tools/autopub.wiring.test.ts` (NUEVO),
  `STATE.md`, `loop-run-log.md`.

## NO-hacer
- NO tocar security.ts/.test.ts ni commitearlos (WIP ajeno). NO push.
- Si entre backup y restauración los mtimes cambian (sesión despierta) → ABORTAR restauración
  manual y re-diff (regla de raza).

## Criterios
- Scoped: vitest autopub+wiring 24 PASS + tsc core 0. FULL: typecheck→lint→test→build.
