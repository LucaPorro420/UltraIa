/**
 * Procedural sound synthesis from scratch — generates WAV audio entirely in
 * memory with no external deps, no samples, no ffmpeg, no network.
 *
 * Each synth returns a `PCM16` buffer (16-bit signed mono, 44.1kHz) plus a
 * WAV encoder. This is the "generate sound from nothing" layer of UltraIa OMAG:
 * tones, noise, beats, ambience, whooshes and impacts.
 */

export const SAMPLE_RATE = 44_100;

export interface SynthOptions {
  durationSec?: number;
  /** Base frequency in Hz. */
  freq?: number;
  /** Amplitude 0..1. */
  gain?: number;
  /** Deterministic seed for noise-based patches. */
  seed?: number;
}

export interface SynthResult {
  /** 16-bit signed PCM mono samples. */
  pcm: Int16Array;
  sampleRate: number;
  durationSec: number;
  kind: string;
}

/** A seedable PRNG (mulberry32) for deterministic noise. */
function rng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function envelopes(n: number, kind: 'exp' | 'lin'): Float32Array {
  const env = new Float32Array(n);
  const attack = Math.max(1, Math.floor(n * 0.01));
  const release = Math.max(1, Math.floor(n * 0.15));
  for (let i = 0; i < n; i++) {
    let a = 1;
    if (i < attack) a = i / attack;
    else if (i > n - release) a = (n - i) / release;
    if (kind === 'exp') a = a * a;
    env[i] = a;
  }
  return env;
}

function toPcm(samples: Float32Array, gain: number): Int16Array {
  const out = new Int16Array(samples.length);
  for (let i = 0; i < samples.length; i++) {
    const v = Math.max(-1, Math.min(1, samples[i] * gain));
    out[i] = v < 0 ? v * 0x8000 : v * 0x7fff;
  }
  return out;
}

/** Pure sine tone with an envelope. */
export function synthTone(opts: SynthOptions = {}): SynthResult {
  const durationSec = opts.durationSec ?? 1;
  const freq = opts.freq ?? 440;
  const n = Math.floor(SAMPLE_RATE * durationSec);
  const env = envelopes(n, 'exp');
  const samples = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    samples[i] = Math.sin((2 * Math.PI * freq * i) / SAMPLE_RATE) * env[i];
  }
  return { pcm: toPcm(samples, opts.gain ?? 0.5), sampleRate: SAMPLE_RATE, durationSec, kind: 'tone' };
}

/** White/brown noise with a low-pass feel for ambience/air. */
export function synthNoise(opts: SynthOptions = {}): SynthResult {
  const durationSec = opts.durationSec ?? 1.5;
  const n = Math.floor(SAMPLE_RATE * durationSec);
  const rand = rng(opts.seed ?? 1337);
  const env = envelopes(n, 'exp');
  const samples = new Float32Array(n);
  let last = 0;
  for (let i = 0; i < n; i++) {
    const white = rand() * 2 - 1;
    last = (last + 0.02 * white) / 1.02; // crude one-pole low-pass → "brown" feel
    samples[i] = last * 4 * env[i];
  }
  return { pcm: toPcm(samples, opts.gain ?? 0.3), sampleRate: SAMPLE_RATE, durationSec, kind: 'noise' };
}

/** A short percussive impact (fast attack, exp decay). */
export function synthImpact(opts: SynthOptions = {}): SynthResult {
  const durationSec = opts.durationSec ?? 0.25;
  const freq = opts.freq ?? 180;
  const n = Math.floor(SAMPLE_RATE * durationSec);
  const rand = rng(opts.seed ?? 99);
  const samples = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const decay = Math.exp(-18 * (i / n));
    const osc = Math.sin((2 * Math.PI * freq * i) / SAMPLE_RATE) * (1 - i / n);
    const hit = (rand() * 2 - 1) * 0.6 * decay;
    samples[i] = osc * decay + hit;
  }
  return { pcm: toPcm(samples, opts.gain ?? 0.7), sampleRate: SAMPLE_RATE, durationSec, kind: 'impact' };
}

/** Rising sweep — classic UI/transition whoosh. */
export function synthWhoosh(opts: SynthOptions = {}): SynthResult {
  const durationSec = opts.durationSec ?? 0.6;
  const n = Math.floor(SAMPLE_RATE * durationSec);
  const rand = rng(opts.seed ?? 7);
  const env = envelopes(n, 'exp');
  const samples = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const t = i / n;
    const freq = 300 + 2600 * t * t; // pitch rises
    const osc = Math.sin((2 * Math.PI * freq * i) / SAMPLE_RATE);
    const air = (rand() * 2 - 1) * 0.5 * (0.5 + 0.5 * t);
    samples[i] = (osc * 0.6 + air) * env[i];
  }
  return { pcm: toPcm(samples, opts.gain ?? 0.4), sampleRate: SAMPLE_RATE, durationSec, kind: 'whoosh' };
}

/** A four-on-the-floor kick/beat loop (bass thump on the downbeat). */
export function synthBeat(opts: SynthOptions = {}): SynthResult {
  const bpm = 120;
  const beatSec = 60 / bpm;
  const bars = Math.max(1, Math.ceil((opts.durationSec ?? 2) / (4 * beatSec)));
  const durationSec = bars * 4 * beatSec;
  const n = Math.floor(SAMPLE_RATE * durationSec);
  const kickFreq = opts.freq ?? 55;
  const samples = new Float32Array(n);
  const beatN = Math.floor(SAMPLE_RATE * beatSec);
  for (let bar = 0; bar < bars; bar++) {
    for (let b = 0; b < 4; b++) {
      const start = (bar * 4 + b) * beatN;
      const kickLen = Math.min(beatN, Math.floor(SAMPLE_RATE * 0.12));
      for (let i = 0; i < kickLen && start + i < n; i++) {
        const t = i / SAMPLE_RATE;
        const pitch = kickFreq * Math.pow(2, -12 * t); // pitch drop thump
        const osc = Math.sin(2 * Math.PI * pitch * t);
        const decay = Math.exp(-30 * t);
        samples[start + i] += osc * decay;
      }
      // light hat on the off-beats
      if (b % 2 === 1) {
        const hatLen = Math.min(beatN, Math.floor(SAMPLE_RATE * 0.03));
        for (let i = 0; i < hatLen && start + i < n; i++) {
          const noise = (rng(start + i)() * 2 - 1) * Math.exp(-80 * (i / SAMPLE_RATE));
          samples[start + i] += noise * 0.4;
        }
      }
    }
  }
  return { pcm: toPcm(samples, opts.gain ?? 0.6), sampleRate: SAMPLE_RATE, durationSec, kind: 'beat' };
}

/** Layered ambience bed: low drone + air for calm scenes. */
export function synthAmbience(opts: SynthOptions = {}): SynthResult {
  const durationSec = opts.durationSec ?? 4;
  const n = Math.floor(SAMPLE_RATE * durationSec);
  const env = envelopes(n, 'exp');
  const rand = rng(opts.seed ?? 42);
  const base = opts.freq ?? 110;
  const samples = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const t = i / SAMPLE_RATE;
    const drone = 0.5 * Math.sin(2 * Math.PI * base * t) + 0.25 * Math.sin(2 * Math.PI * base * 1.5 * t);
    const air = (rand() * 2 - 1) * 0.06;
    samples[i] = (drone + air) * env[i];
  }
  return { pcm: toPcm(samples, opts.gain ?? 0.25), sampleRate: SAMPLE_RATE, durationSec, kind: 'ambience' };
}

/** High-level dispatcher: build a sound by kind. */
export function synthSound(kind: string, opts: SynthOptions = {}): SynthResult {
  switch (kind) {
    case 'tone':
      return synthTone(opts);
    case 'noise':
      return synthNoise(opts);
    case 'impact':
      return synthImpact(opts);
    case 'whoosh':
      return synthWhoosh(opts);
    case 'beat':
      return synthBeat(opts);
    case 'ambience':
      return synthAmbience(opts);
    default:
      throw new Error(`Unknown sound kind: ${kind}`);
  }
}

/** Encode PCM16 mono to a WAV file buffer. */
export function encodeWav(result: SynthResult): Buffer {
  const numSamples = result.pcm.length;
  const dataSize = numSamples * 2;
  const buffer = Buffer.alloc(44 + dataSize);
  buffer.write('RIFF', 0);
  buffer.writeUInt32LE(36 + dataSize, 4);
  buffer.write('WAVE', 8);
  buffer.write('fmt ', 12);
  buffer.writeUInt32LE(16, 16); // fmt chunk size
  buffer.writeUInt16LE(1, 20); // PCM
  buffer.writeUInt16LE(1, 22); // mono
  buffer.writeUInt32LE(result.sampleRate, 24);
  buffer.writeUInt32LE(result.sampleRate * 2, 28); // byte rate
  buffer.writeUInt16LE(2, 32); // block align
  buffer.writeUInt16LE(16, 34); // bits per sample
  buffer.write('data', 36);
  buffer.writeUInt32LE(dataSize, 40);
  for (let i = 0; i < numSamples; i++) {
    buffer.writeInt16LE(result.pcm[i], 44 + i * 2);
  }
  return buffer;
}