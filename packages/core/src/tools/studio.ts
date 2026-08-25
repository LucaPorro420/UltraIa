/**
 * Studio v2 — Media Hub (loop-104).
 *
 * QUÉ ES: dominio puro y determinista del media hub del Studio: planes de
 * guardado, síntesis WAV keyless de una composición musical, planes de
 * derivación (re-roll generativo, resíntesis con parámetros nuevos, slideshow
 * MP4 vía argv ffmpeg) y el esquema de la tool `studio_asset`.
 *
 * POR QUÉ: hasta loop-104 el Studio mantenía los resultados solo en estado de
 * React — no se podían guardar, reproducir, descargar ni modificar. Este módulo
 * centraliza las REGLAS (validación, mapeos, argv) para que la API web y la UI
 * solo ejecuten; nada aquí toca red, disco ni ffmpeg (los planes son datos).
 */

import { z } from 'zod';
import { SAMPLE_RATE, synthAmbience, synthTone, encodeWav } from '../omag/sound';
import { OSS_CATALOG, validateCatalog, type OssEntry } from './studio-catalog';

/* ------------------------------------------------------------------ */
/* Tipos base del media hub                                            */
/* ------------------------------------------------------------------ */

export const STUDIO_MEDIA_TYPES = ['image', 'audio', 'video', 'music', 'tts', 'design', 'text'] as const;
export type StudioMediaType = (typeof STUDIO_MEDIA_TYPES)[number];

/** Carpeta canónica del cloud según el tipo de asset (layout CLOUD_LAYOUT). */
export const STUDIO_CLOUD_DIR_BY_TYPE: Record<StudioMediaType, string> = {
  image: 'media/images',
  video: 'media/videos',
  music: 'media/audio',
  audio: 'media/audio',
  tts: 'media/audio',
  design: 'media/design',
  text: 'exports/notes',
};

const MIME_BY_KIND: Record<string, StudioMediaType> = {
  'image/png': 'image',
  'image/jpeg': 'image',
  'image/webp': 'image',
  'image/gif': 'image',
  'audio/wav': 'music',
  'audio/x-wav': 'music',
  'audio/mpeg': 'audio',
  'audio/mp4': 'audio',
  'audio/ogg': 'audio',
  'video/mp4': 'video',
  'video/webm': 'video',
  'text/html': 'design',
  'text/plain': 'text',
};

/** Mapea un content-type HTTP a un mediaType del hub ('text' si desconocido). */
export function assetKindFromMime(mime: string): StudioMediaType {
  return MIME_BY_KIND[(mime || '').toLowerCase().split(';')[0].trim()] ?? 'text';
}

/* ------------------------------------------------------------------ */
/* Plan de guardado                                                    */
/* ------------------------------------------------------------------ */

export const studioAssetInputSchema = z.object({
  prompt: z.string().min(1).max(2000),
  url: z.string().min(1).max(2048),
  provider: z.string().min(1).max(50),
  model: z.string().max(80).default(''),
  mediaType: z.enum(STUDIO_MEDIA_TYPES).default('image'),
  seed: z.number().int().optional(),
  width: z.number().int().positive().max(8192).optional(),
  height: z.number().int().positive().max(8192).optional(),
  parentId: z.string().min(1).max(64).optional(),
  /** Metadata flexible persistida en metaJson (filters CSS, frames, composición…). */
  meta: z.record(z.unknown()).optional(),
});

export type StudioAssetInput = z.infer<typeof studioAssetInputSchema>;

export interface SavePlan {
  asset: z.infer<typeof studioAssetInputSchema>;
  /** Nombre base slug para el binario en el cloud (sin extensión). */
  fileName: string;
  /** Carpeta destino en el cloud según mediaType. */
  cloudDir: string;
}

/** PRNG mulberry32 determinista (misma familia que omag/sound). */
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

/** Slug corto desde el prompt (a-z0-9, guiones, máx 40 chars). */
export function slugifyPrompt(prompt: string): string {
  const base = (prompt || 'asset')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40)
    .replace(/-+$/, '');
  return base || 'asset';
}

export type SavePlanResult = { ok: true; plan: SavePlan } | { ok: false; errors: string[] };

/**
 * Valida y normaliza un asset del Studio antes de persistir.
 * Puro: no escribe nada; devuelve el plan que la API ejecuta.
 */
export function buildSavePlan(input: unknown): SavePlanResult {
  const parsed = studioAssetInputSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, errors: parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`) };
  }
  const asset = parsed.data;
  const seedPart = typeof asset.seed === 'number' ? `-${asset.seed}` : '';
  return {
    ok: true,
    plan: {
      asset,
      fileName: `${slugifyPrompt(asset.prompt)}${seedPart}`,
      cloudDir: STUDIO_CLOUD_DIR_BY_TYPE[asset.mediaType],
    },
  };
}

/* ------------------------------------------------------------------ */
/* Música: composición → WAV keyless                                   */
/* ------------------------------------------------------------------ */

export const studioCompositionSchema = z.object({
  mood: z.string().default('calm'),
  genre: z.string().optional(),
  key: z.string().optional(),
  tempoBpm: z.number().int().min(40).max(220),
  sections: z.array(z.object({ name: z.string() })).min(1).default([{ name: 'Loop' }]),
});
export type StudioComposition = z.infer<typeof studioCompositionSchema>;

/** Extensión máxima de audio generado (protege memoria y tamaño de asset). */
export const MAX_SYNTH_DURATION_SEC = 30;

export const resynthOverridesSchema = z.object({
  bpm: z.number().int().min(40).max(220).optional(),
  mood: z.string().min(1).max(30).optional(),
  durationSec: z.number().min(2).max(MAX_SYNTH_DURATION_SEC).optional(),
  seed: z.number().int().optional(),
});
export type ResynthOverrides = z.infer<typeof resynthOverridesSchema>;

/** Frecuencia base (Hz) por mood; fallback C3. */
const MOOD_BASE_FREQ: Record<string, number> = {
  euphoric: 220, uplifting: 220, calm: 110, chill: 110, relaxed: 110, lofi: 110,
  dark: 82.41, tense: 82.41, epic: 98, cinematic: 98, playful: 261.63,
  melancholic: 146.83, sad: 146.83, hopeful: 196, mysterious: 103.83, aggressive: 73.42,
};

/** Escala pentatónica menor relativa a la fundamental (semitonos). */
const PENTA = [0, 3, 5, 7, 10, 12];

export interface SynthLayer {
  kind: 'beat' | 'pad' | 'motif';
  gain: number;
  freq?: number;
  noteDurSec?: number;
}

export interface SynthPlan {
  bpm: number;
  moodKey: string;
  baseFreq: number;
  durationSec: number;
  seed: number;
  layers: SynthLayer[];
}

/**
 * Traduce una composición (+ overrides de modificación) al plan de capas de
 * síntesis. Determinista: misma entrada + mismo seed → mismo plan.
 */
export function compositionToSynthPlan(
  composition: StudioComposition,
  overrides: ResynthOverrides = {},
): SynthPlan {
  const bpm = overrides.bpm ?? composition.tempoBpm;
  const moodKey = (overrides.mood ?? composition.mood).toLowerCase();
  const seed = overrides.seed ?? 1337;
  // 4 compases de 4 pulsos por defecto, acotado a [2, MAX_SYNTH_DURATION_SEC].
  const defaultDur = Math.min(MAX_SYNTH_DURATION_SEC, Math.max(2, (60 / bpm) * 16));
  const durationSec = overrides.durationSec ?? defaultDur;
  const baseFreq = MOOD_BASE_FREQ[moodKey] ?? 130.81;
  return {
    bpm,
    moodKey,
    baseFreq,
    durationSec,
    seed,
    layers: [
      { kind: 'beat', gain: 0.55 },
      { kind: 'pad', gain: 0.16, freq: baseFreq },
      { kind: 'motif', gain: 0.3, freq: baseFreq * 2, noteDurSec: 0.22 },
    ],
  };
}

interface MixInput {
  data: ArrayLike<number>;
  gain: number;
  /** Factor para normalizar la fuente (1/0x7fff si viene de PCM16). */
  scale?: number;
}

/** Mezcla N señales con ganancia/escala y convierte a PCM16 con clip. */
function mixToPcm(inputs: MixInput[]): Int16Array {
  const n = inputs[0]?.data.length ?? 0;
  const out = new Int16Array(n);
  for (let i = 0; i < n; i++) {
    let v = 0;
    for (const layer of inputs) v += layer.data[i] * (layer.scale ?? 1) * layer.gain;
    v = Math.max(-1, Math.min(1, v));
    out[i] = v < 0 ? v * 0x8000 : v * 0x7fff;
  }
  return out;
}

/** Renderiza el patrón kick+hat propio (BPM variable, determinista). */
function renderBeat(bpm: number, durationSec: number, seed: number): Float32Array {
  const n = Math.floor(SAMPLE_RATE * durationSec);
  const samples = new Float32Array(n);
  const beatSec = 60 / bpm;
  const beatN = Math.floor(SAMPLE_RATE * beatSec);
  const rand = rng(seed);
  for (let b = 0; b * beatN < n; b++) {
    const start = b * beatN;
    const kickLen = Math.min(beatN, Math.floor(SAMPLE_RATE * 0.12));
    for (let i = 0; i < kickLen && start + i < n; i++) {
      const t = i / SAMPLE_RATE;
      const pitch = 55 * Math.pow(2, -12 * t);
      samples[start + i] += Math.sin(2 * Math.PI * pitch * t) * Math.exp(-30 * t);
    }
    if (b % 2 === 1) {
      const hatLen = Math.min(beatN, Math.floor(SAMPLE_RATE * 0.03));
      for (let i = 0; i < hatLen && start + i < n; i++) {
        samples[start + i] += (rand() * 2 - 1) * Math.exp(-80 * (i / SAMPLE_RATE)) * 0.35;
      }
    }
  }
  return samples;
}

export interface CompositionRenderResult {
  wav: Buffer;
  sampleRate: number;
  durationSec: number;
  plan: SynthPlan;
}

/**
 * Renderiza una composición a WAV mono 44.1kHz SIN proveedores externos:
 * beat propio a bpm variable + pad de ambience + motivo pentatónico.
 * Keyless total (puro TS sobre omag/sound).
 */
export function renderCompositionWav(
  composition: StudioComposition,
  overrides: ResynthOverrides = {},
): CompositionRenderResult {
  const plan = compositionToSynthPlan(composition, overrides);
  const n = Math.floor(SAMPLE_RATE * plan.durationSec);

  const beat = renderBeat(plan.bpm, plan.durationSec, plan.seed);
  const pad = synthAmbience({ durationSec: plan.durationSec, freq: plan.baseFreq, gain: 1, seed: plan.seed + 1 });
  const motif = new Float32Array(n);
  const rand = rng(plan.seed + 2);
  const noteLen = Math.floor(SAMPLE_RATE * (plan.layers[2].noteDurSec ?? 0.22));
  const step = noteLen * 2;
  for (let idx = 0; idx * step < n; idx++) {
    const semis = PENTA[Math.floor(rand() * PENTA.length)];
    const freq = (plan.layers[2].freq ?? 261) * Math.pow(2, semis / 12);
    const note = synthTone({ durationSec: plan.layers[2].noteDurSec ?? 0.22, freq, gain: 1 });
    const start = idx * step;
    for (let i = 0; i < note.pcm.length && start + i < n; i++) {
      motif[start + i] += note.pcm[i] / 0x7fff;
    }
  }

  const pcm = mixToPcm([
    { data: beat, gain: plan.layers[0].gain },
    { data: pad.pcm, gain: plan.layers[1].gain, scale: 1 / 0x7fff },
    { data: motif, gain: plan.layers[2].gain },
  ]);
  const wav = encodeWav({ pcm, sampleRate: SAMPLE_RATE, durationSec: plan.durationSec, kind: 'composition-synth' });
  return { wav, sampleRate: SAMPLE_RATE, durationSec: plan.durationSec, plan };
}

/* ------------------------------------------------------------------ */
/* Derivación: re-roll / resíntesis / slideshow                        */
/* ------------------------------------------------------------------ */

export const deriveOpSchema = z.discriminatedUnion('op', [
  z.object({
    op: z.literal('image-reroll'),
    prompt: z.string().min(1).max(2000),
    sourceUrl: z.string().min(1).max(2048),
  }),
  z.object({
    op: z.literal('music-resynth'),
    composition: studioCompositionSchema,
    overrides: resynthOverridesSchema.optional(),
  }),
  z.object({
    op: z.literal('video-slideshow'),
    frames: z
      .array(z.object({ url: z.string().min(1), caption: z.string().default('') }))
      .min(1)
      .max(12),
    fps: z.number().int().min(12).max(60).default(24),
    secondsPerFrame: z.number().min(0.5).max(6).default(2),
  }),
]);
export type DeriveOp = z.infer<typeof deriveOpSchema>;

export interface DerivePlan {
  op: string;
  childMediaType: StudioMediaType;
  /** Para image-reroll: llamada exacta que la API ejecuta. */
  providerCall?: { endpoint: string; body: Record<string, unknown> };
  /** Para music-resynth: plan de síntesis resultante. */
  synthPlan?: SynthPlan;
  /** Para video-slideshow: duración final estimada y fps. */
  estimatedDurationSec?: number;
  fps?: number;
}

/** Plan puro de derivación (sin ejecución). La API decide cómo aplicarlo. */
export function buildDerivePlan(op: DeriveOp): DerivePlan {
  switch (op.op) {
    case 'image-reroll':
      return {
        op: op.op,
        childMediaType: 'image',
        providerCall: { endpoint: '/api/tools/image', body: { prompt: op.prompt, imageUrl: op.sourceUrl } },
      };
    case 'music-resynth':
      return {
        op: op.op,
        childMediaType: 'music',
        synthPlan: compositionToSynthPlan(op.composition, op.overrides ?? {}),
      };
    case 'video-slideshow':
      return {
        op: op.op,
        childMediaType: 'video',
        fps: op.fps,
        estimatedDurationSec: op.frames.length * op.secondsPerFrame,
      };
  }
}

/**
 * Argv ffmpeg determinista para convertir frames de un storyboard en un MP4
 * vertical (1080x1920) con zoom Ken Burns y crossfades encadenados.
 * Solo genera argv — nunca ejecuta (la ejecución real vive en la API con
 * ffmpeg instalado y falla suave si no está disponible).
 */
export function buildSlideshowFfmpegArgv(
  localImages: readonly string[],
  outPath: string,
  opts: { fps?: number; secondsPerFrame?: number } = {},
): string[] {
  const fps = opts.fps ?? 24;
  const spf = opts.secondsPerFrame ?? 2;
  if (localImages.length === 0) throw new Error('slideshow requiere >=1 frame');
  const fade = 0.5;
  const argv: string[] = ['ffmpeg', '-y'];
  for (const img of localImages) {
    argv.push('-loop', '1', '-t', String(spf), '-i', img);
  }
  const chains: string[] = [];
  const xfadeParts: string[] = [];
  for (let i = 0; i < localImages.length; i++) {
    chains.push(
      `[${i}:v]scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,zoompan=z='min(zoom+0.0008,1.15)':d=${Math.floor(fps * spf)}:s=1080x1920:fps=${fps}[v${i}]`,
    );
  }
  let prevLabel = '[v0]';
  let offset = 0;
  for (let i = 1; i < localImages.length; i++) {
    offset += spf - fade;
    const outLabel = i === localImages.length - 1 ? '[vout]' : `[vx${i}]`;
    xfadeParts.push(`${prevLabel}[v${i}]xfade=transition=fade:duration=${fade}:offset=${offset.toFixed(2)}${outLabel}`);
    prevLabel = outLabel === '[vout]' ? '[vout]' : `[vx${i}]`;
  }
  argv.push(
    '-filter_complex',
    [...chains, ...xfadeParts].join(';'),
    '-map',
    // Con 1 solo frame no hay xfades: la salida es la cadena del único input.
    prevLabel,
    '-r',
    String(fps),
    '-pix_fmt',
    'yuv420p',
    '-movflags',
    '+faststart',
    outPath,
  );
  return argv;
}

/* ------------------------------------------------------------------ */
/* WebHarvest (OSS): lectura local de páginas                          */
/* ------------------------------------------------------------------ */

/** Timeout por candidato del CLI webharvest (scrape local). */
export const WEBHARVEST_TIMEOUT_MS = 45_000;

/**
 * Candidatos argv deterministas para `webharvest scrape <url>` (OSS vendoreado,
 * MIT): binario directo y módulos vía launchers Python (py -3 / python).
 * Solo genera argv — la ejecución vive en la API con fail-soft.
 */
export function planWebHarvestArgv(url: string): { candidates: string[][]; timeoutMs: number } {
  if (!/^https?:\/\//i.test(url)) throw new Error('webharvest requiere URL http(s)');
  const mod = ['-m', 'webharvest', 'scrape', url];
  return {
    candidates: [
      ['webharvest', 'scrape', url],
      ['py', '-3', ...mod],
      ['python', ...mod],
    ],
    timeoutMs: WEBHARVEST_TIMEOUT_MS,
  };
}

/* ------------------------------------------------------------------ */
/* Tool de agente: studio_asset                                        */
/* ------------------------------------------------------------------ */

export const studioToolSchema = z.object({
  action: z.enum(['save_plan', 'derive_plan', 'synth_plan', 'catalog']),
  asset: studioAssetInputSchema.optional(),
  derive: deriveOpSchema.optional(),
  composition: studioCompositionSchema.optional(),
  overrides: resynthOverridesSchema.optional(),
});
export type StudioToolInput = z.infer<typeof studioToolSchema>;

export type StudioActionResult =
  | { action: 'save_plan'; plan: SavePlan | null; errors?: string[] }
  | { action: 'derive_plan'; plan: DerivePlan | null }
  | { action: 'synth_plan'; plan: SynthPlan; maxDurationSec: number }
  | { action: 'catalog'; entries: readonly OssEntry[]; integrityErrors: string[] };

/** Ejecutor puro de acciones (la ejecución real vive en API/UI/runner). */
export function runStudioAction(input: StudioToolInput): StudioActionResult {
  switch (input.action) {
    case 'save_plan': {
      if (!input.asset) throw new Error('save_plan requiere asset');
      const r = buildSavePlan(input.asset);
      return r.ok ? { action: 'save_plan', plan: r.plan } : { action: 'save_plan', plan: null, errors: r.errors };
    }
    case 'derive_plan': {
      if (!input.derive) throw new Error('derive_plan requiere derive');
      return { action: 'derive_plan', plan: buildDerivePlan(input.derive) };
    }
    case 'synth_plan': {
      if (!input.composition) throw new Error('synth_plan requiere composition');
      return {
        action: 'synth_plan',
        plan: compositionToSynthPlan(input.composition, input.overrides ?? {}),
        maxDurationSec: MAX_SYNTH_DURATION_SEC,
      };
    }
    case 'catalog':
      return { action: 'catalog', entries: OSS_CATALOG, integrityErrors: validateCatalog(OSS_CATALOG) };
  }
}

/* ------------------------------------------------------------------ */
/* Namespace público                                                   */
/* ------------------------------------------------------------------ */

export const studio = {
  buildSavePlan,
  slugifyPrompt,
  assetKindFromMime,
  compositionToSynthPlan,
  renderCompositionWav,
  buildDerivePlan,
  buildSlideshowFfmpegArgv,
  runStudioAction,
};
