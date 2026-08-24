// -----------------------------------------------------------------------------
// evo.ts - capability `evo` (Motor Evolutivo M3, plan loop-94 tarea #94)
// -----------------------------------------------------------------------------
// Algoritmo genético PURO y DETERMINISTA en dominio puro (0 deps, keyless),
// port de los PRINCIPIOS del manual "Motor Evolutivo" (cap. GA/RL):
//
//   - PRNG xorshift32 con semilla entera: misma secuencia en cualquier proceso.
//   - evolveGeneration(población, fitnessFn inyectable, config) PURA: la entrada
//     no se muta; selección por torneo, cruce uniform/arithmetic/blend, mutación
//     gaussiana (Box-Muller sobre pares del PRNG), elitismo configurable.
//   - statsEvolution: best/mean/worst + diversidad (desviación típica aplanada).
//   - benchmarkSphere: minimización de f(x)=|x|² que demuestra convergencia.
//
// Reglas del repo: SIN Math.random / Date.now(), JSON-serializable, misma
// semilla + mismo fitness -> misma población evolucionada byte-exact.
// -----------------------------------------------------------------------------

import { z } from 'zod';

/** Error de dominio evo. */
export class EvoError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'EvoError';
  }
}

/** Individuo: genes reales + fitness opcional (lo llena el ciclo de evaluación). */
export const individualSchema = z.object({
  genes: z.array(z.number().finite()).min(1),
  fitness: z.number().finite().optional(),
});
export type Individual = z.infer<typeof individualSchema>;
export type IndividualInput = z.input<typeof individualSchema>;

export function parseIndividual(input: IndividualInput): Individual {
  const r = individualSchema.safeParse(input);
  if (!r.success) throw new EvoError(`individuo inválido: ${r.error.issues[0]?.message ?? 'desconocido'}`);
  return r.data;
}

/* ------------------------------------------------------------------ */
/* PRNG xorshift32                                                     */
/* ------------------------------------------------------------------ */

/**
 * Generador xorshift32 (Marsaglia): determinista entre procesos/plataformas JS
 * para la misma semilla no nula. Devuelve enteros uint32.
 */
export function xorshift32(seed: number): () => number {
  let s = seed >>> 0;
  if (s === 0) s = 0x9e3779b9; // semilla prohibida 0 -> golden ratio
  return () => {
    s ^= s << 13;
    s >>>= 0;
    s ^= s >>> 17;
    s ^= s << 5;
    s >>>= 0;
    return s;
  };
}

/** Siguiente uint32 en [0, 1) con precisión 1/2^32. */
export function nextUnit(rng: () => number): number {
  return rng() / 0x100000000;
}

/** Entero en [lo, hi] ambos inclusive. */
function randInt(rng: () => number, lo: number, hi: number): number {
  return lo + Math.floor(nextUnit(rng) * (hi - lo + 1)) % (hi - lo + 1);
}

/** Gaussiana estándar N(0,1) por Box-Muller (consume 2 salidas del PRNG). */
function gauss(rng: () => number): number {
  let u = nextUnit(rng);
  if (u < 1e-12) u = 1e-12;
  const v = nextUnit(rng);
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

/* ------------------------------------------------------------------ */
/* Config del GA                                                       */
/* ------------------------------------------------------------------ */

export type CrossoverKind = 'uniform' | 'arithmetic' | 'blend';

export interface EvolveConfig {
  /** Individuos élite copiados sin cambios (orden fitness desc). Default 1. */
  elite?: number;
  /** Tamaño de torneo para selección (>=2; mayor = más presión). Default 3. */
  tournamentK?: number;
  crossover?: {
    kind: CrossoverKind;
    /** Probabilidad de cruzar un par seleccionado. Default 0.9. */
    rate?: number;
    /** Alpha para blend (rango extendido [-alpha, 1+alpha]). Default 0.25. */
    alpha?: number;
  };
  mutation?: {
    /** Desviación estándar gaussiana relativa al rango observado del gen. */
    sigma?: number;
    /** Probabilidad de mutar cada gen. Default 0.15. */
    rate?: number;
  };
  /** Semilla entera del PRNG (obligatoria para reproducibilidad explícita). */
  seed: number;
}

const CROSSOVER_KINDS: ReadonlyArray<CrossoverKind> = ['uniform', 'arithmetic', 'blend'];

/* ------------------------------------------------------------------ */
/* Operadores                                                          */
/* ------------------------------------------------------------------ */

function tournamentSelect(pop: readonly Individual[], k: number, rng: () => number): Individual {
  let best = pop[randInt(rng, 0, pop.length - 1)];
  for (let i = 1; i < k; i++) {
    const challenger = pop[randInt(rng, 0, pop.length - 1)];
    if ((challenger.fitness ?? -Infinity) > (best.fitness ?? -Infinity)) best = challenger;
  }
  return best;
}

function crossoverGenes(a: readonly number[], b: readonly number[], cfg: NonNullable<EvolveConfig['crossover']>, rng: () => number): [number[], number[]] {
  const n = a.length;
  if (cfg.kind === 'uniform') {
    const c1: number[] = new Array(n);
    const c2: number[] = new Array(n);
    for (let i = 0; i < n; i++) {
      if (nextUnit(rng) < 0.5) {
        c1[i] = a[i];
        c2[i] = b[i];
      } else {
        c1[i] = b[i];
        c2[i] = a[i];
      }
    }
    return [c1, c2];
  }
  if (cfg.kind === 'arithmetic') {
    const t = nextUnit(rng);
    return [
      a.map((g, i) => t * g + (1 - t) * b[i]),
      b.map((g, i) => t * g + (1 - t) * a[i]),
    ];
  }
  // blend (BLX-alpha): hijo dentro de [min - alpha*range, max + alpha*range]
  const alpha = cfg.alpha ?? 0.25;
  return [
    a.map((g, i) => {
      const lo = Math.min(g, b[i]);
      const hi = Math.max(g, b[i]);
      return lo - alpha * (hi - lo) + nextUnit(rng) * (hi - lo) * (1 + 2 * alpha);
    }),
    b.map((g, i) => {
      const lo = Math.min(g, a[i]);
      const hi = Math.max(g, a[i]);
      return lo - alpha * (hi - lo) + nextUnit(rng) * (hi - lo) * (1 + 2 * alpha);
    }),
  ];
}

function mutateGenes(genes: readonly number[], sigma: number, rate: number, rng: () => number): number[] {
  return genes.map((g) => (nextUnit(rng) < rate ? g + gauss(rng) * sigma : g));
}

/* ------------------------------------------------------------------ */
/* Ciclo                                                               */
/* ------------------------------------------------------------------ */

/**
 * Una generación del GA. PURA: devuelve nueva población sin mutar `population`.
 * Orden de operaciones (determinista): evaluar faltantes -> ordenar desc ->
 * copiar élite -> completar por torneo/cruce/mutación hasta size.
 */
export function evolveGeneration(
  population: readonly IndividualInput[],
  fitnessFn: (genes: readonly number[]) => number,
  config: EvolveConfig,
): Individual[] {
  if (config.elite !== undefined && config.elite < 0) throw new EvoError('elite no puede ser negativo');
  const crossCfg = config.crossover ?? { kind: 'uniform' as CrossoverKind, rate: 0.9, alpha: 0.25 };
  if (!CROSSOVER_KINDS.includes(crossCfg.kind)) throw new EvoError(`crossover.kind inválido: ${String(crossCfg.kind)}`);
  const mutCfg = config.mutation ?? { sigma: 0.1, rate: 0.15 };
  const evaluated = population.map((p) => {
    const ind = parseIndividual(p);
    return ind.fitness === undefined ? ({ genes: [...ind.genes], fitness: fitnessFn(ind.genes) } as Individual) : ind;
  });
  const sorted = [...evaluated].sort((x, y) => (y.fitness ?? -Infinity) - (x.fitness ?? -Infinity));
  const size = sorted.length;
  const elite = Math.max(0, Math.min(config.elite ?? 1, size));
  const rng = xorshift32(config.seed);
  const next: Individual[] = [];
  for (let i = 0; i < elite; i++) next.push({ ...sorted[i], genes: [...sorted[i].genes] });
  while (next.length < size) {
    const parentA = tournamentSelect(sorted, config.tournamentK ?? 3, rng);
    const parentB = tournamentSelect(sorted, config.tournamentK ?? 3, rng);
    let childGenes: number[];
    if (nextUnit(rng) < (crossCfg.rate ?? 0.9)) {
      [childGenes] = crossoverGenes(parentA.genes, parentB.genes, crossCfg, rng);
    } else {
      childGenes = [...parentA.genes];
    }
    childGenes = mutateGenes(childGenes, mutCfg.sigma ?? 0.1, mutCfg.rate ?? 0.15, rng);
    next.push({ genes: childGenes, fitness: fitnessFn(childGenes) });
  }
  return next;
}

/** Corre G generaciones devolviendo el historial completo (población final incluida). */
export function runGa(
  initial: readonly IndividualInput[],
  generations: number,
  fitnessFn: (genes: readonly number[]) => number,
  config: Omit<EvolveConfig, 'seed'> & { seed: number },
): { history: Array<{ best: number; mean: number; worst: number; diversity: number }>; population: Individual[] } {
  if (!Number.isInteger(generations) || generations < 0 || generations > 100_000) {
    throw new EvoError('generations fuera de rango [0, 100000]');
  }
  let cur: Individual[] = initial.map(parseIndividual);
  const history: Array<{ best: number; mean: number; worst: number; diversity: number }> = [];
  for (let g = 0; g < generations; g++) {
    cur = evolveGeneration(cur, fitnessFn, { ...config, seed: config.seed + g * 0x9e3779b1 });
    const st = statsEvolution(cur);
    history.push(st);
  }
  return { history, population: cur };
}

/** Estadísticas de una población (maximización: best = mayor fitness). */
export function statsEvolution(population: readonly Individual[]): { best: number; mean: number; worst: number; diversity: number } {
  if (population.length === 0) throw new EvoError('población vacía');
  const fits = population.map((p) => p.fitness ?? NaN);
  if (fits.some((f) => Number.isNaN(f))) throw new EvoError('individuo sin fitness evaluado');
  const best = Math.max(...fits);
  const worst = Math.min(...fits);
  const mean = fits.reduce((a, b) => a + b, 0) / fits.length;
  const allGenes = population.flatMap((p) => p.genes);
  const mu = allGenes.reduce((a, b) => a + b, 0) / allGenes.length;
  const variance = allGenes.reduce((a, b) => a + (b - mu) * (b - mu), 0) / allGenes.length;
  return { best, mean, worst, diversity: Math.sqrt(variance) };
}

/* ------------------------------------------------------------------ */
/* Benchmark esférico                                                  */
/* ------------------------------------------------------------------ */

/**
 * Población inicial uniforme en el hipercubo [-range, range]^dims (PRNG propio).
 */
export function spherePopulation(size: number, dims: number, range = 5, seed = 42): Individual[] {
  if (size < 2) throw new EvoError('size >= 2');
  if (dims < 1 || dims > 64) throw new EvoError('dims fuera de [1,64]');
  const rng = xorshift32(seed);
  return Array.from({ length: size }, () => ({
    genes: Array.from({ length: dims }, () => (nextUnit(rng) * 2 - 1) * range),
  }));
}

/**
 * Benchmark esférico (minimización expresada como maximización de -|x|²).
 * Devuelve el mejor fitness alcanzado y la generación en que se superó `target`.
 */
export function benchmarkSphere(opts: { dims?: number; size?: number; generations?: number; target?: number; seed?: number; config?: Partial<Omit<EvolveConfig, 'seed'>> } = {}): {
  bestFitness: number;
  bestGenes: number[];
  reachedAtGeneration: number | null;
  history: ReturnType<typeof runGa>['history'];
} {
  const dims = opts.dims ?? 8;
  const size = opts.size ?? 40;
  const generations = opts.generations ?? 50;
  const target = opts.target ?? -1e-4;
  const seed = opts.seed ?? 20260824;
  const fitnessFn = (genes: readonly number[]) => -genes.reduce((acc, g) => acc + g * g, 0);
  const initial = spherePopulation(size, dims, 5, seed);
  const { history, population } = runGa(initial, generations, fitnessFn, {
    elite: 2,
    tournamentK: 3,
    crossover: { kind: 'blend', rate: 0.9, alpha: 0.25 },
    mutation: { sigma: 0.08, rate: 0.2 },
    ...opts.config,
    seed,
  });
  const reachedIdx = history.findIndex((h) => h.best >= target);
  const champion = population.reduce((best, ind) => ((ind.fitness ?? -Infinity) > (best.fitness ?? -Infinity) ? ind : best), population[0]);
  void dims;
  void size;
  return {
    bestFitness: champion.fitness ?? fitnessFn(champion.genes),
    bestGenes: [...champion.genes],
    reachedAtGeneration: reachedIdx === -1 ? null : reachedIdx,
    history,
  };
}
