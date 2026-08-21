/**
 * AutoPub F1 — Motor de ideas (topics).
 *
 * Genera briefs de contenido recurrentes sin intervención manual, keyless-first:
 *   - Fuentes: RSS feeds (parseRss de reach) + búsqueda web DuckDuckGo (tendencias).
 *   - Dedupe por título normalizado + bigram overlap.
 *   - Priorización: score = novedad (frescura del pubDate) × relevancia (keywords del canal).
 *   - Brief JSON estandarizado: {tema, canal, formato, tono, angulo, fuentes, score}.
 *
 * Diseño: `fetchFn` inyectable (para tests sin red); por defecto usa globalThis.fetch.
 * La tool TS es la fuente de verdad; `scripts/topics.py` es el CLI autónomo keyless con el
 * mismo esquema de brief (documentado en AUTO-PUBLICACION.md §4 F1).
 */

import { parseRss, searchWeb } from './reach';

/** Canal objetivo de publicación (D1/D8 del plan maestro; telegram/discord/slack = canales de mensajería; facebook = canal video, iteraciones 39-40, 53). */
export type TopicChannel = 'youtube_shorts' | 'tiktok' | 'instagram' | 'blog' | 'telegram' | 'discord' | 'slack' | 'facebook';

/** Formato visual que el canal espera (F3 `present` lo consumirá). */
export type TopicFormat = '9:16 video' | '1:1 imagen' | '16:9 articulo' | '16:9 video';

/** Tono editorial sugerido para el brief. */
export type TopicTone = 'informativo' | 'educativo' | 'entretenido' | 'inspirador' | 'analitico' | 'noticia';

export interface TopicSource {
  /** URL de un feed RSS/Atom. */
  rss?: string;
  /** Query de búsqueda de tendencias (DuckDuckGo, keyless). */
  search?: string;
}

export interface TopicBrief {
  tema: string;
  canal: TopicChannel;
  formato: TopicFormat;
  tono: TopicTone;
  angulo: string;
  fuentes: string[];
  score: number;
  pubDate: string | null;
}

export interface GenerateTopicsInput {
  /** Fuentes de temas (RSS y/o búsquedas). Vacío → usa las fuentes por defecto. */
  fuentes?: TopicSource[];
  /** Canales objetivo (default: los 4). */
  canales?: TopicChannel[];
  /** Máximo de briefs a devolver (default 8). */
  maxBriefs?: number;
}

export interface GenerateTopicsResult {
  briefs: TopicBrief[];
  /** Cuántos ítems crudos se vieron (pre-dedupe) por fuente. */
  rawCount: number;
  /** Cuántos ítems únicos tras dedupe. */
  uniqueCount: number;
  /** Fuentes que respondieron (RSS con items o búsqueda con resultados). */
  fuentesActivas: string[];
}

/** Keywords por canal — ponderan la relevancia en el score. */
const CHANNEL_KEYWORDS: Record<TopicChannel, string[]> = {
  youtube_shorts: ['tutorial', 'como', 'tips', '5', 'mejores', 'error', 'rapido', 'facil'],
  tiktok: ['tendencia', 'viral', 'hack', 'lifehack', 'misterio', 'antes', 'despues', 'pov'],
  instagram: ['estetica', 'diseno', 'inspiracion', 'idea', 'pack', 'branding', 'visual'],
  blog: ['guia', 'analisis', 'futuro', 'estrategia', 'que es', 'como funciona', 'reporte', 'caso'],
  telegram: ['canal', 'diario', 'resumen', 'noticia', 'actualizacion', 'inteligencia artificial'],
  discord: ['comunidad', 'canal', 'noticia', 'anuncio', 'debate', 'resumen'],
  slack: ['equipo', 'actualizacion', 'resumen', 'anuncio', 'interno', 'reporte'],
  facebook: ['reels', 'video', 'tendencia', 'compartir', 'viral', 'comunidad', 'pagina'],
};

/** Mapa canal → formato visual (F3 `present` lo usará). */
const FORMAT_BY_CHANNEL: Record<TopicChannel, TopicFormat> = {
  youtube_shorts: '9:16 video',
  tiktok: '9:16 video',
  instagram: '1:1 imagen',
  blog: '16:9 articulo',
  telegram: '9:16 video',
  discord: '9:16 video',
  slack: '9:16 video',
  facebook: '9:16 video',
};

/** Tono por defecto según el origen del ítem. */
function toneFor(item: { title: string; description: string }, fromSearch: boolean): TopicTone {
  const t = `${item.title} ${item.description}`.toLowerCase();
  if (/\b(guia|como|tutorial|paso|tips|hack|mejores)\b/.test(t)) return 'educativo';
  if (/\b(tendencia|viral|misterio|pov|antes|despues)\b/.test(t)) return 'entretenido';
  if (/\b(analisis|reporte|futuro|estrategia|estudio|datos)\b/.test(t)) return 'analitico';
  if (/\b(nueva|nuevo|anuncio|lanza|presenta)\b/.test(t)) return 'noticia';
  if (/\b(inspira|idea|pack|branding|estetica|diseno)\b/.test(t)) return 'inspirador';
  return fromSearch ? 'informativo' : 'noticia';
}

/** Ángulo sugerido (template por tipo de fuente). */
function angleFor(item: { title: string; description: string }, fromSearch: boolean): string {
  const t = `${item.title} ${item.description}`.toLowerCase();
  if (/\b(como|tutorial|paso)\b/.test(t)) return 'Tutorial paso a paso con ejemplo real';
  if (/\b(tips|hack|mejores)\b/.test(t)) return 'Lista de recomendaciones accionables';
  if (/\b(tendencia|viral)\b/.test(t)) return 'Por que esto esta en tendencia ahora';
  if (/\b(guia|estrategia|analisis)\b/.test(t)) return 'Analisis con contexto y datos';
  if (/\b(nueva|nuevo|anuncio|lanza)\b/.test(t)) return 'Novedad explicada en 60 segundos';
  return fromSearch ? 'Resumen de tendencia con datos de la busqueda' : 'Resumen de la noticia con contexto';
}

/** Normaliza un título: minúsculas + sin puntuación + espacios colapsados. */
export function normalizeTitle(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Bigrams de un texto normalizado. */
function bigrams(s: string): Set<string> {
  const tokens = s.split(' ').filter(Boolean);
  const out = new Set<string>();
  for (let i = 0; i < tokens.length - 1; i++) out.add(`${tokens[i]} ${tokens[i + 1]}`);
  return out;
}

/** Similitud de Jaccard entre bigram sets (0..1). */
function jaccard(a: Set<string>, b: Set<string>): number {
  if (!a.size && !b.size) return 1;
  let inter = 0;
  for (const x of a) if (b.has(x)) inter++;
  const union = a.size + b.size - inter;
  return union === 0 ? 0 : inter / union;
}

/** Dedupe: agrupa ítems por similitud de título (Jaccard bigram > 0.6). */
export function dedupeItems<T extends { title: string }>(items: T[]): T[] {
  const seen: string[] = [];
  const out: T[] = [];
  for (const item of items) {
    const norm = normalizeTitle(item.title);
    if (!norm) continue;
    const dup = seen.some((prev) => jaccard(bigrams(prev), bigrams(norm)) > 0.6);
    if (dup) continue;
    seen.push(norm);
    out.push(item);
  }
  return out;
}

/** Peso de novedad: 0..1 según antigüedad del pubDate (7 días → 1, 30+ días → 0). */
export function noveltyScore(pubDate: string | null, now: number = Date.now()): number {
  if (!pubDate) return 0.5;
  const t = Date.parse(pubDate);
  if (Number.isNaN(t)) return 0.5;
  const ageDays = (now - t) / 86_400_000;
  if (ageDays < 0) return 1;
  if (ageDays <= 7) return 1;
  if (ageDays >= 30) return 0;
  return 1 - (ageDays - 7) / 23;
}

/** Score final: novedad × relevancia de keywords del canal × bonus de cobertura. */
export function scoreBrief(
  brief: { pubDate: string | null; tema: string },
  canal: TopicChannel,
  now: number = Date.now(),
): number {
  const novelty = noveltyScore(brief.pubDate, now);
  const t = normalizeTitle(brief.tema);
  let relevance = 0.5;
  const channelKw = CHANNEL_KEYWORDS[canal];
  if (channelKw && channelKw.some((kw) => t.includes(kw))) relevance = 1;
  return Math.round(novelty * relevance * 100) / 100;
}

/** Fuentes por defecto cuando el input no trae ninguna (RSS tech + tendencias DDG). */
export const DEFAULT_SOURCES: TopicSource[] = [
  { rss: 'https://hnrss.org/frontpage' },
  { rss: 'https://feeds.arstechnica.com/arstechnica/technology-lab' },
  { rss: 'https://www.theverge.com/rss/index.xml' },
  { search: 'AI tendencias 2026' },
  { search: 'IA generativa noticias hoy' },
];

interface RawItem {
  title: string;
  link: string;
  description: string;
  pubDate: string | null;
  fuente: string;
  fromSearch: boolean;
}

/** Recoge ítems crudos de las fuentes activas (RSS + búsqueda). */
async function collectRaw(input: GenerateTopicsInput): Promise<{ items: RawItem[]; activas: string[] }> {
  const fuentes = input.fuentes?.length ? input.fuentes : DEFAULT_SOURCES;
  const items: RawItem[] = [];
  const activas: string[] = [];

  const tasks = fuentes.map(async (src) => {
    if (src.rss) {
      try {
        const res = await parseRss({ url: src.rss, maxItems: 8 });
        if (res.items.length) {
          activas.push(src.rss);
          for (const it of res.items) {
            items.push({
              title: it.title || '(sin titulo)',
              link: it.link || src.rss,
              description: it.description,
              pubDate: it.pubDate,
              fuente: res.feedTitle || src.rss,
              fromSearch: false,
            });
          }
        }
      } catch {
        // fuente muerta → se ignora (degradación elegante)
      }
    }
    if (src.search) {
      try {
        const res = await searchWeb({ query: src.search, maxResults: 8 });
        if (res.results.length) {
          activas.push(`search:${src.search}`);
          for (const r of res.results) {
            items.push({
              title: r.title || '(sin titulo)',
              link: r.url,
              description: r.snippet,
              pubDate: null,
              fuente: `search:${src.search}`,
              fromSearch: true,
            });
          }
        }
      } catch {
        // búsqueda fallida → se ignora
      }
    }
  });
  await Promise.all(tasks);
  return { items, activas };
}

/** Genera briefs priorizados a partir de fuentes RSS + búsqueda de tendencias. */
export async function generateTopicBriefs(input: GenerateTopicsInput = {}): Promise<GenerateTopicsResult> {
  const canales: TopicChannel[] = input.canales?.length ? input.canales : ['youtube_shorts', 'tiktok', 'instagram', 'blog'];
  const maxBriefs = Math.max(1, input.maxBriefs ?? 8);

  const { items, activas } = await collectRaw(input);
  const unique = dedupeItems(items);
  const briefs: TopicBrief[] = [];

  for (const item of unique) {
    // Cada ítem genera un brief por canal objetivo (rotando el ángulo para evitar duplicados).
    for (const canal of canales) {
      const brief: TopicBrief = {
        tema: item.title,
        canal,
        formato: FORMAT_BY_CHANNEL[canal],
        tono: toneFor(item, item.fromSearch),
        angulo: angleFor(item, item.fromSearch),
        fuentes: [item.link, item.fuente].filter(Boolean),
        score: 0,
        pubDate: item.pubDate,
      };
      brief.score = scoreBrief(brief, canal);
      briefs.push(brief);
    }
  }

  briefs.sort((a, b) => b.score - a.score);
  return { briefs: briefs.slice(0, maxBriefs), rawCount: items.length, uniqueCount: unique.length, fuentesActivas: activas };
}

export const topics = { generateTopicBriefs, normalizeTitle, dedupeItems, noveltyScore, scoreBrief };