import { describe, it, expect } from 'vitest';
import {
  genesisManifestSchema,
  evaluateGates,
  type GenesisManifest,
  type GenesisState,
  type GenesisTask,
} from './genesis';
import {
  runGenesisCycle,
  gapToTask,
  type GapLike,
} from './genesis-runner';

function manifest(over: Partial<GenesisManifest> = {}): GenesisManifest {
  return genesisManifestSchema.parse({
    project: { id: 'ultraia' },
    objective: { primary: 'Evolucionar UltraIa' },
    quality_gates: { build: { required: true }, test: { required: false } },
    autonomy: { level: 1, max_iterations: 100, repair_attempts: 5 },
    pipeline: { steps: ['analyze', 'implement', 'test'] },
    ...over,
  });
}

const baseState: GenesisState = { iterations: 0, repairAttempts: 0 };

describe('runGenesisCycle — stop conditions', () => {
  it('STOPs on autonomy budget (max iterations)', () => {
    const m = manifest();
    const r = runGenesisCycle(m, { ...baseState, iterations: 100 });
    expect(r.action).toBe('STOP');
    expect(r.reason).toMatch(/max iterations/i);
  });

  it('STOPs when approval reached', () => {
    const r = runGenesisCycle(manifest(), { ...baseState, approvalReached: true });
    expect(r.action).toBe('STOP');
    expect(r.reason).toMatch(/approval/i);
  });

  it('STOPs when repair attempts exhausted', () => {
    const r = runGenesisCycle(manifest(), { ...baseState, repairAttempts: 5 });
    expect(r.action).toBe('STOP');
    expect(r.reason).toMatch(/repair/i);
  });

  it('STOPs on safety boundary', () => {
    const r = runGenesisCycle(manifest(), { ...baseState, safetyBoundaryReached: true });
    expect(r.action).toBe('STOP');
  });
});

describe('runGenesisCycle — plan + prioritization', () => {
  const tasks: GenesisTask[] = [
    {
      id: 't1',
      descripcion: 'normal',
      business_value: 0.5,
      technical_impact: 0.5,
      risk_reduction: 0.5,
      dependency_criticality: 0.5,
      confidence: 0.5,
    },
    {
      id: 't2',
      descripcion: 'blocker',
      business_value: 0.1,
      technical_impact: 0.1,
      risk_reduction: 0.1,
      dependency_criticality: 0.1,
      confidence: 0.1,
      bloqueador: true,
    },
  ];

  it('returns PLAN with prioritized tasks (blocker first)', () => {
    const r = runGenesisCycle(manifest(), baseState, { tasks });
    expect(r.action).toBe('PLAN');
    expect(r.tasks?.[0].id).toBe('t2'); // blocker wins regardless of score
    expect(r.tasks?.length).toBe(2);
  });

  it('returns a plan artifact and a next action', () => {
    const r = runGenesisCycle(manifest(), baseState, { tasks });
    expect(r.plan).toBeDefined();
    expect(r.plan?.pasos.length).toBeGreaterThan(0);
    expect(r.next?.action).toMatch(/^IMPLEMENT_TASK:/);
  });

  it('increments iterations by 1', () => {
    const r = runGenesisCycle(manifest(), { ...baseState, iterations: 7 }, { tasks });
    expect(r.state.iterations).toBe(8);
  });

  it('falls back to pipeline step when no tasks', () => {
    const r = runGenesisCycle(manifest(), baseState);
    expect(r.next?.action).toBe('analyze'); // iterations=0 -> steps[0]
    expect(r.tasks).toEqual([]);
  });
});

describe('runGenesisCycle — gap mapping', () => {
  it('maps injected gaps to tasks', () => {
    const gaps: GapLike[] = [
      { id: 'g1', kind: 'source_sin_analizar', detail: 'x', source: 'y' },
      { id: 'g2', kind: 'backlog_pendiente', detail: 'z' },
    ];
    const r = runGenesisCycle(manifest(), baseState, { gaps });
    expect(r.tasks?.length).toBe(2);
    expect(r.tasks?.[0].id).toBe('g2'); // backlog_pendiente is a blocker
  });

  it('gapToTask flags backlog/tema blockers', () => {
    expect(gapToTask({ id: 'a', kind: 'backlog_pendiente' }).bloqueador).toBe(true);
    expect(gapToTask({ id: 'b', kind: 'tema_sin_truth' }).bloqueador).toBe(true);
    expect(gapToTask({ id: 'c', kind: 'source_sin_analizar' }).bloqueador).toBe(false);
  });
});

describe('evaluateGates — real gate verdict', () => {
  it('passes when all required gates pass', () => {
    const r = evaluateGates(manifest(), { build: true, test: true });
    expect(r.passed).toBe(true);
    expect(r.gates.find((g) => g.name === 'build')?.passed).toBe(true);
  });

  it('fails when a required gate fails', () => {
    const r = evaluateGates(manifest(), { build: false, test: true });
    expect(r.passed).toBe(false);
  });

  it('ignores optional gate failures', () => {
    const r = evaluateGates(manifest(), { build: true, test: false });
    expect(r.passed).toBe(true);
  });

  it('treats gates absent from results as unknown (null) but only required block', () => {
    const r = evaluateGates(manifest(), {}); // build missing
    const build = r.gates.find((g) => g.name === 'build');
    expect(build?.passed).toBeNull();
    expect(r.passed).toBe(false);
  });

  it('passes vacuously when no quality_gates declared', () => {
    const r = evaluateGates(manifest({ quality_gates: undefined }), {});
    expect(r.gates).toEqual([]);
    expect(r.passed).toBe(true);
  });
});
