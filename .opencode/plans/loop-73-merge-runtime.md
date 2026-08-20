# Plan loop-73 — FASE 2: Merge aditivo llm.ts/index.ts (desbloquear runtime)

## Contexto
FASE 1 (iter-72, `7b39ff0`) dejó el wiring `semantic_memory` + `autolearn` commiteado en
HEAD, pero el worktree tiene el WIP ajeno `creativo` ENCIMA de llm.ts/index.ts (restaurado
byte-exact post-commit). Resultado: el dev server NO expone memory_search/autolearn_run
hasta resolver el merge. Esta fase lo resuelve: merge aditivo controlado = worktree ajeno
(creativo) + wiring mío (semantic_memory + autolearn) en el MISMO archivo, gates FULL,
commit documentado como merge de sesiones ("quien commitea primero gana" — precedentes
sesiones 36/42).

## Objetivo
Iteración 73: llm.ts/index.ts del worktree contienen AMBAS cosas (creativo ajeno +
semantic_memory + autolearn míos) → el runtime expone las 3 capabilities. Commit con
pathspec que INCLUYE el bloque ajeno (excepción documentada y aprobada por el usuario en
el plan de 4 fases: "merge aditivo controlado... commit con pathspec documentado").

## Pasos
1. Plan file (este).
2. Ya hecho en el worktree (ediciones previas): imports + bloques de tools en llm.ts
   (semantic_memory antes de codevfx, autolearn después; import creativo conservado) +
   index.ts (exports semantic-memory/autolearn, imports, namespace tools con
   semanticMemory+autolearn+creativo, TOOL_DESCRIPTIONS, union Capability con los 3).
3. Verificación scoped: vitest autolearn + semantic-memory + creativo (65/65 PASS) + tsc core 0.
4. Gates FULL en orden CI (typecheck → lint → test → build; matar node + .next limpio).
5. Evidencia: fila 73 STATE.md + entrada loop-run-log.md.
6. Commit con pathspec: plan loop-73 + llm.ts + index.ts + creativo.ts + creativo.test.ts
   (untracked ajenos que el import requiere — parte del merge de sesiones) + STATE.md +
   loop-run-log.md. NO restaurar el WIP ajeno después: esta vez el merge es FINAL.
7. Verificación post-commit: HEAD contiene las 3 capabilities; worktree == HEAD para
   estos 4 archivos (sin WIP encima).

## ARCHIVOS A TOCAR
- .opencode/plans/loop-73-merge-runtime.md (nuevo)
- packages/core/src/ai/llm.ts (merge aditivo — contiene bloque ajeno creativo)
- packages/core/src/tools/index.ts (merge aditivo — idem)
- packages/core/src/tools/creativo.ts (untracked ajeno — se commitea como parte del merge)
- packages/core/src/tools/creativo.test.ts (untracked ajeno — idem)
- STATE.md, loop-run-log.md (evidencia)

## NO-hacer
- NO tocar el resto del WIP ajeno (reach/topics/present/enrutador/publications/blueprint/
  automation/recorder/media-synthesis + deletions staged: publish.test.ts, reach.test.ts,
  vfx-generator.test.ts, blueprint.test.ts, publications.test.ts).
- NO `git add .` ni `-A`. NO push/merge sin aprobación. NO deps nuevas. NO migraciones.
- NO restaurar cuarentena sobre estos 4 archivos tras el commit (merge FINAL).

## Criterios
- Scoped: 65/65 PASS (autolearn 21 + semantic-memory 24 + creativo 20).
- FULL: typecheck → lint → test → build TODOS verdes.
- Commit 1 solo: `feat(core): merge aditivo runtime - exposicion de memory_search + autolearn_run + creativo (iter-73)`.
- Post-commit: `git status` de los 4 archivos = limpio (sin WIP encima).

## TOLERANCIAS / RIESGOS
- El bloque ajeno `creativo` ya compilaba (gates de iter-70/71 verdes con él en el
  worktree) — el merge no cambia su código, solo convive con el mío.
- Si el test ajeno fallara en FULL: NO tocar creativo.ts (es de la otra sesión) —
  reportar y escalar.
- PS 5.1: ediciones con tool Edit/Write, nunca Set-Content.

## Esfuerzo / Prioridad
- Prioridad P1 (desbloquea el runtime para que las capabilities vivan en producción).
- Esfuerzo: 1 ciclo.