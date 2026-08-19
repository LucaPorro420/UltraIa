/**
 * Tests de replica.ts (capability `replica`) — orquestador análisis-por-síntesis.
 * CERO ejecución real: fakes matemáticos (generador cuadrático determinista).
 */
import { describe, it, expect } from 'vitest';
import {
  analyzeTarget,
  coordinateStep,
  checkpointFrom,
  runReplica,
  resumeFrom,
  replicaConfigSchema,
  type ReplicaConfig,
  type ReplicaIO,
} from './replica';

/** Objetivo: señal sintética (seno muestreado + offset). */
function makeTarget(n = 64): number[] {
  const out: number[] = [];
  for (let i = 0; i < n; i++) {
    out.push(Math.sin((i / n) * Math.PI * 4) + 2);
  }
  return out;
}

/**
 * Fake determinista: el generador sintetiza la señal con θ = [amp, offset, freq]
 * y el comparador mide el error relativo contra el target.
 */
function makeIo(target: number[], opts?: { failAt?: number; now?: () => number }): ReplicaIO<number[]> {
  const generate = (theta: number[]): number[] => {
    const [amp, offset, freq] = theta;
    const out: number[] = [];
    for (let i = 0; i < target.length; i++) {
      out.push(amp * Math.sin((i / target.length) * Math.PI * 2 * freq) + offset);
    }
    return out;
  };
  const compare = (c: number[], t: number[]): number => {
    let err = 0;
    for (let i = 0; i < t.length; i++) {
      err += Math.abs(c[i] - t[i]);
    }
    const mae = err / t.length;
    return Math.max(0, 1 - mae / 2);
  };
  return { target, generate, compare, now: opts?.now };
}

const baseCfg: ReplicaConfig = {
  maxIterations: 100,
  targetScore: 0.98,
  improvementThreshold: 0.001,
  patience: 5,
  theta: [1, 1, 1],
  stepSize: 0.1,
  timeoutMs: 60000,
};

describe('analyzeTarget (estadísticas del objetivo)', () => {
  it('media y varianza exactas de una señal constante', () => {
    const s = analyzeTarget([2, 2, 2, 2]);
    expect(s.mean).toBe(2);
    expect(s.variance).toBe(0);
    expect(s.span).toBe(0);
  });

  it('media/varianza/span de una rampa', () => {
    const s = analyzeTarget([0, 1, 2, 3]);
    expect(s.mean).toBe(1.5);
    expect(s.variance).toBeCloseTo(1.25, 9);
    expect(s.span).toBe(3);
  });

  it('target vacío → neutral', () => {
    expect(analyzeTarget([])).toEqual({ mean: 0, variance: 0, span: 0 });
  });
});

describe('coordinateStep (descenso por coordenadas determinista)', () => {
  it('avanza hacia el mínimo de una parábola (score = 1 - error²)', () => {
    const score = (t: readonly number[]): number => {
      const err = Math.abs(t[0] - 5);
      return 1 - err * err;
    };
    const r1 = coordinateStep([0], 0.1, score);
    expect(r1.improved).toBe(true);
    expect(r1.theta[0]).toBe(0.1);
    expect(r1.score).toBeGreaterThan(score([0]));
    const r2 = coordinateStep(r1.theta, 0.1, score);
    expect(r2.theta[0]).toBe(0.2);
  });

  it('sin mejora posible → improved false y theta intacto', () => {
    const score = (): number => 0.5;
    const r = coordinateStep([3, 4], 0.1, score);
    expect(r.improved).toBe(false);
    expect(r.theta).toEqual([3, 4]);
    expect(r.score).toBe(0.5);
  });

  it('multi-eje: greedy por orden de ejes (prueba ±step en cada eje, avanza por el mejor)', () => {
    const score = (t: readonly number[]): number => -(Math.abs(t[0] - 2) + Math.abs(t[1] - 50));
    const r = coordinateStep([0, 0], 0.5, score);
    // Eje 0: +0.5 → -51.5 (mejora); eje 1 desde ahí: +0.5 → -51 (mejor aún).
    expect(r.theta).toEqual([0.5, 0.5]);
    expect(r.score).toBe(-51);
    expect(r.improved).toBe(true);
  });
});

describe('runReplica (orquestador análisis-por-síntesis)', () => {
  it('converge al target real: bestScore alto y stop por target', () => {
    const target = makeTarget();
    const io = makeIo(target);
    // θ inicial CERCA del óptimo [amp=1, offset=2, freq=2] → convergencia rápida y determinista.
    const cfg: ReplicaConfig = {
      ...baseCfg,
      theta: [1, 2, 1.5],
      targetScore: 0.99,
      patience: 10,
      maxIterations: 50,
    };
    const r = runReplica(cfg, io);
    expect(r.stoppedBy).toBe('target');
    expect(r.bestScore).toBeGreaterThanOrEqual(0.99);
    expect(r.iterationsUsed).toBeLessThanOrEqual(cfg.maxIterations);
    // Seno con amplitud 1 → span = 2 (no 4).
    expect(r.diagnostics.targetStats?.span).toBeCloseTo(2, 6);
  });

  it('stop por maxIterations si no alcanza el target', () => {
    const target = makeTarget();
    const io = makeIo(target);
    const cfg: ReplicaConfig = { ...baseCfg, maxIterations: 3, targetScore: 0.999999 };
    const r = runReplica(cfg, io);
    expect(r.stoppedBy).toBe('maxIterations');
    expect(r.iterationsUsed).toBe(3);
    expect(r.history.length).toBe(3);
  });

  it('stop por patience si el score se estanca', () => {
    const io: ReplicaIO<number[]> = {
      target: [0],
      generate: () => [0],
      compare: () => 0.5, // score constante: nunca mejora
    };
    const cfg: ReplicaConfig = { ...baseCfg, patience: 4, targetScore: 1 };
    const r = runReplica(cfg, io);
    expect(r.stoppedBy).toBe('patience');
    expect(r.iterationsUsed).toBe(4); // 1 + patience
  });

  it('stop por timeout con reloj inyectable', () => {
    let t = 0;
    const io = makeIo(makeTarget(), { now: () => (t += 1_000_000) });
    const cfg: ReplicaConfig = { ...baseCfg, timeoutMs: 3_000_000 };
    const r = runReplica(cfg, io);
    expect(r.stoppedBy).toBe('timeout');
  });

  it('fail-soft: generador que lanza en la optimización → resultado con diagnóstico, sin crash', () => {
    const target = makeTarget();
    const io = makeIo(target);
    const failIo: ReplicaIO<number[]> = {
      ...io,
      generate: (theta) => {
        if (theta[0] > 0.7) {
          throw new Error('generator exploded');
        }
        return io.generate(theta);
      },
    };
    const cfg: ReplicaConfig = { ...baseCfg, theta: [0.5, 0.5, 0.5], stepSize: 0.2, patience: 2 };
    const r = runReplica(cfg, failIo);
    expect(Number.isFinite(r.bestScore)).toBe(true);
    // La iteración 0 completa la historia; el throw ocurre dentro de coordinateStep → break.
    expect(r.history.length).toBeGreaterThanOrEqual(1);
  });

  it('determinista: misma config → misma trayectoria', () => {
    const target = makeTarget();
    const r1 = runReplica({ ...baseCfg, maxIterations: 5 }, makeIo(target));
    const r2 = runReplica({ ...baseCfg, maxIterations: 5 }, makeIo(target));
    expect(r1.history).toEqual(r2.history);
    expect(r1.finalTheta).toEqual(r2.finalTheta);
  });

  it('checkpoint captura estado completo y bestScore', () => {
    const r = runReplica({ ...baseCfg, maxIterations: 7 }, makeIo(makeTarget()));
    expect(r.checkpoint.iteration).toBe(r.iterationsUsed - 1);
    expect(r.checkpoint.bestScore).toBe(r.bestScore);
    expect(r.checkpoint.history).toEqual(r.history);
    expect(r.checkpoint.theta).toEqual(r.finalTheta);
  });
});

describe('resumeFrom (reanudar desde checkpoint)', () => {
  it('continúa la historia y mantiene el mejor score', () => {
    const target = makeTarget();
    const io = makeIo(target);
    const cfg: ReplicaConfig = { ...baseCfg, theta: [0.5, 0.5, 0.5] };
    const r1 = runReplica({ ...cfg, maxIterations: 10 }, io);
    const r2 = resumeFrom({ ...cfg, maxIterations: 30 }, io, r1.checkpoint);
    expect(r2.iterationsUsed).toBeGreaterThan(r1.iterationsUsed);
    expect(r2.history.length).toBe(r1.history.length + (r2.iterationsUsed - r1.iterationsUsed));
    expect(r2.bestScore).toBeGreaterThanOrEqual(r1.bestScore);
    // La historia reanudada empieza con la previa intacta.
    expect(r2.history.slice(0, r1.history.length)).toEqual(r1.history);
  });
});

describe('replicaConfigSchema', () => {
  it('defaults aplicados', () => {
    const cfg = replicaConfigSchema.parse({ theta: [1] });
    expect(cfg.maxIterations).toBe(100);
    expect(cfg.patience).toBe(5);
    expect(cfg.targetScore).toBe(0.98);
  });

  it('rechaza configs inválidas', () => {
    expect(() => replicaConfigSchema.parse({ theta: [] })).toThrow();
    expect(() => replicaConfigSchema.parse({ theta: [1], maxIterations: 0 })).toThrow();
    expect(() => replicaConfigSchema.parse({ theta: [1], targetScore: 1.5 })).toThrow();
  });
});

describe('checkpointFrom (serialización)', () => {
  it('copia profunda: mutar el original no afecta al checkpoint', () => {
    const theta = [1, 2];
    const history = [{ iteration: 0, score: 0.5 }];
    const cp = checkpointFrom(0, theta, 0.5, history);
    theta[0] = 99;
    history[0].score = 0;
    expect(cp.theta).toEqual([1, 2]);
    expect(cp.history[0].score).toBe(0.5);
  });
});