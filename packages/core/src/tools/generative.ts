/**
 * generative — Procedural media generation engine (capability `generative`)
 *
 * Generates images, video motion and audio ENTIRELY in code — no external
 * assets, no models, no network (keyless by construction), like a game
 * engine rendering from math:
 *
 *   image: Perlin value noise, 2D Simplex gradient noise, Mandelbrot
 *          fractals, flow fields, L-systems -> deterministic SVG output.
 *   video: keyframe interpolation (linear / cubic Catmull-Rom),
 *          deterministic particle simulation, parametric Ken Burns camera
 *          windows, scene planning (buildVideoPlan) -> frame descriptors.
 *   audio: waveform synthesis (sine/square/saw/triangle), FM synthesis,
 *          granular synthesis, pink noise, ADSR envelopes, a BPM sequencer
 *          and multi-track mixing -> PCM16 + WAV (reuses omag/sound.ts).
 *
 * Deterministic: every function is seeded (mulberry32 PRNG) — same input,
 * same output, hasheable via fnv1a checksums. Zero dependencies.
 */
import { SAMPLE_RATE, encodeWav, type SynthResult, type SynthOptions } from '../omag/sound';

/* ------------------------------------------------------------------ */
/* PRNG + hashing                                                      */
/* ------------------------------------------------------------------ */

/** Seedable PRNG (mulberry32) — deterministic across runs and platforms. */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** FNV-1a 32-bit checksum over the raw LE bytes of a Float32 array. */
export function fnv1a(values: ArrayLike<number>): string {
  const buf = new Float32Array(values);
  const bytes = new Uint8Array(buf.buffer);
  let h = 0x811c9dc5;
  for (let i = 0; i < bytes.length; i++) {
    h ^= bytes[i];
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(16).padStart(8, '0');
}

/** FNV-1a checksum over a string (UTF-8). */
export function fnv1aStr(s: string): string {
  const bytes = new TextEncoder().encode(s);
  let h = 0x811c9dc5;
  for (let i = 0; i < bytes.length; i++) {
    h ^= bytes[i];
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(16).padStart(8, '0');
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function smoothstep(t: number): number {
  return t * t * (3 - 2 * t);
}

function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v));
}

/** Deterministic 0..1 hash of an integer coordinate pair. */
function hash2(x: number, y: number, seed: number): number {
  let h = seed >>> 0;
  h = Math.imul(h ^ (x + 0x9e3779b9), 0x85ebca6b);
  h = Math.imul(h ^ (y + 0xc2b2ae35), 0x27d4eb2f);
  h ^= h >>> 15;
  h = Math.imul(h, 0x165667b1);
  h ^= h >>> 15;
  return (h >>> 0) / 4294967296;
}

/* ------------------------------------------------------------------ */
/* Image — noise / fractals / fields / L-systems                       */
/* ------------------------------------------------------------------ */

export interface NoiseOptions {
  seed?: number;
  /** Lattice cell size in pixels (>=1). */
  scale?: number;
  /** Fractal octaves (1..8). */
  octaves?: number;
  /** Persistence between octaves (0..1). */
  persistence?: number;
}

/**
 * Perlin-style value noise: lattice of seeded random values interpolated
 * with smoothstep, optionally fractal (multi-octave). Returns 0..1.
 */
export function perlinNoise(width: number, height: number, opts: NoiseOptions = {}): Float32Array {
  const seed = opts.seed ?? 1337;
  const octaves = Math.max(1, Math.min(8, opts.octaves ?? 1));
  const persistence = opts.persistence ?? 0.5;
  const baseScale = Math.max(1, opts.scale ?? 16);
  const minCell = baseScale / Math.pow(2, octaves - 1);
  const gw = Math.ceil(width / minCell) + 2;
  const gh = Math.ceil(height / minCell) + 2;
  const lattice = new Float32Array(gw * gh);
  const rand = mulberry32(seed);
  for (let i = 0; i < lattice.length; i++) lattice[i] = rand();
  const out = new Float32Array(width * height);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let amp = 1;
      let freq = 1;
      let total = 0;
      let norm = 0;
      for (let o = 0; o < octaves; o++) {
        const sx = (x * freq) / baseScale;
        const sy = (y * freq) / baseScale;
        const x0 = Math.floor(sx);
        const y0 = Math.floor(sy);
        const tx = smoothstep(sx - x0);
        const ty = smoothstep(sy - y0);
        const v00 = lattice[y0 * gw + x0];
        const v10 = lattice[y0 * gw + (x0 + 1)];
        const v01 = lattice[(y0 + 1) * gw + x0];
        const v11 = lattice[(y0 + 1) * gw + (x0 + 1)];
        total += lerp(lerp(v00, v10, tx), lerp(v01, v11, tx), ty) * amp;
        norm += amp;
        amp *= persistence;
        freq *= 2;
      }
      out[y * width + x] = total / norm;
    }
  }
  return out;
}

const GRAD2: Array<[number, number]> = [
  [1, 1],
  [-1, 1],
  [1, -1],
  [-1, -1],
  [1, 0],
  [-1, 0],
  [0, 1],
  [0, -1],
];

/** 2D Simplex gradient noise at a point — range roughly -1..1. */
export function simplexNoise2D(x: number, y: number, seed = 1337): number {
  const F2 = 0.5 * (Math.sqrt(3) - 1);
  const G2 = (3 - Math.sqrt(3)) / 6;
  const s = (x + y) * F2;
  const i = Math.floor(x + s);
  const j = Math.floor(y + s);
  const t = (i + j) * G2;
  const x0 = x - (i - t);
  const y0 = y - (j - t);
  const i1 = x0 > y0 ? 1 : 0;
  const j1 = x0 > y0 ? 0 : 1;
  const x1 = x0 - i1 + G2;
  const y1 = y0 - j1 + G2;
  const x2 = x0 - 1 + 2 * G2;
  const y2 = y0 - 1 + 2 * G2;
  const gi = (ii: number, jj: number) => GRAD2[Math.floor(hash2(ii, jj, seed) * GRAD2.length)];
  const contrib = (gx: number, gy: number, dx: number, dy: number): number => {
    let t2 = 0.5 - dx * dx - dy * dy;
    if (t2 < 0) return 0;
    t2 *= t2;
    return t2 * t2 * (gx * dx + gy * dy);
  };
  const [g00x, g00y] = gi(i, j);
  const [g10x, g10y] = gi(i + i1, j + j1);
  const [g01x, g01y] = gi(i + 1, j + 1);
  return 70 * (contrib(g00x, g00y, x0, y0) + contrib(g10x, g10y, x1, y1) + contrib(g01x, g01y, x2, y2));
}

/** Simplex noise field — returns values normalized to 0..1. */
export function simplexNoiseField(width: number, height: number, opts: { seed?: number; scale?: number } = {}): Float32Array {
  const seed = opts.seed ?? 1337;
  const scale = Math.max(1, opts.scale ?? 16);
  const out = new Float32Array(width * height);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      out[y * width + x] = 0.5 + 0.5 * simplexNoise2D(x / scale, y / scale, seed);
    }
  }
  return out;
}

export interface FractalOptions {
  /** Center of the viewport in the complex plane. */
  center?: [number, number];
  /** Zoom: 1 = unit width viewport, larger = deeper. */
  zoom?: number;
  maxIter?: number;
}

/** Mandelbrot set: iteration counts normalized 0..1 (0 = outside fast). */
export function mandelbrot(width: number, height: number, opts: FractalOptions = {}): Float32Array {
  const [cx, cy] = opts.center ?? [-0.5, 0];
  const zoom = Math.max(0.0001, opts.zoom ?? 1);
  const maxIter = Math.max(4, Math.min(512, opts.maxIter ?? 64));
  const aspect = width / height;
  const halfH = 1.5 / zoom;
  const halfW = halfH * aspect;
  const out = new Float32Array(width * height);
  for (let py = 0; py < height; py++) {
    const im = cy + halfH - (py / height) * 2 * halfH;
    for (let px = 0; px < width; px++) {
      const re = cx - halfW + (px / width) * 2 * halfW;
      let zr = 0;
      let zi = 0;
      let iter = 0;
      while (iter < maxIter && zr * zr + zi * zi <= 4) {
        const nzr = zr * zr - zi * zi + re;
        zi = 2 * zr * zi + im;
        zr = nzr;
        iter++;
      }
      out[py * width + px] = iter / maxIter;
    }
  }
  return out;
}

/**
 * Flow field: a smooth angle (0..2π) per cell, derived from seeded value
 * noise — the basis for particle trails and vector-art strokes.
 */
export function flowField(width: number, height: number, opts: { seed?: number } = {}): Float32Array {
  const seed = opts.seed ?? 7;
  const out = new Float32Array(width * height);
  const cell = 8;
  const gw = Math.ceil(width / cell) + 2;
  const gh = Math.ceil(height / cell) + 2;
  const lattice = new Float32Array(gw * gh);
  const rand = mulberry32(seed);
  for (let i = 0; i < lattice.length; i++) lattice[i] = rand();
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const sx = x / cell;
      const sy = y / cell;
      const x0 = Math.floor(sx);
      const y0 = Math.floor(sy);
      const tx = smoothstep(sx - x0);
      const ty = smoothstep(sy - y0);
      const v = lerp(lerp(lattice[y0 * gw + x0], lattice[y0 * gw + (x0 + 1)], tx), lerp(lattice[(y0 + 1) * gw + x0], lattice[(y0 + 1) * gw + (x0 + 1)], tx), ty);
      out[y * width + x] = v * Math.PI * 2;
    }
  }
  return out;
}

/** L-system expansion (turtle-graphics alphabet). Deterministic, capped. */
export function lSystem(axiom: string, rules: Record<string, string>, iterations: number, maxLen = 200_000): string {
  let s = axiom;
  for (let i = 0; i < iterations && s.length < maxLen; i++) {
    let next = '';
    for (const ch of s) next += rules[ch] ?? ch;
    s = next;
  }
  return s.slice(0, maxLen);
}

/** Render a grayscale value field as a self-contained SVG (Dark-Obsidian friendly). */
export function valuesToSvg(values: Float32Array, width: number, height: number, opts: { cell?: number; idPrefix?: string } = {}): string {
  const cell = Math.max(1, opts.cell ?? 1);
  const id = opts.idPrefix ?? 'gen';
  const w = width * cell;
  const h = height * cell;
  let rects = '';
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const v = clamp(values[y * width + x], 0, 1);
      const lum = Math.round(v * 255);
      rects += `<rect x="${x * cell}" y="${y * cell}" width="${cell}" height="${cell}" fill="rgb(${lum},${lum},${lum})"/>`;
    }
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" role="img" aria-labelledby="${id}-title ${id}-desc"><title id="${id}-title">Generative value field</title><desc id="${id}-desc">Deterministic procedural grayscale field, ${width}x${height} cells.</desc>${rects}</svg>`;
}

/** Render a value field with a color ramp palette (hex stops). */
export function valuesToSvgPalette(values: Float32Array, width: number, height: number, palette: string[], opts: { cell?: number; idPrefix?: string } = {}): string {
  const cell = Math.max(1, opts.cell ?? 1);
  const id = opts.idPrefix ?? 'genp';
  const w = width * cell;
  const h = height * cell;
  let rects = '';
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const v = clamp(values[y * width + x], 0, 1);
      const idx = Math.min(palette.length - 1, Math.floor(v * palette.length));
      rects += `<rect x="${x * cell}" y="${y * cell}" width="${cell}" height="${cell}" fill="${palette[idx]}"/>`;
    }
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" role="img" aria-labelledby="${id}-title ${id}-desc"><title id="${id}-title">Generative palette field</title><desc id="${id}-desc">Deterministic procedural field, ${width}x${height} cells.</desc>${rects}</svg>`;
}

/* ------------------------------------------------------------------ */
/* Video — keyframes / particles / camera / scene plan                 */
/* ------------------------------------------------------------------ */

export interface Keyframe<T = number[]> {
  t: number; // 0..1
  value: T;
}

/** Interpolate keyframes at t (0..1). Methods: 'linear' | 'cubic'. */
export function interpolateKeyframes(keyframes: Keyframe[], t: number, method: 'linear' | 'cubic' = 'linear'): number[] {
  if (keyframes.length === 0) return [];
  if (keyframes.length === 1) return [...keyframes[0].value];
  const sorted = [...keyframes].sort((a, b) => a.t - b.t);
  const tc = clamp(t, sorted[0].t, sorted[sorted.length - 1].t);
  let i = 0;
  while (i < sorted.length - 1 && sorted[i + 1].t < tc) i++;
  const a = sorted[i];
  const b = sorted[Math.min(i + 1, sorted.length - 1)];
  const span = Math.max(1e-9, b.t - a.t);
  const lt = (tc - a.t) / span;
  const n = Math.max(a.value.length, b.value.length);
  const out: number[] = [];
  for (let k = 0; k < n; k++) {
    const va = a.value[k] ?? 0;
    const vb = b.value[k] ?? 0;
    if (method === 'cubic' && i > 0 && i < sorted.length - 2) {
      const p0 = sorted[i - 1].value[k] ?? va;
      const p3 = sorted[i + 2].value[k] ?? vb;
      out.push(catmullRom(p0, va, vb, p3, lt));
    } else {
      out.push(lerp(va, vb, lt));
    }
  }
  return out;
}

/** Cubic Catmull-Rom interpolation between p1..p2 with neighbors p0/p3. */
export function catmullRom(p0: number, p1: number, p2: number, p3: number, t: number): number {
  const t2 = t * t;
  const t3 = t2 * t;
  return 0.5 * (2 * p1 + (-p0 + p2) * t + (2 * p0 - 5 * p1 + 4 * p2 - p3) * t2 + (-p0 + 3 * p1 - 3 * p2 + p3) * t3);
}

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number; // 1 -> 0
  size: number;
}

export interface ParticleOptions {
  count?: number;
  seed?: number;
  steps?: number;
  dt?: number;
  gravity?: number; // px/s^2 (negative = up)
  wind?: number; // px/s
  friction?: number; // 0..1 per second
  spread?: number; // spawn box half-size in px
  life?: number; // initial life 0..1
  minSize?: number;
  maxSize?: number;
}

/** Deterministic particle simulation — one frame array per step. */
export function particleFrames(opts: ParticleOptions = {}): Particle[][] {
  const count = Math.max(1, opts.count ?? 64);
  const seed = opts.seed ?? 42;
  const steps = Math.max(1, opts.steps ?? 30);
  const dt = opts.dt ?? 1 / 30;
  const gravity = opts.gravity ?? 40;
  const wind = opts.wind ?? 0;
  const friction = clamp(opts.friction ?? 0, 0, 1);
  const spread = Math.max(1, opts.spread ?? 64);
  const minSize = opts.minSize ?? 1;
  const maxSize = opts.maxSize ?? 4;
  const rand = mulberry32(seed);
  const particles: Particle[] = [];
  for (let i = 0; i < count; i++) {
    particles.push({
      x: (rand() * 2 - 1) * spread,
      y: (rand() * 2 - 1) * spread,
      vx: (rand() * 2 - 1) * 20,
      vy: (rand() * 2 - 1) * 20,
      life: opts.life ?? 0.5 + rand() * 0.5,
      size: minSize + rand() * (maxSize - minSize),
    });
  }
  const frames: Particle[][] = [];
  for (let s = 0; s < steps; s++) {
    const frame: Particle[] = [];
    for (const p of particles) {
      p.vy += gravity * dt;
      p.vx += wind * dt;
      const f = Math.max(0, 1 - friction * dt);
      p.vx *= f;
      p.vy *= f;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.life = Math.max(0, p.life - dt);
      frame.push({ ...p });
    }
    frames.push(frame);
  }
  return frames;
}

export interface KenBurnsFrame {
  t: number; // 0..1 within the shot
  frame: number;
  x: number;
  y: number;
  w: number;
  h: number;
  zoom: number;
}

export interface KenBurnsOptions {
  width?: number;
  height?: number;
  startZoom?: number;
  endZoom?: number;
  /** Pan of the crop window center, in fractions of the frame (0..1). */
  pan?: [number, number, number, number]; // [x0, y0, x1, y1]
  ease?: 'linear' | 'ease-in-out';
}

/** Parametric Ken Burns camera: crop windows per frame, fully deterministic. */
export function kenBurnsFrames(durationSec: number, fps: number, opts: KenBurnsOptions = {}): KenBurnsFrame[] {
  const width = opts.width ?? 1920;
  const height = opts.height ?? 1080;
  const startZoom = Math.max(1, opts.startZoom ?? 1);
  const endZoom = Math.max(startZoom, opts.endZoom ?? 1.15);
  const pan = opts.pan ?? [0.5, 0.5, 0.5, 0.5];
  const frames = Math.max(1, Math.round(durationSec * fps));
  const out: KenBurnsFrame[] = [];
  for (let f = 0; f < frames; f++) {
    const t = frames === 1 ? 0 : f / (frames - 1);
    let et = t;
    if (opts.ease === 'ease-in-out') et = smoothstep(t);
    const zoom = lerp(startZoom, endZoom, et);
    const cxp = lerp(pan[0], pan[2], et);
    const cyp = lerp(pan[1], pan[3], et);
    const w = width / zoom;
    const h = height / zoom;
    const x = clamp(cxp - 0.5, 0, 1 - w / width) * (width - w);
    const y = clamp(cyp - 0.5, 0, 1 - h / height) * (height - h);
    out.push({ t, frame: f, x, y, w, h, zoom });
  }
  return out;
}

export interface VideoScene {
  durationSec: number;
  camera?: KenBurnsOptions;
  label?: string;
}

export interface VideoPlan {
  fps: number;
  width: number;
  height: number;
  frames: Array<{ scene: number; frame: number; x: number; y: number; w: number; h: number; zoom: number }>;
  sceneRanges: Array<{ scene: number; label: string; start: number; end: number; durationSec: number }>;
  checksum: string;
}

/** Deterministic multi-scene video plan (camera windows per scene). */
export function buildVideoPlan(scenes: VideoScene[], opts: { fps?: number; width?: number; height?: number } = {}): VideoPlan {
  const fps = opts.fps ?? 30;
  const width = opts.width ?? 1920;
  const height = opts.height ?? 1080;
  if (scenes.length === 0) throw new Error('buildVideoPlan requiere >= 1 escena');
  const frames: VideoPlan['frames'] = [];
  const sceneRanges: VideoPlan['sceneRanges'] = [];
  let frame = 0;
  scenes.forEach((scene, si) => {
    const kf = kenBurnsFrames(scene.durationSec, fps, { width, height, ...scene.camera });
    const start = frame;
    for (const f of kf) {
      frames.push({ scene: si, frame, x: f.x, y: f.y, w: f.w, h: f.h, zoom: f.zoom });
      frame++;
    }
    sceneRanges.push({ scene: si, label: scene.label ?? `escena ${si + 1}`, start, end: frame - 1, durationSec: scene.durationSec });
  });
  const checksum = fnv1a(frames.map((f) => f.x + f.y * 0.001 + f.w * 0.000001 + f.h * 0.000000001 + f.zoom));
  return { fps, width, height, frames, sceneRanges, checksum };
}

/* ------------------------------------------------------------------ */
/* Audio — oscillators / FM / granular / noise / ADSR / sequencer      */
/* ------------------------------------------------------------------ */

export type WaveType = 'sine' | 'square' | 'saw' | 'triangle';

export interface WaveOptions extends SynthOptions {
  type?: WaveType;
  /** Detune in cents for layered thickness. */
  detuneCents?: number;
}

function oscSample(type: WaveType, phase: number): number {
  switch (type) {
    case 'sine':
      return Math.sin(phase);
    case 'square':
      return Math.sin(phase) >= 0 ? 1 : -1;
    case 'saw':
      return 2 * ((phase / (2 * Math.PI)) % 1) - 1;
    case 'triangle':
      return (2 / Math.PI) * Math.asin(Math.sin(phase));
  }
}

function pcmFromSamples(samples: Float32Array, gain: number): Int16Array {
  const out = new Int16Array(samples.length);
  for (let i = 0; i < samples.length; i++) {
    const v = Math.max(-1, Math.min(1, samples[i] * gain));
    out[i] = v < 0 ? v * 0x8000 : v * 0x7fff;
  }
  return out;
}

function baseResult(kind: string, pcm: Int16Array, durationSec: number): SynthResult {
  return { pcm, sampleRate: SAMPLE_RATE, durationSec, kind };
}

/** Basic waveform oscillator with optional detune. */
export function synthWave(opts: WaveOptions = {}): SynthResult {
  const durationSec = opts.durationSec ?? 1;
  const freq = opts.freq ?? 440;
  const type = opts.type ?? 'sine';
  const n = Math.floor(SAMPLE_RATE * durationSec);
  const samples = new Float32Array(n);
  const detune = opts.detuneCents ?? 0;
  const f2 = freq * Math.pow(2, detune / 1200);
  for (let i = 0; i < n; i++) {
    const t = i / SAMPLE_RATE;
    const phase = 2 * Math.PI * f2 * t;
    samples[i] = oscSample(type, phase);
  }
  return baseResult(`wave:${type}`, pcmFromSamples(samples, opts.gain ?? 0.5), durationSec);
}

export interface FmOptions extends SynthOptions {
  carrier?: number;
  mod?: number;
  modIndex?: number;
}

/** FM synthesis: carrier modulated by a sine modulator (deterministic). */
export function synthFm(opts: FmOptions = {}): SynthResult {
  const durationSec = opts.durationSec ?? 1;
  const carrier = opts.carrier ?? opts.freq ?? 220;
  const mod = opts.mod ?? carrier * 3;
  const modIndex = opts.modIndex ?? 3;
  const n = Math.floor(SAMPLE_RATE * durationSec);
  const samples = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const t = i / SAMPLE_RATE;
    samples[i] = Math.sin(2 * Math.PI * carrier * t + modIndex * Math.sin(2 * Math.PI * mod * t));
  }
  return baseResult('fm', pcmFromSamples(samples, opts.gain ?? 0.5), durationSec);
}

export interface GranularOptions extends SynthOptions {
  grainDurSec?: number;
  grainsPerSec?: number;
  jitter?: number; // 0..1 pitch randomness
}

/** Granular synthesis: overlapping short grains with raised-cosine envelopes. */
export function synthGranular(opts: GranularOptions = {}): SynthResult {
  const durationSec = opts.durationSec ?? 1.5;
  const freqBase = opts.freq ?? 440;
  const grainDur = Math.max(0.01, opts.grainDurSec ?? 0.08);
  const grainsPerSec = Math.max(1, opts.grainsPerSec ?? 12);
  const jitter = clamp(opts.jitter ?? 0.15, 0, 1);
  const seed = opts.seed ?? 99;
  const rand = mulberry32(seed);
  const n = Math.floor(SAMPLE_RATE * durationSec);
  const samples = new Float32Array(n);
  const grainN = Math.floor(SAMPLE_RATE * grainDur);
  let t = 0;
  while (t < durationSec) {
    const start = Math.floor(t * SAMPLE_RATE);
    const freq = freqBase * (1 + (rand() * 2 - 1) * jitter);
    const amp = 0.4 + rand() * 0.6;
    for (let i = 0; i < grainN && start + i < n; i++) {
      const p = i / grainN;
      const env = 0.5 - 0.5 * Math.cos(Math.PI * 2 * p * 0.5); // raised cosine window
      samples[start + i] += amp * Math.sin(2 * Math.PI * freq * (i / SAMPLE_RATE)) * env;
    }
    t += 1 / grainsPerSec;
  }
  return baseResult('granular', pcmFromSamples(samples, opts.gain ?? 0.6), durationSec);
}

/** Pink noise (Paul Kellet filter) — deterministic. */
export function synthPinkNoise(opts: SynthOptions = {}): SynthResult {
  const durationSec = opts.durationSec ?? 1.5;
  const seed = opts.seed ?? 555;
  const rand = mulberry32(seed);
  const n = Math.floor(SAMPLE_RATE * durationSec);
  const samples = new Float32Array(n);
  let b0 = 0;
  let b1 = 0;
  let b2 = 0;
  let b3 = 0;
  let b4 = 0;
  let b5 = 0;
  let b6 = 0;
  for (let i = 0; i < n; i++) {
    const white = rand() * 2 - 1;
    b0 = 0.99886 * b0 + white * 0.0555179;
    b1 = 0.99332 * b1 + white * 0.0750759;
    b2 = 0.969 * b2 + white * 0.153852;
    b3 = 0.8665 * b3 + white * 0.3104856;
    b4 = 0.55 * b4 + white * 0.5329522;
    b5 = -0.7616 * b5 - white * 0.016898;
    samples[i] = b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362;
    b6 = white * 0.115926;
  }
  return baseResult('pink', pcmFromSamples(samples, opts.gain ?? 0.35), durationSec);
}

export interface AdsrOptions {
  attackSec?: number;
  decaySec?: number;
  sustain?: number; // 0..1
  releaseSec?: number;
}

/** Apply an ADSR envelope to a synthesis result (in place on a copy). */
export function applyAdsr(result: SynthResult, opts: AdsrOptions = {}): SynthResult {
  const attack = Math.max(0, opts.attackSec ?? 0.01);
  const decay = Math.max(0, opts.decaySec ?? 0.1);
  const sustain = clamp(opts.sustain ?? 0.7, 0, 1);
  const release = Math.max(0, opts.releaseSec ?? 0.2);
  const n = result.pcm.length;
  const aN = Math.floor(attack * SAMPLE_RATE);
  const dN = Math.floor(decay * SAMPLE_RATE);
  const rN = Math.floor(release * SAMPLE_RATE);
  const out = new Int16Array(n);
  for (let i = 0; i < n; i++) {
    let env: number;
    if (i < aN) {
      env = aN > 0 ? i / aN : 1;
    } else if (i < aN + dN) {
      env = dN > 0 ? 1 - (1 - sustain) * ((i - aN) / dN) : sustain;
    } else if (i > n - rN) {
      env = rN > 0 ? sustain * ((n - i) / rN) : sustain;
    } else {
      env = sustain;
    }
    out[i] = Math.round(result.pcm[i] * env);
  }
  return { ...result, pcm: out };
}

export interface NoteStep {
  /** Step index (0-based), 16 steps per bar. */
  step: number;
  freq: number;
  type?: WaveType;
  gain?: number;
}

export interface SequencerOptions {
  bpm?: number;
  pattern: NoteStep[];
  bars?: number;
  seed?: number;
}

/** BPM sequencer: schedules waveform notes on a 16-step grid. */
export function sequenceNotes(opts: SequencerOptions): SynthResult {
  const bpm = opts.bpm ?? 120;
  const bars = Math.max(1, opts.bars ?? 1);
  const stepSec = 60 / bpm / 4;
  const totalSteps = bars * 16;
  const durationSec = totalSteps * stepSec;
  const n = Math.floor(SAMPLE_RATE * durationSec);
  const mix = new Float32Array(n);
  for (const note of opts.pattern) {
    if (note.step < 0 || note.step >= totalSteps) continue;
    const start = Math.floor(note.step * stepSec * SAMPLE_RATE);
    const noteSec = stepSec * 0.9;
    const noteN = Math.min(Math.floor(noteSec * SAMPLE_RATE), n - start);
    if (noteN <= 0) continue;
    const type = note.type ?? 'sine';
    for (let i = 0; i < noteN; i++) {
      const t = i / SAMPLE_RATE;
      const env = 0.5 - 0.5 * Math.cos((Math.PI * i) / noteN); // attack-release window
      mix[start + i] += oscSample(type, 2 * Math.PI * note.freq * t) * env * (note.gain ?? 0.5);
    }
  }
  return baseResult(`seq:${bpm}bpm`, pcmFromSamples(mix, 0.9), durationSec);
}

/** Mix multiple synthesis results into one (duration = longest). */
export function mixSynths(results: SynthResult[]): SynthResult {
  if (results.length === 0) return baseResult('mix', new Int16Array(0), 0);
  const n = Math.max(...results.map((r) => r.pcm.length));
  const mix = new Float32Array(n);
  for (const r of results) {
    for (let i = 0; i < r.pcm.length; i++) mix[i] += r.pcm[i] / 0x8000;
  }
  return baseResult(`mix:${results.length}`, pcmFromSamples(mix, 0.85), n / SAMPLE_RATE);
}

/* ------------------------------------------------------------------ */
/* Facade                                                              */
/* ------------------------------------------------------------------ */

export const generative = {
  mulberry32,
  fnv1a,
  fnv1aStr,
  perlinNoise,
  simplexNoise2D,
  simplexNoiseField,
  mandelbrot,
  flowField,
  lSystem,
  valuesToSvg,
  valuesToSvgPalette,
  interpolateKeyframes,
  catmullRom,
  particleFrames,
  kenBurnsFrames,
  buildVideoPlan,
  synthWave,
  synthFm,
  synthGranular,
  synthPinkNoise,
  applyAdsr,
  sequenceNotes,
  mixSynths,
  encodeWav,
};

export { encodeWav };
export type { SynthResult, SynthOptions };