# Plan — Capability `genesis` (Genesis Autonomous Engineering Engine)

## Context
The user shared a DeepSeek conversation ("Genesis" master prompt) describing an
autonomous software-engineering orchestrator driven by an **executable Project
Manifest** (JSON contract) with: autonomous loop, quality gates, autonomy levels
(0-3), stop conditions, hierarchical memory and the Genesis priority formula
`priority = business_value × technical_impact × risk_reduction ×
dependency_criticality × confidence`. The valuable, non-redundant part is the
**declarative manifest engine** — a "new mentality engine" that complements the
existing `autolearn` META-IA (iter-74).

The share also proposed "build from scratch" scaffold files (blueprint/improve/
eval/feedback/llm). Those ALREADY EXIST in UltraIa as sophisticated modules, so
recreating them would REGRESS the project. We do NOT recreate them.

## Objective
Add a deterministic, keyless `genesis` domain module that:
- parses/validates a Genesis Manifest (zod),
- evaluates quality gates,
- computes autonomy level (0-3),
- checks stop conditions,
- prioritizes tasks with the Genesis formula (blockers first),
- computes the next highest-value validated engineering action (FINAL PRINCIPLE),
- builds a loop-piv style improvement plan.
Wire it as tool `genesis_run` + export `genesis` namespace + `Capability` union
`'genesis'`, mirroring the `autolearn` wiring exactly.

## Files to touch
- `packages/core/src/tools/genesis.ts` (NEW)
- `packages/core/src/tools/genesis.test.ts` (NEW)
- `packages/core/src/tools/index.ts` (ADD export + import + tools key + descriptor + Capability union)
- `packages/core/src/ai/llm.ts` (ADD import + `genesis_run` tool block)
- `docs/RAZONAMIENTO-GENESIS.md` (NEW — mapping of the share to implementation)
- `learning/sources/genesis-deepseek.md` (NEW — source from the share, condensed)
- `.opencode/plans/loop-75-genesis-engine.md` (this file)

## Scoped criteria (before FULL)
- `npx vitest run genesis.test.ts` GREEN (target ≥ 22 tests)
- `npx tsc --noEmit -p packages/core/tsconfig.json` → 0 errors introduced
- `npx eslint packages/core/src/tools/genesis.ts` → 0 (project's eslint config)

## FULL criteria (before commit)
- `npm run typecheck` → `npm run lint` → `npm run test` → `npm run build` all GREEN

## NO-hacer
- Do NOT recreate UltraIa scaffold files (blueprint/improve/eval/feedback/llm) —
  they already exist and are sophisticated; the share's "from scratch" plan is
  redundant for this repo.
- Do NOT edit .env / infrastructure / concurrent-session files (automation,
  recorder, reach, blueprint, creativo are owned by other sessions).
- Do NOT push or merge (loop-constraints: human approval required).

## Prediction
Gates FULL green; new capability `genesis` available to agents via `genesis_run`;
autoprogramador theme extended with a declarative manifest contract. Commit
`feat(core): add genesis autonomous-engineering manifest engine`.

## Priority
P1 (high-value, additive, non-breaking).
