// -----------------------------------------------------------------------------
// procvid.ts - capability `procvid`
// -----------------------------------------------------------------------------
// Librería procedural de VIDEO (pedido usuario 23/08/2026): convierte funciones
// matemáticas puras (x, y, t) → RGBA en videos REALES, sin IA generativa ni red.
//
// Cadena: catálogo de ANIMACIONES serializable (nombre + params JSON, invocable
// por agentes) → frames PNG vía `pngrender.encodePng` → argv ffmpeg
// DETERMINISTA (patrón travel/video-edit/screenflow: aquí solo se PLANIFICA,
// el runner ejecuta ffmpeg fuera de los tests).
//
// Animaciones (todas funciones cerradas deterministas):
//   plasma       suma de senos 2D clásica
//   waves        bandas sinusoidales con wobble
//   orbits       cuerpos orbitando con brillo gaussiano
//   noise-flow   simplex noise desplazado en el tiempo (usa generative.ts)
//   fractal-zoom zoom de Mandelbrot por frame (iteración inline)
//   shape-morph  interpolación de superfórmula de Gielis (usa geometry.ts)
//
// Guardas anti-runaway: dims pares ≤1280, fps 1..60 entero, durationSec ≤60,
// frameCount ≤1800. Coordenadas normalizadas: x∈[-aspect/2, aspect/2],
// y∈[-0.5, 0.5] (Y hacia arriba), t∈[0,1) progreso del loop.
// -----------------------------------------------------------------------------

import * as path from 'node:path';
import { mkdir, rename, writeFile } from 'node:fs/promises';

import {
  PALETTE_NAMES,
  PngError,
  renderImagePng,
  samplePalette,
  writePngAtomic,
  type PixelFn,
} from './pngrender';
import { simplexNoise2D } from './generative';
import { superShapeRadius, type SuperShapeParams } from './geometry';

/** Error de dominio procvid. */
export class ProcVidError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ProcVidError';
  }
}

export const PROCVID_ANIMATIONS = [
  'plasma',
  'waves',
  'orbits',
  'noise-flow',
  'fractal-zoom',
  'shape-morph',
] as const;

export type ProcVidAnimation = (typeof PROCVID_ANIMATIONS)[number];

/** Límites anti-runaway. */
export const MAX_DIM = 1280;
export const MAX_FPS = 60;
export const MAX_DURATION_SEC = 60;
export const MAX_FRAMES = 1800;

export const PROCVID_DEFAULTS = {
  width: 480,
  height: 854, // 9:16 vertical (dims pares para yuv420p)
  fps: 30,
  durationSec: 4,
  seed: 1337,
} as const;

export type ProcVidParams = Record<string, unknown>;

export interface ProcVidSpecInput {
  animation: string;
  width?: number;
  height?: number;
  fps?: number;
  durationSec?: number;
  seed?: number;
  outName?: string;
  /** Paleta pngrender (default por animación). */
  palette?: string;
  params?: ProcVidParams;
}

export interface NormalizedProcVidSpec {
  animation: ProcVidAnimation;
  width: number;
  height: number;
  fps: number;
  durationSec: number;
  seed: number;
  outName: string;
  palette: string;
  params: ProcVidParams;
  frameCount: number;
}

/* ------------------------------------------------------------------ */
/* Helpers de params                                                   */
/* ------------------------------------------------------------------ */

function num(p: ProcVidParams, key: string, dflt: number): number {
  const v = p[key];
  return typeof v === 'number' && Number.isFinite(v) ? v : dflt;
}

const TAU = Math.PI * 2;

function clamp01(v: number): number {
  return v < 0 ? 0 : v > 1 ? 1 : v;
}

/** Slug determinista para nombres de archivo/salida. */
export function slugifyOutName(raw: string): string {
  const slug = raw
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48);
  return slug.length > 0 ? slug : '';
}

const DEFAULT_PALETTE: Record<ProcVidAnimation, string> = {
  plasma: 'fire',
  waves: 'ice',
  orbits: 'neoViolet',
  'noise-flow': 'obsidian',
  'fractal-zoom': 'fire',
  'shape-morph': 'neoViolet',
};

/* ------------------------------------------------------------------ */
/* Spec                                                                */
/* ------------------------------------------------------------------ */

/**
 * Normaliza y valida la spec (determinista, sin reloj). Lanza ProcVidError con
 * mensaje accionable ante animación/paleta desconocida o límites excedidos.
 */
export function resolveSpec(input: ProcVidSpecInput): NormalizedProcVidSpec {
  if (!(PROCVID_ANIMATIONS as readonly string[]).includes(input.animation)) {
    throw new ProcVidError(
      `animación desconocida "${input.animation}" (válidas: ${PROCVID_ANIMATIONS.join(', ')})`,
    );
  }
  const animation = input.animation as ProcVidAnimation;

  const width = Math.floor(input.width ?? PROCVID_DEFAULTS.width);
  const height = Math.floor(input.height ?? PROCVID_DEFAULTS.height);
  if (width < 2 || height < 2) throw new ProcVidError(`dimensiones deben ser >= 2 (${width}x${height})`);
  if (width > MAX_DIM || height > MAX_DIM)
    throw new ProcVidError(`dimensiones exceden ${MAX_DIM} (${width}x${height})`);
  if (width % 2 !== 0 || height % 2 !== 0)
    throw new ProcVidError(`dimensiones deben ser pares para yuv420p (${width}x${height})`);

  const fps = input.fps ?? PROCVID_DEFAULTS.fps;
  if (!Number.isInteger(fps) || fps < 1 || fps > MAX_FPS)
    throw new ProcVidError(`fps debe ser entero 1..${MAX_FPS} (recibido ${fps})`);

  const durationSec = input.durationSec ?? PROCVID_DEFAULTS.durationSec;
  if (!(durationSec > 0) || durationSec > MAX_DURATION_SEC)
    throw new ProcVidError(`durationSec debe ser > 0 y <= ${MAX_DURATION_SEC} (recibido ${durationSec})`);

  const frameCount = Math.round(fps * durationSec);
  if (frameCount < 1 || frameCount > MAX_FRAMES)
    throw new ProcVidError(`frameCount ${frameCount} fuera de rango 1..${MAX_FRAMES}`);

  const palette = input.palette ?? DEFAULT_PALETTE[animation];
  if (!(PALETTE_NAMES as readonly string[]).includes(palette)) {
    throw new PngError(`paleta desconocida: ${palette} (válidas: ${PALETTE_NAMES.join(', ')})`);
  }

  return {
    animation,
    width,
    height,
    fps,
    durationSec,
    seed: input.seed ?? PROCVID_DEFAULTS.seed,
    outName: slugifyOutName(input.outName ?? '') || `procvid-${animation}`,
    palette,
    params: input.params ?? {},
    frameCount,
  };
}

/* ------------------------------------------------------------------ */
/* Animaciones (funciones puras cerradas sobre la spec)                */
/* ------------------------------------------------------------------ */

function mandelbrotPixel(re: number, im: number, maxIter: number): number {
  let zr = 0;
  let zi = 0;
  let iter = 0;
  while (iter < maxIter && zr * zr + zi * zi <= 4) {
    const nzr = zr * zr - zi * zi + re;
    zi = 2 * zr * zi + im;
    zr = nzr;
    iter++;
  }
  return iter / maxIter; // 1 ≈ borde/dentro
}

/**
 * Función de píxel del frame `t∈[0,1)` en coordenadas normalizadas.
 * Determinista: misma spec+t → mismos colores.
 */
export function framePixelFn(spec: NormalizedProcVidSpec, t: number): PixelFn {
  const { width, height, seed, palette, params } = spec;
  const aspect = width / height;
  const toPlane = (px: number, py: number): [number, number] => [
    ((px + 0.5) / width) * aspect - aspect / 2,
    0.5 - (py + 0.5) / height,
  ];

  switch (spec.animation) {
    case 'plasma': {
      const f1 = num(params, 'freq1', 6);
      const f2 = num(params, 'freq2', 5);
      const f3 = num(params, 'freq3', 4);
      const f4 = num(params, 'freq4', 7);
      const speed = num(params, 'speed', 1);
      return (px, py) => {
        const [x, y] = toPlane(px, py);
        const tt = t * TAU * speed;
        const v =
          Math.sin(x * f1 + tt) +
          Math.sin(y * f2 - tt * 0.8) +
          Math.sin((x + y) * f3 + tt * 0.5) +
          Math.sin(Math.hypot(x, y) * f4 - tt * 0.3);
        return samplePalette(palette, clamp01(0.5 + 0.125 * v));
      };
    }

    case 'waves': {
      const k = num(params, 'k', 14);
      const kx = num(params, 'kx', 9);
      const amp = num(params, 'amp', 0.35);
      const speed = num(params, 'speed', 0.8);
      return (px, py) => {
        const [x, y] = toPlane(px, py);
        const phase = y * k + x * kx * 0.25 + t * TAU * speed;
        const wobble = Math.sin(x * kx + t * TAU * speed) * amp;
        return samplePalette(palette, clamp01(0.5 + 0.5 * Math.sin(phase + wobble)));
      };
    }

    case 'orbits': {
      const n = Math.max(1, Math.min(24, Math.floor(num(params, 'bodies', 5))));
      const radius = num(params, 'radius', 0.34);
      const sigma = num(params, 'sigma', 0.07);
      const speed = num(params, 'speed', 1);
      const inv2s2 = 1 / (2 * sigma * sigma);
      return (px, py) => {
        const [x, y] = toPlane(px, py);
        let glow = 0;
        for (let i = 0; i < n; i++) {
          const ang = t * TAU * speed * (1 + (i % 3) * 0.35) + (i / n) * TAU;
          const r = radius * (0.55 + 0.45 * ((i % 3) / 2));
          const dx = x - Math.cos(ang) * r;
          const dy = y - Math.sin(ang) * r;
          glow += Math.exp(-(dx * dx + dy * dy) * inv2s2);
        }
        return samplePalette(palette, clamp01(glow));
      };
    }

    case 'noise-flow': {
      const scale = num(params, 'scale', 3.5);
      const flowSpeed = num(params, 'flowSpeed', 2.5);
      const warp = num(params, 'warp', 0.35);
      return (px, py) => {
        const [x, y] = toPlane(px, py);
        const sx = x * scale;
        const sy = y * scale + t * flowSpeed;
        const n1 = simplexNoise2D(sx, sy, seed);
        const n2 = simplexNoise2D(sx * 2 + 7.31, sy * 2 + t * flowSpeed * 1.4, seed + 91);
        const v = clamp01(0.5 + 0.35 * n1 + warp * n2);
        return samplePalette(palette, v);
      };
    }

    case 'fractal-zoom': {
      const cx = num(params, 'centerX', -0.743643887037151); // punto profundo clásico
      const cy = num(params, 'centerY', 0.13182590420533);
      const zStart = num(params, 'zoomStart', 1.2);
      const zEnd = num(params, 'zoomEnd', 6);
      const maxIter = Math.max(16, Math.min(512, Math.floor(num(params, 'maxIter', 96))));
      return (px, py) => {
        const [x, y] = toPlane(px, py);
        const zoom = zStart * Math.pow(zEnd / zStart, t);
        const halfH = 1.75 / zoom;
        const halfW = halfH * aspect;
        const re = cx + (x / (aspect / 2)) * halfW;
        const im = cy + y * 2 * halfH;
        const v = mandelbrotPixel(re, im, maxIter);
        // dentro del set (v≈1) → primer stop oscuro; borde → brillo alto
        return samplePalette(palette, clamp01(Math.pow(v, 0.6)));
      };
    }

    case 'shape-morph': {
      const readP = (prefix: string, dflt: SuperShapeParams): SuperShapeParams => ({
        m: num(params, `${prefix}M`, dflt.m),
        n1: num(params, `${prefix}N1`, dflt.n1),
        n2: num(params, `${prefix}N2`, dflt.n2),
        n3: num(params, `${prefix}N3`, dflt.n3),
      });
      const A = readP('a', { m: 0, n1: 1, n2: 1, n3: 1 }); // círculo
      const B = readP('b', { m: 6, n1: 1, n2: 1.7, n3: 1.7 }); // flor
      const size = num(params, 'size', 0.38);
      const mix: SuperShapeParams = {
        m: A.m + (B.m - A.m) * t,
        n1: A.n1 + (B.n1 - A.n1) * t,
        n2: A.n2 + (B.n2 - A.n2) * t,
        n3: A.n3 + (B.n3 - A.n3) * t,
      };
      return (px, py) => {
        const [x, y] = toPlane(px, py);
        const r = Math.hypot(x, y);
        const phi = Math.atan2(y, x);
        const limit = superShapeRadius(mix, phi) * size;
        if (r <= limit) return samplePalette(palette, 0.85);
        return samplePalette(palette, 0.05);
      };
    }
  }
}

/* ------------------------------------------------------------------ */
/* Plan ffmpeg                                                         */
/* ------------------------------------------------------------------ */

export interface ProcVidPlan extends NormalizedProcVidSpec {
  outDir: string;
  framesDir: string;
  framePattern: string;
  outputPath: string;
  ffmpegArgv: string[];
  /** Variante GIF (2 pasos palettegen/paletteuse). Solo si se solicita. */
  gifArgv?: string[][];
}

function quoteWin(arg: string): string {
  return /\s/.test(arg) ? `"${arg}"` : arg;
}

export interface PlanOptions {
  outDir?: string;
  /** Incluir variante GIF (argv, no ejecuta nada). */
  gif?: boolean;
}

export function planProcVid(spec: NormalizedProcVidSpec, opts: PlanOptions = {}): ProcVidPlan {
  const outDir = opts.outDir ?? path.join('.ultraia', 'procedural');
  const framesDir = path.join(outDir, spec.outName);
  const framePattern = 'frame_%06d.png';
  const outputPath = path.join(outDir, `${spec.outName}.mp4`);

  const ffmpegArgv = [
    'ffmpeg',
    '-y',
    '-framerate',
    String(spec.fps),
    '-i',
    path.join(framesDir, framePattern),
    '-c:v',
    'libx264',
    '-pix_fmt',
    'yuv420p',
    '-crf',
    '18',
    '-movflags',
    '+faststart',
    outputPath,
  ];

  let gifArgv: string[][] | undefined;
  if (opts.gif) {
    const palettePath = path.join(outDir, `${spec.outName}-palette.png`);
    gifArgv = [
      [
        'ffmpeg',
        '-y',
        '-framerate',
        String(spec.fps),
        '-i',
        path.join(framesDir, framePattern),
        '-vf',
        'fps=12,scale=480:-1:flags=lanczos,palettegen',
        palettePath,
      ],
      [
        'ffmpeg',
        '-y',
        '-framerate',
        String(spec.fps),
        '-i',
        path.join(framesDir, framePattern),
        '-i',
        palettePath,
        '-lavfi',
        'paletteuse',
        path.join(outDir, `${spec.outName}.gif`),
      ],
    ];
  }

  return {
    ...spec,
    outDir,
    framesDir,
    framePattern,
    outputPath,
    ffmpegArgv,
    gifArgv,
  };
}

/* ------------------------------------------------------------------ */
/* Render de frames                                                    */
/* ------------------------------------------------------------------ */

export function frameFileName(index: number): string {
  return `frame_${String(index).padStart(6, '0')}.png`;
}

/** Renderiza UN frame a PNG bytes (índice validado contra frameCount). */
export function renderFramePng(spec: NormalizedProcVidSpec, frameIndex: number): Uint8Array {
  if (!Number.isInteger(frameIndex) || frameIndex < 0 || frameIndex >= spec.frameCount)
    throw new ProcVidError(
      `frameIndex ${frameIndex} fuera de rango 0..${spec.frameCount - 1}`,
    );
  const t = spec.frameCount === 1 ? 0 : frameIndex / spec.frameCount;
  return renderImagePng({ width: spec.width, height: spec.height }, framePixelFn(spec, t));
}

export interface RenderFramesResult {
  count: number;
  dir: string;
  files: string[];
}

/** Escribe todos los frames PNG al directorio del plan (o override). Idempotente. */
export async function renderFrames(
  spec: NormalizedProcVidSpec,
  plan: Pick<ProcVidPlan, 'framesDir'>,
): Promise<RenderFramesResult> {
  const files: string[] = [];
  for (let i = 0; i < spec.frameCount; i++) {
    const name = frameFileName(i);
    await writePngAtomic(path.join(plan.framesDir, name), renderFramePng(spec, i));
    files.push(name);
  }
  return { count: files.length, dir: plan.framesDir, files };
}

/* ------------------------------------------------------------------ */
/* Script + manifest                                                   */
/* ------------------------------------------------------------------ */

export function buildRenderScript(plan: ProcVidPlan): { sh: string; steps: string[] } {
  const steps: string[] = [];
  steps.push(plan.ffmpegArgv.map(quoteWin).join(' '));
  if (plan.gifArgv) for (const g of plan.gifArgv) steps.push(g.map(quoteWin).join(' '));
  const header = '#!/usr/bin/env sh\n# UltraIa procvid — render determinista (generado, no editar)\nset -eu\n';
  const sh = header + steps.map((s) => `${s}\n`).join('');
  return { sh, steps };
}

/** Manifest determinista (sin timestamps) → idempotente entre corridas. */
export async function writeManifest(plan: ProcVidPlan): Promise<Record<string, unknown>> {
  const manifest = {
    generator: 'ultraia-procvid',
    animation: plan.animation,
    width: plan.width,
    height: plan.height,
    fps: plan.fps,
    durationSec: plan.durationSec,
    seed: plan.seed,
    outName: plan.outName,
    palette: plan.palette,
    frameCount: plan.frameCount,
    framesDir: plan.framesDir,
    framePattern: plan.framePattern,
    outputPath: plan.outputPath,
    ffmpegArgv: plan.ffmpegArgv,
    gif: plan.gifArgv ? true : false,
  };
  const json = JSON.stringify(manifest, null, 2) + '\n';
  await mkdir(plan.outDir, { recursive: true });
  const tmp = path.join(plan.outDir, `${plan.outName}.manifest.json.tmp`);
  await writeFile(tmp, json, 'utf8');
  await rename(tmp, path.join(plan.outDir, `${plan.outName}.manifest.json`));
  return manifest;
}

/* ------------------------------------------------------------------ */
/* Namespace                                                           */
/* ------------------------------------------------------------------ */

export const procvidNamespace = {
  animations: PROCVID_ANIMATIONS,
};
