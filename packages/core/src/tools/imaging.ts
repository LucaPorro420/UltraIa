/**
 * imaging — kernels de procesamiento de imagen en TypeScript puro (capability `imaging`)
 *
 * Fuente: learning/sources/fundamentos-programacion.md §A8 (procesamiento de imágenes) y
 * §A9-A11 (optical flow / tracking). Gap documentado en
 * docs/RAZONAMIENTO-FUNDAMENTOS-PROGRAMACION.md:
 *   - A8  "◑ parcial — sin implementación de kernels en TS puro"
 *   - A9-11 "◑ parcial — solo planificación (runner Python), sin flujo real"
 *   - A22-24 "◑ parcial — sin mapas de error 2D ni SSIM por ventana"
 *
 * Este módulo cierra los tres: convoluciones, filtros, morfología, histogramas, pirámides
 * y flujo óptico Lucas-Kanade (mono y piramidal) — todo determinista, keyless, sin deps y
 * sin red. Es la capa numérica que faltaba entre `generative` (síntesis) y
 * `videoqa`/`motion` (verificación), y la que permite a `replica` cerrar el bucle
 * análisis-por-síntesis con métricas 2D reales.
 *
 * Convenciones:
 *   - Una imagen es luminancia en Float64Array (rango típico 0-255, no forzado).
 *   - Todas las operaciones son PURAS: devuelven una imagen nueva, nunca mutan la entrada.
 *   - Los bordes se resuelven con un modo explícito ('reflect' por defecto: sin artefactos).
 */

import { z } from 'zod';
import type { FlowField, MotionVector } from './motion';
import { mse as bufferMse, psnr as psnrFromMse } from './videoqa';

// ---------------------------------------------------------------------------
// Tipos base
// ---------------------------------------------------------------------------

/** Imagen en escala de grises (luminancia). `data.length === width * height`. */
export interface GrayImage {
  readonly width: number;
  readonly height: number;
  readonly data: Float64Array;
}

/** Kernel de convolución 2D arbitrario (width/height impares recomendados). */
export interface Kernel2D {
  readonly width: number;
  readonly height: number;
  readonly values: readonly number[];
}

/** Resolución de coordenadas fuera de la imagen. */
export type BorderMode = 'reflect' | 'clamp' | 'zero' | 'wrap';

export const borderModeSchema = z.enum(['reflect', 'clamp', 'zero', 'wrap']);

export const imageSchema = z.object({
  width: z.number().int().positive(),
  height: z.number().int().positive(),
  data: z.array(z.number()),
});

export const kernelSchema = z.object({
  width: z.number().int().positive(),
  height: z.number().int().positive(),
  values: z.array(z.number()),
});

// ---------------------------------------------------------------------------
// Construcción / conversión
// ---------------------------------------------------------------------------

/** Crea una imagen de w×h rellena con `fill`. */
export function createImage(width: number, height: number, fill = 0): GrayImage {
  assertSize(width, height);
  const data = new Float64Array(width * height);
  if (fill !== 0) data.fill(fill);
  return { width, height, data };
}

/** Construye una imagen a partir de un buffer plano (copia defensiva). */
export function imageFrom(
  width: number,
  height: number,
  data: readonly number[] | Float64Array,
): GrayImage {
  assertSize(width, height);
  if (data.length !== width * height) {
    throw new Error(`imaging: buffer de ${data.length} valores no cuadra con ${width}x${height}`);
  }
  return { width, height, data: Float64Array.from(data) };
}

/** Copia independiente de una imagen. */
export function cloneImage(img: GrayImage): GrayImage {
  return { width: img.width, height: img.height, data: Float64Array.from(img.data) };
}

/**
 * Luminancia BT.709 a partir de un buffer RGBA entrelazado (4 bytes por píxel).
 * Y = 0.2126·R + 0.7152·G + 0.0722·B (el canal alfa se ignora).
 */
export function fromRgba(
  width: number,
  height: number,
  rgba: readonly number[] | Uint8ClampedArray | Uint8Array,
): GrayImage {
  assertSize(width, height);
  const n = width * height;
  if (rgba.length < n * 4) {
    throw new Error(`imaging: RGBA de ${rgba.length} bytes insuficiente para ${width}x${height}`);
  }
  const out = new Float64Array(n);
  for (let i = 0; i < n; i++) {
    const o = i * 4;
    out[i] = 0.2126 * rgba[o] + 0.7152 * rgba[o + 1] + 0.0722 * rgba[o + 2];
  }
  return { width, height, data: out };
}

/** Serializa a bytes 0-255 (redondeo + clamp), listo para PNG/canvas. */
export function toGrayBytes(img: GrayImage): Uint8ClampedArray {
  const out = new Uint8ClampedArray(img.data.length);
  for (let i = 0; i < img.data.length; i++) out[i] = Math.round(img.data[i]);
  return out;
}

/** Vista plana como array normal (para JSON / tools). */
export function toArray(img: GrayImage): number[] {
  return Array.from(img.data);
}

function assertSize(width: number, height: number): void {
  if (!Number.isInteger(width) || !Number.isInteger(height) || width <= 0 || height <= 0) {
    throw new Error(`imaging: dimensiones inválidas ${width}x${height}`);
  }
}

function assertSameSize(a: GrayImage, b: GrayImage): void {
  if (a.width !== b.width || a.height !== b.height) {
    throw new Error(
      `imaging: imágenes de distinto tamaño (${a.width}x${a.height} vs ${b.width}x${b.height})`,
    );
  }
}

// ---------------------------------------------------------------------------
// Muestreo
// ---------------------------------------------------------------------------

/** Resuelve un índice fuera de rango según el modo de borde. Devuelve -1 si es 'zero'. */
function wrapIndex(v: number, max: number, mode: BorderMode): number {
  if (v >= 0 && v < max) return v;
  switch (mode) {
    case 'clamp':
      return v < 0 ? 0 : max - 1;
    case 'zero':
      return -1;
    case 'wrap': {
      const m = ((v % max) + max) % max;
      return m;
    }
    case 'reflect':
    default: {
      if (max === 1) return 0;
      const period = 2 * max - 2;
      let m = ((v % period) + period) % period;
      if (m >= max) m = period - m;
      return m;
    }
  }
}

/** Lee un píxel resolviendo bordes (fuera de rango en modo 'zero' → 0). */
export function sampleAt(img: GrayImage, x: number, y: number, border: BorderMode = 'reflect'): number {
  const sx = wrapIndex(x, img.width, border);
  if (sx < 0) return 0;
  const sy = wrapIndex(y, img.height, border);
  if (sy < 0) return 0;
  return img.data[sy * img.width + sx];
}

/** Muestreo bilineal en coordenadas continuas (subpíxel). */
export function bilinearSample(
  img: GrayImage,
  x: number,
  y: number,
  border: BorderMode = 'clamp',
): number {
  const x0 = Math.floor(x);
  const y0 = Math.floor(y);
  const fx = x - x0;
  const fy = y - y0;
  const p00 = sampleAt(img, x0, y0, border);
  const p10 = sampleAt(img, x0 + 1, y0, border);
  const p01 = sampleAt(img, x0, y0 + 1, border);
  const p11 = sampleAt(img, x0 + 1, y0 + 1, border);
  const top = p00 + (p10 - p00) * fx;
  const bottom = p01 + (p11 - p01) * fx;
  return top + (bottom - top) * fy;
}

// ---------------------------------------------------------------------------
// Convolución
// ---------------------------------------------------------------------------

export interface ConvolveOptions {
  border?: BorderMode;
  /** Divide el resultado por la suma del kernel (si no es 0). Default: false. */
  normalize?: boolean;
  /** Sumando constante tras la convolución (offset de visualización). Default: 0. */
  bias?: number;
}

/**
 * Convolución 2D general: el kernel se VOLTEA en ambos ejes (convolución matemática).
 * Para aplicar el kernel tal cual (convención de visión por computador) usar `correlate2d`.
 */
export function convolve2d(img: GrayImage, kernel: Kernel2D, opts: ConvolveOptions = {}): GrayImage {
  const border = opts.border ?? 'reflect';
  const bias = opts.bias ?? 0;
  if (kernel.values.length !== kernel.width * kernel.height) {
    throw new Error(
      `imaging: kernel de ${kernel.values.length} valores no cuadra con ${kernel.width}x${kernel.height}`,
    );
  }
  let scale = 1;
  if (opts.normalize) {
    const sum = kernel.values.reduce((a, b) => a + b, 0);
    scale = sum === 0 ? 1 : 1 / sum;
  }
  const kx = (kernel.width - 1) / 2;
  const ky = (kernel.height - 1) / 2;
  const out = new Float64Array(img.width * img.height);
  for (let y = 0; y < img.height; y++) {
    for (let x = 0; x < img.width; x++) {
      let acc = 0;
      for (let j = 0; j < kernel.height; j++) {
        for (let i = 0; i < kernel.width; i++) {
          // Convolución: el kernel se voltea en ambos ejes.
          const w = kernel.values[(kernel.height - 1 - j) * kernel.width + (kernel.width - 1 - i)];
          if (w === 0) continue;
          acc += w * sampleAt(img, x + i - kx, y + j - ky, border);
        }
      }
      out[y * img.width + x] = acc * scale + bias;
    }
  }
  return { width: img.width, height: img.height, data: out };
}

/** Voltea un kernel en ambos ejes (convolución ↔ correlación). */
export function flipKernel(kernel: Kernel2D): Kernel2D {
  return { width: kernel.width, height: kernel.height, values: [...kernel.values].reverse() };
}

/**
 * Correlación 2D: aplica el kernel TAL CUAL, sin voltearlo.
 * Es la convención de los operadores de derivada (Sobel/Prewitt) y la de `filter2D`
 * en las librerías de visión: con SOBEL_X devuelve +∂I/∂x, no −∂I/∂x.
 */
export function correlate2d(img: GrayImage, kernel: Kernel2D, opts: ConvolveOptions = {}): GrayImage {
  return convolve2d(img, flipKernel(kernel), opts);
}

/**
 * Convolución separable (kernel 1D horizontal + 1D vertical).
 * O(w·h·(kx+ky)) en vez de O(w·h·kx·ky): es la vía rápida para gaussianas y cajas.
 */
export function convolveSeparable(
  img: GrayImage,
  kernelX: readonly number[],
  kernelY: readonly number[],
  opts: ConvolveOptions = {},
): GrayImage {
  const border = opts.border ?? 'reflect';
  const rx = (kernelX.length - 1) / 2;
  const ry = (kernelY.length - 1) / 2;
  const tmp = new Float64Array(img.width * img.height);
  for (let y = 0; y < img.height; y++) {
    for (let x = 0; x < img.width; x++) {
      let acc = 0;
      for (let i = 0; i < kernelX.length; i++) {
        acc += kernelX[kernelX.length - 1 - i] * sampleAt(img, x + i - rx, y, border);
      }
      tmp[y * img.width + x] = acc;
    }
  }
  const mid: GrayImage = { width: img.width, height: img.height, data: tmp };
  const out = new Float64Array(img.width * img.height);
  for (let y = 0; y < img.height; y++) {
    for (let x = 0; x < img.width; x++) {
      let acc = 0;
      for (let j = 0; j < kernelY.length; j++) {
        acc += kernelY[kernelY.length - 1 - j] * sampleAt(mid, x, y + j - ry, border);
      }
      out[y * img.width + x] = acc + (opts.bias ?? 0);
    }
  }
  return { width: img.width, height: img.height, data: out };
}

// ---------------------------------------------------------------------------
// Kernels
// ---------------------------------------------------------------------------

/** Kernel gaussiano 1D normalizado (suma 1). radius por defecto: ceil(3σ). */
export function gaussianKernel1d(sigma: number, radius?: number): number[] {
  if (sigma <= 0) throw new Error('imaging: sigma debe ser > 0');
  const r = radius ?? Math.max(1, Math.ceil(3 * sigma));
  const out: number[] = [];
  let sum = 0;
  for (let i = -r; i <= r; i++) {
    const v = Math.exp(-(i * i) / (2 * sigma * sigma));
    out.push(v);
    sum += v;
  }
  return out.map((v) => v / sum);
}

/** Kernel de caja 1D normalizado (media móvil de 2r+1 muestras). */
export function boxKernel1d(radius: number): number[] {
  if (!Number.isInteger(radius) || radius < 1) throw new Error('imaging: radius debe ser entero >= 1');
  const n = 2 * radius + 1;
  return new Array(n).fill(1 / n);
}

/** Construye un Kernel2D validando dimensiones. */
export function kernel2d(width: number, height: number, values: readonly number[]): Kernel2D {
  if (values.length !== width * height) {
    throw new Error(`imaging: kernel de ${values.length} valores no cuadra con ${width}x${height}`);
  }
  return { width, height, values: [...values] };
}

export const SOBEL_X: Kernel2D = kernel2d(3, 3, [-1, 0, 1, -2, 0, 2, -1, 0, 1]);
export const SOBEL_Y: Kernel2D = kernel2d(3, 3, [-1, -2, -1, 0, 0, 0, 1, 2, 1]);
export const PREWITT_X: Kernel2D = kernel2d(3, 3, [-1, 0, 1, -1, 0, 1, -1, 0, 1]);
export const PREWITT_Y: Kernel2D = kernel2d(3, 3, [-1, -1, -1, 0, 0, 0, 1, 1, 1]);
export const LAPLACIAN4: Kernel2D = kernel2d(3, 3, [0, 1, 0, 1, -4, 1, 0, 1, 0]);
export const LAPLACIAN8: Kernel2D = kernel2d(3, 3, [1, 1, 1, 1, -8, 1, 1, 1, 1]);
export const SHARPEN: Kernel2D = kernel2d(3, 3, [0, -1, 0, -1, 5, -1, 0, -1, 0]);
export const EMBOSS: Kernel2D = kernel2d(3, 3, [-2, -1, 0, -1, 1, 1, 0, 1, 2]);

/** Factor de escala del operador Sobel: [1,2,1]⊗[-1,0,1] = 4 × 2 → derivada real = /8. */
export const SOBEL_SCALE = 8;

// ---------------------------------------------------------------------------
// Filtros
// ---------------------------------------------------------------------------

/** Desenfoque gaussiano separable. */
export function gaussianBlur(img: GrayImage, sigma: number, border: BorderMode = 'reflect'): GrayImage {
  const k = gaussianKernel1d(sigma);
  return convolveSeparable(img, k, k, { border });
}

/** Desenfoque de caja (media móvil separable). */
export function boxBlur(img: GrayImage, radius: number, border: BorderMode = 'reflect'): GrayImage {
  const k = boxKernel1d(radius);
  return convolveSeparable(img, k, k, { border });
}

export interface Gradients {
  /** Derivada parcial ∂I/∂x (escala real si `normalize`). */
  gx: GrayImage;
  /** Derivada parcial ∂I/∂y. */
  gy: GrayImage;
  /** Magnitud √(gx²+gy²). */
  magnitude: GrayImage;
  /** Ángulo atan2(gy, gx) en radianes (-π..π). */
  direction: GrayImage;
}

/**
 * Gradientes Sobel. Con `normalize` (default true) divide entre SOBEL_SCALE para que
 * gx/gy aproximen la derivada real por píxel — imprescindible para Lucas-Kanade.
 */
export function sobelGradients(
  img: GrayImage,
  opts: { border?: BorderMode; normalize?: boolean } = {},
): Gradients {
  const border = opts.border ?? 'reflect';
  const scale = (opts.normalize ?? true) ? 1 / SOBEL_SCALE : 1;
  const gxRaw = correlate2d(img, SOBEL_X, { border });
  const gyRaw = correlate2d(img, SOBEL_Y, { border });
  const n = img.data.length;
  const gx = new Float64Array(n);
  const gy = new Float64Array(n);
  const mag = new Float64Array(n);
  const dir = new Float64Array(n);
  for (let i = 0; i < n; i++) {
    gx[i] = gxRaw.data[i] * scale;
    gy[i] = gyRaw.data[i] * scale;
    mag[i] = Math.sqrt(gx[i] * gx[i] + gy[i] * gy[i]);
    dir[i] = Math.atan2(gy[i], gx[i]);
  }
  const shape = { width: img.width, height: img.height };
  return {
    gx: { ...shape, data: gx },
    gy: { ...shape, data: gy },
    magnitude: { ...shape, data: mag },
    direction: { ...shape, data: dir },
  };
}

/** Laplaciano (4 u 8 vecinos): detector de segundo orden / realce de detalle. */
export function laplacianFilter(
  img: GrayImage,
  opts: { neighbors?: 4 | 8; border?: BorderMode } = {},
): GrayImage {
  const kernel = (opts.neighbors ?? 4) === 8 ? LAPLACIAN8 : LAPLACIAN4;
  return correlate2d(img, kernel, { border: opts.border ?? 'reflect' });
}

/** Máscara de enfoque: I + amount·(I − blur(I)), aplicando `threshold` al detalle. */
export function unsharpMask(
  img: GrayImage,
  opts: { sigma?: number; amount?: number; threshold?: number; border?: BorderMode } = {},
): GrayImage {
  const sigma = opts.sigma ?? 1;
  const amount = opts.amount ?? 1;
  const threshold = opts.threshold ?? 0;
  const blurred = gaussianBlur(img, sigma, opts.border ?? 'reflect');
  const out = new Float64Array(img.data.length);
  for (let i = 0; i < img.data.length; i++) {
    const detail = img.data[i] - blurred.data[i];
    out[i] = Math.abs(detail) >= threshold ? img.data[i] + amount * detail : img.data[i];
  }
  return { width: img.width, height: img.height, data: out };
}

/** Filtro de mediana (no lineal): elimina sal y pimienta preservando bordes. */
export function medianFilter(img: GrayImage, radius = 1, border: BorderMode = 'reflect'): GrayImage {
  if (!Number.isInteger(radius) || radius < 1) throw new Error('imaging: radius debe ser entero >= 1');
  const window: number[] = [];
  const out = new Float64Array(img.data.length);
  for (let y = 0; y < img.height; y++) {
    for (let x = 0; x < img.width; x++) {
      window.length = 0;
      for (let j = -radius; j <= radius; j++) {
        for (let i = -radius; i <= radius; i++) {
          window.push(sampleAt(img, x + i, y + j, border));
        }
      }
      window.sort((a, b) => a - b);
      out[y * img.width + x] = window[(window.length - 1) >> 1];
    }
  }
  return { width: img.width, height: img.height, data: out };
}

// ---------------------------------------------------------------------------
// Morfología (sobre grises: mínimo / máximo local)
// ---------------------------------------------------------------------------

function morph(img: GrayImage, radius: number, pick: 'min' | 'max', border: BorderMode): GrayImage {
  if (!Number.isInteger(radius) || radius < 1) throw new Error('imaging: radius debe ser entero >= 1');
  const out = new Float64Array(img.data.length);
  for (let y = 0; y < img.height; y++) {
    for (let x = 0; x < img.width; x++) {
      let best = pick === 'min' ? Infinity : -Infinity;
      for (let j = -radius; j <= radius; j++) {
        for (let i = -radius; i <= radius; i++) {
          const v = sampleAt(img, x + i, y + j, border);
          best = pick === 'min' ? Math.min(best, v) : Math.max(best, v);
        }
      }
      out[y * img.width + x] = best;
    }
  }
  return { width: img.width, height: img.height, data: out };
}

/** Erosión (mínimo local): adelgaza regiones claras. */
export function erodeImage(img: GrayImage, radius = 1, border: BorderMode = 'reflect'): GrayImage {
  return morph(img, radius, 'min', border);
}

/** Dilatación (máximo local): engorda regiones claras. */
export function dilateImage(img: GrayImage, radius = 1, border: BorderMode = 'reflect'): GrayImage {
  return morph(img, radius, 'max', border);
}

/** Apertura = erosión → dilatación: borra motas claras. */
export function openImage(img: GrayImage, radius = 1, border: BorderMode = 'reflect'): GrayImage {
  return dilateImage(erodeImage(img, radius, border), radius, border);
}

/** Cierre = dilatación → erosión: rellena huecos oscuros. */
export function closeImage(img: GrayImage, radius = 1, border: BorderMode = 'reflect'): GrayImage {
  return erodeImage(dilateImage(img, radius, border), radius, border);
}

/** Gradiente morfológico = dilatación − erosión: contorno de las regiones. */
export function morphGradient(img: GrayImage, radius = 1, border: BorderMode = 'reflect'): GrayImage {
  const d = dilateImage(img, radius, border);
  const e = erodeImage(img, radius, border);
  const out = new Float64Array(img.data.length);
  for (let i = 0; i < out.length; i++) out[i] = d.data[i] - e.data[i];
  return { width: img.width, height: img.height, data: out };
}

// ---------------------------------------------------------------------------
// Estadística, histograma y tono
// ---------------------------------------------------------------------------

export interface ImageStats {
  min: number;
  max: number;
  mean: number;
  variance: number;
  stdDev: number;
  /** Entropía de Shannon del histograma de 256 bins (bits). */
  entropy: number;
}

/** Estadísticas globales de una imagen (una sola pasada + histograma). */
export function imageStats(img: GrayImage): ImageStats {
  const n = img.data.length;
  if (n === 0) return { min: 0, max: 0, mean: 0, variance: 0, stdDev: 0, entropy: 0 };
  let min = Infinity;
  let max = -Infinity;
  let sum = 0;
  for (let i = 0; i < n; i++) {
    const v = img.data[i];
    if (v < min) min = v;
    if (v > max) max = v;
    sum += v;
  }
  const mean = sum / n;
  let acc = 0;
  for (let i = 0; i < n; i++) {
    const d = img.data[i] - mean;
    acc += d * d;
  }
  const variance = acc / n;
  const hist = imageHistogram(img, 256, { min, max });
  let entropy = 0;
  for (const c of hist.counts) {
    if (c === 0) continue;
    const p = c / n;
    entropy -= p * Math.log2(p);
  }
  return { min, max, mean, variance, stdDev: Math.sqrt(variance), entropy };
}

export interface Histogram {
  bins: number;
  min: number;
  max: number;
  counts: number[];
}

/** Histograma de `bins` niveles entre min y max (por defecto los de la imagen). */
export function imageHistogram(
  img: GrayImage,
  bins = 256,
  range?: { min?: number; max?: number },
): Histogram {
  if (!Number.isInteger(bins) || bins < 1) throw new Error('imaging: bins debe ser entero >= 1');
  let min = range?.min;
  let max = range?.max;
  if (min === undefined || max === undefined) {
    let lo = Infinity;
    let hi = -Infinity;
    for (const v of img.data) {
      if (v < lo) lo = v;
      if (v > hi) hi = v;
    }
    min = min ?? (Number.isFinite(lo) ? lo : 0);
    max = max ?? (Number.isFinite(hi) ? hi : 0);
  }
  const counts = new Array(bins).fill(0);
  const span = max - min;
  for (const v of img.data) {
    const t = span === 0 ? 0 : (v - min) / span;
    let idx = Math.floor(t * bins);
    if (idx < 0) idx = 0;
    if (idx >= bins) idx = bins - 1;
    counts[idx] += 1;
  }
  return { bins, min, max, counts };
}

/**
 * Umbral de Otsu: maximiza la varianza entre clases del histograma.
 * Devuelve el valor de corte en la escala original de la imagen.
 */
export function otsuThreshold(img: GrayImage, bins = 256): number {
  const hist = imageHistogram(img, bins);
  const total = img.data.length;
  if (total === 0) return 0;
  let sumAll = 0;
  for (let i = 0; i < bins; i++) sumAll += i * hist.counts[i];
  let sumB = 0;
  let wB = 0;
  let best = 0;
  let bestIdx = 0;
  for (let i = 0; i < bins; i++) {
    wB += hist.counts[i];
    if (wB === 0) continue;
    const wF = total - wB;
    if (wF === 0) break;
    sumB += i * hist.counts[i];
    const mB = sumB / wB;
    const mF = (sumAll - sumB) / wF;
    const between = wB * wF * (mB - mF) * (mB - mF);
    if (between > best) {
      best = between;
      bestIdx = i;
    }
  }
  const span = hist.max - hist.min;
  return hist.min + ((bestIdx + 1) / bins) * span;
}

/** Binariza: valores > t → `high`, resto → `low`. */
export function thresholdImage(
  img: GrayImage,
  t: number,
  opts: { low?: number; high?: number; invert?: boolean } = {},
): GrayImage {
  const low = opts.low ?? 0;
  const high = opts.high ?? 255;
  const invert = opts.invert ?? false;
  const out = new Float64Array(img.data.length);
  for (let i = 0; i < out.length; i++) {
    const on = img.data[i] > t;
    out[i] = (invert ? !on : on) ? high : low;
  }
  return { width: img.width, height: img.height, data: out };
}

/** Reescala linealmente al rango [min, max] (por defecto 0-255). */
export function normalizeImage(img: GrayImage, min = 0, max = 255): GrayImage {
  let lo = Infinity;
  let hi = -Infinity;
  for (const v of img.data) {
    if (v < lo) lo = v;
    if (v > hi) hi = v;
  }
  const span = hi - lo;
  const outSpan = max - min;
  const out = new Float64Array(img.data.length);
  for (let i = 0; i < out.length; i++) {
    out[i] = span === 0 ? min : min + ((img.data[i] - lo) / span) * outSpan;
  }
  return { width: img.width, height: img.height, data: out };
}

/** Corrección gamma sobre el rango 0-`peak` (default 255). */
export function gammaCorrect(img: GrayImage, gamma: number, peak = 255): GrayImage {
  if (gamma <= 0) throw new Error('imaging: gamma debe ser > 0');
  const out = new Float64Array(img.data.length);
  for (let i = 0; i < out.length; i++) {
    const t = Math.min(1, Math.max(0, img.data[i] / peak));
    out[i] = Math.pow(t, gamma) * peak;
  }
  return { width: img.width, height: img.height, data: out };
}

/**
 * Ecualización de histograma con límite de contraste opcional (CLAHE global):
 * recorta los bins por encima de `clipLimit`·media y redistribuye el exceso.
 */
export function equalizeImage(
  img: GrayImage,
  opts: { bins?: number; clipLimit?: number } = {},
): GrayImage {
  const bins = opts.bins ?? 256;
  const hist = imageHistogram(img, bins);
  const counts = [...hist.counts];
  const total = img.data.length;
  if (total === 0) return cloneImage(img);
  if (opts.clipLimit && opts.clipLimit > 0) {
    const limit = Math.max(1, (opts.clipLimit * total) / bins);
    let excess = 0;
    for (let i = 0; i < bins; i++) {
      if (counts[i] > limit) {
        excess += counts[i] - limit;
        counts[i] = limit;
      }
    }
    const share = excess / bins;
    for (let i = 0; i < bins; i++) counts[i] += share;
  }
  const cdf: number[] = new Array(bins);
  let acc = 0;
  for (let i = 0; i < bins; i++) {
    acc += counts[i];
    cdf[i] = acc;
  }
  const cdfMin = cdf.find((v) => v > 0) ?? 0;
  const denom = acc - cdfMin || 1;
  const span = hist.max - hist.min;
  const out = new Float64Array(img.data.length);
  for (let i = 0; i < out.length; i++) {
    const t = span === 0 ? 0 : (img.data[i] - hist.min) / span;
    let idx = Math.floor(t * bins);
    if (idx < 0) idx = 0;
    if (idx >= bins) idx = bins - 1;
    out[i] = ((cdf[idx] - cdfMin) / denom) * 255;
  }
  return { width: img.width, height: img.height, data: out };
}

// ---------------------------------------------------------------------------
// Geometría y pirámides
// ---------------------------------------------------------------------------

/** Recorte (la región debe caber en la imagen). */
export function cropImage(img: GrayImage, x: number, y: number, width: number, height: number): GrayImage {
  assertSize(width, height);
  if (x < 0 || y < 0 || x + width > img.width || y + height > img.height) {
    throw new Error(`imaging: recorte ${x},${y} ${width}x${height} fuera de ${img.width}x${img.height}`);
  }
  const out = new Float64Array(width * height);
  for (let j = 0; j < height; j++) {
    for (let i = 0; i < width; i++) {
      out[j * width + i] = img.data[(y + j) * img.width + (x + i)];
    }
  }
  return { width, height, data: out };
}

/** Redimensiona con interpolación bilineal (alineado a centros de píxel). */
export function resizeBilinear(img: GrayImage, width: number, height: number): GrayImage {
  assertSize(width, height);
  const out = new Float64Array(width * height);
  const sx = img.width / width;
  const sy = img.height / height;
  for (let y = 0; y < height; y++) {
    const srcY = (y + 0.5) * sy - 0.5;
    for (let x = 0; x < width; x++) {
      const srcX = (x + 0.5) * sx - 0.5;
      out[y * width + x] = bilinearSample(img, srcX, srcY, 'clamp');
    }
  }
  return { width, height, data: out };
}

/** Reduce a la mitad con pre-filtrado gaussiano (paso de pirámide). */
export function downsample2(img: GrayImage, sigma = 1): GrayImage {
  const blurred = gaussianBlur(img, sigma);
  const width = Math.max(1, Math.floor(img.width / 2));
  const height = Math.max(1, Math.floor(img.height / 2));
  const out = new Float64Array(width * height);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      out[y * width + x] = blurred.data[Math.min(img.height - 1, y * 2) * img.width + Math.min(img.width - 1, x * 2)];
    }
  }
  return { width, height, data: out };
}

/** Pirámide gaussiana: [nivel 0 = original, 1 = mitad, ...]. */
export function gaussianPyramid(img: GrayImage, levels: number, sigma = 1): GrayImage[] {
  if (!Number.isInteger(levels) || levels < 1) throw new Error('imaging: levels debe ser entero >= 1');
  const out: GrayImage[] = [cloneImage(img)];
  for (let i = 1; i < levels; i++) {
    const prev = out[i - 1];
    if (prev.width < 4 || prev.height < 4) break;
    out.push(downsample2(prev, sigma));
  }
  return out;
}

// ---------------------------------------------------------------------------
// Bordes (Canny)
// ---------------------------------------------------------------------------

/** Supresión de no-máximos sobre magnitud+dirección (adelgaza bordes a 1 px). */
export function nonMaxSuppression(magnitude: GrayImage, direction: GrayImage): GrayImage {
  assertSameSize(magnitude, direction);
  const { width, height } = magnitude;
  const out = new Float64Array(width * height);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = y * width + x;
      const angle = ((direction.data[idx] * 180) / Math.PI + 180) % 180;
      let dx = 1;
      let dy = 0;
      if (angle >= 22.5 && angle < 67.5) {
        dx = 1;
        dy = 1;
      } else if (angle >= 67.5 && angle < 112.5) {
        dx = 0;
        dy = 1;
      } else if (angle >= 112.5 && angle < 157.5) {
        dx = -1;
        dy = 1;
      }
      const m = magnitude.data[idx];
      const a = sampleAt(magnitude, x + dx, y + dy, 'zero');
      const b = sampleAt(magnitude, x - dx, y - dy, 'zero');
      out[idx] = m >= a && m >= b ? m : 0;
    }
  }
  return { width, height, data: out };
}

/** Histéresis: fuerte (>high) se conserva; débil (>low) solo si toca un fuerte (8-conexo). */
export function hysteresisThreshold(img: GrayImage, low: number, high: number): GrayImage {
  const { width, height } = img;
  const out = new Float64Array(width * height);
  const stack: number[] = [];
  for (let i = 0; i < img.data.length; i++) {
    if (img.data[i] >= high) {
      out[i] = 255;
      stack.push(i);
    }
  }
  while (stack.length > 0) {
    const idx = stack.pop() as number;
    const x = idx % width;
    const y = (idx - x) / width;
    for (let j = -1; j <= 1; j++) {
      for (let i = -1; i <= 1; i++) {
        if (i === 0 && j === 0) continue;
        const nx = x + i;
        const ny = y + j;
        if (nx < 0 || ny < 0 || nx >= width || ny >= height) continue;
        const nIdx = ny * width + nx;
        if (out[nIdx] === 0 && img.data[nIdx] >= low) {
          out[nIdx] = 255;
          stack.push(nIdx);
        }
      }
    }
  }
  return { width, height, data: out };
}

export interface CannyResult {
  /** Máscara binaria 0/255 de bordes. */
  edges: GrayImage;
  /** Fracción de píxeles marcados como borde (0-1). */
  density: number;
  thresholds: { low: number; high: number };
}

/**
 * Detector de bordes Canny: blur → Sobel → supresión de no-máximos → histéresis.
 * Si no se dan umbrales se derivan de Otsu sobre la magnitud (high = otsu, low = 0.4·high).
 */
export function cannyEdges(
  img: GrayImage,
  opts: { sigma?: number; low?: number; high?: number } = {},
): CannyResult {
  const blurred = gaussianBlur(img, opts.sigma ?? 1.4);
  const g = sobelGradients(blurred);
  const thin = nonMaxSuppression(g.magnitude, g.direction);
  let maxMag = 0;
  for (const v of thin.data) if (v > maxMag) maxMag = v;
  if (maxMag <= 0) {
    // Imagen sin gradiente: sin umbral positivo no hay bordes (evita marcar todo).
    return { edges: createImage(img.width, img.height, 0), density: 0, thresholds: { low: 0, high: 0 } };
  }
  const high = Math.max(opts.high ?? otsuThreshold(thin), 1e-9);
  const low = opts.low ?? high * 0.4;
  const edges = hysteresisThreshold(thin, low, high);
  let on = 0;
  for (const v of edges.data) if (v > 0) on += 1;
  return { edges, density: edges.data.length === 0 ? 0 : on / edges.data.length, thresholds: { low, high } };
}

// ---------------------------------------------------------------------------
// Puente con `videoqa`: mapas de error 2D y SSIM por ventana
// ---------------------------------------------------------------------------

/** Mapa de error absoluto |a−b| píxel a píxel (el "error map" de la fuente §A22). */
export function absDiffMap(a: GrayImage, b: GrayImage): GrayImage {
  assertSameSize(a, b);
  const out = new Float64Array(a.data.length);
  for (let i = 0; i < out.length; i++) out[i] = Math.abs(a.data[i] - b.data[i]);
  return { width: a.width, height: a.height, data: out };
}

/** Mapa de error cuadrático (a−b)². */
export function squaredDiffMap(a: GrayImage, b: GrayImage): GrayImage {
  assertSameSize(a, b);
  const out = new Float64Array(a.data.length);
  for (let i = 0; i < out.length; i++) {
    const d = a.data[i] - b.data[i];
    out[i] = d * d;
  }
  return { width: a.width, height: a.height, data: out };
}

export interface SsimMapResult {
  /** SSIM local por píxel (-1..1). */
  map: GrayImage;
  /** MSSIM: media del mapa — la métrica que se compara contra el umbral 0.95. */
  mean: number;
  /** Peor ventana del mapa (dónde falla el render). */
  min: number;
  /** Índice del peor píxel, como coordenadas. */
  worstAt: { x: number; y: number };
}

/**
 * SSIM local con ventana gaussiana (Wang et al. 2004) — la versión correcta frente al
 * SSIM global de `videoqa.ssim`, que promedia toda la imagen y oculta defectos locales.
 */
export function ssimMap(
  a: GrayImage,
  b: GrayImage,
  opts: { sigma?: number; dynamicRange?: number } = {},
): SsimMapResult {
  assertSameSize(a, b);
  const sigma = opts.sigma ?? 1.5;
  const L = opts.dynamicRange ?? 255;
  const c1 = (0.01 * L) ** 2;
  const c2 = (0.03 * L) ** 2;
  const k = gaussianKernel1d(sigma);
  const blur = (img: GrayImage) => convolveSeparable(img, k, k, { border: 'reflect' });
  const mulImages = (x: GrayImage, y: GrayImage): GrayImage => {
    const out = new Float64Array(x.data.length);
    for (let i = 0; i < out.length; i++) out[i] = x.data[i] * y.data[i];
    return { width: x.width, height: x.height, data: out };
  };
  const muA = blur(a);
  const muB = blur(b);
  const aa = blur(mulImages(a, a));
  const bb = blur(mulImages(b, b));
  const ab = blur(mulImages(a, b));
  const n = a.data.length;
  const map = new Float64Array(n);
  let sum = 0;
  let min = Infinity;
  let worst = 0;
  for (let i = 0; i < n; i++) {
    const ma = muA.data[i];
    const mb = muB.data[i];
    const va = aa.data[i] - ma * ma;
    const vb = bb.data[i] - mb * mb;
    const cov = ab.data[i] - ma * mb;
    const num = (2 * ma * mb + c1) * (2 * cov + c2);
    const den = (ma * ma + mb * mb + c1) * (va + vb + c2);
    const s = den === 0 ? 1 : num / den;
    map[i] = s;
    sum += s;
    if (s < min) {
      min = s;
      worst = i;
    }
  }
  return {
    map: { width: a.width, height: a.height, data: map },
    mean: n === 0 ? 1 : sum / n,
    min: n === 0 ? 1 : min,
    worstAt: { x: worst % a.width, y: Math.floor(worst / a.width) },
  };
}

export interface CompareReport {
  mse: number;
  psnr: number;
  mssim: number;
  worstSsim: number;
  worstAt: { x: number; y: number };
  maxAbsError: number;
  meanAbsError: number;
  /** Cuadrante con más error acumulado: útil para diagnosticar de dónde viene el fallo. */
  worstQuadrant: 'tl' | 'tr' | 'bl' | 'br';
}

/**
 * Informe 2D completo referencia vs render: reutiliza mse/psnr de `videoqa` (una sola
 * definición de las métricas de píxel en el proyecto) y añade lo que sólo existe en 2D.
 */
export function compareImages(reference: GrayImage, distorted: GrayImage): CompareReport {
  assertSameSize(reference, distorted);
  const mseValue = bufferMse(Array.from(reference.data), Array.from(distorted.data));
  const s = ssimMap(reference, distorted);
  const diff = absDiffMap(reference, distorted);
  let maxAbs = 0;
  let sumAbs = 0;
  for (const v of diff.data) {
    if (v > maxAbs) maxAbs = v;
    sumAbs += v;
  }
  const halfW = reference.width / 2;
  const halfH = reference.height / 2;
  const quad = { tl: 0, tr: 0, bl: 0, br: 0 };
  for (let y = 0; y < reference.height; y++) {
    for (let x = 0; x < reference.width; x++) {
      const v = diff.data[y * reference.width + x];
      if (y < halfH) quad[x < halfW ? 'tl' : 'tr'] += v;
      else quad[x < halfW ? 'bl' : 'br'] += v;
    }
  }
  const worstQuadrant = (Object.keys(quad) as Array<keyof typeof quad>).reduce((best, key) =>
    quad[key] > quad[best] ? key : best,
  );
  return {
    mse: mseValue,
    psnr: psnrFromMse(mseValue),
    mssim: s.mean,
    worstSsim: s.min,
    worstAt: s.worstAt,
    maxAbsError: maxAbs,
    meanAbsError: diff.data.length === 0 ? 0 : sumAbs / diff.data.length,
    worstQuadrant,
  };
}

// ---------------------------------------------------------------------------
// Puente con `motion`: flujo óptico Lucas-Kanade real (TS puro)
// ---------------------------------------------------------------------------

export interface LucasKanadeOptions {
  /** Radio de la ventana de integración (default 3 → ventana 7x7). */
  windowRadius?: number;
  /** Paso de la rejilla de muestreo en píxeles (default 4). */
  step?: number;
  /** Umbral mínimo del determinante del tensor estructural (default 1e-6). */
  minDeterminant?: number;
  /** Suavizado previo (default 1; 0 = sin suavizar). */
  sigma?: number;
  border?: BorderMode;
}

/**
 * Lucas-Kanade denso por ventanas: resuelve el sistema 2x2 del tensor estructural
 *   [ΣIx²  ΣIxIy][u]   [−ΣIxIt]
 *   [ΣIxIy ΣIy² ][v] = [−ΣIyIt]
 * en cada nodo de la rejilla. Devuelve un `FlowField` compatible con la capability
 * `motion` (flowStats / decomposeMotion consumen exactamente esta forma).
 *
 * Limitación conocida del método (no un bug): sólo resuelve desplazamientos menores que
 * la ventana. Para movimientos grandes usar `pyramidalFlow`.
 */
export function lucasKanadeFlow(
  prev: GrayImage,
  next: GrayImage,
  opts: LucasKanadeOptions = {},
): FlowField {
  assertSameSize(prev, next);
  const radius = opts.windowRadius ?? 3;
  const step = opts.step ?? 4;
  const minDet = opts.minDeterminant ?? 1e-6;
  const sigma = opts.sigma ?? 1;
  const border = opts.border ?? 'reflect';
  const a = sigma > 0 ? gaussianBlur(prev, sigma, border) : prev;
  const b = sigma > 0 ? gaussianBlur(next, sigma, border) : next;
  const g = sobelGradients(a, { border });
  const it = new Float64Array(a.data.length);
  for (let i = 0; i < it.length; i++) it[i] = b.data[i] - a.data[i];
  const itImg: GrayImage = { width: a.width, height: a.height, data: it };

  const vectors: MotionVector[] = [];
  for (let y = radius; y < prev.height - radius; y += step) {
    for (let x = radius; x < prev.width - radius; x += step) {
      let sxx = 0;
      let syy = 0;
      let sxy = 0;
      let sxt = 0;
      let syt = 0;
      for (let j = -radius; j <= radius; j++) {
        for (let i = -radius; i <= radius; i++) {
          const ix = sampleAt(g.gx, x + i, y + j, border);
          const iy = sampleAt(g.gy, x + i, y + j, border);
          const t = sampleAt(itImg, x + i, y + j, border);
          sxx += ix * ix;
          syy += iy * iy;
          sxy += ix * iy;
          sxt += ix * t;
          syt += iy * t;
        }
      }
      const det = sxx * syy - sxy * sxy;
      let u = 0;
      let v = 0;
      if (Math.abs(det) > minDet) {
        u = (-syy * sxt + sxy * syt) / det;
        v = (sxy * sxt - sxx * syt) / det;
      }
      vectors.push([x, y, u, v] as MotionVector);
    }
  }
  return { width: prev.width, height: prev.height, vectors };
}

/** Deforma `img` según un desplazamiento constante (u, v) con muestreo bilineal. */
export function warpByOffset(img: GrayImage, u: number, v: number, border: BorderMode = 'clamp'): GrayImage {
  const out = new Float64Array(img.data.length);
  for (let y = 0; y < img.height; y++) {
    for (let x = 0; x < img.width; x++) {
      out[y * img.width + x] = bilinearSample(img, x + u, y + v, border);
    }
  }
  return { width: img.width, height: img.height, data: out };
}

export interface PyramidalFlowOptions extends LucasKanadeOptions {
  /** Número de niveles de la pirámide (default 3). */
  levels?: number;
}

export interface PyramidalFlowResult {
  /** Campo final en coordenadas del nivel 0. */
  field: FlowField;
  /** Desplazamiento acumulado tras cada nivel, en píxeles de ESE nivel (grueso → fino). */
  perLevel: Array<{ level: number; u: number; v: number }>;
  /** Estimación global (mediana de los vectores del campo final). */
  globalShift: { u: number; v: number };
}

/**
 * Lucas-Kanade piramidal (coarse-to-fine): estima el desplazamiento global en el nivel
 * más grueso, deforma la imagen siguiente con lo acumulado y refina nivel a nivel.
 * Resuelve movimientos mayores que la ventana, que el LK de un solo nivel no ve.
 */
export function pyramidalFlow(
  prev: GrayImage,
  next: GrayImage,
  opts: PyramidalFlowOptions = {},
): PyramidalFlowResult {
  assertSameSize(prev, next);
  const levels = opts.levels ?? 3;
  const pyrA = gaussianPyramid(prev, levels);
  const pyrB = gaussianPyramid(next, levels);
  const used = Math.min(pyrA.length, pyrB.length);
  let u = 0;
  let v = 0;
  const perLevel: Array<{ level: number; u: number; v: number }> = [];
  for (let l = used - 1; l >= 0; l--) {
    // Al bajar un nivel, el desplazamiento en píxeles se duplica.
    if (l < used - 1) {
      u *= 2;
      v *= 2;
    }
    const a = pyrA[l];
    // Deshace el desplazamiento ya estimado: warped(x) = next(x + u) ≈ prev(x).
    const warped = warpByOffset(pyrB[l], u, v, opts.border ?? 'clamp');
    const field = lucasKanadeFlow(a, warped, {
      windowRadius: opts.windowRadius,
      step: opts.step,
      minDeterminant: opts.minDeterminant,
      sigma: opts.sigma,
      border: opts.border,
    });
    const med = medianFlow(field);
    u += med.u;
    v += med.v;
    perLevel.push({ level: l, u, v });
  }
  const field = lucasKanadeFlow(prev, warpByOffset(next, u, v, opts.border ?? 'clamp'), opts);
  const refined: MotionVector[] = field.vectors.map(
    ([x, y, du, dv]) => [x, y, du + u, dv + v] as MotionVector,
  );
  return {
    field: { width: prev.width, height: prev.height, vectors: refined },
    perLevel,
    globalShift: { u, v },
  };
}

/** Mediana componente a componente de un campo de flujo (robusta frente a outliers). */
export function medianFlow(field: FlowField): { u: number; v: number } {
  if (field.vectors.length === 0) return { u: 0, v: 0 };
  const us = field.vectors.map((vec) => vec[2]).sort((a, b) => a - b);
  const vs = field.vectors.map((vec) => vec[3]).sort((a, b) => a - b);
  const mid = (arr: number[]): number =>
    arr.length % 2 === 1
      ? arr[(arr.length - 1) / 2]
      : (arr[arr.length / 2 - 1] + arr[arr.length / 2]) / 2;
  return { u: mid(us), v: mid(vs) };
}

// ---------------------------------------------------------------------------
// Superficie de la capability
// ---------------------------------------------------------------------------

export const imagingSurface = {
  filtros: ['gaussianBlur', 'boxBlur', 'medianFilter', 'unsharpMask', 'laplacianFilter'] as const,
  kernels: ['sobel', 'prewitt', 'laplacian4', 'laplacian8', 'sharpen', 'emboss', 'gauss', 'box'] as const,
  convolucion: ['convolve2d', 'correlate2d', 'convolveSeparable', 'flipKernel'] as const,
  morfologia: ['erode', 'dilate', 'open', 'close', 'gradient'] as const,
  tono: ['normalize', 'gamma', 'equalize', 'threshold', 'otsu', 'histogram', 'stats'] as const,
  geometria: ['crop', 'resize', 'downsample2', 'pyramid'] as const,
  bordes: ['sobelGradients', 'nonMaxSuppression', 'hysteresis', 'canny'] as const,
  comparacion: ['absDiffMap', 'squaredDiffMap', 'ssimMap', 'compareImages'] as const,
  flujo: ['lucasKanadeFlow', 'pyramidalFlow', 'warpByOffset', 'medianFlow'] as const,
  cierra: {
    A8: 'kernels de imagen en TS puro',
    'A9-A11': 'optical flow real (Lucas-Kanade mono y piramidal)',
    'A22-A24': 'mapas de error 2D + SSIM por ventana (MSSIM)',
  },
  schemas: { image: imageSchema, kernel: kernelSchema, border: borderModeSchema },
};
