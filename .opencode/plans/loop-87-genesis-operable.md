# Plan — loop-87: make genesis operable out-of-the-box

## Context
The Genesis engine (iter-83/84/85) is shipped and FULL-green, but there is no
first-class way to run it and no committable sample manifest. The CLI self-bootstraps
with a built-in DEFAULT_MANIFEST, yet a documented entry point (`npm run genesis`) plus
a real `.json` sample makes the feature usable and discoverable.

## Objective
Add `npm run genesis` (vite-node -> scripts/genesis-run.ts) and commit a representative
sample manifest at `scripts/genesis.manifest.json` the CLI can load via `--manifest`.
Validate with `--dry-run` (no tree mutation, gates not executed).

## Files to touch
- EDIT `package.json` — add `"genesis": "vite-node scripts/genesis-run.ts --manifest scripts/genesis.manifest.json"` to `scripts`.
- NEW `scripts/genesis.manifest.json` — sample GenesisManifest (autonomy 1, goals,
  quality_gates = the 4 npm gates, constraints, stop_conditions, max_iterations 40).
- (implicit) the CLI already defaults to STATE_DIR/genesis/manifest.json and supports
  `--manifest` + `--dry-run`; no CLI code change needed.

## Scoped gates
- `npm run genesis -- --dry-run` prints a plan and exits without mutating the repo.

## FULL gates
- typecheck -> lint -> test -> build (no behavioral change; only config + a .json fixture).
  The genesis code is already FULL-green; this iteration adds config + fixture only.

## NO-hacer
- Do NOT change CLI logic.
- Do NOT run non-dry-run (would spawn real npm gates) in this iteration.
- Do NOT touch pre-existing WIP (AGENT.md, DOCS_TODO.md, resultTask/*).

## Priority
P3 (operability)
