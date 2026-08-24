// -----------------------------------------------------------------------------
// evolution.test.ts - Motor Evolutivo M4 (plan loop-94)
// Criterios SPEC: 100% IO inyectable (cero fs/red), resume(checkpoint) ==
// corrida completa, fail-soft en stores que lanzan, checkpoints periódicos.
// -----------------------------------------------------------------------------
import { describe, expect, it } from 'vitest';

import {
  buildBrainpageEntries,
  demoEvolution,
  runEvolutionCycle,
  type EvolutionCheckpoint,
  type EvolutionIo,
} from './evolution';
import { EvoError } from './evo';

/** Dominio de juguete determinista: artefacto = suma de genes; fitness = -|suma - target|. */
function makeDomain(target: number) {
  return {
    generator: (genes: readonly number[]) => genes.reduce((a, g) => a + g, 0),
    evaluator: (artifact: number): number => -Math.abs(artifact - target),
    initialPopulation: Array.from({ length: 10 }, (_, i) => ({ genes: [i / 2 - 2.5, (i % 4) - 1.5] })),
  };
}

function makeConfig(generations = 12) {
  const d = makeDomain(3);
  return {
    ...d,
    target: 3 as unknown,
    generations,
    ga: { seed: 20260824, elite: 2, crossover: { kind: 'blend' as const, rate: 0.9 }, mutation: { sigma: 0.05, rate: 0.25 } },
  };
}

describe('evolution — ciclo completo', () => {
  it('corre G generaciones -> history de longitud G con campos completos', () => {
    const r = runEvolutionCycle(makeConfig(8));
    expect(r.history.length).toBe(8);
    for (let i = 0; i < 8; i++) {
      expect(r.history[i].generation).toBe(i);
      expect(Number.isFinite(r.history[i].best)).toBe(true);
      expect(Number.isFinite(r.history[i].diversity)).toBe(true);
    }
    expect(r.resumedFrom).toBeNull();
    expect(r.warnings).toEqual([]);
  });

  it('el best del historial es monótono no decreciente (élite activa)', () => {
    const r = runEvolutionCycle(makeConfig(15));
    for (let i = 1; i < r.history.length; i++) {
      expect(r.history[i].best).toBeGreaterThanOrEqual(r.history[i - 1].best - 1e-12);
    }
  });

  it('el generador recibe genes y produce artefactos deterministas', () => {
    const seen: number[][] = [];
    const cfg = makeConfig(5);
    const r = runEvolutionCycle({
      ...cfg,
      generator: (genes) => {
        seen.push([...genes]);
        return genes.reduce((a, g) => a + g, 0);
      },
    });
    expect(seen.length).toBeGreaterThan(0);
    // re-generar el artefacto campeón da el mismo valor
    expect(cfg.generator(r.bestGenes)).toBe(r.bestArtifact);
  });

  it('evaluador llamado por individuo; resultado serializable JSON', () => {
    let evalCount = 0;
    const d = makeDomain(2);
    const r = runEvolutionCycle({
      ...d,
      target: 2 as unknown,
      generations: 3,
      evaluator: (artifact) => {
        evalCount++;
        return -Math.abs(artifact - 2);
      },
      ga: { seed: 5, elite: 1 },
    });
    expect(evalCount).toBeGreaterThan(3);
    const roundtrip = JSON.parse(JSON.stringify({ bestGenes: r.bestGenes, bestFitness: r.bestFitness })) as typeof r;
    void roundtrip;
    expect(roundtrip.bestGenes).toEqual(r.bestGenes);
  });

  it('stopOnTarget corta antes (stoppedEarly + history truncada)', () => {
    const d = makeDomain(3);
    const r = runEvolutionCycle({
      ...d,
      target: 3 as unknown,
      generations: 100,
      stopOnTarget: -0.001, // casi exacto: para apenas pueda
      ga: { seed: 7, elite: 3, crossover: { kind: 'blend', rate: 0.9 }, mutation: { sigma: 0.02, rate: 0.3 } },
    });
    if (r.stoppedEarly) expect(r.history.length).toBeLessThan(100);
    else expect(r.bestFitness).toBeGreaterThanOrEqual(-0.05);
  });
});

describe('evolution — IO inyectable y fail-soft', () => {
  it('checkpoint cada checkpointEvery + último (count correcto)', () => {
    const saved: EvolutionCheckpoint[] = [];
    const io: EvolutionIo = { checkpoint: { save: (cp) => void saved.push(cp) } };
    const r = runEvolutionCycle(makeConfig(10), io, {});
    // gens 0-indexadas: guarda en 2,5,8 (every=3) + final (9)
    expect(saved.length).toBe(r.checkpointsWritten);
    expect(r.checkpointsWritten).toBeGreaterThanOrEqual(3);
    expect(saved[saved.length - 1].generationIndex).toBe(10);
  });

  it('artifact.save recibe el mejor artefacto de cada gen guardada', () => {
    const artifacts: Array<{ artifact: number; meta: { generation: number; fitness: number } }> = [];
    const io: EvolutionIo = { artifact: { save: (a, m) => void artifacts.push({ artifact: a as number, meta: m }) } };
    const r = runEvolutionCycle(makeConfig(6), io, {});
    expect(artifacts.length).toBe(r.artifactsSaved);
    expect(artifacts[artifacts.length - 1].meta.generation).toBe(5);
  });

  it('timeline.append construye entradas well-formed', () => {
    const entries: unknown[] = [];
    const io: EvolutionIo = { timeline: { append: (e) => void entries.push(e) } };
    const r = runEvolutionCycle(makeConfig(4), io, {});
    expect(entries.length).toBe(r.timelineAppends);
    expect(r.timelineAppends).toBeGreaterThan(0);
  });

  it('stores que LANZAN no detienen el ciclo (fail-soft + warnings)', () => {
    const io: EvolutionIo = {
      checkpoint: { save: () => { throw new Error('disco lleno'); } },
      artifact: { save: () => { throw new Error('vault caído'); } },
      timeline: { append: () => { throw new Error('brainpage rota'); } },
    };
    const r = runEvolutionCycle(makeConfig(6), io, {});
    expect(r.history.length).toBe(6); // el ciclo COMPLETO igual
    expect(r.warnings.some((w) => w.includes('disco lleno'))).toBe(true);
    expect(r.warnings.some((w) => w.includes('vault caído'))).toBe(true);
    expect(r.warnings.some((w) => w.includes('brainpage rota'))).toBe(true);
  });

  it('sin IO el ciclo funciona (todos los puertos opcionales)', () => {
    const r = runEvolutionCycle(makeConfig(3), {}, {});
    expect(r.checkpointsWritten).toBe(0);
    expect(r.artifactsSaved).toBe(0);
    expect(r.warnings).toEqual([]);
  });
});

describe('evolution — resume desde checkpoint', () => {
  it('resume(checkpoint a la mitad) == corrida completa (bestGenes byte-exact)', () => {
    const cfg = makeConfig(14);
    const full = runEvolutionCycle(cfg);

    // corrida interrumpida: captura el checkpoint de la generación 7
    const saved: EvolutionCheckpoint[] = [];
    runEvolutionCycle(cfg, { checkpoint: { save: (cp) => void saved.push(cp) } });
    const mid = saved.find((cp) => cp.generationIndex === 7)!;
    expect(mid).toBeDefined();

    // reanuda DESDE el checkpoint con la MISMA config
    const resumed = runEvolutionCycle(cfg, {}, { resumeFrom: mid });

    expect(resumed.resumedFrom).toBe(7);
    expect(JSON.stringify(resumed.bestGenes)).toBe(JSON.stringify(full.bestGenes));
    expect(resumed.bestFitness).toBeCloseTo(full.bestFitness, 12);
  });

  it('resume respeta el historial restante (generaciones 7..G-1)', () => {
    const cfg = makeConfig(10);
    const saved: EvolutionCheckpoint[] = [];
    runEvolutionCycle(cfg, { checkpoint: { save: (cp) => void saved.push(cp) } });
    const cp5 = saved.find((cp) => cp.generationIndex === 5)!;
    const resumed = runEvolutionCycle(cfg, {}, { resumeFrom: cp5 });
    expect(resumed.history.length).toBe(5);
    expect(resumed.history[0].generation).toBe(5);
    expect(resumed.history[resumed.history.length - 1].generation).toBe(9);
  });

  it('checkpoint inválido rechazado con error claro', () => {
    const cfg = makeConfig(4);
    expect(() =>
      runEvolutionCycle(cfg, {}, { resumeFrom: { generationIndex: 99, populationGenes: [[0]], bestGenes: [0], bestFitness: 0 } }),
    ).toThrow(/generationIndex/);
  });
});

describe('evolution — helpers puros y validación', () => {
  it('buildBrainpageEntries deriva entradas de memoria evolutiva', () => {
    const entries = buildBrainpageEntries([
      { generationIndex: 3, populationGenes: [[1]], bestGenes: [1, 2, 3], bestFitness: 0.5 },
    ]);
    expect(entries).toEqual([
      { kind: 'evolution-checkpoint', generation: 3, bestFitness: 0.5, bestGenesPreview: '[1,2,3]' },
    ]);
  });

  it('generations fuera de rango y población vacía rechazados', async () => {
    expect(() => runEvolutionCycle({ ...makeConfig(-1) })).toThrow();
    await import('./evolution').then((m) => {
      expect(() =>
        m.runEvolutionCycle({ ...makeConfig(200_000) }),
      ).toThrow();
    });
    expect(() =>
      runEvolutionCycle({ ...makeConfig(3), initialPopulation: [] }),
    ).toThrow(EvoError);
  });

  it('demoEvolution converge hacia el objetivo (fitness mejora)', () => {
    const r = demoEvolution({ dims: 4, size: 12, generations: 20, seed: 42 });
    expect(r.history[r.history.length - 1].best).toBeGreaterThan(r.history[0].best);
    expect(Number.isFinite(r.bestFitness)).toBe(true);
  });
});
