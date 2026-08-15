/**
 * AutoPub F5 — media_score port a TypeScript (fuente:
 * ULTRAIA/integracionesImplementacion/media_score.py, criterios verificados).
 *
 * `puntuarMedia` puntúa un resultado de generación (imagen/audio/video/tts/music/director)
 * 0-25 con veredicto PASS (≥20) / FAIL. `puntuarPaquete` puntúa un PublicationPackage (F3)
 * 0-100 como score de calidad PRE-publicación (el plan maestro F5, tarea 2).
 */

const DOMINIOS_IMAGEN = ['image.pollinations.ai', 'images.meigen.ai'];
const PROVIDERS_AUDIO = ['edge-tts', 'local', 'composition'];
const MOTIONS = new Set(['zoom-in', 'zoom-out', 'pan-left', 'pan-right', 'pan-up', 'pan-down']);
const IDIOMAS = new Set(['es', 'en', 'fr', 'pt', 'de', 'it', 'ar', 'hi', 'ja', 'zh', 'ru', 'nl', 'tr', 'ko', 'multi']);

export type MediaModalidad = 'image' | 'audio' | 'video' | 'tts' | 'music' | 'director';

export interface MediaVeredicto {
  caseId: string;
  modalidad: MediaModalidad;
  score: number;
  max: number;
  status: 'PASS' | 'FAIL';
  notas: string[];
}

function urlOk(url: string): boolean {
  return url.startsWith('https://') || url.startsWith('/media/');
}

function scoreImage(data: Record<string, unknown>): [number, string[]] {
  let puntos = 0;
  const notas: string[] = [];
  const url = String(data.url ?? '');
  if (urlOk(url)) puntos += 10;
  else notas.push('url invalida');
  if (DOMINIOS_IMAGEN.some((d) => url.startsWith(d) || url.includes(`/${d.split('.')[0]}`))) puntos += 10;
  else if (url) notas.push('dominio no verificado');
  if (data.model) puntos += 5;
  else notas.push('sin modelo');
  return [puntos, notas];
}

function scoreAudio(data: Record<string, unknown>): [number, string[]] {
  let puntos = 0;
  const notas: string[] = [];
  const provider = String(data.provider ?? '');
  if (PROVIDERS_AUDIO.includes(provider)) puntos += 10;
  else notas.push(`provider '${provider}' no esperado`);
  const url = String(data.url ?? '');
  if (url && (url.endsWith('.mp3') || url.endsWith('.wav') || urlOk(url))) puntos += 10;
  else notas.push('sin archivo de audio');
  if (urlOk(url)) puntos += 5;
  else notas.push('sin url servible');
  return [puntos, notas];
}

function scoreVideo(data: Record<string, unknown>): [number, string[]] {
  let puntos = 0;
  const notas: string[] = [];
  const frames = data.frames;
  const url = String(data.url ?? '');
  if ((Array.isArray(frames) && frames.length >= 1 && frames.length <= 8) || urlOk(url)) puntos += 10;
  else notas.push('sin frames ni url');
  if (data.motion && MOTIONS.has(String(data.motion))) puntos += 5;
  if (data.provider) puntos += 5;
  return [puntos, notas];
}

function scoreTts(data: Record<string, unknown>): [number, string[]] {
  let puntos = 0;
  const notas: string[] = [];
  const language = String(data.language ?? '');
  if (IDIOMAS.has(language)) puntos += 10;
  else notas.push(`idioma '${language}' no soportado`);
  const voz = String(data.voz ?? data.voice ?? '');
  if (voz.includes('Neural')) puntos += 10;
  else notas.push('voz edge-tts no reconocida');
  const url = String(data.url ?? '');
  if (url.endsWith('.mp3') || urlOk(url)) puntos += 5;
  else notas.push('sin mp3');
  return [puntos, notas];
}

function scoreDirector(data: Record<string, unknown>): [number, string[]] {
  let puntos = 0;
  const notas: string[] = [];
  const plan = (data.plan ?? data) as Record<string, unknown>;
  const language = String(plan.language ?? '');
  if (IDIOMAS.has(language)) puntos += 10;
  else notas.push('language invalido');
  if (plan.script) puntos += 10;
  else notas.push('sin script');
  if (Array.isArray(plan.images) && plan.images.length >= 1) puntos += 5;
  else notas.push('sin images');
  return [puntos, notas];
}

const SCORERS: Record<MediaModalidad, (d: Record<string, unknown>) => [number, string[]]> = {
  image: scoreImage,
  audio: scoreAudio,
  video: scoreVideo,
  tts: scoreTts,
  music: scoreAudio,
  director: scoreDirector,
};

/** Puntúa un resultado de generación (port 1:1 de media_score.py). */
export function puntuarMedia(data: Record<string, unknown>): MediaVeredicto {
  const modalidad = (String(data.modalidad ?? 'image') || 'image') as MediaModalidad;
  const scorer = SCORERS[modalidad] ?? scoreImage;
  const [score, notas] = scorer(data);
  return {
    caseId: String(data.id ?? 'media-unknown'),
    modalidad,
    score,
    max: 25,
    status: score >= 20 ? 'PASS' : 'FAIL',
    notas,
  };
}

/** Paquete de publicación F3 (PublicationPackage) mínimo necesario para puntuar. */
export interface PaquetePuntual {
  caption?: string;
  hashtags?: string[] | string;
  visualByChannel?: Record<string, { formato?: string; thumbnail?: string } | undefined>;
  captionsByChannel?: Record<string, { caption?: unknown; srt?: unknown } | undefined>;
  contenido?: string;
  horarioSugerido?: string | Record<string, string>;
  canales?: string[];
  media?: string[];
  srtByChannel?: Record<string, string | undefined>;
}

/** Score 0-100 de calidad pre-publicación de un PublicationPackage. */
export function puntuarPaquete(paquete: PaquetePuntual): { score: number; notas: string[] } {
  let score = 0;
  const notas: string[] = [];
  const canales = paquete.canales ?? Object.keys(paquete.captionsByChannel ?? {});

  // 0-30: contenido
  if (paquete.contenido && paquete.contenido.trim().length >= 80) score += 30;
  else if (paquete.contenido && paquete.contenido.trim().length > 0) score += 15;
  else notas.push('contenido corto o vacio');

  // 0-20: caption + hashtags por canal
  const conCaption =
    canales.length > 0 &&
    canales.every((c) => {
      const caption = paquete.captionsByChannel?.[c]?.caption ?? paquete.caption;
      return typeof caption === 'string' && caption.trim().length >= 10;
    });
  if (conCaption) score += 20;
  else notas.push('falta caption por canal');

  const hashtags = Array.isArray(paquete.hashtags) ? paquete.hashtags : [];
  const conHashtags = hashtags.length >= 2;
  if (conHashtags) score += 10;
  else notas.push('menos de 2 hashtags');

  // 0-15: visual por canal (formato + thumbnail)
  const conVisual =
    canales.length > 0 &&
    canales.every((c) => {
      const v = paquete.visualByChannel?.[c];
      return v?.formato && v?.thumbnail;
    });
  if (conVisual) score += 15;
  else notas.push('falta visual/thumbnail por canal');

  // 0-10: subtitulos (video) o media (texto)
  const conSrt = canales.some((c) => paquete.srtByChannel?.[c] || paquete.captionsByChannel?.[c]?.srt);
  const conMedia = Array.isArray(paquete.media) && paquete.media.length > 0;
  if (conSrt || conMedia) score += 10;
  else notas.push('sin subtitulos ni media');

  // 0-15: horario sugerido (string o record por canal con al menos una entrada)
  const horario =
    typeof paquete.horarioSugerido === 'string'
      ? paquete.horarioSugerido
      : paquete.horarioSugerido
        ? Object.values(paquete.horarioSugerido).filter(Boolean)[0] ?? ''
        : '';
  if (horario) score += 15;
  else notas.push('sin horario sugerido');

  return { score: Math.min(score, 100), notas };
}

export const mediaScore = { puntuarMedia, puntuarPaquete };