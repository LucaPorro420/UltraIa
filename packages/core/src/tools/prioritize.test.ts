import { describe, it, expect } from 'vitest';
import {
  scoreExperiment,
  levelFor,
  prioritizeExperiments,
  detectWeakRules,
  detectBottlenecks,
  computeRoi,
  computeKnowledge,
  autoPrioritizeCycle,
  classifyExplorationMix,
  type PriorityExperiment,
  type Rule,
  type ModuleBottleneck,
} from './prioritize';

const mk = (over: Partial<PriorityExperiment> = {}): PriorityExperiment => ({
  id: 'EXP-1',
  objective: 'test',
  impact: 0.9,
  confidence: 0.9,
  learningValue: 0.5,
  urgency: 0.8,
  computeCost: 0.3,
  ...over,
});

describe('prioritize: scoreExperiment', () => {
  it('aplica la formula Impacto*Confianza*Learning*Urgencia/Costo', () => {
    const e = mk({ impact: 0.9, confidence: 0.9, learningValue: 0.5, urgency: 0.8, computeCost: 0.5 });
    expect(scoreExperiment(e)).toBeCloseTo((0.9 * 0.9 * 0.5 * 0.8) / 0.5, 4);
  });
  it('clampa el score a [0,1] cuando el costo es ~0', () => {
    const s = scoreExperiment(mk({ impact: 1, confidence: 1, learningValue: 1, urgency: 1, computeCost: 0.0001 }));
    expect(s).toBe(1);
  });
  it('devuelve 0 para valores NaN', () => {
    expect(scoreExperiment(mk({ impact: NaN } as unknown as PriorityExperiment))).toBe(0);
  });
  it('clampa factores fuera de rango', () => {
    const s = scoreExperiment(mk({ impact: 5, confidence: -1 }));
    expect(s).toBeGreaterThanOrEqual(0);
    expect(s).toBeLessThanOrEqual(1);
  });
});

describe('prioritize: levelFor', () => {
  it('A >= 0.6', () => expect(levelFor(0.6)).toBe('A'));
  it('B en [0.4,0.6)', () => expect(levelFor(0.4)).toBe('B'));
  it('C en [0.2,0.4)', () => expect(levelFor(0.2)).toBe('C'));
  it('D < 0.2', () => expect(levelFor(0.1)).toBe('D'));
});

describe('prioritize: prioritizeExperiments', () => {
  it('ordena por score descendente', () => {
    const list = [
      mk({ id: 'low', impact: 0.2, confidence: 0.2, learningValue: 0.2, urgency: 0.2, computeCost: 0.9 }),
      mk({ id: 'high', impact: 0.9, confidence: 0.9, learningValue: 0.9, urgency: 0.9, computeCost: 0.1 }),
    ];
    const r = prioritizeExperiments(list);
    expect(r[0].id).toBe('high');
    expect(r[1].id).toBe('low');
  });
  it('asigna nivel coherente con el score', () => {
    const r = prioritizeExperiments([mk({ id: 'x', impact: 0.9, confidence: 0.9, learningValue: 0.9, urgency: 0.9, computeCost: 0.1 })]);
    expect(r[0].level).toBe('A');
  });
  it('expone factores clamps en el resultado', () => {
    const r = prioritizeExperiments([mk({ impact: 5 })]);
    expect(r[0].factors.impact).toBe(1);
  });
  it('maneja lista vacia', () => {
    expect(prioritizeExperiments([])).toEqual([]);
  });
});

describe('prioritize: analisis', () => {
  it('detectWeakRules filtra por umbral', () => {
    const rules: Rule[] = [
      { id: 'r1', description: 'a', confidence: 0.3, impact: 0.5 },
      { id: 'r2', description: 'b', confidence: 0.95, impact: 0.5 },
    ];
    expect(detectWeakRules(rules).map((r) => r.id)).toEqual(['r1']);
  });
  it('detectWeakRules ordena por confianza ascendente', () => {
    const rules: Rule[] = [
      { id: 'r1', description: 'a', confidence: 0.5, impact: 0.5 },
      { id: 'r2', description: 'b', confidence: 0.1, impact: 0.5 },
      { id: 'r3', description: 'c', confidence: 0.2, impact: 0.5 },
    ];
    expect(detectWeakRules(rules).map((r) => r.id)).toEqual(['r2', 'r3', 'r1']);
  });
  it('detectBottlenecks ordena por impacto global desc', () => {
    const m: ModuleBottleneck[] = [
      { module: 'x', impactGlobal: 0.2 },
      { module: 'y', impactGlobal: 0.8 },
    ];
    expect(detectBottlenecks(m)[0].module).toBe('y');
  });
  it('detectBottlenecks no muta la entrada', () => {
    const m: ModuleBottleneck[] = [{ module: 'x', impactGlobal: 0.2 }];
    detectBottlenecks(m);
    expect(m[0].module).toBe('x');
  });
  it('computeRoi y computeKnowledge dividen por costo', () => {
    expect(computeRoi(0.5, 0.25)).toBeCloseTo(2, 4);
    expect(computeKnowledge(0.4, 0.2)).toBeCloseTo(2, 4);
  });
  it('computeRoi maneja costo ~0 sin dividir por cero (razon finita > 1)', () => {
    const r = computeRoi(1, 0);
    expect(Number.isFinite(r)).toBe(true);
    expect(r).toBeGreaterThan(1);
  });
});

describe('prioritize: autoPrioritizeCycle (8 pasos)', () => {
  const input = {
    experiments: [
      mk({ id: 'EXP-A', impact: 0.9, confidence: 0.9, learningValue: 0.9, urgency: 0.9, computeCost: 0.1 }),
      mk({ id: 'EXP-B', impact: 0.4, confidence: 0.5, learningValue: 0.3, urgency: 0.4, computeCost: 0.5 }),
    ],
    rules: [
      { id: 'r1', description: 'a', confidence: 0.2, impact: 0.5 },
      { id: 'r2', description: 'b', confidence: 0.9, impact: 0.5 },
    ],
    bottlenecks: [{ module: 'texturas', impactGlobal: 0.31 }] as ModuleBottleneck[],
  };
  it('analiza reglas y detecta debiles', () => {
    const r = autoPrioritizeCycle(input);
    expect(r.analyzedRules).toBe(2);
    expect(r.weakRules.map((x) => x.id)).toEqual(['r1']);
  });
  it('ordena cuellos de botella', () => {
    const r = autoPrioritizeCycle(input);
    expect(r.bottlenecks[0].module).toBe('texturas');
  });
  it('ranked tiene el experimento top primero', () => {
    const r = autoPrioritizeCycle(input);
    expect(r.ranked[0].id).toBe('EXP-A');
    expect(r.best?.id).toBe('EXP-A');
  });
  it('libraryUpdate resume el ciclo', () => {
    const r = autoPrioritizeCycle(input);
    expect(r.libraryUpdate).toEqual({ rules: 2, weakRules: 1, bottlenecks: 1, topExperimentId: 'EXP-A' });
  });
  it('maneja entrada vacia sin romper', () => {
    const r = autoPrioritizeCycle({ experiments: [] });
    expect(r.best).toBeNull();
    expect(r.ranked).toEqual([]);
  });
});

describe('prioritize: classifyExplorationMix (70/20/10)', () => {
  it('separa por nivel', () => {
    const ranked = prioritizeExperiments([
      mk({ id: 'a', impact: 0.9, confidence: 0.9, learningValue: 0.9, urgency: 0.9, computeCost: 0.1 }),
      mk({ id: 'b', impact: 0.5, confidence: 0.5, learningValue: 0.5, urgency: 0.5, computeCost: 0.3 }),
      mk({ id: 'c', impact: 0.1, confidence: 0.1, learningValue: 0.1, urgency: 0.1, computeCost: 0.9 }),
    ]);
    const mix = classifyExplorationMix(ranked);
    expect(mix.explotation.map((e) => e.id)).toContain('a');
    expect(mix.exploration.map((e) => e.id)).toContain('c');
  });
});
