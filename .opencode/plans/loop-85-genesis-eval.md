# Plan — loop-77: genesis_run `eval` action (tool-level gate verdict)

## Context
iter-76 added `evaluateGates(manifest, results)` (maps real pass/fail → Manifest verdict) and a
CLI that runs real `npm` gates. But the `genesis_run` tool could only read the *declared* gates
(`gates` action), not evaluate a verdict from provided results. This iteration closes that gap
so the engine can be audited/used directly: feed the gate results and get the pass/fail verdict.

## Objective
Add an `eval` action to the `genesis_run` tool that calls `genesis.evaluateGates` on a supplied
`resultadosJson` map, and document it in the tool description.

## Files to touch
- EDIT `packages/core/src/ai/llm.ts` — add `'eval'` to `accion` enum, add `resultadosJson?: string`
  param, add `eval` branch returning `genesis.evaluateGates(m, results)`; update tool description.
- EDIT `.opencode/plans/loop-77-genesis-eval.md` — this plan.

## Scoped gates (per iteration)
- `npx tsc --noEmit -p packages/core/tsconfig.json` → 0
- `npx vitest run genesis-runner.test.ts` → GREEN (already 15)

## FULL gates (before commit)
- `npm run typecheck` → `npm run lint` → `npm run test` → `npm run build` (all GREEN)
- Kill dev servers before `npm run build`.

## NO-hacer
- No new capability; no recreation of modules; no push/merge; no real gate execution in core.

## Prediction
Gates FULL green; commit `feat(core): add genesis_run eval action for quality-gate verdict`.

## Priority
P2
