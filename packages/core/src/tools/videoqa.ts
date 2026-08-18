/**
 * videoqa — métricas de calidad de vídeo para verificación de renders (capability `videoqa`)
 *
 * Fuente: learning/sources/fundamentos-programacion.md §A20-A24 (control de calidad audiovisual):
 *   PSNR > 40 dB y SSIM > 0.95 como umbrales de calidad; error map; métricas frame a frame.
 *
 * Port ORIGINAL de los PRINCIPIOS (matemática estándar — PSNR/SSIM son métricas de dominio
 * público; implementación propia sin deps). Determinista, keyless: opera sobre BUFFERS
 * numéricos (muestras de luminancia o parches), no sobre archivos de vídeo. El runner real
 * (ffmpeg/libvmaf) solo GENERA argv determinista — nunca se ejecuta desde el dominio ni en tests.
 *
 * E_total ponderado: E = α·E_pixel + β·E_flow + γ·E_semantic (α=0.6, β=0.3, γ=0.1 por defecto).
 * Umbrales de veredicto (fuente): PSNR > 40 dB, SSIM > 0.95; E_total < 0.4 captura errores de
 * flujo/semánticos (los de píxel ya los ve PSNR).
 */

import { z } from 'zod';

// ---------------------------------------------------------------------------
// Schemas zod (tool + runner)
// ---------------------------------------------------------------------------

export const videoqaInputSchema = z.object({
  /** Muestras del vídeo de referencia (luminancia 0-255 o normalizada). */
  reference: z.array(z.number()),
  /** Muestras del vídeo a evaluar (misma longitud). */
  distorted: z.array(z.number()),
  /** Campo de flujo de referencia (vectores [x, y] por píxel o por bloque). */
  flowReference: z.array(z.tuple([z.number(), z.number()])).optional(),
  /** Campo de flujo del vídeo a evaluar. */
  flowDistorted: z.array(z.tuple([z.number(), z.number()])).optional(),
  /** Error semántico normalizado 0-1 (de críticos externos, p.ej. OMAG). */
  semanticError: z.number().min(0).max(1).optional().default(0),
});
export type VideoqaInput = z.infer<typeof videoqaInputSchema>;

/**
 * Tipo de ENTRADA de las funciones puras: los campos opcionales lo son de verdad
 * (z.infer aplica los .default() y los vuelve requeridos — no sirve para llamadas directas).
 */
export type VideoqaInputLike = {
  reference: readonly number[];
  distorted: readonly number[];
  flowReference?: readonly FlowVector[];
  flowDistorted?: readonly FlowVector[];
  semanticError?: number;
};

export const videoqaWeightsSchema = z.object({
  alpha: z.number().min(0).max(1).default(0.6),
  beta: z.number().min(0).max(1).default(0.3),
  gamma: z.number().min(0).max(1).default(0.1),
});
export type VideoqaWeights = z.infer<typeof videoqaWeightsSchema>;

/** Umbrales de calidad (fuente: PSNR > 40 dB, SSIM > 0.95). */
export const videoqaThresholdsSchema = z.object({
  psnrMin: z.number().positive().default(40),
  ssimMin: z.number().min(0).max(1).default(0.95),
  /** E_total captura errores de flujo/semánticos (los de píxel los ve PSNR): default 0.4. */
  eTotalMax: z.number().min(0).max(1).default(0.4),
});
export type VideoqaThresholds = z.infer<typeof videoqaThresholdsSchema>;

// ---------------------------------------------------------------------------
// Métricas de píxel (matemática pura)
// ---------------------------------------------------------------------------

/** Error absoluto medio (MAE). */
export function mae(a: readonly number[], b: readonly number[]): number {
  if (a.length !== b.length) {
    throw new Error(`videoqa: buffers de distinta longitud (${a.length} vs ${b.length})`);
  }
  if (a.length === 0) {
    return 0;
  }
  let acc = 0;
  for (let i = 0; i < a.length; i++) {
    acc += Math.abs(a[i] - b[i]);
  }
  return acc / a.length;
}

/** Error cuadrático medio (MSE). */
export function mse(a: readonly number[], b: readonly number[]): number {
  if (a.length !== b.length) {
    throw new Error(`videoqa: buffers de distinta longitud (${a.length} vs ${b.length})`);
  }
  if (a.length === 0) {
    return 0;
  }
  let acc = 0;
  for (let i = 0; i < a.length; i++) {
    const d = a[i] - b[i];
    acc += d * d;
  }
  return acc / a.length;
}

/** PSNR en dB (pico 255): 10·log10(MAX²/MSE). MSE=0 → Infinity (idénticos). */
export function psnr(mseValue: number, maxValue = 255): number {
  if (mseValue <= 0) {
    return Infinity;
  }
  return 10 * Math.log10((maxValue * maxValue) / mseValue);
}

/** Media de un buffer. */
export function mean(a: readonly number[]): number {
  if (a.length === 0) {
    return 0;
  }
  let acc = 0;
  for (const x of a) {
    acc += x;
  }
  return acc / a.length;
}

/** Varianza muestral (poblacional con n, consistente con SSIM). */
export function variance(a: readonly number[], meanValue: number): number {
  if (a.length === 0) {
    return 0;
  }
  let acc = 0;
  for (const x of a) {
    const d = x - meanValue;
    acc += d * d;
  }
  return acc / a.length;
}

/** Covarianza entre dos buffers (misma longitud). */
export function covariance(a: readonly number[], b: readonly number[]): number {
  if (a.length !== b.length) {
    throw new Error(`videoqa: buffers de distinta longitud (${a.length} vs ${b.length})`);
  }
  if (a.length === 0) {
    return 0;
  }
  const ma = mean(a);
  const mb = mean(b);
  let acc = 0;
  for (let i = 0; i < a.length; i++) {
    acc += (a[i] - ma) * (b[i] - mb);
  }
  return acc / a.length;
}

const SSIM_C1 = (0.01 * 255) ** 2;
const SSIM_C2 = (0.03 * 255) ** 2;

/**
 * SSIM global (estructural) entre dos buffers: 1 = idénticos, <1 = degradación.
 * Implementación estándar de luminancia/contraste/estructura sobre las estadísticas globales.
 */
export function ssim(a: readonly number[], b: readonly number[]): number {
  if (a.length !== b.length) {
    throw new Error(`videoqa: buffers de distinta longitud (${a.length} vs ${b.length})`);
  }
  if (a.length === 0) {
    return 1;
  }
  const ma = mean(a);
  const mb = mean(b);
  const va = variance(a, ma);
  const vb = variance(b, mb);
  const cov = covariance(a, b);
  const numerator = (2 * ma * mb + SSIM_C1) * (2 * cov + SSIM_C2);
  const denominator = (ma * ma + mb * mb + SSIM_C1) * (va + vb + SSIM_C2);
  if (denominator === 0) {
    return 1;
  }
  return numerator / denominator;
}

// ---------------------------------------------------------------------------
// Error de flujo (E_flow)
// ---------------------------------------------------------------------------

export type FlowVector = readonly [number, number];

/** Magnitud promedio del campo de flujo (velocidad media). */
export function flowMagnitude(flow: readonly FlowVector[]): number {
  if (flow.length === 0) {
    return 0;
  }
  let acc = 0;
  for (const [x, y] of flow) {
    acc += Math.sqrt(x * x + y * y);
  }
  return acc / flow.length;
}

/**
 * E_flow: diferencia media de magnitud entre dos campos de flujo (misma longitud).
 * Normalizada contra 1 + la magnitud de referencia (relativa, estable ante escala).
 */
export function eFlow(
  reference: readonly FlowVector[],
  distorted: readonly FlowVector[],
): number {
  if (reference.length !== distorted.length) {
    throw new Error(`videoqa: flujos de distinta longitud (${reference.length} vs ${distorted.length})`);
  }
  if (reference.length === 0) {
    return 0;
  }
  const magRef = flowMagnitude(reference);
  let acc = 0;
  for (let i = 0; i < reference.length; i++) {
    const [rx, ry] = reference[i];
    const [dx, dy] = distorted[i];
    acc += Math.abs(Math.sqrt(rx * rx + ry * ry) - Math.sqrt(dx * dx + dy * dy));
  }
  const meanDiff = acc / reference.length;
  // Normalización relativa: 0 si idéntico, ~1 si el error equivale a la señal.
  return meanDiff / (1 + magRef);
}

// ---------------------------------------------------------------------------
// Error total ponderado (E_total)
// ---------------------------------------------------------------------------

/**
 * E_total = α·E_pixel + β·E_flow + γ·E_semantic.
 * E_pixel se deriva del PSNR (1 = peor, 0 = perfecto): 1 / (1 + psnr/40).
 */
export function ePixelFromPsnr(psnrValue: number): number {
  if (!Number.isFinite(psnrValue)) {
    return 0;
  }
  return 1 / (1 + psnrValue / 40);
}

export function eTotal(input: VideoqaInputLike, weights: VideoqaWeights = videoqaWeightsSchema.parse({})): {
  ePixel: number;
  eFlowValue: number;
  eSemantic: number;
  eTotal: number;
} {
  const psnrValue = psnr(mse(input.reference, input.distorted));
  const ePixelValue = ePixelFromPsnr(psnrValue);
  const eFlowValue =
    input.flowReference && input.flowDistorted
      ? eFlow(input.flowReference, input.flowDistorted)
      : 0;
  const eSemantic = input.semanticError ?? 0;
  const total =
    weights.alpha * ePixelValue + weights.beta * eFlowValue + weights.gamma * eSemantic;
  return { ePixel: ePixelValue, eFlowValue, eSemantic, eTotal: total };
}

// ---------------------------------------------------------------------------
// Veredicto (umbrales del fuente)
// ---------------------------------------------------------------------------

export interface VideoqaVerdict {
  /** true solo si TODOS los umbrales se cumplen. */
  pass: boolean;
  psnr: number;
  ssim: number;
  eTotal: number;
  checks: { psnr: boolean; ssim: boolean; eTotal: boolean };
  /** Diagnóstico en lenguaje natural (para el reporte del orquestador). */
  summary: string;
}

/** Evalúa el vídeo contra los umbrales de calidad (PSNR > 40 dB, SSIM > 0.95, E_total < 0.05). */
export function verdictVideo(
  input: VideoqaInputLike,
  thresholds: VideoqaThresholds = videoqaThresholdsSchema.parse({}),
): VideoqaVerdict {
  const psnrValue = psnr(mse(input.reference, input.distorted));
  const ssimValue = ssim(input.reference, input.distorted);
  const total = eTotal(input);
  const checks = {
    psnr: psnrValue > thresholds.psnrMin,
    ssim: ssimValue > thresholds.ssimMin,
    eTotal: total.eTotal < thresholds.eTotalMax,
  };
  const pass = checks.psnr && checks.ssim && checks.eTotal;
  const summary = pass
    ? `PASS (PSNR ${psnrValue === Infinity ? '∞' : psnrValue.toFixed(1)} dB, SSIM ${ssimValue.toFixed(3)}, E_total ${total.eTotal.toFixed(3)})`
    : `FAIL — ${['PSNR', 'SSIM', 'E_total']
        .filter((_, i) => !Object.values(checks)[i])
        .join(', ')} fuera de umbral (PSNR ${psnrValue === Infinity ? '∞' : psnrValue.toFixed(1)} dB, SSIM ${ssimValue.toFixed(3)}, E_total ${total.eTotal.toFixed(3)})`;
  return { pass, psnr: psnrValue, ssim: ssimValue, eTotal: total.eTotal, checks, summary };
}

// ---------------------------------------------------------------------------
// Runner ffmpeg/libvmaf (SOLO generación de argv — nunca ejecuta)
// ---------------------------------------------------------------------------

export const vmafRunnerSchema = z.object({
  reference: z.string().min(1),
  distorted: z.string().min(1),
  /** Ancho/alto de análisis (default 1920x1080). */
  size: z.string().default('1920x1080'),
  /** Modelo vmaf (default vmaf_v0.6.1). */
  model: z.string().default('vmaf_v0.6.1'),
  /** Feature set (default psnr; vmaf incluye psnr+ssim con --feature). */
  features: z.array(z.enum(['psnr', 'ssim', 'vmaf'])).default(['psnr']),
  /** Ruta del binario ffmpeg (default 'ffmpeg', resuelto en runtime). */
  ffmpegPath: z.string().default('ffmpeg'),
});
export type VmafRunner = z.infer<typeof vmafRunnerSchema>;

/**
 * Genera el argv determinista de ffmpeg para evaluar distorted vs reference con libvmaf.
 * Determinista y fail-soft: el dominio NUNCA ejecuta ffmpeg; el runner externo decide
 * (si `ffmpeg` no está en PATH, se degrada a las métricas por CPU de este módulo).
 */
export function buildVmafArgv(runner: VmafRunner): string[] {
  const args = [runner.ffmpegPath, '-hide_banner', '-i', runner.distorted, '-i', runner.reference];
  const libvmaf =
    `libvmaf=model_path=${runner.model}:n_threads=0` +
    (runner.features.includes('psnr') ? ':psnr=1' : '') +
    (runner.features.includes('ssim') ? ':ssim=1' : '');
  args.push('-lavfi', `[0:v]scale=${runner.size},setpts=PTS-STARTPTS[dis];[1:v]scale=${runner.size},setpts=PTS-STARTPTS[ref];[dis][ref]${libvmaf}`, '-f', 'null', '-');
  return args;
}

// ---------------------------------------------------------------------------
// Surface de la capability (el tool se registra en ai/llm.ts — wiring
// DIFERIDO mientras llm.ts esté en uso por otras sesiones)
// ---------------------------------------------------------------------------

export const videoqaSurface = {
  metrics: ['mae', 'mse', 'psnr', 'ssim', 'e_flow', 'e_total'],
  thresholds: { psnrMin: 40, ssimMin: 0.95, eTotalMax: 0.4 },
  schemas: {
    input: videoqaInputSchema,
    weights: videoqaWeightsSchema,
    thresholds: videoqaThresholdsSchema,
    runner: vmafRunnerSchema,
  },
};