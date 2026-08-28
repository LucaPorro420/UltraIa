# Plan: loop-126 — Enable knowledge capabilities on agents (enlaces.txt L7/L9/L247)

## Context
The user's `enlaces.txt` requested installing & using three repos for the agent/project:
- L7 `mindmuxai/brain.md` → ported as capability `brainpage` (tools/brainpage.ts)
- L9 `Graphify-Labs/graphify` → ported as capability `kgraph` (tools/kgraph.ts + knowledge-graph.ts)
- L247 `webadderallorg/Recordly` → ported as capability `recordly` (tools/recordly.ts)

All three capabilities are fully implemented, wired in `ai/llm.ts` (gated by
`opts.tools?.includes('kgraph'|'brainpage'|'recordly')`), and exported in `tools/index.ts`
with tool descriptors + `Capability` union entries + wiring tests. The ports are DONE.

The remaining gap vs the literal request ("use it for the agent") is that these caps are
NOT in the default admin agent capability set — so agents never receive them in `opts.tools`.
`prioritize` was enabled the same way in seed-admin.mjs; we extend that base list.

## Objective
Enable `kgraph`, `brainpage`, `recordly` on all 8 admin agents (seed-admin.mjs base caps),
and commit the downloaded enlaces.txt source READMEs as evidence (per enlaces.txt protocol:
"La fuente queda commiteada en learning/sources/").

## Steps
1. Edit `packages/core/prisma/seed-admin.mjs` line 30: append `'kgraph','brainpage','recordly'`
   to the base caps array (`[...a.caps, 'skills','content','memory','prioritize', ...]`).
2. Commit downloaded sources: `learning/sources/mindmuxai-brain-README.md`,
   `learning/sources/graphify-README.md`, `learning/sources/graphify-main-README.md`.
3. Add STATE.md backlog row #126 (DONE) + loop-run-log entry.

## ARCHIVOS A TOCAR
- `packages/core/prisma/seed-admin.mjs` (1-line edit)
- `learning/sources/mindmuxai-brain-README.md` (new, downloaded)
- `learning/sources/graphify-README.md` (new, downloaded)
- `learning/sources/graphify-main-README.md` (new, downloaded)
- `.opencode/plans/loop-126-enable-knowledge-caps.md` (this plan)
- `STATE.md` (task row)

## NO-hacer
- Do NOT modify the capability .ts files (already complete + tested).
- Do NOT run a full reseed unprompted (the source change activates on next `npm run db:seed`);
  the repo gates (typecheck/lint/test/build) do not depend on .mjs seeds.
- Do NOT push (standing rule).

## Criterios de verificación (FULL CI order)
- `npm run typecheck` → 0
- `npm run lint` → 0
- `npm run test` → green (core 1847+ / runtime 193+ unaffected by .mjs change)
- `npm run build` → 0 (seed .mjs not in build graph)

## Predicción
All 4 gates remain GREEN (change is additive data in a .mjs seed script + markdown evidence).
Commit via pathspec with message `feat(agents): enable kgraph/brainpage/recordly caps (enlaces.txt L7/L9/L247)`.
