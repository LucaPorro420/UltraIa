# Plan — loop-88: genesis propose (reviewable improvement artifact)

## Context
The Genesis engine (iter-83..87) now parses a Manifest, discovers real gaps via
`autolearn.detectGaps`, prioritizes them, and computes the next validated action. But its
output only lands on the console in `--dry-run`. A human/loop-piv reviewer needs a
*persisted, reviewable artifact* of the proposed next improvement.

## Objective
Add `buildGenesisProposal(manifest, state, tasks?, gaps?)` (pure, deterministic Markdown)
+ expose it as the `genesis_run` tool action `propose` + add a CLI `--propose`/`--propose`
flag that writes `.ultraia/genesis/proposal.md`. No source mutation, no auto-commit.

## Files to touch
- EDIT `packages/core/src/tools/genesis.ts` — add `GenesisProposal` interface +
  `buildGenesisProposal()` (Markdown: header, vitals stub, top gaps, prioritized tasks,
  next action, recommended plan steps).
- EDIT `packages/core/src/tools/genesis.test.ts` — 3 tests (deterministic content).
- EDIT `packages/core/src/ai/llm.ts` — add `propose` to `accion` enum + switch branch.
- EDIT `scripts/genesis-run.ts` — add `--propose` flag; when set, compute proposal and
  write `.ultraia/genesis/proposal.md` (and print).
- EDIT `docs/RAZONAMIENTO-GENESIS.md` — one line noting `propose`.

## Scoped gates
- `npx tsc --noEmit -p packages/core/tsconfig.json` → 0
- `npm run test -w @ultraia/core` → 193+ green (genesis now 37 tests)

## FULL gates
- typecheck → lint → test → build (change is pure function + CLI flag + 1 tool action;
  already-green code path). Build unaffected (CLI/scripts not in next build graph).

## NO-hacer
- Do NOT auto-edit source or auto-commit from the engine (human approval required).
- Do NOT touch concurrent-session #25 WIP or blocked GPU/human items.

## Priority
P2 (completes the Genesis usefulness arc)
