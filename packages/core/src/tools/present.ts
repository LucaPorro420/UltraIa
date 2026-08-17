/**
 * AutoPub F3 — Presentación unificada (present).
 *
 * Un solo paquete de contenido (`PublicationPackage`) que se adapta a cada canal:
 *   - formato visual por canal (9:16 video / 1:1 imagen / 16:9 artículo),
 *   - caption + hashtags por plataforma (YouTube, TikTok, Instagram, blog),
 *   - branding kit por marca (paleta + fuente + logo; default Dark Obsidian de UltraIa),
 *   - subtítulos SRT (patrón RF-11 del pipeline Python) para video,
 *   - horario sugerido por canal (D2 del plan maestro: video 2-3/sem, texto 1/día, blog 1/sem).
 *
 * Keyless y determinista: `present` NO llama a modelos; produce el paquete estructural que
 * F4 (PublisherAdapter + cola) consumirá. La tool TS es la fuente de verdad.
 */

import type { TopicChannel, TopicFormat } from './topics';

/** Canal objetivo (mismo vocabulario que F1 topics). */
export type PresentChannel = TopicChannel;

export interface BrandingKit {
  marca: string;
  paleta: string[];
  fuente: string;
  logo: string | null;
  acento: string;
}

/** QUÉ ES: sobrescritura parcial del kit de marca (merge sobre el kit base).
// PARA QUÉ: F3 — branding kit editable: el caller personaliza solo lo que quiera
// (p.ej. solo `acento`) y el resto queda del kit por nombre o del default Dark Obsidian.
// POR QUÉ: aditivo — `brandingFor(marca)` sin override mantiene el comportamiento actual. */
export type BrandingKitInput = Partial<BrandingKit>;

export interface VisualSpec {
  dimensiones: string;
  formato: TopicFormat;
  estilo: string;
  textoOverlay: string;
  thumbnail: string;
}

export interface ChannelCaption {
  canal: PresentChannel;
  caption: string;
  hashtags: string[];
  srt: string | null;
}

export interface PublicationPackage {
  briefId: string | null;
  tema: string;
  contenido: string;
  media: string[];
  canales: PresentChannel[];
  captionsByChannel: Record<PresentChannel, ChannelCaption>;
  visualByChannel: Record<PresentChannel, VisualSpec>;
  horarioSugerido: Record<PresentChannel, string>;
  branding: BrandingKit;
  generadoAt: string;
}

export interface PresentInput {
  /** Título/tema del contenido (se usa para hashtags y overlay). */
  tema: string;
  /** Cuerpo del contenido (texto, guion, resumen). */
  contenido: string;
  /** URLs de media ya generadas (imagenes/video). */
  media?: string[];
  /** Canales a presentar (default: los 4). */
  canales?: PresentChannel[];
  /** briefId del F1 si viene de la cola de briefs. */
  briefId?: string | null;
  /** Marca (default: kit Dark Obsidian). */
  marca?: string;
  /** QUÉ ES: sobrescritura parcial del branding kit (F3 editable). */
  branding?: BrandingKitInput;
}

/** Mapa canal → formato visual (compartido con F1 topics). */
export const FORMAT_BY_CHANNEL: Record<PresentChannel, TopicFormat> = {
  youtube_shorts: '9:16 video',
  tiktok: '9:16 video',
  instagram: '1:1 imagen',
  blog: '16:9 articulo',
};

/** Horario sugerido por canal (D2: video 2-3/sem; texto 1/día; blog 1/sem). */
export const HORARIO_SUGERIDO: Record<PresentChannel, string> = {
  youtube_shorts: 'lun/mie/vie 12:00',
  tiktok: 'mar/jue/sab 18:30',
  instagram: 'lun/mie/vie 20:00',
  blog: 'domingo 09:00',
};

/** Kits de marca por defecto. Dark Obsidian = sistema de diseño de UltraIa. */
export const BRANDING_KITS: Record<string, BrandingKit> = {
  ultrala: {
    marca: 'UltraIa',
    paleta: ['#08080a', '#111115', '#8b5cf6', '#1f1f2a'],
    fuente: 'Plus Jakarta Sans',
    logo: null,
    acento: '#8b5cf6',
  },
  neo_violet: {
    marca: 'Neo Violet',
    paleta: ['#0b0914', '#1a1530', '#7c5cff', '#2a2345'],
    fuente: 'Inter',
    logo: null,
    acento: '#7c5cff',
  },
};

const DEFAULT_KIT = BRANDING_KITS.ultrala;

/** Kit de branding para una marca (default: Dark Obsidian) con sobrescritura opcional (F3). */
export function brandingFor(marca?: string, override?: BrandingKitInput): BrandingKit {
  const base = marca && BRANDING_KITS[marca] ? BRANDING_KITS[marca] : { ...DEFAULT_KIT, marca: marca || DEFAULT_KIT.marca };
  // QUÉ ES: merge superficial del override sobre el kit base (solo campos presentes).
  // PARA QUÉ: personalizar paleta/fuente/logo/acento sin reconstruir el kit completo.
  // POR QUÉ: el spread respeta los undefined (no sobrescriben) y mantiene el kit intacto.
  return override ? { ...base, ...override } : base;
}

/** Normaliza un tema a etiqueta URL/overlay: minúsculas, sin puntuación, guiones. */
export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .trim()
    .replace(/\s+/g, '-')
    .slice(0, 80);
}

/** Hashtags por canal según el tema (keyless, determinista). */
export function hashtagsFor(tema: string, canal: PresentChannel): string[] {
  const words = slugify(tema).split('-').filter((w) => w.length > 2);
  const topicTags = words.slice(0, 4).map((w) => `#${w}`);
  const base: Record<PresentChannel, string[]> = {
    youtube_shorts: ['#shorts', '#tutorial', '#tips', '#aprende'],
    tiktok: ['#fyp', '#parati', '#viral', '#tendencia'],
    instagram: ['#instagood', '#reels', '#inspo', '#creadores'],
    blog: ['#blog', '#guia', '#analisis'],
  };
  const tags = [...topicTags, ...base[canal]];
  // IG admite hasta 30 hashtags; el resto 5-10.
  const cap = canal === 'instagram' ? 30 : 10;
  const unique = [...new Set(tags)];
  return unique.slice(0, cap);
}

/** Caption por plataforma: tono/longitud distinta por canal. */
export function captionFor(tema: string, contenido: string, canal: PresentChannel, hashtags: string[]): string {
  const tags = hashtags.join(' ');
  const firstLine = contenido.split('\n')[0].slice(0, 160) || tema;
  switch (canal) {
    case 'youtube_shorts':
      return `${tema}\n\n${firstLine}\n\n${tags}`;
    case 'tiktok':
      return `${firstLine} ${tags}`.slice(0, 2200);
    case 'instagram':
      return `${tema}\n\n${contenido.slice(0, 1800)}\n\n.\n.\n.\n${tags}`;
    case 'blog':
    default:
      return `${tema}\n\n${contenido.slice(0, 300)}\n\n${tags}`;
  }
}

/** Subtítulos SRT (patrón RF-11): segmentos de ~12 palabras con timestamps incrementales. */
export function srtFor(text: string, wordsPerChunk: number = 12, startSec: number = 0, wordsPerSec: number = 2.4): string {
  const words = text.replace(/\s+/g, ' ').trim().split(' ').filter(Boolean);
  if (!words.length) return '';
  const chunks: string[] = [];
  for (let i = 0; i < words.length; i += wordsPerChunk) chunks.push(words.slice(i, i + wordsPerChunk).join(' '));

  const ts = (sec: number): string => {
    const h = Math.floor(sec / 3600);
    const m = Math.floor((sec % 3600) / 60);
    const s = Math.floor(sec % 60);
    const ms = Math.round((sec % 1) * 1000);
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')},${String(ms).padStart(3, '0')}`;
  };

  return chunks
    .map((chunk, i) => {
      const start = startSec + (i * wordsPerChunk) / wordsPerSec;
      const end = start + wordsPerChunk / wordsPerSec;
      return `${i + 1}\n${ts(start)} --> ${ts(end)}\n${chunk}`;
    })
    .join('\n\n');
}

/** Especificación visual por canal (dimensiones + estilo + overlay). */
export function visualFor(tema: string, canal: PresentChannel): VisualSpec {
  const overlay = tema.slice(0, 60);
  switch (canal) {
    case 'youtube_shorts':
      return {
        dimensiones: '1080x1920 (9:16)',
        formato: '9:16 video',
        estilo: 'video vertical corto, subtitulos grandes, ritmo rapido',
        textoOverlay: overlay,
        thumbnail: `https://pollinations.ai/p/${encodeURIComponent(overlay)}?width=1080&height=1920&nologo=true`,
      };
    case 'tiktok':
      return {
        dimensiones: '1080x1920 (9:16)',
        formato: '9:16 video',
        estilo: 'video vertical, transiciones virales, texto grande',
        textoOverlay: overlay,
        thumbnail: `https://pollinations.ai/p/${encodeURIComponent(overlay)}?width=1080&height=1920&nologo=true`,
      };
    case 'instagram':
      return {
        dimensiones: '1080x1080 (1:1)',
        formato: '1:1 imagen',
        estilo: 'imagen cuadrada con tipografia display y acento de marca',
        textoOverlay: overlay,
        thumbnail: `https://pollinations.ai/p/${encodeURIComponent(overlay)}?width=1080&height=1080&nologo=true`,
      };
    case 'blog':
    default:
      return {
        dimensiones: '1600x900 (16:9)',
        formato: '16:9 articulo',
        estilo: 'imagen de portada con titulo y marca',
        textoOverlay: overlay,
        thumbnail: `https://pollinations.ai/p/${encodeURIComponent(overlay)}?width=1600&height=900&nologo=true`,
      };
  }
}

/** Orquesta el paquete completo de publicación para los canales pedidos. */
export function present(input: PresentInput): PublicationPackage {
  const canales: PresentChannel[] = input.canales?.length ? input.canales : ['youtube_shorts', 'tiktok', 'instagram', 'blog'];
  const branding = brandingFor(input.marca, input.branding);
  const captionsByChannel = {} as Record<PresentChannel, ChannelCaption>;
  const visualByChannel = {} as Record<PresentChannel, VisualSpec>;
  const horarioSugerido = {} as Record<PresentChannel, string>;

  for (const canal of canales) {
    const hashtags = hashtagsFor(input.tema, canal);
    const srt = canal === 'youtube_shorts' || canal === 'tiktok' ? srtFor(input.contenido) : null;
    captionsByChannel[canal] = {
      canal,
      caption: captionFor(input.tema, input.contenido, canal, hashtags),
      hashtags,
      srt,
    };
    visualByChannel[canal] = visualFor(input.tema, canal);
    horarioSugerido[canal] = HORARIO_SUGERIDO[canal];
  }

  return {
    briefId: input.briefId ?? null,
    tema: input.tema,
    contenido: input.contenido,
    media: input.media ?? [],
    canales,
    captionsByChannel,
    visualByChannel,
    horarioSugerido,
    branding,
    generadoAt: new Date().toISOString(),
  };
}

export const presentTools = { present, captionFor, hashtagsFor, srtFor, visualFor, brandingFor, slugify, BRANDING_KITS };