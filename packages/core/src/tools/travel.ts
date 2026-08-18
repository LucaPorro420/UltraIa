/**
 * Travel video engine (UltraIa — "tomas de paisajes → videos automatizados de viajes").
 *
 * Port of the USER'S REQUEST (18/08/2026): "ver el contenido de las historias sobre
 * paisajes y salvarlas para realizar videos automatizados de viajes e replicar
 * paisajes". Pattern: screenflow (deterministic pure domain, argv generation only).
 *
 * Capabilities (keyless, deterministic):
 *  - planTravelVideo: 9:16 travel script (hook + scenes with camera MOTIONS +
 *    per-scene image prompts + bilingual es/ar narration + CTA) from a destination.
 *  - buildTakeManifest: persist a "take" (saved landscape reference from stories)
 *    into .ultraia/travel/tomas/<slug>/manifest.json (idempotent slug).
 *  - buildTravelRender: deterministic ffmpeg pipeline — Ken Burns (zoompan) per
 *    scene + chained xfade transitions + narration (edge-tts TTS) + background
 *    music → travel-<slug>.mp4. Emits render.sh + render.steps.txt + manifest.json.
 *  - replicateLandscape: N deterministic prompt variations of a landscape
 *    (time of day × weather × lens) → hotlinkable Pollinations URLs (keyless).
 */
import type { GeneratedImage } from './image';

export interface TravelScene {
  lugar: string;
  descripcion: string;
  motion: string; // camera movement from the MOTIONS vocabulary
  duracionSeg: number;
  promptImagen: string;
  narracion: string;
}

export interface TravelPlan {
  slug: string;
  titulo: string;
  destino: string;
  idioma: 'es' | 'ar';
  estilo: TravelStyle;
  duracionSeg: number;
  hook: string;
  escenas: TravelScene[];
  cta: string;
  musicaSugerida: string;
}

export type TravelStyle = 'aventura' | 'relax' | 'cultura' | 'naturaleza';
export type TravelLang = 'es' | 'ar';

/** Camera motion vocabulary (canonical, matches prompt/director MOTIONS). */
export const MOTIONS = [
  'pan left',
  'pan right',
  'push in',
  'push out',
  'tilt up',
  'tilt down',
  'orbit',
  'zoom in',
  'zoom out',
  'crane up',
  'crane down',
  'track left',
  'track right',
  'static',
  'aerial',
  'handheld',
] as const;

/** Deterministic slug: lowercase, strip accents, non-alnum → '-', collapse, trim. */
export function slugifyDestino(input: string): string {
  const normalized = input
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return normalized || 'destino';
}

function clampInt(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, Math.round(n)));
}

// ---- bilingual copy banks (deterministic, pattern RF-12 / enrutador) ----

const HOOK_BY_STYLE: Record<TravelStyle, Record<TravelLang, string>> = {
  aventura: { es: '{destino} no es para los débiles. Es para los que despiertan antes que el sol.', ar: '{destino} ليست للضعفاء. هي لمن يستيقظون قبل الشمس.' },
  relax: { es: 'Cierra los ojos. Respira. {destino} te está esperando.', ar: 'أغلق عينيك. تنفس. {destino} في انتظارك.' },
  cultura: { es: 'Cada piedra de {destino} tiene una historia. Hoy te cuento una.', ar: 'كل حجر في {destino} يحكي قصة. اليوم أحكي لك واحدة.' },
  naturaleza: { es: 'La naturaleza no posa. Solo existe. Y {destino} es su mejor obra.', ar: 'الطبيعة لا تتوقف عن الجمال. و{destino} أجمل أعمالها.' },
};

const CTA_BY_STYLE: Record<TravelStyle, Record<TravelLang, string>> = {
  aventura: { es: 'Guarda este video para tu próxima aventura. 🎒', ar: 'احفظ هذا الفيديو لمغامرتك القادمة. 🎒' },
  relax: { es: 'Guárdalo para cuando necesites respirar. 🌿', ar: 'احفظه عندما تحتاج إلى التنفس. 🌿' },
  cultura: { es: 'Sígueme para más historias viajeras. 📖', ar: 'تابعني لمزيد من قصص السفر. 📖' },
  naturaleza: { es: 'Comparte este paisaje con quien lo necesita. 🌄', ar: 'شارك هذا المنظر مع من يحتاجه. 🌄' },
};

const SCENE_DESC_BY_STYLE: Record<TravelStyle, Record<TravelLang, string[]>> = {
  aventura: {
    es: ['El amanecer rompe sobre las montañas', 'El camino serpentea entre los valles', 'El río baja con fuerza tras la lluvia', 'La cumbre se asoma entre las nubes', 'El viento golpea la llanura abierta', 'El sendero desaparece en el bosque', 'La noche cae sobre el campamento'],
    ar: ['الفجر يكسر فوق الجبال', 'الطريق يلتوي بين الوديان', 'النهر يندفع بقوة بعد المطر', 'القمة تظهر بين الغيوم', 'الرياح تضرب السهل المفتوح', 'الممر يختفي في الغابة', 'الليل يسقط على المخيم'],
  },
  relax: {
    es: ['La laguna refleja el cielo en calma', 'La brisa mece los pastos dorados', 'El mar acaricia la orilla vacía', 'Las nubes pasan lentas sobre el valle', 'El bosque huele a tierra mojada', 'El sol se pone en silencio', 'Las estrellas aparecen una a una'],
    ar: ['البحيرة تعكس السماء الهادئة', 'النسيم يحرك الحقول الذهبية', 'البحر يلامس الشاطئ الفارغ', 'الغيوم تمر ببطء فوق الوادي', 'الغابة تفوح برائحة الأرض المبللة', 'الشمس تغرب بصمت', 'النجوم تظهر واحدة تلو الأخرى'],
  },
  cultura: {
    es: ['Las calles antiguas despiertan al alba', 'El mercado hierve de colores y voces', 'La torre vigila la ciudad desde hace siglos', 'El museo guarda los secretos del pasado', 'Los muros cuentan batallas olvidadas', 'El río separa dos mundos', 'Las luces encienden la plaza mayor'],
    ar: ['الشوارع القديمة تستيقظ عند الفجر', 'السوق يعج بالألوان والأصوات', 'البرج يراقب المدينة منذ قرون', 'المتحف يحفظ أسرار الماضي', 'الجدران تروي معارك منسية', 'النهر يفصل بين عالمين', 'الأضواء تشعل الساحة الكبرى'],
  },
  naturaleza: {
    es: ['El glaciar avanza en silencio', 'La cascada cae entre la niebla', 'El cañón se abre en capas de color', 'El desierto guarda dunas infinitas', 'El lago se congela en la mañana', 'La selva respira húmeda y verde', 'El volcán descansa entre las nubes'],
    ar: ['النهر الجليدي يتقدم بصمت', 'الشلال يسقط بين الضباب', 'الوادي ينفتح بطبقات من الألوان', 'الصحراء تحفظ كثباناً لا نهاية لها', 'البحيرة تتجمد في الصباح', 'الغابة تتنفس رطبة وخضراء', 'البركان يرتاح بين الغيوم'],
  },
};

const STYLE_MUSIC: Record<TravelStyle, string> = {
  aventura: 'epic orchestral percussion',
  relax: 'ambient acoustic piano',
  cultura: 'world folk strings',
  naturaleza: 'nature soundscape ambient',
};

/** Plan a 9:16 travel video (hook + scenes + narration + CTA). Deterministic, keyless. */
export function planTravelVideo(destino: string, opts?: { idioma?: TravelLang; estilo?: TravelStyle; duracionSeg?: number; escenas?: number }): TravelPlan {
  const idioma: TravelLang = opts?.idioma ?? 'es';
  const estilo: TravelStyle = opts?.estilo ?? 'naturaleza';
  const duracionSeg = clampInt(opts?.duracionSeg ?? 45, 30, 60);
  const escenasCount = clampInt(opts?.escenas ?? Math.round(duracionSeg / 8), 3, 7);
  const slug = slugifyDestino(destino);
  const titulo = idioma === 'es' ? `Viaje a ${destino}` : `رحلة إلى ${destino}`;

  const descs = SCENE_DESC_BY_STYLE[estilo][idioma];
  const motions = [...MOTIONS];
  const escenas: TravelScene[] = [];
  for (let i = 0; i < escenasCount; i++) {
    const desc = descs[i % descs.length];
    const motion = motions[(i * 3 + 1) % motions.length]; // deterministic spread
    const duracion = Math.max(4, Math.round(duracionSeg / escenasCount));
    escenas.push({
      lugar: destino,
      descripcion: desc,
      motion,
      duracionSeg: duracion,
      promptImagen: `cinematic travel photography of ${destino}, ${desc.toLowerCase()}, ${motion}, golden hour, 35mm, ultra detailed, 9:16 vertical`,
      narracion: desc,
    });
  }

  return {
    slug,
    titulo,
    destino,
    idioma,
    estilo,
    duracionSeg,
    hook: HOOK_BY_STYLE[estilo][idioma].replace('{destino}', destino),
    escenas,
    cta: CTA_BY_STYLE[estilo][idioma],
    musicaSugerida: STYLE_MUSIC[estilo],
  };
}

export interface TakeInput {
  fuente: string; // URL / perfil / handle de origen (ej. instagram.com/tomassporro)
  lugar: string;
  descripcion: string;
  tags: string[];
  tipo?: 'imagen' | 'video' | 'referencia';
  guardadoEn?: string; // ruta relativa del archivo guardado (.ultraia/travel/tomas/<slug>/)
}

export interface TakeManifest {
  schemaVersion: 1;
  slug: string;
  fuente: string;
  lugar: string;
  descripcion: string;
  tags: string[];
  tipo: 'imagen' | 'video' | 'referencia';
  guardadoEn: string;
  creadoEn: string; // injected by caller (Date.now()) — deterministic per call
}

/** Manifest for a saved landscape "take" (stories → .ultraia/travel/tomas/<slug>/). */
export function buildTakeManifest(take: TakeInput, ahora?: number): TakeManifest {
  return {
    schemaVersion: 1,
    slug: slugifyDestino(`${take.lugar}-${take.fuente.replace(/^https?:\/\//, '').replace(/[^a-z0-9]+/gi, '-')}`),
    fuente: take.fuente,
    lugar: take.lugar,
    descripcion: take.descripcion,
    tags: take.tags.slice(0, 8),
    tipo: take.tipo ?? 'referencia',
    guardadoEn: take.guardadoEn ?? `.ultraia/travel/tomas/${slugifyDestino(take.lugar)}/`,
    creadoEn: new Date(ahora ?? Date.now()).toISOString(),
  };
}

export interface TravelRenderOptions {
  imagenesDir?: string; // dir with img-0.jpg .. img-N.jpg
  narracionMp3?: string | null; // TTS edge-tts output (keyless)
  bgmMp3?: string | null;
  outFile?: string;
  width?: number;
  height?: number;
  fps?: number;
  fadeSec?: number;
}

export interface RenderPlan {
  pasos: string[];
  argv: string[][];
  renderSh: string;
  manifest: {
    slug: string;
    escenas: number;
    duracionSeg: number;
    fadeSec: number;
    outFile: string;
    fuentes: { narracionMp3: string | null; bgmMp3: string | null };
  };
}

/**
 * Deterministic ffmpeg pipeline for a travel video:
 *  - per scene: zoompan (Ken Burns) from the still image → clip-N.mp4
 *  - chained xfade (fade) between clips
 *  - narration (TTS mp3) + background music (volume 0.25) mixed in
 * Emits argv lists + render.sh + manifest (execution is delegated to ffmpeg, never run here).
 */
export function buildTravelRender(plan: TravelPlan, opts?: TravelRenderOptions): RenderPlan {
  const width = opts?.width ?? 720;
  const height = opts?.height ?? 1280;
  const fps = opts?.fps ?? 25;
  const fadeSec = Math.max(0.3, Math.min(1, opts?.fadeSec ?? 0.6));
  const outFile = opts?.outFile ?? `travel-${plan.slug}.mp4`;
  const imagenesDir = opts?.imagenesDir ?? './imagenes';
  const narracionMp3 = opts?.narracionMp3 ?? null;
  const bgmMp3 = opts?.bgmMp3 ?? null;

  const pasos: string[] = [];
  const argv: string[][] = [];
  const n = plan.escenas.length;

  // Step 1: stills → Ken Burns clips
  for (let i = 0; i < n; i++) {
    const escena = plan.escenas[i];
    const dur = Math.max(3, escena.duracionSeg);
    const clip = `clip-${i}.mp4`;
    const zoom = 1 + i * 0.0008; // incremental drift
    pasos.push(`[${i}] Ken Burns: ${escena.descripcion} (${escena.motion}, ${dur}s) → ${clip}`);
    argv.push([
      'ffmpeg', '-y', '-loop', '1', '-i', `${imagenesDir}/img-${i}.jpg`,
      '-vf', `scale=${width}:${height},crop=${width}:${height},zoompan=z='${zoom.toFixed(4)}+0.0008*on':d=${Math.round(dur * fps)}:s=${width}x${height}:fps=${fps}`,
      '-t', String(dur), '-c:v', 'libx264', '-preset', 'fast', '-pix_fmt', 'yuv420p', clip,
    ]);
  }

  // Step 2: chained xfade (offsets accumulate: duration - fade)
  // For k-th xfade adding clip k (1-indexed: k=1 adds clip1 to clip0, k=2 adds clip2 to v1, etc.)
  // offset = sum of durations of clips 0..k-1 - k * fadeSec
  const inputs: string[] = [];
  const labels: string[] = [];
  let fc = `[0:v][1:v]xfade=transition=fade:duration=${fadeSec}:offset=${Math.max(0, plan.escenas[0].duracionSeg - fadeSec)}[v1]`;
  inputs.push('-i', 'clip-0.mp4', '-i', 'clip-1.mp4');
  labels.push('v1');
  for (let i = 2; i < n; i++) {
    inputs.push('-i', `clip-${i}.mp4`);
    // i is the index of the clip being added (0-indexed). We've already processed clips 0..i-1.
    // The xfade number k = i (since first xfade k=1 added clip1, second k=2 adds clip2, etc.)
    // offset = sum of first i scenes - i * fadeSec
    const offset = plan.escenas.slice(0, i).reduce((a, s) => a + s.duracionSeg, 0) - i * fadeSec;
    fc += `;[${labels[i - 2]}][${i}:v]xfade=transition=fade:duration=${fadeSec}:offset=${Math.max(0, offset)}[v${i}]`;
    labels.push(`v${i}`);
  }
  const videoLabel = labels[labels.length - 1];
  pasos.push(`xfade encadenado: ${n} clips → ${videoLabel} (fade ${fadeSec}s)`);

  // Step 3: audio mix (narration full + BGM ducked)
  let audioArgs: string[] = [];
  let audioFc = '';
  if (narracionMp3 || bgmMp3) {
    const mapIn: string[] = [];
    if (narracionMp3) { mapIn.push('-i', narracionMp3); audioFc += `[${mapIn.length - 1}:a]volume=1.0[na]`; }
    if (bgmMp3) { mapIn.push('-i', bgmMp3); audioFc += (audioFc ? ';' : '') + `[${mapIn.length - 1}:a]volume=0.25[bg]`; }
    audioArgs = mapIn;
    audioFc += ';' + (narracionMp3 && bgmMp3
      ? '[na][bg]amix=inputs=2:duration=longest[aout]'
      : narracionMp3 ? '[na]anull[aout]' : '[bg]anull[aout]');
    pasos.push(`audio: narración ${narracionMp3 ? 'SÍ' : 'NO'} + BGM ${bgmMp3 ? 'SÍ (0.25)' : 'NO'} → aout`);
  }

  const total = plan.escenas.reduce((a, s) => a + s.duracionSeg, 0) - (n - 1) * fadeSec;
  const filterParts = [fc, audioFc].filter(Boolean);
  const mapVideo = ['-map', `[${videoLabel}]`];
  const mapAudio = audioFc ? ['-map', '[aout]'] : [];
  const filterArg = filterParts.join(';');
  const ffmpegArgs = ['ffmpeg', '-y', ...audioArgs, ...inputs, '-filter_complex', filterArg, ...mapVideo, ...mapAudio, '-c:v', 'libx264', '-preset', 'fast', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', '-c:a', 'aac', '-b:a', '128k', '-t', total.toFixed(2), outFile];
  argv.push(ffmpegArgs);
  pasos.push(`render final: ${outFile} (${total.toFixed(1)}s, ${width}x${height}@${fps}fps)`);

  const renderSh = [
    '#!/usr/bin/env bash',
    `# Render automático: ${plan.titulo} (${plan.idioma}, ${plan.duracionSeg}s)`,
    'set -euo pipefail',
    ...argv.map((a) => a.join(' ')),
    `echo "OK: ${outFile}"`,
  ].join('\n');

  return {
    pasos,
    argv,
    renderSh,
    manifest: { slug: plan.slug, escenas: n, duracionSeg: total, fadeSec, outFile, fuentes: { narracionMp3, bgmMp3 } },
  };
}

export interface ReplicateOptions {
  variaciones?: number; // 1..8
  seed?: number; // fixed seed → reproducible
  width?: number;
  height?: number;
}

export interface ReplicateResult {
  prompts: string[];
  urls: string[];
}

const TIMES = ['golden hour', 'midday', 'sunset', 'night'] as const;
const WEATHERS = ['clear sky', 'soft fog', 'light rain', 'fresh snow'] as const;
const LENSES = ['35mm', '85mm', 'drone aerial', 'wide angle'] as const;

/** N deterministic variations of a landscape prompt → Pollinations URLs (keyless). */
export function replicateLandscape(promptBase: string, opts?: ReplicateOptions): ReplicateResult {
  const variaciones = clampInt(opts?.variaciones ?? 4, 1, 8);
  const seed = opts?.seed ?? 20260818;
  const width = clampInt(opts?.width ?? 720, 128, 1792);
  const height = clampInt(opts?.height ?? 1280, 128, 1792);
  const prompts: string[] = [];
  const urls: string[] = [];
  for (let i = 0; i < variaciones; i++) {
    const time = TIMES[i % TIMES.length];
    const weather = WEATHERS[(i + 1) % WEATHERS.length];
    const lens = LENSES[(i * 3 + 2) % LENSES.length];
    const prompt = `travel landscape: ${promptBase.trim()}, ${time}, ${weather}, ${lens}, photorealistic, vertical 9:16`;
    prompts.push(prompt);
    const query = new URLSearchParams({ width: String(width), height: String(height), seed: String(seed + i), model: 'flux', nologo: 'true' });
    urls.push(`https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?${query.toString()}`);
  }
  return { prompts, urls };
}

/** URL builder for the lead still of a travel plan (scene 0). Keyless. */
export function travelLeadImage(plan: TravelPlan, opts?: { width?: number; height?: number; seed?: number }): GeneratedImage {
  const scene = plan.escenas[0];
  const query = new URLSearchParams({
    width: String(opts?.width ?? 720),
    height: String(opts?.height ?? 1280),
    seed: String(opts?.seed ?? 20260818),
    model: 'flux',
    nologo: 'true',
  });
  return {
    prompt: scene.promptImagen,
    url: `https://image.pollinations.ai/prompt/${encodeURIComponent(scene.promptImagen)}?${query.toString()}`,
    width: opts?.width ?? 720,
    height: opts?.height ?? 1280,
    model: 'flux',
    seed: opts?.seed ?? 20260818,
    provider: 'pollinations',
    aspectRatio: '9:16',
  };
}

/** Namespace export (pattern: growth/vfx/codevfx) for tools/index.ts. */
export const travel = {
  planTravelVideo,
  buildTakeManifest,
  buildTravelRender,
  replicateLandscape,
  travelLeadImage,
  MOTIONS,
  slugifyDestino,
};
