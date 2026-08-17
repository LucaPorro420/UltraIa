/**
 * AutoPub F5 — KPIs por canal de la cola de publicaciones (F4 tarea 2 + F5 tarea 1).
 * Agrega sobre `Publication` (Prisma) con db inyectable: publicadas, fallidas,
 * pendientes, tasa de éxito, y media del mediaScore pre-publicación (F5).
 */

import type { Db } from '../db/client';
import type { PublicationEstado } from '../domain/publications';

export interface CanalKpis {
  canal: string;
  total: number;
  publicadas: number;
  fallidas: number;
  pendientes: number; // DRAFT + APPROVED
  tasaExito: number | null; // publicadas / (publicadas + fallidas), null si no hay
  scorePromedio: number | null; // media mediaScore
  /** Analytics reales fusionados (F5, opcional). */
  vistasReales?: number;
  likesReales?: number;
  comentariosReales?: number;
  compartidosReales?: number;
}

export interface PublicationKpis {
  porCanal: CanalKpis[];
  totales: {
    total: number;
    publicadas: number;
    fallidas: number;
    pendientes: number;
    tasaExito: number | null;
    scorePromedio: number | null;
  };
}

export async function computeChannelKpis(db: Db): Promise<PublicationKpis> {
  const rows = await db.publication.findMany({ select: { canal: true, estado: true, mediaScore: true } });
  const porCanal = new Map<string, CanalKpis>();

  const acumula = (canal: string) => {
    let c = porCanal.get(canal);
    if (!c) {
      c = { canal, total: 0, publicadas: 0, fallidas: 0, pendientes: 0, tasaExito: null, scorePromedio: null };
      porCanal.set(canal, c);
    }
    return c;
  };

  const scoresPorCanal = new Map<string, number[]>();
  for (const r of rows) {
    const c = acumula(r.canal);
    c.total++;
    const estado = r.estado as PublicationEstado;
    if (estado === 'PUBLISHED') c.publicadas++;
    else if (estado === 'FAILED') c.fallidas++;
    else if (estado === 'DRAFT' || estado === 'APPROVED') c.pendientes++;
    if (typeof r.mediaScore === 'number') {
      const arr = scoresPorCanal.get(r.canal) ?? [];
      arr.push(r.mediaScore);
      scoresPorCanal.set(r.canal, arr);
    }
  }

  const canales = [...porCanal.values()].map((c) => {
    const cerradas = c.publicadas + c.fallidas;
    const scores = scoresPorCanal.get(c.canal) ?? [];
    return {
      ...c,
      tasaExito: cerradas > 0 ? Math.round((c.publicadas / cerradas) * 100) / 100 : null,
      scorePromedio: scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : null,
    };
  });

  const sum = (fn: (c: CanalKpis) => number) => canales.reduce((acc, c) => acc + fn(c), 0);
  const totalPublicadas = sum((c) => c.publicadas);
  const totalFallidas = sum((c) => c.fallidas);
  const cerradas = totalPublicadas + totalFallidas;
  const todosScores = [...scoresPorCanal.values()].flat();

  return {
    porCanal: canales.sort((a, b) => b.total - a.total),
    totales: {
      total: sum((c) => c.total),
      publicadas: totalPublicadas,
      fallidas: totalFallidas,
      pendientes: sum((c) => c.pendientes),
      tasaExito: cerradas > 0 ? Math.round((totalPublicadas / cerradas) * 100) / 100 : null,
      scorePromedio: todosScores.length > 0 ? Math.round(todosScores.reduce((a, b) => a + b, 0) / todosScores.length) : null,
    },
  };
}

export const metrics = { computeChannelKpis };

// -----------------------------------------------------------------------------
// F5 — analytics REALES por API de canal (keyless-first, fail-soft).
// YouTube Data API v3 (channels/statistics) es gratis con YOUTUBE_API_KEY; el resto
// de plataformas requieren aprobacion/OAuth/token -> fail-soft con razon clara.
// -----------------------------------------------------------------------------

export type AnalyticsPlatform = 'youtube' | 'tiktok' | 'x' | 'instagram' | 'threads' | 'telegram';

export interface ChannelAnalytics {
  platform: AnalyticsPlatform;
  ok: boolean;
  /** Canal de la cola Publication al que mapea (null si no mapea). */
  canal: string | null;
  vistas?: number;
  likes?: number;
  comentarios?: number;
  compartidos?: number;
  videoCount?: number;
  /** Subscriptores (solo youtube). */
  subscriptores?: number;
  error?: string;
  fetchedAt: string;
}

export interface FetchAnalyticsOptions {
  /** fetch inyectable (tests). Default: global fetch. */
  fetchImpl?: typeof fetch;
  /** apiKeys inyectables (tests). Default: env. */
  apiKeys?: Record<string, string>;
}

const PLATFORM_TO_CANAL: Record<AnalyticsPlatform, string | null> = {
  youtube: 'youtube_shorts',
  tiktok: 'tiktok',
  x: null, // no hay canal 'x' en la cola
  instagram: 'instagram',
  threads: null,
  telegram: 'telegram',
};

function parseCount(v: unknown): number | undefined {
  if (typeof v === 'number' && Number.isFinite(v)) return v;
  if (typeof v === 'string' && v.trim() !== '' && Number.isFinite(Number(v))) return Number(v);
  return undefined;
}

function envKey(name: string, opts: FetchAnalyticsOptions): string | undefined {
  if (opts.apiKeys?.[name]) return opts.apiKeys[name];
  try {
    return process.env[name];
  } catch {
    return undefined;
  }
}

async function fetchYoutubeStatistics(input: { channelId: string; apiKey: string }, opts: FetchAnalyticsOptions): Promise<ChannelAnalytics> {
  const f = opts.fetchImpl ?? fetch;
  const url = `https://www.googleapis.com/youtube/v3/channels?part=statistics&id=${encodeURIComponent(input.channelId)}&key=${encodeURIComponent(input.apiKey)}`;
  const res = await f(url);
  if (!res.ok) throw new Error(`youtube API HTTP ${res.status}`);
  const data = (await res.json()) as { items?: Array<{ statistics?: Record<string, string> }> };
  const stats = data.items?.[0]?.statistics;
  if (!stats) throw new Error('youtube: sin items (channelId invalido o canal sin estadisticas)');
  return {
    platform: 'youtube',
    ok: true,
    canal: PLATFORM_TO_CANAL.youtube,
    vistas: parseCount(stats.viewCount),
    subscriptores: parseCount(stats.subscriberCount),
    videoCount: parseCount(stats.videoCount),
    fetchedAt: new Date().toISOString(),
  };
}

/** Analytics reales de una plataforma. Keyless-first: youtube con YOUTUBE_API_KEY; el
// resto fail-soft (razon clara: aprobacion/OAuth/token/admin). Nunca inventa numeros. */
export async function fetchChannelAnalytics(input: { platform: AnalyticsPlatform; channelId?: string }, opts: FetchAnalyticsOptions = {}): Promise<ChannelAnalytics> {
  const base = { platform: input.platform, canal: PLATFORM_TO_CANAL[input.platform], fetchedAt: new Date().toISOString() };
  try {
    switch (input.platform) {
      case 'youtube': {
        if (!input.channelId) return { ...base, ok: false, error: 'youtube requiere channelId' };
        const apiKey = envKey('YOUTUBE_API_KEY', opts);
        if (!apiKey) return { ...base, ok: false, error: 'YOUTUBE_API_KEY no configurada (fail-soft)' };
        return await fetchYoutubeStatistics({ channelId: input.channelId, apiKey }, opts);
      }
      case 'tiktok':
        return { ...base, ok: false, error: 'TikTok Research API requiere aprobacion de TikTok (fail-soft)' };
      case 'x':
        return { ...base, ok: false, error: 'X API v2 requiere OAuth2 de usuario (fail-soft)' };
      case 'instagram':
      case 'threads':
        return { ...base, ok: false, error: `${input.platform} Graph API requiere IG_ACCESS_TOKEN (fail-soft)` };
      case 'telegram':
        return { ...base, ok: false, error: 'Telegram requiere bot admin del canal (fail-soft)' };
    }
  } catch (e) {
    return { ...base, ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

/** Fusiona analytics reales en los KPIs de la cola (por canal mapeado). Determinista. */
export function mergeAnalyticsIntoKpis(kpis: PublicationKpis, analytics: ChannelAnalytics[]): PublicationKpis {
  const mapa = new Map<string, ChannelAnalytics>();
  for (const a of analytics) {
    if (a.ok && a.canal && !mapa.has(a.canal)) mapa.set(a.canal, a);
  }
  const porCanal = kpis.porCanal.map((c) => {
    const a = mapa.get(c.canal);
    if (!a) return c;
    return { ...c, vistasReales: a.vistas, likesReales: a.likes, comentariosReales: a.comentarios, compartidosReales: a.compartidos };
  });
  return { ...kpis, porCanal };
}

export const metricsF5 = { fetchChannelAnalytics, mergeAnalyticsIntoKpis };