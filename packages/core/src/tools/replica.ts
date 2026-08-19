/**
 * replica — orquestador de análisis-por-síntesis (capability `replica`)
 *
 * Fuente: learning/sources/fundamentos-programacion.md §A21 (bucle analyze→generate→compare→
 *   optimize), §A26-A37 (parámetros θ, E_total como métrica, stop conditions por target o por
 *   mejora estancada, checkpoints, presupuestos de cómputo y diagnóstico fail-soft).
 *
 * Port ORIGINAL de los PRINCIPIOS (implementación propia; nada copiado). Determinista y keyless:
 * el orquestador es un DOMINIO PURO con inyección de `generate`/`compare` — los tests usan fakes
 * matemáticos; la integración real (generative/videoqa/motion/sdf) se registra en ai/llm.ts
 * (wiring diferido) y los runners externos deciden si ejecutan (fail-soft).
 *
 * Bucle: analyze(target) → stats iniciales → para cada iteración: candidate = generate(θ);
 * score = compare(candidate, target); θ se optimiza por descenso por coordenadas (determinista);
 * history + checkpoints cada iteración; para cuando: score ≥ targetScore OR iteraciones ≥
 * maxIterations OR mejora < improvementThreshold durante `patience` iteraciones.
 */

import { z } from 'zod';

// ---------------------------------------------------------------------------
// Schemas y tipos
// ---------------------------------------------------------------------------

export const replicaConfigSchema = z.object({
  /** Presupuesto: máx. iteraciones del bucle. */
  maxIterations: z.number().int().min(1).max(10000).default(100),
  /** Stop: score objetivo (0-1; 1 = réplica perfecta). */
  targetScore: z.number().min(0).max(1).default(0.98),
  /** Stop: mejora mínima por iteración para considerar progreso. */
  improvementThreshold: z.number().min(0).default(0.001),
  /** Stop: nº de iteraciones consecutivas sin mejora → abandonar. */
  patience: z.number().int().min(1).default(5),
  /** Parámetros iniciales θ del generador. */
  theta: z.array(z.number()).min(1),
  /** Paso del descenso por coordenadas (determinista). */
  stepSize: z.number().positive().default(0.1),
  /** Presupuesto de cómputo (ms) — el loop lo consulta vía reloj inyectable. */
  timeoutMs: z.number().int().min(1000).default(60000),
});
export type ReplicaConfig = z.infer<typeof replicaConfigSchema>;

/** IO inyectable del orquestador (los runners reales deciden si ejecutan). */
export interface ReplicaIO<T = number[]> {
  /** Objetivo a replicar (vídeo/firma de vídeo). */
  target: T;
  /** Generador: θ → candidato (p.ej. generative con parámetros θ). */
  generate(theta: readonly number[]): T;
  /** Comparador: (candidato, objetivo) → score 0-1 (1 = idéntico). */
  compare(candidate: T, target: T): number;
  /** Reloj inyectable (ms) para el presupuesto de cómputo. */
  now?(): number;
}

export type StopReason = 'target' | 'maxIterations' | 'patience' | 'timeout';

export interface ReplicaCheckpoint {
  iteration: number;
  theta: number[];
  bestScore: number;
  history: { iteration: number; score: number }[];
}

export interface ReplicaResult {
  stoppedBy: StopReason;
  iterationsUsed: number;
  finalTheta: number[];
  bestScore: number;
  history: { iteration: number; score: number }[];
  checkpoint: ReplicaCheckpoint;
  diagnostics: {
    /** Estadísticas del objetivo (de analyze). */
    targetStats: { mean: number; variance: number; span: number } | null;
    /** Última mejora observada (0 si nunca mejoró). */
    lastImprovement: number;
    /** Score del checkpoint (igual que bestScore). */
    checkpointScore: number;
  };
}

// ---------------------------------------------------------------------------
// Analyze: estadísticas del objetivo (matemática pura)
// ---------------------------------------------------------------------------

export interface TargetStats {
  mean: number;
  variance: number;
  span: number;
}

/** Estadísticas deterministas del objetivo (firma numérica del vídeo). */
export function analyzeTarget(target: readonly number[]): TargetStats {
  if (target.length === 0) {
    return { mean: 0, variance: 0, span: 0 };
  }
  let sum = 0;
  for (const x of target) {
    sum += x;
  }
  const mean = sum / target.length;
  let sq = 0;
  let min = Infinity;
  let max = -Infinity;
  for (const x of target) {
    sq += (x - mean) ** 2;
    if (x < min) min = x;
    if (x > max) max = x;
  }
  return { mean, variance: sq / target.length, span: max - min };
}

// ---------------------------------------------------------------------------
// Optimizador: descenso por coordenadas determinista
// ---------------------------------------------------------------------------

/**
 * Un paso de descenso por coordenadas: prueba ±step en cada eje (en orden) y avanza
 * por el que más mejora el score. Devuelve { theta, score, improved }.
 */
export function coordinateStep(
  theta: readonly number[],
  step: number,
  score: (t: readonly number[]) => number,
): { theta: number[]; score: number; improved: boolean } {
  let best = theta.slice();
  let bestScore = score(theta);
  let improved = false;
  for (let i = 0; i < theta.length; i++) {
    for (const dir of [1, -1] as const) {
      const cand = best.slice();
      cand[i] += dir * step;
      const s = score(cand);
      if (s > bestScore) {
        best = cand;
        bestScore = s;
        improved = true;
      }
    }
  }
  return { theta: best, score: bestScore, improved };
}

// ---------------------------------------------------------------------------
// Orquestador
// ---------------------------------------------------------------------------

/** Checkpoint serializable (estado completo del bucle). */
export function checkpointFrom(
  iteration: number,
  theta: readonly number[],
  bestScore: number,
  history: { iteration: number; score: number }[],
): ReplicaCheckpoint {
  return { iteration, theta: theta.slice(), bestScore, history: history.map((h) => ({ ...h })) };
}

/**
 * Ejecuta el bucle análisis-por-síntesis con stop conditions y checkpoints.
 * Nunca lanza: si generate/compare fallan, devuelve estado + diagnóstico (fail-soft).
 */
export function runReplica(cfg: ReplicaConfig, io: ReplicaIO): ReplicaResult {
  const now = io.now ?? (() => Date.now());
  const start = now();
  const maxIterations = cfg.maxIterations;
  const target = io.target;

  const targetStats = (() => {
    try {
      return analyzeTarget(target as readonly number[]);
    } catch {
      return null;
    }
  })();

  const scoreAt = (theta: readonly number[]): number => {
    const candidate = io.generate(theta);
    return io.compare(candidate, target);
  };

  let theta = cfg.theta.slice();
  let bestScore = Number.NEGATIVE_INFINITY;
  let bestTheta = theta.slice();
  const history: { iteration: number; score: number }[] = [];
  let stalled = 0;
  let stoppedBy: StopReason = 'maxIterations';
  let lastImprovement = 0;
  let iteration = 0;

  for (; iteration < maxIterations; iteration++) {
    // Presupuesto de cómputo.
    if (now() - start > cfg.timeoutMs) {
      stoppedBy = 'timeout';
      break;
    }
    let currentScore: number;
    try {
      currentScore = scoreAt(theta);
    } catch {
      // Fail-soft: el generador/ comparador falló → estado parcial + diagnóstico.
      stoppedBy = 'maxIterations';
      bestScore = Number.isFinite(bestScore) ? bestScore : 0;
      break;
    }
    if (!Number.isFinite(currentScore)) {
      currentScore = 0;
    }
    history.push({ iteration, score: currentScore });
    if (currentScore > bestScore) {
      bestScore = currentScore;
      bestTheta = theta.slice();
    }
    if (currentScore >= cfg.targetScore) {
      stoppedBy = 'target';
      break;
    }
    // Optimizar y medir la mejora (fail-soft: si el optimizador lanza, estado parcial).
    const before = currentScore;
    let next: { theta: number[]; score: number; improved: boolean };
    try {
      next = coordinateStep(theta, cfg.stepSize, scoreAt);
    } catch {
      break;
    }
    const improvement = next.score - before;
    theta = next.theta;
    lastImprovement = improvement;
    if (improvement < cfg.improvementThreshold) {
      stalled++;
      if (stalled >= cfg.patience) {
        stoppedBy = 'patience';
        break;
      }
    } else {
      stalled = 0;
    }
  }

  // La última iteración REAL ejecutada (loop completo: iteration == maxIterations → maxIterations-1).
  const lastIteration = Math.min(iteration, maxIterations - 1);
  const checkpoint = checkpointFrom(lastIteration, bestTheta, bestScore, history);
  return {
    stoppedBy,
    // Loop completo: iteration ya llegó a maxIterations (contó de más); break: última usada.
    iterationsUsed: Math.min(iteration + 1, maxIterations),
    finalTheta: bestTheta,
    bestScore,
    history,
    checkpoint,
    diagnostics: {
      targetStats,
      lastImprovement,
      checkpointScore: checkpoint.bestScore,
    },
  };
}

/** Reanuda desde un checkpoint (mantiene θ, mejor score e historia previa). */
export function resumeFrom(
  cfg: ReplicaConfig,
  io: ReplicaIO,
  checkpoint: ReplicaCheckpoint,
): ReplicaResult {
  // checkpoint.iteration es 0-indexado: iteraciones ya ejecutadas = iteration + 1.
  const startIteration = checkpoint.iteration + 1;
  const result = runReplica(
    {
      ...cfg,
      maxIterations: Math.max(0, cfg.maxIterations - startIteration),
      theta: checkpoint.theta,
    },
    io,
  );
  const totalIterations = startIteration + result.iterationsUsed;
  const history = [...checkpoint.history, ...result.history];
  return {
    ...result,
    iterationsUsed: totalIterations,
    history,
    checkpoint: checkpointFrom(totalIterations - 1, result.finalTheta, result.bestScore, history),
  };
}

// ---------------------------------------------------------------------------
// Surface (tool replica_run se registra en ai/llm.ts — wiring diferido)
// ---------------------------------------------------------------------------

export const replicaSurface = {
  stops: ['target', 'maxIterations', 'patience', 'timeout'],
  features: ['analyzeTarget', 'coordinateStep', 'runReplica', 'checkpointFrom', 'resumeFrom'],
  schemas: { config: replicaConfigSchema },
};