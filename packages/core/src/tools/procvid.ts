// -----------------------------------------------------------------------------
// procvid.ts - capability `procvid`
// -----------------------------------------------------------------------------
// LibrerÃ­a procedural de VIDEO (pedido usuario 23/08/2026): convierte funciones
// matemÃ¡ticas puras (x, y, t) â†’ RGBA en videos REALES, sin IA generativa ni red.
//
// Cadena: catÃ¡logo de ANIMACIONES serializable (nombre + params JSON, invocable
// por agentes) â†’ frames PNG vÃ­a `pngrender.encodePng` â†’ argv ffmpeg
// DETERMINISTA (patrÃ³n travel/video-edit/screenflow: aquÃ­ solo se PLANIFICA,
// el runner ejecuta ffmpeg fuera de los tests).
//
// Animaciones (todas funciones cerradas deterministas):
//   plasma       suma de senos 2D clÃ¡sica
//   waves        bandas sinusoidales con wobble
//   orbits       cuerpos orbitando con brillo gaussiano
//   noise-flow   simplex noise desplazado en el tiempo (usa generative.ts)
//   fractal-zoom zoom de Mandelbrot por frame (iteraciÃ³n inline)
//   shape-morph  interpolaciÃ³n de superfÃ³rmula de Gielis (usa geometry.ts)
//
// Guardas anti-runaway: dims pares â‰¤1280, fps 1..60 entero, durationSec â‰¤60,
// frameCount â‰¤1800. Coordenadas normalizadas: xâˆˆ[-aspect/2, aspect/2],
// yâˆˆ[-0.5, 0.5] (Y hacia arriba), tâˆˆ[0,1) progreso del loop.
// -----------------------------------------------------------------------------

import * as path from 'node:path';
import { mkdir, rename, writeFile } from 'node:fs/promises';

import {
  PALETTE_NAMES,
  PngError,
  renderImage,
  renderImagePng,
  samplePalette,
  writePngAtomic,
  type PixelFn,
  encodeGif,
} from './pngrender';
import { simplexNoise2D, fbm2D } from './generative';
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
  'fbm-flow',
  'fractal-zoom',
  'shape-morph',
  // v2 (iter-103): tunnel/metaballs/kaleido/starfield — mismas garantías
  // (función cerrada determinista x,y,t → color, sin estado ni red).
  'tunnel',
  'metaballs',
  'kaleido',
  'starfield',
  // v3 (iter-150): voronoi/reaction-diffusion/fire — patrones orgánicos
  'voronoi',
  'reaction-diffusion',
  'fire',
] as const;

export type ProcVidAnimation = (typeof PROCVID_ANIMATIONS)[number];

/** LÃ­mites anti-runaway. */
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
  /** Paleta pngrender (default por animaciÃ³n). */
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
  'fbm-flow': 'neoViolet',
  'fractal-zoom': 'fire',
  'shape-morph': 'neoViolet',
  // v2 (iter-103): paletas default de las animaciones nuevas.
  tunnel: 'obsidian',
  metaballs: 'fire',
  kaleido: 'neoViolet',
  starfield: 'ice',
  // v3 (iter-150): paletas default de las animaciones v3.
  voronoi: 'neoViolet',
  'reaction-diffusion': 'fire',
  fire: 'fire',
};

/* ------------------------------------------------------------------ */
/* Spec                                                                */
/* ------------------------------------------------------------------ */

/**
 * Normaliza y valida la spec (determinista, sin reloj). Lanza ProcVidError con
 * mensaje accionable ante animaciÃ³n/paleta desconocida o lÃ­mites excedidos.
 */
export function resolveSpec(input: ProcVidSpecInput): NormalizedProcVidSpec {
  if (!(PROCVID_ANIMATIONS as readonly string[]).includes(input.animation)) {
    throw new ProcVidError(
      `animaciÃ³n desconocida "${input.animation}" (vÃ¡lidas: ${PROCVID_ANIMATIONS.join(', ')})`,
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
    throw new PngError(`paleta desconocida: ${palette} (vÃ¡lidas: ${PALETTE_NAMES.join(', ')})`);
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
  return iter / maxIter; // 1 â‰ˆ borde/dentro
}

/**
 * FunciÃ³n de pÃ­xel del frame `tâˆˆ[0,1)` en coordenadas normalizadas.
 * Determinista: misma spec+t â†’ mismos colores.
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

    case 'fbm-flow': {
      // Igual estructura de flujo que noise-flow pero con fBm (suma de octavas
      // de value noise) en lugar de Simplex -> textura fractal más rica.
      const scale = num(params, 'scale', 3.5);
      const flowSpeed = num(params, 'flowSpeed', 2.5);
      const warp = num(params, 'warp', 0.35);
      const octaves = Math.max(1, Math.min(8, Math.floor(num(params, 'octaves', 5))));
      const persistence = num(params, 'persistence', 0.55);
      const lacunarity = num(params, 'lacunarity', 2);
      return (px, py) => {
        const [x, y] = toPlane(px, py);
        const sx = x * scale;
        const sy = y * scale + t * flowSpeed;
        const n1 = fbm2D(sx, sy, { seed, octaves, persistence, lacunarity });
        const n2 = fbm2D(sx * 2 + 7.31, sy * 2 + t * flowSpeed * 1.4, {
          seed: seed + 91,
          octaves,
          persistence,
          lacunarity,
        });
        const v = clamp01(0.5 + 0.35 * n1 + warp * n2);
        return samplePalette(palette, v);
      };
    }

    case 'fractal-zoom': {
      const cx = num(params, 'centerX', -0.743643887037151); // punto profundo clÃ¡sico
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
        // dentro del set (vâ‰ˆ1) â†’ primer stop oscuro; borde â†’ brillo alto
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
      const A = readP('a', { m: 0, n1: 1, n2: 1, n3: 1 }); // cÃ­rculo
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

    case 'tunnel': {
      // Túnel radial infinito: anillos que nacen del centro y crecen hacia la
      // cámara. v combina distancia (profundidad) + ángulo (giro del túnel).
      const rings = num(params, 'rings', 9);
      const twist = num(params, 'twist', 5);
      const speed = num(params, 'speed', 1.2);
      return (px, py) => {
        const [x, y] = toPlane(px, py);
        const dist = Math.hypot(x, y) + 1e-6;
        const phi = Math.atan2(y, x);
        // 1/dist comprime el espacio: los anillos aceleran al acercarse.
        const depth = (1 / dist) * 0.22 - t * speed;
        const v = Math.sin(depth * TAU * 0.5 + phi * twist);
        const fade = clamp01(1 - dist * 1.1); // oscurecer el fondo del túnel
        return samplePalette(palette, clamp01(0.12 + 0.55 * (0.5 + 0.5 * v) * (0.35 + 0.65 * fade)));
      };
    }

    case 'metaballs': {
      // Metabolas 2D: N blobs con órbitas senoidales sembradas; campo de
      // potencial sum(r²/d²) con umbral suave → fusión orgánica clásica.
      const count = Math.max(2, Math.min(6, Math.round(num(params, 'count', 3))));
      const radius = num(params, 'radius', 0.16);
      const speed = num(params, 'speed', 0.7);
      const centers: Array<[number, number]> = [];
      for (let i = 0; i < count; i++) {
        const h = Math.sin((seed % 97 + 1) * (i + 3) * 12.9898) * 43758.5453;
        const ox = h - Math.floor(h); // determinista por seed+i
        const ay = ((seed + i * 37) % 100) / 100;
        centers.push([
          Math.cos(TAU * (t * speed + ox)) * 0.28,
          Math.sin(TAU * (t * speed * 1.31 + ay)) * 0.26,
        ]);
      }
      const r2 = radius * radius;
      return (px, py) => {
        const [x, y] = toPlane(px, py);
        let field = 0;
        for (const [cx, cy] of centers) {
          const dx = x - cx;
          const dy = y - cy;
          field += r2 / (dx * dx + dy * dy + 1e-6);
        }
        // field>1 dentro de una bola; ~1 en la zona de fusión.
        return samplePalette(palette, clamp01(0.15 + 0.7 * clamp01(field - 0.35)));
      };
    }

    case 'kaleido': {
      // Caleidoscopio: pliega el ángulo en N gajos espejados y muestrea un
      // patrón ondular debajo — simetría radial perfecta por construcción.
      const wedges = Math.max(3, Math.min(16, Math.round(num(params, 'wedges', 8))));
      const freq = num(params, 'freq', 7);
      const speed = num(params, 'speed', 0.8);
      const wedge = Math.PI / wedges;
      const tt = t * TAU * speed;
      return (px, py) => {
        const [x0, y0] = toPlane(px, py);
        const rot = -tt * 0.05;
        const x = x0 * Math.cos(rot) - y0 * Math.sin(rot);
        const y = x0 * Math.sin(rot) + y0 * Math.cos(rot);
        let a = Math.atan2(y, x);
        a = ((a % (2 * wedge)) + 2 * wedge) % (2 * wedge); // [0, 2w)
        if (a > wedge) a = 2 * wedge - a; // espejo del gajo
        const r = Math.hypot(x, y);
        const kx = Math.cos(a) * r;
        const ky = Math.sin(a) * r;
        const v =
          Math.sin(kx * freq + tt) +
          Math.sin(ky * freq * 1.3 - tt * 0.7) +
          Math.sin(r * freq - tt);
        return samplePalette(palette, clamp01(0.5 + 0.14 * v));
      };
    }

    case 'starfield': {
      // Warp estelar 3D: estrellas sembradas por hash viajan en z hacia la
      // cámara; proyección en perspectiva produce streaks radiales clásicos.
      const stars = Math.max(20, Math.min(400, Math.round(num(params, 'stars', 120))));
      const warpSpeed = num(params, 'speed', 1.4);
      const density = num(params, 'density', 0.85);
      // Hash determinista por índice+seed (sin PRNG con estado).
      const hash = (i: number, salt: number): number => {
        const h = Math.sin((i + 1) * 127.1 + salt * 311.7 + (seed % 89) * 0.6180339) * 43758.5453;
        return h - Math.floor(h);
      };
      const sx: number[] = [];
      const sy: number[] = [];
      const sz: number[] = [];
      for (let i = 0; i < stars; i++) {
        sx.push(hash(i, 1) * 2 - 1);
        sy.push(hash(i, 2) * 2 - 1);
        sz.push(0.08 + hash(i, 3) * 0.92); // z inicial ∈ (0,1]
      }
      return (px, py) => {
        const [x, y] = toPlane(px, py);
        let best = 0;
        for (let i = 0; i < stars; i++) {
          const z = ((sz[i] - t * warpSpeed * 0.22) % 1 + 1) % 1 + 0.04;
          const k = 0.09 / z;
          const dx = x - sx[i] * k * 3;
          const dy = y - sy[i] * k * 3;
          const d = Math.hypot(dx, dy);
          // streak: brillo cae con la distancia al rastro radial de la estrella
          const glow = Math.exp(-d * d * 900 / (k * k * 9));
          if (glow > best) best = glow;
        }
        return samplePalette(palette, clamp01(best * density + 0.02));
      };
    }

    case 'voronoi': {
      // Voronoi animado: N semillas que se mueven suavemente; cada píxel se
      // colorea por distancia al sitio más cercano → celdas orgánicas.
      const sites = Math.max(3, Math.min(30, Math.round(num(params, 'sites', 12))));
      const speed = num(params, 'speed', 0.6);
      const edgeWidth = num(params, 'edgeWidth', 0.03);
      // Hash determinista por índice+seed.
      const hash2 = (i: number, salt: number): number => {
        const h = Math.sin((i + 1) * 127.1 + salt * 311.7 + (seed % 89) * 0.6180339) * 43758.5453;
        return h - Math.floor(h);
      };
      // Precomputar centros semilla por frame (determinista).
      const centers: Array<[number, number]> = [];
      for (let i = 0; i < sites; i++) {
        const baseX = hash2(i, 1) * 2 - 1;
        const baseY = hash2(i, 2) * 2 - 1;
        const phaseX = hash2(i, 3) * TAU;
        const phaseY = hash2(i, 4) * TAU;
        const ampX = hash2(i, 5) * 0.15 + 0.03;
        const ampY = hash2(i, 6) * 0.15 + 0.03;
        centers.push([
          baseX + Math.sin(t * TAU * speed + phaseX) * ampX,
          baseY + Math.cos(t * TAU * speed * 0.7 + phaseY) * ampY,
        ]);
      }
      return (px, py) => {
        const [x, y] = toPlane(px, py);
        let minDist = Infinity;
        let secondDist = Infinity;
        for (const [cx, cy] of centers) {
          const d = Math.hypot(x - cx, y - cy);
          if (d < minDist) {
            secondDist = minDist;
            minDist = d;
          } else if (d < secondDist) {
            secondDist = d;
          }
        }
        // Borde de celda: diferencia entre 1ro y 2do más cercano.
        const edge = secondDist - minDist;
        const edgeFactor = clamp01(edge / edgeWidth);
        const siteIndex = centers.findIndex(
          ([cx, cy]) => Math.hypot(x - cx, y - cy) === minDist,
        );
        const hue = ((siteIndex / sites) * 0.8 + 0.1);
        return samplePalette(palette, clamp01(hue * 0.7 + 0.15 + edgeFactor * 0.15));
      };
    }

    case 'reaction-diffusion': {
      // Reacción-difusión simplificada (Gray-Scott-like): ondas que se expanden
      // y se inhiben mutamente → patrón de Turing animado. Per-pixel determinista
      // usando superposición de ondas circulares con fase animada.
      const waves = Math.max(2, Math.min(8, Math.round(num(params, 'waves', 4))));
      const freq = num(params, 'freq', 6);
      const speed = num(params, 'speed', 1);
      const feed = num(params, 'feed', 0.04);
      const kill = num(params, 'kill', 0.06);
      // Centros de reacción (semillas que emiten ondas).
      const hash3 = (i: number, salt: number): number => {
        const h = Math.sin((i + 1) * 127.1 + salt * 311.7 + (seed % 89) * 0.6180339) * 43758.5453;
        return h - Math.floor(h);
      };
      const seeds: Array<[number, number]> = [];
      for (let i = 0; i < waves; i++) {
        seeds.push([hash3(i, 1) * 2 - 1, hash3(i, 2) * 2 - 1]);
      }
      return (px, py) => {
        const [x, y] = toPlane(px, py);
        let v = 0;
        for (let i = 0; i < waves; i++) {
          const [sx, sy] = seeds[i];
          const dist = Math.hypot(x - sx, y - sy);
          // Onda circular: crece con t, se amortigua con distancia.
          const phase = dist * freq - t * TAU * speed * (1 + i * 0.3);
          const wave = Math.sin(phase) * Math.exp(-dist * kill * 8);
          v += wave;
        }
        // Normalizar a [0,1] con biased feed.
        const normalized = clamp01(0.5 + v * (0.3 + feed * 5));
        return samplePalette(palette, normalized);
      };
    }

    case 'fire': {
      // Fuego procedural: gradiente vertical con turbulencia simplex que simula
      // llama. La base es oscura (negro→rojo→amarillo→blanco hacia arriba).
      const scale = num(params, 'scale', 4);
      const turbulence = num(params, 'turbulence', 2.5);
      const speed = num(params, 'speed', 1.5);
      const intensity = num(params, 'intensity', 1);
      return (px, py) => {
        const [x, y] = toPlane(px, py);
        // y ∈ [-0.5, 0.5]; fuego sube: y=0.5 = punta, y=-0.5 = base.
        const height01 = clamp01(y + 0.5); // 0=base, 1=punta
        // Turbulencia: desplaza x e y con simplex noise.
        const turbX = simplexNoise2D(x * scale, y * scale + t * speed, seed) * turbulence;
        const turbY = simplexNoise2D(x * scale + 100, y * scale + t * speed + 50, seed + 7) * turbulence;
        const turbDist = Math.hypot(turbX, turbY);
        // La llama se estrecha hacia arriba y oscila.
        const flicker = 0.85 + 0.15 * Math.sin(t * TAU * speed * 2.3);
        const flameWidth = (1 - height01 * 0.7) * flicker;
        const distFromCenter = Math.abs(x + turbX * 0.3) / (flameWidth + 0.01);
        // Intensidad: máxima en la base中心, cae con altura y distancia al centro.
        const baseGlow = Math.exp(-distFromCenter * distFromCenter * 3);
        const heightFade = Math.exp(-height01 * 3.5) * intensity;
        const turbBoost = Math.exp(-turbDist * 0.5) * 0.3;
        const v = clamp01(baseGlow * heightFade + turbBoost);
        // Mapear a fuego: negro→rojo→amarillo→blanco.
        return samplePalette(palette, clamp01(v));
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

/** Renderiza UN frame a PNG bytes (Ã­ndice validado contra frameCount). */
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

/* ------------------------------------------------------------------ */
/* Audio v2 (iter-103): banda sonora procedural muxada al MP4          */
/* ------------------------------------------------------------------ */

/**
 * Devuelve el argv ffmpeg con la pista de audio WAV muxada al video.
 *
 * QUÉ: inserta `-i <wavPath>` como SEGUNDA ENTRADA (inmediatamente después
 * del valor del primer `-i`, el patrón de frames) y añade `-c:a aac -shortest`
 * junto a los flags de salida.
 * POR QUÉ así: ffmpeg agrupa opciones por posición — los flags de salida
 * intercalados ENTRE inputs hacen que el segundo input herede opciones
 * inválidas ("Decoder not found"). Inputs primero, flags de salida juntos.
 * Determinista: misma entrada → mismo argv. Sin WAV válido no se llama.
 */
export function planAudioMux(
  ffmpegArgv: readonly string[],
  wavPath: string,
  opts: { codec?: 'aac' | 'copy'; volume?: number } = {},
): string[] {
  const codec = opts.codec ?? 'aac';
  const argv = [...ffmpegArgv];
  const firstInputIdx = argv.indexOf('-i');
  if (firstInputIdx === -1 || firstInputIdx + 1 >= argv.length) return argv;
  // Insertar la segunda entrada tras el VALOR del primer -i (patrón frames).
  const insertAt = firstInputIdx + 2;
  const audioFlags = ['-i', wavPath];
  if (typeof opts.volume === 'number' && opts.volume !== 1) {
    audioFlags.push('-filter:a', `volume=${opts.volume}`);
  }
  argv.splice(insertAt, 0, ...audioFlags);
  // Flags de salida: codec de audio + shortest antes del archivo final.
  const output = argv.pop() as string;
  return [...argv, '-c:a', codec, '-shortest', output];
}

/** Manifest determinista (sin timestamps) â†’ idempotente entre corridas. */
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

/* ------------------------------------------------------------------ */
/* GIF nativo (sin ffmpeg) via pngrender.encodeGif                     */
/* ------------------------------------------------------------------ */

export interface RenderGifOptions {
  /** Delay por frame en ms (default: derivado de fps -> Math.round(1000/fps)). */
  delayMs?: number;
  loop?: boolean;
  /** Paleta del encoder GIF ('rgb332' default | 'mediancut' adaptativa). */
  palette?: 'rgb332' | 'mediancut';
}

/**
 * Renderiza TODOS los frames de la spec y los ensambla como GIF89a animado
 * 100% TypeScript (sin ffmpeg). Determinista byte a byte.
 */
export async function renderGifBytes(
  spec: NormalizedProcVidSpec,
  opts: RenderGifOptions = {},
): Promise<Uint8Array> {
  const frames: Uint8Array[] = [];
  for (let i = 0; i < spec.frameCount; i++) {
    const t = spec.frameCount === 1 ? 0 : i / spec.frameCount;
    frames.push(renderImage({ width: spec.width, height: spec.height }, framePixelFn(spec, t)).rgba);
  }
  return encodeGif(frames, {
    width: spec.width,
    height: spec.height,
    delayMs: opts.delayMs ?? Math.max(20, Math.round(1000 / spec.fps)),
    loop: opts.loop,
    palette: opts.palette,
  });
}

export const procvid = {
  PROCVID_ANIMATIONS,
  resolveSpec,
  framePixelFn,
  planProcVid,
  renderFramePng,
  renderFrames,
  buildRenderScript,
  planAudioMux,
  writeManifest,
  renderGifBytes,
  slugifyOutName,
  frameFileName,
};

