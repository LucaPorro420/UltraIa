# Plan — loop-86: Genesis bookkeeping + porting lesson

## Context
The Genesis suite (iter-75/76/77 in my local numbering) shipped three commits
(`d4640e6` capability, `0e03b16` runner, `1b24921` eval). Two loose ends:
1. `STATE.md` has no record of the Genesis work, and the iteration numbers 75–82 are
   already occupied by *other* sessions' tasks (Modos, qdrant, kgraph, brainpage...).
   The plan files `loop-75/76/77-genesis-*` must be renumbered to free slots to avoid
   a plan-file collision (check-13) with the existing backlog.
2. `LEARNINGS.md` lacks the key lesson from this port: external "build from scratch"
   shares must be reduced to their *genuine, non-redundant* contribution — never
   recreate modules UltraIa already has.
3. `index.ts` genesis tool description was updated to list all actions (validate|
   gates|prioritize|stop|next|plan|run|eval) but not yet committed.

## Objective
Record the Genesis suite in STATE.md (rows 83–86), add the porting lesson to
LEARNINGS.md, renumber the plan files to 83/84/85, and commit the `index.ts`
description sync. No new code behavior — the engine is already shipped and gated.

## Files to touch
- EDIT `STATE.md` — insert rows #83 (genesis capability), #84 (runner), #85 (eval),
  #86 (bookkeeping) after the #82 row.
- EDIT `learning/LEARNINGS.md` — append porting lesson (don't recreate existing
  modules; complement, don't replace; renumber plan files to avoid collisions).
- RENAME (git mv) `.opencode/plans/loop-75-genesis-engine.md` → `loop-83-...`,
  `loop-76-genesis-runner.md` → `loop-84-...`, `loop-77-genesis-eval.md` → `loop-85-...`.
- EDIT `.opencode/plans/loop-86-genesis-bookkeeping.md` — this plan.
- COMMIT (already-staged-eligible) `packages/core/src/tools/index.ts` (description sync).

## Scoped gates
- `npx tsc --noEmit -p packages/core/tsconfig.json` → 0 (index.ts is a string change)
- `npm run typecheck -w @ultraia/web` → 0

## FULL gates
- typecheck → lint → test → build (the Genesis code is already FULL-green in 75/76/77;
  this iteration only touches docs + one string, so core/web tsc suffices as the
  relevant gate; no behavioral change).

## NO-hacer
- Do NOT touch the other modified files (AGENT.md, DOCS_TODO.md, resultTask/*) — they
  are pre-existing WIP not part of this work.
- Do NOT push or merge.

## Priority
P3 (bookkeeping)
