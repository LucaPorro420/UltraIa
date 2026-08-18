/**
 * motion — análisis de movimiento para vídeo (capability `motion`)
 *
 * Fuente: learning/sources/fundamentos-programacion.md §A9-A11 (flujo óptico, trayectorias) y
 *   §A14 (descomposición cámara vs escena): campo F(x,y,t), flujo óptico (Farnebäck /
 *   Lucas-Kanade), trayectorias interpoladas, movimiento de cámara vs movimiento de escena.
 *
 * Port ORIGINAL de los PRINCIPIOS (implementación propia, matemática estándar; nada copiado).
 * Determinista y keyless: el dominio opera sobre CAMPOS DE FLUJO numéricos (vectores por
 * punto/tiempo) y genera el argv del runner externo (Python/OpenCV) SIN ejecutarlo nunca.
 *
 * Superficie: flowStats (estadística del campo), decomposeMotion (cámara global vs residual de
 * escena), trajectoryFit (spline Catmull-Rom interpolante), planFlowAnalysis (argv runner
 * determinista). El tool motion_analyze se registra en ai/llm.ts (wiring diferido).
 */

import { z } from 'zod';

// ---------------------------------------------------------------------------
// Tipos y schemas
// ---------------------------------------------------------------------------

/** Vector de movimiento: [x, y, u, v] — posición y desplazamiento. */
export type MotionVector = readonly [number, number, number, number];

export const motionVectorSchema = z.tuple([
  z.number(),
  z.number(),
  z.number(),
  z.number(),
]);

/** Campo de flujo óptico F(x,y,t): grid con un vector por celda. */
export interface FlowField {
  width: number;
  height: number;
  /** vectors.length === width * height (orden row-major). */
  vectors: MotionVector[];
}

export const flowFieldSchema = z.object({
  width: z.number().int().positive(),
  height: z.number().int().positive(),
  vectors: z.array(motionVectorSchema),
});

/** Config del runner OpenCV (solo genera argv; nunca ejecuta). */
export const flowAnalysisSchema = z.object({
  method: z.enum(['farneback', 'lucasKanade']).default('farneback'),
  /** Escala del análisis (1 = resolución completa; bajar = más rápido). */
  scale: z.number().min(0.1).max(2).default(1),
  /** Grid del campo resultante (celdas por lado). */
  grid: z.number().int().min(2).max(64).default(16),
  /** ROI opcional [x, y, w, h] (0-1 normalizado). */
  roi: z.tuple([z.number(), z.number(), z.number(), z.number()]).optional(),
  /** Ventana de Lucas-Kanade (tamaño del vecindario). */
  window: z.number().int().min(3).max(31).default(15),
  /** Umbral de magnitud para descartar vectores ruidosos. */
  minMagnitude: z.number().min(0).max(10).default(0.1),
  /** Python a usar (default 'python', el runner resuelve). */
  pythonPath: z.string().default('python'),
});
export type FlowAnalysis = z.infer<typeof flowAnalysisSchema>;

/** Resultado de la descomposición cámara vs escena. */
export interface DecomposedMotion {
  /** Translación global de cámara (píxeles/cuadro, promediada). */
  cameraTranslation: { x: number; y: number };
  /** Zoom global (1 = sin zoom, >1 = acercamiento). */
  cameraZoom: number;
  /** Fracción de energía del movimiento explicada por la cámara (0-1). */
  explainedRatio: number;
  /** Residual: movimiento NO explicado por cámara (objetos/escena). */
  sceneResidual: FlowField;
  /** Veredicto heurístico: 'static' | 'camera' | 'scene' | 'mixed'. */
  dominant: 'static' | 'camera' | 'scene' | 'mixed';
}

// ---------------------------------------------------------------------------
// Estadística del campo (F(x,y,t))
// ---------------------------------------------------------------------------

export interface FlowStats {
  /** Magnitud media (velocidad media en px/cuadro). */
  meanMagnitude: number;
  /** Dirección dominante en grados (0-360, 0 = +x). */
  dominantAngle: number;
  /** Coherencia 0-1: 1 = todos los vectores apuntan igual. */
  coherence: number;
  /** Vector medio. */
  meanVector: { x: number; y: number };
}

/** Estadística del campo de flujo. */
export function flowStats(field: FlowField): FlowStats {
  if (field.vectors.length === 0) {
    return { meanMagnitude: 0, dominantAngle: 0, coherence: 1, meanVector: { x: 0, y: 0 } };
  }
  let sx = 0;
  let sy = 0;
  let smag = 0;
  for (const [, , u, v] of field.vectors) {
    sx += u;
    sy += v;
    smag += Math.sqrt(u * u + v * v);
  }
  const n = field.vectors.length;
  const mx = sx / n;
  const my = sy / n;
  const meanMag = smag / n;
  // Coherencia: razón entre la magnitud del vector medio y la magnitud media.
  const meanMagVec = Math.sqrt(mx * mx + my * my);
  const coherence = meanMag > 0 ? Math.min(1, meanMagVec / meanMag) : 1;
  const dominantAngle = (Math.atan2(my, mx) * 180) / Math.PI;
  return {
    meanMagnitude: meanMag,
    dominantAngle: dominantAngle < 0 ? dominantAngle + 360 : dominantAngle,
    coherence,
    meanVector: { x: mx, y: my },
  };
}

// ---------------------------------------------------------------------------
// Descomposición cámara vs escena
// ---------------------------------------------------------------------------

/**
 * Modelo de cámara afín: u ≈ tx + s·x, v ≈ ty + s·y (translación + zoom uniforme).
 * Ajusta tx/ty/s por mínimos cuadrados y deja el residual como movimiento de escena.
 */
export function decomposeMotion(field: FlowField): DecomposedMotion {
  const n = field.vectors.length;
  if (n === 0) {
    const empty: FlowField = { width: field.width, height: field.height, vectors: [] };
    return {
      cameraTranslation: { x: 0, y: 0 },
      cameraZoom: 1,
      explainedRatio: 0,
      sceneResidual: empty,
      dominant: 'static',
    };
  }
  // Ajuste lineal por componentes: u = tx + s·x ; v = ty + s·y
  // mínimos cuadrados: [Σ1 Σx; Σx Σx²]·[tx; s] = [Σu; Σx·u]
  let sumX = 0;
  let sumX2 = 0;
  let sumU = 0;
  let sumXU = 0;
  let sumY = 0;
  let sumY2 = 0;
  let sumV = 0;
  let sumYV = 0;
  for (const [x, y, u, v] of field.vectors) {
    sumX += x;
    sumX2 += x * x;
    sumU += u;
    sumXU += x * u;
    sumY += y;
    sumY2 += y * y;
    sumV += v;
    sumYV += y * v;
  }
  const detX = n * sumX2 - sumX * sumX;
  const detY = n * sumY2 - sumY * sumY;
  let s = 0;
  let tx = 0;
  let ty = 0;
  if (Math.abs(detX) > 1e-9) {
    s = (n * sumXU - sumX * sumU) / detX;
    tx = (sumU - s * sumX) / n;
  } else {
    tx = sumU / n;
  }
  if (Math.abs(detY) > 1e-9) {
    const sy = (n * sumYV - sumY * sumV) / detY;
    s = (s + sy) / 2;
    ty = (sumV - sy * sumY) / n;
  } else {
    ty = sumV / n;
  }
  const zoom = 1 + s;

  // Residual y energía explicada.
  const residual: MotionVector[] = [];
  let energyTotal = 0;
  let energyModel = 0;
  for (const [x, y, u, v] of field.vectors) {
    const mu = tx + s * x;
    const mv = ty + s * y;
    energyTotal += u * u + v * v;
    energyModel += mu * mu + mv * mv;
    residual.push([x, y, u - mu, v - mv]);
  }
  const explainedRatio = energyTotal > 0 ? Math.min(1, energyModel / energyTotal) : 1;
  const sceneResidual: FlowField = { width: field.width, height: field.height, vectors: residual };

  const stats = flowStats(field);
  const totalMag = stats.meanMagnitude;
  // Clasificación por energía explicada por el modelo de cámara (robusto a
  // objetos con magnitud dispar): >0.85 camera, <0.15 scene, entre medias mixed.
  const dominant: DecomposedMotion['dominant'] =
    totalMag < 0.05
      ? 'static'
      : explainedRatio > 0.85
        ? 'camera'
        : explainedRatio < 0.15
          ? 'scene'
          : 'mixed';

  return {
    cameraTranslation: { x: tx, y: ty },
    cameraZoom: zoom,
    explainedRatio,
    sceneResidual,
    dominant,
  };
}

// ---------------------------------------------------------------------------
// Trayectorias: spline Catmull-Rom interpolante
// ---------------------------------------------------------------------------

export type Point2D = readonly [number, number];

/** Punto Catmull-Rom en t∈[0,1] entre p1 y p2 con vecinos p0 y p3. */
export function catmullRom(p0: Point2D, p1: Point2D, p2: Point2D, p3: Point2D, t: number): Point2D {
  const t2 = t * t;
  const t3 = t2 * t;
  const a0 = -0.5 * p0[0] + 1.5 * p1[0] - 1.5 * p2[0] + 0.5 * p3[0];
  const a1 = p0[0] - 2.5 * p1[0] + 2 * p2[0] - 0.5 * p3[0];
  const a2 = -0.5 * p0[0] + 0.5 * p2[0];
  const a3 = p1[0];
  const b0 = -0.5 * p0[1] + 1.5 * p1[1] - 1.5 * p2[1] + 0.5 * p3[1];
  const b1 = p0[1] - 2.5 * p1[1] + 2 * p2[1] - 0.5 * p3[1];
  const b2 = -0.5 * p0[1] + 0.5 * p2[1];
  const b3 = p1[1];
  return [a0 * t3 + a1 * t2 + a2 * t + a3, b0 * t3 + b1 * t2 + b2 * t + b3];
}

export interface Trajectory {
  /** Puntos de control interpolados exactamente en t = 0..n-1. */
  controlPoints: Point2D[];
  /** Evalúa la spline en el parámetro global t (0 = primer punto, n-1 = último). */
  evaluate(t: number): Point2D;
  /** Longitud aproximada (suma de segmentos muestreados, determinista). */
  length: number;
  /** Tiempos de control (t = índice). */
  times: number[];
}

/**
 * Spline Catmull-Rom interpolante por los puntos de control (t = 0..n-1).
 * Los puntos de control se interpolan EXACTAMENTE en t entero.
 */
export function trajectoryFit(points: readonly Point2D[]): Trajectory {
  if (points.length < 2) {
    throw new Error(`motion: trajectoryFit necesita >= 2 puntos (recibió ${points.length})`);
  }
  const n = points.length;
  const at = (i: number): Point2D => points[Math.min(n - 1, Math.max(0, i))];
  const evaluate = (t: number): Point2D => {
    const clamped = Math.min(n - 1, Math.max(0, t));
    const i = Math.floor(clamped);
    if (i >= n - 1) {
      return points[n - 1];
    }
    const local = clamped - i;
    return catmullRom(at(i - 1), at(i), at(i + 1), at(i + 2), local);
  };
  // Longitud: muestrear la spline en 4 sub-segmentos por control (determinista).
  let length = 0;
  let prev = evaluate(0);
  for (let i = 0; i < n - 1; i++) {
    for (let k = 1; k <= 4; k++) {
      const p = evaluate(i + k / 4);
      length += Math.sqrt((p[0] - prev[0]) ** 2 + (p[1] - prev[1]) ** 2);
      prev = p;
    }
  }
  return {
    controlPoints: [...points],
    evaluate,
    length,
    times: points.map((_, i) => i),
  };
}

// ---------------------------------------------------------------------------
// Runner Python/OpenCV (SOLO generación de argv + script; nunca ejecuta)
// ---------------------------------------------------------------------------

/**
 * Genera el argv determinista del runner de análisis de flujo (Python + OpenCV).
 * El runner externo decide si ejecutar (fail-soft: sin OpenCV → estadística por CPU).
 */
export function planFlowAnalysis(
  input: Partial<FlowAnalysis>,
  scriptPath = 'scripts/motion/flow_analysis.py',
): {
  argv: string[];
  scriptPath: string;
  summary: string;
} {
  // Parse zod: aplica defaults (method farneback, pythonPath 'python', ...).
  const cfg = flowAnalysisSchema.parse(input);
  const argv = [cfg.pythonPath, scriptPath];
  const args: Record<string, string> = {
    '--method': cfg.method,
    '--scale': String(cfg.scale),
    '--grid': String(cfg.grid),
    '--window': String(cfg.window),
    '--min-magnitude': String(cfg.minMagnitude),
  };
  if (cfg.roi) {
    args['--roi'] = cfg.roi.map((x) => String(x)).join(',');
  }
  for (const [k, v] of Object.entries(args)) {
    argv.push(k, v);
  }
  const summary = `motion: ${cfg.method} grid ${cfg.grid}×${cfg.grid} scale ${cfg.scale} (argv listo, no ejecutado)`;
  return { argv, scriptPath, summary };
}

// ---------------------------------------------------------------------------
// Surface (tool motion_analyze se registra en ai/llm.ts — wiring diferido)
// ---------------------------------------------------------------------------

export const motionSurface = {
  methods: ['farneback', 'lucasKanade'],
  features: ['flowStats', 'decomposeMotion', 'trajectoryFit', 'planFlowAnalysis'],
  schemas: {
    flowField: flowFieldSchema,
    flowAnalysis: flowAnalysisSchema,
  },
};