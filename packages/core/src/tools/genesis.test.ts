import { describe, it, expect } from 'vitest';
import {
  genesis,
  genesisManifestSchema,
  parseManifest,
  autonomyLevel,
  qualityGates,
  prioritizeTasks,
  checkStopConditions,
  nextEngineeringAction,
  buildGenesisPlan,
  buildGenesisProposal,
  type GenesisManifest,
  type GenesisTask,
} from './genesis';

const SAMPLE_MANIFEST: GenesisManifest = {
  genesis: { version: '1.0.0', manifest_version: '1.0' },
  project: { id: 'ultraia', name: 'UltraIa', stage: 'from_scratch' },
  objective: { primary: 'Construir UltraIa', success_criteria: ['tests pass'] },
  pipeline: { steps: ['analyze', 'discover', 'prioritize', 'plan', 'implement'] },
  quality_gates: {
    build: { required: true, command: 'npm run build' },
    tests: { required: true, command: 'npm run test' },
    coverage: { required: true, minimum: 90, command: 'npm run test -- --coverage' },
    lint: { required: false, command: 'npm run lint' },
  },
  autonomy: { level: 1, repair_attempts: 5, max_iterations: 100 },
};

describe('genesis / parseManifest', () => {
  it('parses a valid manifest', () => {
    const r = parseManifest(SAMPLE_MANIFEST);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.manifest.project.id).toBe('ultraia');
  });

  it('parses a JSON string', () => {
    const r = parseManifest(JSON.stringify(SAMPLE_MANIFEST));
    expect(r.ok).toBe(true);
  });

  it('returns ok:false for invalid JSON', () => {
    const r = parseManifest('{not json');
    expect(r.ok).toBe(false);
  });

  it('returns ok:false for missing project.id', () => {
    const r = parseManifest({ project: { name: 'x' } });
    expect(r.ok).toBe(false);
  });

  it('tolerates an empty object-shaped input (project.id required -> fail)', () => {
    const r = parseManifest({});
    expect(r.ok).toBe(false);
  });
});

describe('genesis / autonomyLevel', () => {
  it('defaults to 0 when unset', () => {
    expect(autonomyLevel({ project: { id: 'x' } })).toBe(0);
  });
  it('reads the level from the manifest', () => {
    expect(autonomyLevel(SAMPLE_MANIFEST)).toBe(1);
  });
  it('clamps out-of-range levels', () => {
    expect(autonomyLevel({ project: { id: 'x' }, autonomy: { level: 9 } })).toBe(3);
    expect(autonomyLevel({ project: { id: 'x' }, autonomy: { level: -2 } })).toBe(0);
  });
});

describe('genesis / qualityGates', () => {
  it('returns [] when none defined', () => {
    expect(qualityGates({ project: { id: 'x' } })).toBeInstanceOf(Array);
    expect(qualityGates({ project: { id: 'x' } }).length).toBe(0);
  });
  it('maps each gate with defaults', () => {
    const gates = qualityGates(SAMPLE_MANIFEST);
    expect(gates.length).toBe(4);
    const build = gates.find((g) => g.name === 'build');
    expect(build?.required).toBe(true);
    expect(build?.command).toBe('npm run build');
  });
  it('marks unmarked gates as not required', () => {
    const gates = qualityGates(SAMPLE_MANIFEST);
    const lint = gates.find((g) => g.name === 'lint');
    expect(lint?.required).toBe(false);
  });
  it('exposes minimum on coverage gate', () => {
    const cov = qualityGates(SAMPLE_MANIFEST).find((g) => g.name === 'coverage');
    expect(cov?.minimum).toBe(90);
  });
});

describe('genesis / prioritizeTasks (Genesis formula)', () => {
  const tasks: GenesisTask[] = [
    {
      id: 'a',
      descripcion: 'Low priority',
      business_value: 1,
      technical_impact: 1,
      risk_reduction: 1,
      dependency_criticality: 1,
      confidence: 1,
    },
    {
      id: 'b',
      descripcion: 'High priority',
      business_value: 5,
      technical_impact: 4,
      risk_reduction: 3,
      dependency_criticality: 2,
      confidence: 0.9,
    },
  ];

  it('orders by product of factors (highest first)', () => {
    const ranked = prioritizeTasks(tasks);
    expect(ranked[0].id).toBe('b');
    expect(ranked[1].id).toBe('a');
  });

  it('computes the priority as the product', () => {
    const ranked = prioritizeTasks(tasks);
    expect(ranked.find((t) => t.id === 'b')?.priority).toBeCloseTo(5 * 4 * 3 * 2 * 0.9);
  });

  it('puts blockers first regardless of score', () => {
    const withBlocker: GenesisTask[] = [
      { ...tasks[1], id: 'b' },
      { ...tasks[0], id: 'a', bloqueador: true },
    ];
    const ranked = prioritizeTasks(withBlocker);
    expect(ranked[0].id).toBe('a');
    expect(ranked[0].bloqueador).toBe(true);
  });

  it('returns empty array for no tasks', () => {
    expect(prioritizeTasks([]).length).toBe(0);
  });
});

describe('genesis / checkStopConditions', () => {
  const base = { iterations: 1, repairAttempts: 0 };

  it('continues by default', () => {
    expect(checkStopConditions(base).stop).toBe(false);
  });
  it('stops on stable release', () => {
    expect(checkStopConditions({ ...base, stableReleaseAchieved: true }).reason).toContain('Stable');
  });
  it('stops on approval reached', () => {
    expect(checkStopConditions({ ...base, approvalReached: true }).reason).toContain('approval');
  });
  it('stops on safety boundary', () => {
    expect(checkStopConditions({ ...base, safetyBoundaryReached: true }).reason).toContain('Safety');
  });
  it('stops when repair attempts exhausted (explicit)', () => {
    expect(checkStopConditions({ ...base, repairAttemptsExhausted: true }).reason).toContain('Repair');
  });
  it('stops when repair attempts >= manifest limit', () => {
    const r = checkStopConditions(
      { ...base, repairAttempts: 5 },
      { project: { id: 'x' }, autonomy: { level: 1, repair_attempts: 5 } },
    );
    expect(r.stop).toBe(true);
  });
  it('stops on missing info', () => {
    expect(checkStopConditions({ ...base, requiredInfoUnavailable: true }).reason).toContain('information');
  });
  it('stops on ambiguous repo', () => {
    expect(checkStopConditions({ ...base, repoStateAmbiguous: true }).reason).toContain('ambiguous');
  });
  it('stops on destructive confirmation', () => {
    expect(
      checkStopConditions({ ...base, destructiveRequiresConfirmation: true }).reason,
    ).toContain('Destructive');
  });
  it('stops on unsatisfied quality', () => {
    expect(checkStopConditions({ ...base, qualityUnsatisfied: true }).reason).toContain('Quality');
  });
  it('stops when iterations hit manifest max', () => {
    const r = checkStopConditions(
      { ...base, iterations: 100 },
      { project: { id: 'x' }, autonomy: { level: 1, max_iterations: 100 } },
    );
    expect(r.stop).toBe(true);
    expect(r.reason).toContain('budget');
  });
});

describe('genesis / nextEngineeringAction (FINAL PRINCIPLE)', () => {
  const state = { iterations: 0, repairAttempts: 0 };

  it('returns STOP when a stop condition is met', () => {
    const r = nextEngineeringAction(SAMPLE_MANIFEST, {
      ...state,
      stableReleaseAchieved: true,
    });
    expect(r.action).toBe('STOP');
  });

  it('returns the top-priority task when tasks are queued', () => {
    const tasks: GenesisTask[] = [
      {
        id: 'low',
        descripcion: 'low',
        business_value: 1,
        technical_impact: 1,
        risk_reduction: 1,
        dependency_criticality: 1,
        confidence: 1,
      },
      {
        id: 'high',
        descripcion: 'high',
        business_value: 5,
        technical_impact: 5,
        risk_reduction: 5,
        dependency_criticality: 5,
        confidence: 1,
      },
    ];
    const r = nextEngineeringAction(SAMPLE_MANIFEST, state, tasks);
    expect(r.action).toBe('IMPLEMENT_TASK:high');
    expect(r.rationale).toContain('Highest-value');
  });

  it('falls back to pipeline step when no tasks', () => {
    const r = nextEngineeringAction(SAMPLE_MANIFEST, state);
    expect(r.action).toBe('analyze');
    expect(r.rationale).toContain('Pipeline step');
  });

  it('advances pipeline step by iteration index', () => {
    const r = nextEngineeringAction(SAMPLE_MANIFEST, { ...state, iterations: 2 });
    expect(r.action).toBe('prioritize');
  });
});

describe('genesis / buildGenesisPlan', () => {
  it('produces a loop-piv style artifact', () => {
    const plan = buildGenesisPlan(SAMPLE_MANIFEST, { iterations: 0, repairAttempts: 0 });
    expect(plan.objetivo).toContain('UltraIa');
    expect(plan.pasos.length).toBeGreaterThan(3);
    expect(plan.criterios_full).toContain('build');
    expect(plan.prioridad).toBe('P1');
    expect(plan.prediccion).toContain('Siguiente acción');
  });
});

describe('genesis / namespace + schema export', () => {
  it('exposes all functions', () => {
    expect(typeof genesis.parseManifest).toBe('function');
    expect(typeof genesis.autonomyLevel).toBe('function');
    expect(typeof genesis.qualityGates).toBe('function');
    expect(typeof genesis.prioritizeTasks).toBe('function');
    expect(typeof genesis.checkStopConditions).toBe('function');
    expect(typeof genesis.nextEngineeringAction).toBe('function');
    expect(typeof genesis.buildGenesisPlan).toBe('function');
  });
  it('schema is exported', () => {
    expect(genesisManifestSchema).toBeDefined();
  });
});

describe('genesis / buildGenesisProposal', () => {
  const tasks: GenesisTask[] = [
    {
      id: 't1',
      descripcion: 'Add retry to fetch',
      business_value: 0.9,
      technical_impact: 0.8,
      risk_reduction: 0.7,
      dependency_criticality: 0.6,
      confidence: 0.8,
    },
    {
      id: 't0',
      descripcion: 'Unblock build',
      business_value: 0.9,
      technical_impact: 0.9,
      risk_reduction: 0.9,
      dependency_criticality: 0.9,
      confidence: 0.9,
      bloqueador: true,
    },
  ];
  const gaps = [
    { id: 'g1', kind: 'source_sin_analizar', detail: 'Fuente X sin RAZONAMIENTO' },
  ];

  it('produces deterministic reviewable Markdown', () => {
    const p = buildGenesisProposal({
      manifest: SAMPLE_MANIFEST,
      state: { iterations: 3, repairAttempts: 0 },
      tasks,
      gaps,
    });
    expect(p.markdown).toContain('# Genesis Proposal');
    expect(p.markdown).toContain('UltraIa');
    expect(p.markdown).toContain('source_sin_analizar');
    expect(p.markdown).toContain('Unblock build');
    expect(p.nextAction).toContain('IMPLEMENT_TASK');
    expect(p.topTaskId).toBe('t0'); // blocker first
  });

  it('handles empty gaps/tasks gracefully', () => {
    const p = buildGenesisProposal({
      manifest: SAMPLE_MANIFEST,
      state: { iterations: 0, repairAttempts: 0 },
    });
    expect(p.markdown).toContain('No gaps discovered');
    expect(p.markdown).toContain('No tasks queued');
    expect(typeof p.nextAction).toBe('string');
  });

  it('is exposed on the namespace', () => {
    expect(typeof genesis.buildGenesisProposal).toBe('function');
  });
});
