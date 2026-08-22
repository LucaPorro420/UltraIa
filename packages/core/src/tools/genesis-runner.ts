//! Genesis Runner — deterministic orchestration of the autonomous engineering loop.
//!
//! This is the *executor* layer on top of the `genesis` contract (iter-75). It is
//! pure and dependency-injected so it is fully unit-testable: gap discovery and gate
//! execution are passed in by the caller (the CLI `scripts/genesis-run.ts` wires the
//! real `autolearn.detectGaps` + real `npm run ...` gates). The runner never shells
//! out or reads the filesystem on its own — it decides the next validated action.

import {
  type GenesisManifest,
  type GenesisState,
  type GenesisTask,
  type GenesisPlan,
  type PrioritizedTask,
  prioritizeTasks,
  buildGenesisPlan,
  nextEngineeringAction,
  checkStopConditions,
} from './genesis';

/** Minimal shape of an autolearn gap (kept structural to avoid a hard import cycle). */
export interface GapLike {
  id: string;
  kind: string;
  detail?: string;
  source?: string;
  [key: string]: unknown;
}

export interface GenesisCycleResult {
  action: 'STOP' | 'PLAN';
  reason: string;
  tasks?: PrioritizedTask[];
  plan?: GenesisPlan;
  next?: { action: string; rationale: string };
  state: GenesisState;
}

export interface RunGenesisCycleOptions {
  /** Explicit tasks (e.g. discovered gaps mapped to GenesisTask). */
  tasks?: GenesisTask[];
  /** Raw gaps from a discovery step (mapped to tasks when `tasks` is absent). */
  gaps?: GapLike[];
}

/** Map an autolearn-style gap into a GenesisTask with neutral-but-positive scores. */
export function gapToTask(gap: GapLike): GenesisTask {
  return {
    id: gap.id,
    descripcion: `${gap.kind}: ${gap.detail ?? gap.id}`,
    business_value: 0.7,
    technical_impact: 0.7,
    risk_reduction: 0.6,
    dependency_criticality: 0.6,
    confidence: 0.6,
    bloqueador: gap.kind === 'backlog_pendiente' || gap.kind === 'tema_sin_truth',
  };
}

/**
 * Run one iteration of the Genesis loop.
 *
 * 1. Check stop conditions (§18). If any → STOP.
 * 2. Discover: convert injected `gaps` → tasks when `tasks` not supplied.
 * 3. Prioritize tasks with the Genesis formula (blockers first).
 * 4. Build the loop-piv style plan.
 * 5. Compute the next validated engineering action (FINAL PRINCIPLE).
 * 6. Advance `iterations`.
 */
export function runGenesisCycle(
  manifest: GenesisManifest,
  state: GenesisState,
  opts: RunGenesisCycleOptions = {},
): GenesisCycleResult {
  const stop = checkStopConditions(state, manifest);
  if (stop.stop) {
    return { action: 'STOP', reason: stop.reason, state };
  }

  const tasks: GenesisTask[] = opts.tasks ?? (opts.gaps ?? []).map(gapToTask);
  const prioritized = prioritizeTasks(tasks);
  const plan = buildGenesisPlan(manifest, state, tasks);
  const next = nextEngineeringAction(manifest, state, tasks);

  const advanced: GenesisState = {
    ...state,
    iterations: (state.iterations ?? 0) + 1,
  };

  return {
    action: next.action === 'STOP' ? 'STOP' : 'PLAN',
    reason: next.rationale,
    tasks: prioritized,
    plan,
    next,
    state: advanced,
  };
}
