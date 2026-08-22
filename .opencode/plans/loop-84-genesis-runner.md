# Plan — loop-76: Genesis runner + real quality-gate evaluation

## Context
iter-75 shipped the `genesis` capability (declarative manifest engine: parse/validate,
autonomy, quality gates, prioritization, stop conditions, next action, plan). The DeepSeek
"Genesis" share's real value is a **self-driving loop**: read the Manifest, analyze → discover
→ prioritize → plan → implement → test → repair → … → reassess. iter-75 was the contract layer;
this iteration adds the **executor** (deterministic orchestration) plus **real quality-gate
evaluation** that maps the Manifest's `quality_gates` onto the actual `npm run typecheck/lint/
test/build` gates, so the engine can actually judge "is the project stable?"

## Objective
Add a deterministic `runGenesisCycle` orchestrator (injects gap-discovery + gate results, so it
is pure/testable) and an `evaluateGates` function that turns real gate pass/fail into the
Manifest's required-gate verdict. Expose a `run` action on the `genesis_run` tool and ship a
real CLI `scripts/genesis-run.ts` that drives the autonomous loop against the live repo
(autolearn gap detection + real npm gates + persisted `.ultraia/genesis/state.json`).

## Files to touch
- NEW `packages/core/src/tools/genesis-runner.ts` — `runGenesisCycle(manifest, state, opts?)`,
  `GenesisCycleResult`, `GapLike`.
- NEW `packages/core/src/tools/genesis-runner.test.ts` — ≥12 tests (stop on max_iterations /
  approval / repair exhaustion; returns plan+next+tasks; increments iterations; evaluateGates
  pass/fail/all-optional; injected gaps → tasks).
- EDIT `packages/core/src/tools/genesis.ts` — add `GateResult` + `evaluateGates(manifest, results)`.
- EDIT `packages/core/src/ai/llm.ts` — `import * as genesisRunner`, add `'run'` to `accion`
  enum, add `run` branch returning `runGenesisCycle`.
- NEW `scripts/genesis-run.ts` — CLI (vite-node): loads `genesis.json` (default
  `.ultraia/genesis/manifest.json`), runs cycles, executes real npm gates, persists state,
  `--dry-run` / `--max-iter` / `--manifest`.

## Scoped gates (per iteration)
- `npx vitest run genesis-runner.test.ts` → GREEN (≥12)
- `npx tsc --noEmit -p packages/core/tsconfig.json` → 0
- `npx eslint packages/core/src/tools/genesis-runner.ts packages/core/src/tools/genesis.ts` → 0

## FULL gates (before commit)
- `npm run typecheck` → `npm run lint` → `npm run test` → `npm run build` (all GREEN)
- Kill dev servers before `npm run build`.

## NO-hacer
- Do NOT recreate any UltraIa module (blueprint/improve/eval/feedback/llm already exist).
- Do NOT edit concurrent-session #25 files (recorder/automation/reach/blueprint untracked).
- Do NOT run real npm gates inside core unit tests (gate execution lives only in the CLI).
- Do NOT push or merge (human approval required).

## Prediction
Gates FULL green; commit `feat(core): add genesis runner with real quality-gate evaluation`.
The engine will, against the live repo, discover gaps via autolearn and report the next
validated action + gate verdict — without auto-mutating the tree beyond its own state file.

## Priority
P1
