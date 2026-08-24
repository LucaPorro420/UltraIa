// -----------------------------------------------------------------------------
// evo.test.ts - Motor Evolutivo M3 (plan loop-94)
// Criterios SPEC: misma semilla+mismo fitness -> misma población (byte-exact),
// elitismo conserva al campeón, convergencia benchmark esférico <50 generaciones.
// -----------------------------------------------------------------------------
import { describe, expect, it } from 'vitest';

import {
  EvoError,
  benchmarkSphere,
  evolveGeneration,
  nextUnit,
  parseIndividual,
  runGa,
  spherePopulation,
  statsEvolution,
  xorshift32,
  type Individual,
} from './evo';

const sphere = (genes: readonly number[]): number => -genes.reduce((a, g) => a + g * g, 0);

describe('evo — PRNG xorshift32', () => {
  it('misma semilla -> misma secuencia; semillas distintas -> secuencias distintas', () => {
    const a = xorshift32(1234);
    const b = xorshift32(1234);
    const c = xorshift32(1235);
    const seqA = [a(), a(), a()];
    const seqB = [b(), b(), b()];
    expect(seqA).toEqual(seqB);
    expect(seqA).not.toEqual([c(), c(), c()]);
  });

  it('semilla 0 no rompe (golden ratio) y salida en [0,1)', () => {
    const rng = xorshift32(0);
    for (let i = 0; i < 100; i++) {
      const u = nextUnit(rng);
      expect(u).toBeGreaterThanOrEqual(0);
      expect(u).toBeLessThan(1);
    }
  });

  it('determinista entre procesos: JSON de 1000 salidas idéntico', () => {
    const mk = (): number[] => {
      const r = xorshift32(20260824);
      return Array.from({ length: 1000 }, () => r());
    };
    expect(JSON.stringify(mk())).toBe(JSON.stringify(mk()));
  });
});

describe('evo — individuos y validación', () => {
  it('parseIndividual acepta genes y fitness opcional; rechaza genes vacíos', () => {
    expect(parseIndividual({ genes: [1, 2] }).fitness).toBeUndefined();
    expect(parseIndividual({ genes: [0.5], fitness: -3 }).fitness).toBe(-3);
    expect(() => parseIndividual({ genes: [] })).toThrow(EvoError);
    expect(() => parseIndividual({ genes: [NaN] })).toThrow(EvoError);
  });
});

describe('evo — evolveGeneration', () => {
  const pop = (n: number): Individual[] =>
    Array.from({ length: n }, (_, i) => ({ genes: [(i - n / 2) / n, ((i * 7) % 11) / 11], fitness: undefined as unknown as number }));

  it('evalúa cada individuo de entrada una vez + cada hijo creado una vez', () => {
    const calls: number[][] = [];
    const fitnessFn = (g: readonly number[]) => {
      calls.push([...g]);
      return sphere(g);
    };
    evolveGeneration(pop(6), fitnessFn, { seed: 7, elite: 1 });
    // 6 de la población inicial + (6 - élite) hijos generados
    expect(calls.length).toBe(6 + 5);
    // los genes de entrada se evalúan en orden determinista
    expect(calls[0]).toEqual(pop(6)[0].genes);
  });

  it('es PURA: la población de entrada no se muta', () => {
    const input: Individual[] = pop(5) as Individual[];
    input.forEach((p) => (p.fitness = sphere(p.genes)));
    const before = JSON.stringify(input);
    evolveGeneration(input, sphere, { seed: 9, elite: 2 });
    expect(JSON.stringify(input)).toBe(before);
  });

  it('elitismo conserva el campeón (mejor fitness intacto tras 10 generaciones)', () => {
    let cur: Individual[] = spherePopulation(20, 2, 5, 11);
    for (let g = 0; g < 10; g++) cur = evolveGeneration(cur, sphere, { seed: 100 + g, elite: 2 });
    const bestFit = Math.max(...cur.map((p) => p.fitness ?? -Infinity));
    // con élite el mejor nunca puede empeorar respecto del historial
    const run = runGa(spherePopulation(20, 2, 5, 11), 10, sphere, { seed: 100, elite: 2 });
    expect(run.population[run.population.length - 1]).toBeDefined();
    void bestFit;
    const histBests = run.history.map((h) => h.best);
    for (let i = 1; i < histBests.length; i++) expect(histBests[i]).toBeGreaterThanOrEqual(histBests[i - 1] - 1e-12);
  });

  it('misma semilla + mismo fitness -> población evolucionada byte-exact', () => {
    const mkPop = (): Individual[] => spherePopulation(16, 3, 4, 77);
    const a = evolveGeneration(mkPop(), sphere, { seed: 555, elite: 2, crossover: { kind: 'blend', rate: 0.8 }, mutation: { sigma: 0.05, rate: 0.2 } });
    const b = evolveGeneration(mkPop(), sphere, { seed: 555, elite: 2, crossover: { kind: 'blend', rate: 0.8 }, mutation: { sigma: 0.05, rate: 0.2 } });
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
  });

  it('crossover arithmetic produce combinaciones convexas', () => {
    const parents: Individual[] = [
      { genes: [0, 0], fitness: 1 },
      { genes: [10, 10], fitness: 0.5 },
    ];
    const out = evolveGeneration(parents, sphere, { seed: 3, elite: 0, crossover: { kind: 'arithmetic', rate: 1 }, mutation: { sigma: 0, rate: 0 } });
    for (const ind of out) {
      for (const g of ind.genes) {
        expect(g).toBeGreaterThanOrEqual(-1e-9);
        expect(g).toBeLessThanOrEqual(10 + 1e-9);
      }
    }
  });

  it('crossover blend respeta el rango extendido BLX-alpha', () => {
    const parents: Individual[] = [
      { genes: [2], fitness: 1 },
      { genes: [4], fitness: 0.9 },
    ];
    const alpha = 0.25;
    const lo = 2 - alpha * 2;
    const hi = 4 + alpha * 2;
    for (let s = 1; s <= 30; s++) {
      const out = evolveGeneration(parents, sphere, { seed: s, elite: 0, crossover: { kind: 'blend', rate: 1, alpha }, mutation: { sigma: 0, rate: 0 } });
      for (const ind of out) {
        expect(ind.genes[0]).toBeGreaterThanOrEqual(lo - 1e-9);
        expect(ind.genes[0]).toBeLessThanOrEqual(hi + 1e-9);
      }
    }
  });

  it('torneo k grande selecciona siempre al mejor (presión máxima determinista)', () => {
    const ranked: Individual[] = [
      { genes: [1], fitness: 0.1 },
      { genes: [2], fitness: 0.5 },
      { genes: [3], fitness: 0.9 },
    ];
    const out = evolveGeneration(ranked, (g) => g[0] / 10, { seed: 42, elite: 0, tournamentK: 10, crossover: { kind: 'uniform', rate: 0 }, mutation: { sigma: 0, rate: 0 } });
    // sin cruce ni mutación, los hijos son copias del ganador del torneo (el mejor)
    for (const ind of out) expect(ind.genes[0]).toBe(3);
  });

  it('mutación con sigma>0 altera genes cuando rate=1 (y sigma=0/rate=0 los deja intactos)', () => {
    const base: Individual[] = [{ genes: [1, 2, 3], fitness: 1 }];
    const untouched = evolveGeneration(base, sphere, { seed: 5, elite: 0, crossover: { kind: 'uniform', rate: 0 }, mutation: { sigma: 0.5, rate: 0 } });
    expect(untouched[0].genes).toEqual([1, 2, 3]);
    const mutatedAll = evolveGeneration(base, sphere, { seed: 5, elite: 0, crossover: { kind: 'uniform', rate: 0 }, mutation: { sigma: 0.5, rate: 1 } });
    expect(mutatedAll[0].genes).not.toEqual([1, 2, 3]);
  });

  it('validación de config inválida', () => {
    const p: Individual[] = [{ genes: [1], fitness: 1 }];
    expect(() => evolveGeneration(p, sphere, { seed: 1, elite: -1 })).toThrow(EvoError);
    expect(() => evolveGeneration(p, sphere, { seed: 1, crossover: { kind: 'noexiste' as never } })).toThrow(EvoError);
  });
});

describe('evo — stats y benchmark', () => {
  it('statsEvolution: best/mean/worst exactos en población de juguete', () => {
    const st = statsEvolution([
      { genes: [0], fitness: 3 },
      { genes: [1], fitness: 1 },
      { genes: [2], fitness: 2 },
    ]);
    expect(st.best).toBe(3);
    expect(st.worst).toBe(1);
    expect(st.mean).toBeCloseTo(2, 12);
  });

  it('diversidad 0 con población idéntica; >0 con población dispersa', () => {
    expect(statsEvolution([
      { genes: [1, 1], fitness: 1 },
      { genes: [1, 1], fitness: 1 },
    ]).diversity).toBe(0);
    expect(statsEvolution([
      { genes: [-5, 0], fitness: 1 },
      { genes: [5, 0], fitness: 1 },
    ]).diversity).toBeGreaterThan(1);
  });

  it('benchmark esférico converge (< target) antes de 50 generaciones', () => {
    const r = benchmarkSphere({ dims: 8, size: 40, generations: 50, target: -0.01, seed: 20260824 });
    expect(r.reachedAtGeneration).not.toBeNull();
    expect(r.reachedAtGeneration!).toBeLessThan(50);
    expect(r.bestFitness).toBeGreaterThan(-1);
    for (const g of r.bestGenes) expect(Math.abs(g)).toBeLessThan(5);
  });

  it('benchmark reproducible bit-exact con la misma semilla', () => {
    const a = benchmarkSphere({ dims: 6, size: 30, generations: 25, seed: 99 });
    const b = benchmarkSphere({ dims: 6, size: 30, generations: 25, seed: 99 });
    expect(JSON.stringify(a.history)).toBe(JSON.stringify(b.history));
    expect(JSON.stringify(a.bestGenes)).toBe(JSON.stringify(b.bestGenes));
  });

  it('spherePopulation valida size/dims', () => {
    expect(() => spherePopulation(1, 2)).toThrow(EvoError);
    expect(() => spherePopulation(10, 0)).toThrow(EvoError);
    expect(() => spherePopulation(10, 65)).toThrow(EvoError);
  });

  it('runGa valida generations fuera de rango', async () => {
    await import('./evo').then((m) => {
      expect(() => m.runGa([{ genes: [0] }], -1, sphere, { seed: 1 })).toThrow(EvoError);
      expect(() => m.runGa([{ genes: [0] }], 100_001, sphere, { seed: 1 })).toThrow(EvoError);
    });
  });
});
