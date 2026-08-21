# Plan iter-77 — Cierre iter-75 (commit del trabajo implementado) + documentar iter-76 + gaps `tema_sin_truth`

## Contexto (Sensado)
- Lock `.ultraia/loop/session.lock` = CERRADA-ITER74 (heartbeat 14:18, tarea 73/74 DONE) -> tarea LIBRE.
- Kill switch: NO activo (solo menciones negadas).
- Backlog 1-75 DONE. **iter-75 (modos-operacion + vault + pdfsearch) está implementado en el worktree pero NUNCA commiteado**:
  run-log termina en `[P] Iteracion 75`; git log no tiene commit iter-75; STATE.md fila 75 dice "DONE (commits iter-75)" SIN hash real (drift bitácora check-12).
- **iter-76 (qdrant-memory) SÍ commiteado** `f675e14` (15:51) pero SIN fila backlog ni entrada run-log.
- Sesión concurrente #25 ACTIVA en brain.md + graphify (brain.ts/knowledge-graph.ts untracked, 17:27-17:28 hoy, NO referenciados en llm.ts/index.ts) -> NO tocar, NO wirear, NO commitear sus archivos.
- Autolearn gaps priorizados (META-IA): brain-md (1.2) y graphify (1.2) -> concurrente; tema_sin_truth search/image/video/code/audio (0.8 c/u) -> ACCIONABLE; backlog_pendiente -> #6/#17/#25 human-blocked/concurrente.

## Objetivo
1. Verificar el trabajo de iter-75 (vault 22 + pdfsearch 16 + autolearn 29 + research 18) y commitearlo con pathspec como iter-75 (evita pérdida de trabajo; STATE.md ya lo declara DONE).
2. Documentar iter-76 (fila backlog + entrada [R] con hash f675e14) — evidencia: commit + docs/RAZONAMIENTO-QDRANT-MEMORY.md + resultTask/qdrant/.
3. Cerrar 5 gaps `tema_sin_truth` (search/image/video/code/audio) con `learning/truth/truth_ultraia_capabilities.json` — verdad VERIFICADA de capabilities propias ya testeables (reach searchWeb DDG, pollinations image, edge-tts audio, video_edit ffmpeg, builder codegen), cada caso con source + verified + note + usage.
4. Ronda de consolidación: fila 77 + run-log [P]/[I]/[V]/[R] + LEARNINGS + cierre High Priority RED CAIDA (builds verdes desde iter-74).

## Archivos a tocar (staging EXPLÍCITO, nunca `git add .`)
- `.opencode/plans/loop-77-cierre-75-76-truth.md` (este plan)
- `packages/core/src/tools/vault.ts` + `vault.test.ts` (untracked, iter-75)
- `packages/core/src/tools/pdfsearch.ts` + `pdfsearch.test.ts` (untracked, iter-75)
- `packages/core/src/tools/autolearn.ts` + `autolearn.test.ts` (M, iter-75: buildModePlan +5)
- `packages/core/src/tools/research.ts` + `research.test.ts` (M, iter-75: source pdf +3)
- `packages/core/src/ai/llm.ts` + `packages/core/src/tools/index.ts` (M, wiring iter-75 YA presente: vault_manage/pdfsearch_search/mode_plan — verificado, NO referencia brain/graphify)
- `.opencode/skills/modos-operacion/SKILL.md` + `skills/modos-operacion/SKILL.md` (untracked, iter-75, espejos sync)
- `docs/MODOS-OPERACION.md` + `docs/RAZONAMIENTO-MODOS-OPERACION.md` (untracked, iter-75)
- `opencode.json` (M, piv-plan v2/piv-build v2 iter-75) + `AGENTS.md` + `LOOP.md` (M, sección modos)
- `fundamentosdelaprogramacion.txt` (untracked, rename iter-75)
- `learning/truth/truth_ultraia_capabilities.json` (NUEVO, iter-77)
- `STATE.md` + `loop-run-log.md` + `learning/LEARNINGS.md`

## NO-hacer
- NO tocar brain.ts/knowledge-graph.ts/brain-sync.ts/Task/*tomasporro*/recorder/automation/media-synthesis (sesión concurrente).
- NO wirear brain/knowledge-graph en llm.ts/index.ts.
- NO `git add .` ni `git add -A`; NO commitear los ~130 archivos staged ajenos.
- NO correr gates FULL sobre el árbol completo sin cuarentena del WIP ajeno (tests untracked de la sesión concurrente pueden fallar).

## Criterios de verificación
- Scoped: vitest vault.test.ts 22 + pdfsearch.test.ts 16 + autolearn.test.ts 29 + research.test.ts 18 PASS; tsc core 0.
- Gates Python: pyflakes/py_compile/ruff 0 en scripts/autolearn.py; e2e autolearn.test.py 6/6 (regresión).
- FULL en orden CI (typecheck -> lint -> test -> build) con cuarentena byte-exact del WIP ajeno untracked; matar dev servers + .next limpio antes del build.
- Commit ÚNICO con pathspec; verificación raíz > 0 y sin `D ` ajenos antes de commitear.

## Predicción
- scoped 85/85 PASS (22+16+29+18); tsc 0; FULL gates verdes; commit 1 con ~20 pathspec.
- Después del commit: autolearn runner --dry-run muestra MENOS gaps tema_sin_truth (search/image/video/code/audio cerrados).
- Riesgos: tests untracked de la sesión concurrente fallan en FULL (cuarentena los aísla); vitest caché stale (limpiar node_modules/.vite si fallos raros); red caída bloquea build (High Priority activo).