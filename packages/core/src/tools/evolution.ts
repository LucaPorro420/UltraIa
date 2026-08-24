// -----------------------------------------------------------------------------
// evolution.ts - capability `evolution` (Motor Evolutivo M4, plan loop-94 #94)
// -----------------------------------------------------------------------------
// MOTOR EVOLUTIVO DE ARTEFACTOS: mapea el pipeline del manual "Motor Evolutivo"
// (Observar->Medir->Analizar->Proponer->Implementar->Probar->Evaluar->Aprender->
// Repetir) sobre las capabilities existentes del repo:
//
//   población   = params de un GENERADOR inyectable (sdf scene | procvid anim |
//                 geometry preset | cualquier dominio)
//   evaluar     = fitnessFn inyectable (videoqa ssim/psnr vs objetivo | imaging
//                 stats | custom)
//   evolucionar = evo.evolveGeneration (GA determinista xorshift32, M3)
//   aprender    = checkpoint por generación persistible en brainpage (timeline
//                 append-only = memoria evolutiva) + vault (.ultraia/vault/creations)
//
// Garantías del repo: 100% IO INYECTABLE (tests sin fs/red), fail-soft (un store
// que lanza NO detiene el ciclo: queda en warnings), RESUME desde checkpoint ==
// corrida completa (misma semilla -> mismo resultado), SIN Math.random/Date.now.
// -----------------------------------------------------------------------------

import { EvoError, evolveGeneration, parseIndividual, type Individual, type IndividualInput } from './evo';

/** Error de dominio evolution. */
export class EvolutionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'EvolutionError';
  }
}

/** Punto de control: snapshot suficiente para REANUDAR sin perder convergencia. */
export interface EvolutionCheckpoint {
  /** índice de la SIGUIENTE generación a correr */
  generationIndex: number;
  /** genes de la población actual (fitness se re-evalúa al reanudar) */
  populationGenes: number[][];
  bestGenes: number[];
  bestFitness: number;
}

export interface EvolutionHistoryEntry {
  generation: number;
  best: number;
  mean: number;
  worst: number;
  diversity: number;
}

/** Puertos de IO inyectables — todos opcionales y fail-soft. */
export interface EvolutionIo {
  checkpoint?: {
    save(cp: EvolutionCheckpoint): void | Promise<void>;
  };
  /** bóveda (.ultraia/vault/creations): recibe el mejor artefacto de cada gen guardada */
  artifact?: {
    save(artifact: unknown, meta: { generation: number; fitness: number }): void | Promise<void>;
  };
  /** memoria (brainpage timeline append-only): entradas de memoria evolutiva */
  timeline?: {
    append(entry: EvolutionTimelineEntry): void | Promise<void>;
  };
}

export interface EvolutionTimelineEntry {
  kind: 'evolution-checkpoint';
  generation: number;
  bestFitness: number;
  bestGenesPreview: string;
}

export interface EvolutionCycleConfig<TArtifact = unknown> {
  /** población inicial (genes crudos; el ciclo los valida) */
  initialPopulation: ReadonlyArray<IndividualInput>;
  /** generador PURO: genes -> artefacto (determinista por contrato del repo) */
  generator: (genes: readonly number[]) => TArtifact;
  /** evaluador PURO: (artefacto, target) -> fitness a MAXIMIZAR */
  evaluator: (artifact: TArtifact, target: unknown) => number;
  /** spec del objetivo que consume `evaluator` (pasa sin interpretar) */
  target: unknown;
  generations: number;
  /** guardar checkpoint cada N generaciones (default 1) */
  checkpointEvery?: number;
  /** parar antes si best >= stopOnTarget (opcional) */
  stopOnTarget?: number;
  /** config GA (seed obligatoria; ver evo.EvolveConfig) */
  ga: Parameters<typeof evolveGeneration>[2];
}

export interface EvolutionCycleResult<TArtifact = unknown> {
  history: EvolutionHistoryEntry[];
  bestGenes: number[];
  bestFitness: number;
  bestArtifact: TArtifact;
  checkpointsWritten: number;
  artifactsSaved: number;
  timelineAppends: number;
  warnings: string[];
  stoppedEarly: boolean;
  resumedFrom: number | null;
}

function statsOf(pop: readonly Individual[]): { best: number; mean: number; worst: number; diversity: number } {
  const fits = pop.map((p) => p.fitness ?? -Infinity);
  const best = Math.max(...fits);
  const worst = Math.min(...fits);
  const mean = fits.reduce((a, b) => a + b, 0) / fits.length;
  const all = pop.flatMap((p) => p.genes);
  const mu = all.reduce((a, b) => a + b, 0) / all.length;
  const variance = all.reduce((a, b) => a + (b - mu) * (b - mu), 0) / all.length;
  return { best, mean, worst, diversity: Math.sqrt(variance) };
}

/**
 * Corre el ciclo evolutivo completo sobre un dominio inyectado.
 * PURA respecto de la lógica: toda IO pasa por `io` y sus fallos son fail-soft.
 */
export function runEvolutionCycle<TArtifact>(
  config: EvolutionCycleConfig<TArtifact>,
  io: EvolutionIo = {},
  options: { resumeFrom?: EvolutionCheckpoint } = {},
): EvolutionCycleResult<TArtifact> {
  if (!Number.isInteger(config.generations) || config.generations < 0 || config.generations > 100_000) {
    throw new EvolutionError('generations fuera de rango [0, 100000]');
  }
  if (config.initialPopulation.length === 0 && !options.resumeFrom) {
    throw new EvoError('initialPopulation vacía (se requiere >=1 individuo)');
  }
  const checkpointEvery = Math.max(1, config.checkpointEvery ?? 1);
  const warnings: string[] = [];
  let checkpointsWritten = 0;
  let artifactsSaved = 0;
  let timelineAppends = 0;

  const tryRun = <T>(label: string, fn: () => T, fallback: T): T => {
    try {
      return fn();
    } catch (err) {
      warnings.push(`${label}: ${err instanceof Error ? err.message : String(err)}`);
      return fallback;
    }
  };

  // estado inicial (nuevo arranque o resume)
  let startGen = 0;
  let population: Individual[];
  let championGenes: number[];
  let championFitness: number;

  if (options.resumeFrom) {
    const cp = options.resumeFrom;
    if (!Number.isInteger(cp.generationIndex) || cp.generationIndex < 0 || cp.generationIndex > config.generations) {
      throw new EvolutionError('checkpoint.generationIndex inválido');
    }
    startGen = cp.generationIndex;
    population = cp.populationGenes.map((genes) => {
      const ind = parseIndividual({ genes });
      ind.fitness = config.evaluator(config.generator(ind.genes), config.target);
      return ind;
    });
    championGenes = [...cp.bestGenes];
    championFitness =
      cp.bestFitness ??
      (() => {
        throw new EvolutionError('checkpoint sin bestFitness');
      })();
  } else {
    population = config.initialPopulation.map((ind) => {
      const parsed = parseIndividual(ind);
      parsed.fitness = config.evaluator(config.generator(parsed.genes), config.target);
      return parsed;
    });
    const first = population.reduce((best, ind) => ((ind.fitness ?? -Infinity) > (best.fitness ?? -Infinity) ? ind : best), population[0]);
    championGenes = [...first.genes];
    championFitness = first.fitness ?? config.evaluator(config.generator(first.genes), config.target);
  }

  const history: EvolutionHistoryEntry[] = [];
  let bestArtifact: TArtifact = config.generator(championGenes);
  let stoppedEarly = false;

  const saveCheckpoint = (genNext: number, pop: readonly Individual[]): void => {
    if (!io.checkpoint) return;
    tryRun('checkpoint.save', () => {
      void io.checkpoint!.save({
        generationIndex: genNext,
        populationGenes: pop.map((p) => [...p.genes]),
        bestGenes: [...championGenes],
        bestFitness: championFitness,
      });
      checkpointsWritten++;
      return undefined;
    }, undefined);
  };

  const rememberAndSaveArtifacts = (gen: number): void => {
    if (io.artifact) {
      tryRun('artifact.save', () => {
        void io.artifact!.save(bestArtifact, { generation: gen, fitness: championFitness });
        artifactsSaved++;
        return undefined;
      }, undefined);
    }
    if (io.timeline) {
      tryRun('timeline.append', () => {
        void io.timeline!.append({
          kind: 'evolution-checkpoint',
          generation: gen,
          bestFitness: championFitness,
          bestGenesPreview: JSON.stringify(championGenes.slice(0, 3)),
        });
        timelineAppends++;
        return undefined;
      }, undefined);
    }
  };

  for (let g = startGen; g < config.generations; g++) {
    // El GA evalúa (entrada + hijos) con el fitness REAL por artefacto: la
    // selección de padres usa fitness genuino, no placeholders.
    population = evolveGeneration(
      population,
      (genes) => config.evaluator(config.generator(genes), config.target),
      config.ga,
    );
    // Campeón global (puede venir de cualquier generación previa con élite=0)
    for (const ind of population) {
      if ((ind.fitness ?? -Infinity) > championFitness) {
        championFitness = ind.fitness!;
        championGenes = [...ind.genes];
        bestArtifact = config.generator(ind.genes);
      }
    }

    const st = statsOf(population);
    history.push({
      generation: g,
      best: Math.max(st.best, championFitness),
      mean: st.mean,
      worst: st.worst,
      diversity: st.diversity,
    });

    if (g % checkpointEvery === checkpointEvery - 1 || g === config.generations - 1) {
      saveCheckpoint(g + 1, population);
      rememberAndSaveArtifacts(g);
    }

    if (config.stopOnTarget !== undefined && championFitness >= config.stopOnTarget) {
      stoppedEarly = true;
      break;
    }
  }

  return {
    history,
    bestGenes: [...championGenes],
    bestFitness: championFitness,
    bestArtifact,
    checkpointsWritten,
    artifactsSaved,
    timelineAppends,
    warnings,
    stoppedEarly,
    resumedFrom: options.resumeFrom ? startGen : null,
  };
}

/**
 * Entradas de timeline brainpage derivadas de checkpoints (helper puro para
 * persistir la memoria evolutiva sin duplicar lógica).
 */
export function buildBrainpageEntries(cps: readonly EvolutionCheckpoint[]): EvolutionTimelineEntry[] {
  return cps.map((cp) => ({
    kind: 'evolution-checkpoint',
    generation: cp.generationIndex,
    bestFitness: cp.bestFitness,
    bestGenesPreview: JSON.stringify(cp.bestGenes.slice(0, 3)),
  }));
}

/** Conveniencia: corre N generaciones de un dominio esférico de juguete. */
export function demoEvolution(opts: { dims?: number; size?: number; generations?: number; seed?: number } = {}): EvolutionCycleResult<number[]> {
  const dims = opts.dims ?? 4;
  const size = opts.size ?? 12;
  const seed = opts.seed ?? 20260824;
  const targetVec = Array.from({ length: dims }, (_, i) => Math.sin(i + 1));
  return runEvolutionCycle<number[]>({
    initialPopulation: Array.from({ length: size }, (_, i) => ({ genes: Array.from({ length: dims }, (_, j) => Math.cos(i * 3 + j)) })),
    generator: (genes) => [...genes],
    evaluator: (artifact, target) => {
      const t = target as number[];
      return -artifact.reduce((a, g, i) => a + Math.abs(g - t[i]), 0);
    },
    target: targetVec,
    generations: opts.generations ?? 20,
    ga: { seed, elite: 1, crossover: { kind: 'blend', rate: 0.9 }, mutation: { sigma: 0.05, rate: 0.2 } },
  });
}
