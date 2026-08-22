//! Capability `genesis` — Genesis Autonomous Software Engineering Engine.
//!
//! Port ORIGINAL of the principios from the DeepSeek "Genesis" share (an
//! executable Project Manifest that drives an autonomous engineering loop).
//! NO code was copied; this is a clean, deterministic, keyless domain module
//! that parses a Genesis Manifest, evaluates quality gates, autonomy levels &
//! stop conditions, prioritizes tasks with the Genesis formula and computes
//! the next highest-value validated engineering action (the "FINAL PRINCIPLE").
//!
//! It complements `autolearn` (META-IA RICE prioritization) with a declarative
//! contract layer: the Manifest is the project's executable source of intent.
//!
//! * Fuente del diseño: learning/sources/genesis-deepseek.md.

import { z } from 'zod';

// ---------------------------------------------------------------------------
// Schema: Genesis Project Manifest (declarative contract, fail-soft)
// ---------------------------------------------------------------------------

export const gateSchema = z.object({
  required: z.boolean().optional(),
  command: z.string().optional(),
  minimum: z.number().optional(),
  tools: z.array(z.string()).optional(),
  files: z.array(z.string()).optional(),
});

export const genesisManifestSchema = z.object({
  genesis: z
    .object({ version: z.string().optional(), manifest_version: z.string().optional() })
    .optional(),
  project: z.object({
    id: z.string(),
    name: z.string().optional(),
    description: z.string().optional(),
    type: z.string().optional(),
    stage: z.string().optional(),
    repository: z.string().optional(),
  }),
  objective: z
    .object({ primary: z.string().optional(), success_criteria: z.array(z.string()).optional() })
    .optional(),
  technology: z.record(z.any()).optional(),
  agents: z
    .object({
      dynamic_creation: z.boolean().optional(),
      enabled: z.array(z.string()).optional(),
      factory: z.record(z.any()).optional(),
    })
    .optional(),
  pipeline: z.object({ mode: z.string().optional(), steps: z.array(z.string()).optional() }).optional(),
  quality_gates: z.record(gateSchema).optional(),
  autonomy: z
    .object({
      level: z.number().int().min(0).max(3).optional(),
      automatic_actions: z.array(z.string()).optional(),
      approval_required: z.array(z.string()).optional(),
      repair_attempts: z.number().optional(),
      max_iterations: z.number().optional(),
    })
    .optional(),
  repositories: z.record(z.any()).optional(),
  memory: z.record(z.any()).optional(),
  execution: z.record(z.any()).optional(),
  observability: z.record(z.any()).optional(),
  release: z.record(z.any()).optional(),
});

export type GenesisManifest = z.infer<typeof genesisManifestSchema>;

export type ParseResult =
  | { ok: true; manifest: GenesisManifest }
  | { ok: false; error: string };

// ---------------------------------------------------------------------------
// Parse / validate
// ---------------------------------------------------------------------------

export function parseManifest(input: string | unknown): ParseResult {
  try {
    const obj = typeof input === 'string' ? JSON.parse(input) : input;
    const manifest = genesisManifestSchema.parse(obj);
    return { ok: true, manifest };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

// ---------------------------------------------------------------------------
// Autonomy
// ---------------------------------------------------------------------------

export function autonomyLevel(manifest: GenesisManifest): 0 | 1 | 2 | 3 {
  const lvl = manifest.autonomy?.level;
  if (lvl === undefined) return 0;
  return (lvl < 0 ? 0 : lvl > 3 ? 3 : lvl) as 0 | 1 | 2 | 3;
}

// ---------------------------------------------------------------------------
// Quality gates
// ---------------------------------------------------------------------------

export interface QualityGate {
  name: string;
  required: boolean;
  command?: string;
  minimum?: number;
  tools?: string[];
  files?: string[];
}

export function qualityGates(manifest: GenesisManifest): QualityGate[] {
  const qg = manifest.quality_gates;
  if (!qg) return [];
  return Object.entries(qg).map(([name, g]) => ({
    name,
    required: g.required ?? false,
    command: g.command,
    minimum: g.minimum,
    tools: g.tools,
    files: g.files,
  }));
}

// ---------------------------------------------------------------------------
// Task prioritization (Genesis formula)
// ---------------------------------------------------------------------------

export interface GenesisTask {
  id: string;
  descripcion: string;
  business_value: number;
  technical_impact: number;
  risk_reduction: number;
  dependency_criticality: number;
  confidence: number;
  bloqueador?: boolean;
}

export interface PrioritizedTask extends GenesisTask {
  priority: number;
}

export function prioritizeTasks(tasks: GenesisTask[]): PrioritizedTask[] {
  const scored = tasks.map((t) => {
    const priority =
      t.business_value *
      t.technical_impact *
      t.risk_reduction *
      t.dependency_criticality *
      t.confidence;
    return { ...t, priority };
  });
  return scored.sort((a, b) => {
    const ab = a.bloqueador ? 1 : 0;
    const bb = b.bloqueador ? 1 : 0;
    if (ab !== bb) return bb - ab; // blockers first
    return b.priority - a.priority;
  });
}

// ---------------------------------------------------------------------------
// Stop conditions (§18 of the Genesis spec)
// ---------------------------------------------------------------------------

export interface GenesisState {
  iterations: number;
  repairAttempts: number;
  stableReleaseAchieved?: boolean;
  approvalReached?: boolean;
  safetyBoundaryReached?: boolean;
  repairAttemptsExhausted?: boolean;
  requiredInfoUnavailable?: boolean;
  repoStateAmbiguous?: boolean;
  destructiveRequiresConfirmation?: boolean;
  qualityUnsatisfied?: boolean;
  maxIterations?: number;
  maxRepairAttempts?: number;
}

export function checkStopConditions(
  state: GenesisState,
  manifest?: GenesisManifest,
): { stop: boolean; reason: string } {
  const maxIter = manifest?.autonomy?.max_iterations ?? state.maxIterations ?? Infinity;
  const maxRepair = manifest?.autonomy?.repair_attempts ?? state.maxRepairAttempts ?? Infinity;

  if (state.stableReleaseAchieved) return { stop: true, reason: 'Stable release achieved' };
  if (state.approvalReached) return { stop: true, reason: 'Required approval reached' };
  if (state.safetyBoundaryReached) return { stop: true, reason: 'Safety boundary reached' };
  if (state.repairAttemptsExhausted || state.repairAttempts >= maxRepair)
    return { stop: true, reason: 'Repair attempts exhausted' };
  if (state.requiredInfoUnavailable) return { stop: true, reason: 'Required information unavailable' };
  if (state.repoStateAmbiguous) return { stop: true, reason: 'Repository state ambiguous' };
  if (state.destructiveRequiresConfirmation)
    return { stop: true, reason: 'Destructive action requires confirmation' };
  if (state.qualityUnsatisfied) return { stop: true, reason: 'Quality requirements cannot be satisfied' };
  if (state.iterations >= maxIter) return { stop: true, reason: 'Autonomy budget exhausted (max iterations)' };
  return { stop: false, reason: 'Continue' };
}

// ---------------------------------------------------------------------------
// Next engineering action (the FINAL PRINCIPLE, §21)
// ---------------------------------------------------------------------------

export function nextEngineeringAction(
  manifest: GenesisManifest,
  state: GenesisState,
  tasks?: GenesisTask[],
): { action: string; rationale: string } {
  const stop = checkStopConditions(state, manifest);
  if (stop.stop) return { action: 'STOP', rationale: stop.reason };

  if (tasks && tasks.length > 0) {
    const ranked = prioritizeTasks(tasks);
    const top = ranked[0];
    return {
      action: `IMPLEMENT_TASK:${top.id}`,
      rationale: `Highest-value validated action (priority ${top.priority.toFixed(
        4,
      )}, ${top.bloqueador ? 'blocker' : 'normal'}): ${top.descripcion}`,
    };
  }

  const steps =
    manifest.pipeline?.steps ?? [
      'analyze',
      'discover',
      'prioritize',
      'plan',
      'implement',
      'test',
      'repair',
      'refactor',
      'document',
      'validate',
      'commit',
      'reassess',
    ];
  const idx = Math.min(state.iterations, steps.length - 1);
  return {
    action: steps[idx],
    rationale: `Pipeline step ${idx + 1}/${steps.length}: ${steps[idx]} (no explicit tasks queued)`,
  };
}

// ---------------------------------------------------------------------------
// Plan (loop-piv style artifact)
// ---------------------------------------------------------------------------

export interface GenesisPlan {
  objetivo: string;
  pasos: string[];
  archivos: string[];
  criterios_scoped: string;
  criterios_full: string;
  prioridad: string;
  prediccion: string;
}

export function buildGenesisPlan(
  manifest: GenesisManifest,
  state: GenesisState,
  tasks?: GenesisTask[],
): GenesisPlan {
  const next = nextEngineeringAction(manifest, state, tasks);
  const gates = qualityGates(manifest)
    .filter((g) => g.required)
    .map((g) => g.name);
  return {
    objetivo:
      manifest.objective?.primary ?? 'Mover el proyecto hacia su estado estable declarado.',
    pasos: [
      'ANALYZE: inspeccionar manifiesto + estado del repo',
      'DISCOVER: detectar gaps/deuda/riesgos',
      'PRIORITIZE: ordenar por la fórmula Genesis',
      `NEXT: ${next.action}`,
      'IMPLEMENT -> TEST -> REPAIR -> REFACTOR -> DOCUMENT -> VALIDATE -> COMMIT -> REASSESS',
    ],
    archivos: [],
    criterios_scoped: 'genesis.test.ts GREEN + tsc core 0 + eslint 0',
    criterios_full: 'typecheck -> lint -> test -> build GREEN',
    prioridad: 'P1',
    prediccion: `Siguiente acción validada: ${next.action} — ${next.rationale}`,
  };
}

// ---------------------------------------------------------------------------
// Namespace (mirrors autolearn)
// ---------------------------------------------------------------------------

export const genesis = {
  genesisManifestSchema,
  parseManifest,
  autonomyLevel,
  qualityGates,
  prioritizeTasks,
  checkStopConditions,
  nextEngineeringAction,
  buildGenesisPlan,
};
