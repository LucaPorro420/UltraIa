import { describe, expect, it } from 'vitest';
import { computeChannelKpis, fetchChannelAnalytics, mergeAnalyticsIntoKpis } from './metrics';
import type { Db } from '../db/client';
import type { PublicationPackage } from './present';

function makePaquete(canal: 'youtube_shorts' | 'tiktok' | 'instagram' | 'blog'): PublicationPackage {
  const canales: Array<'youtube_shorts' | 'tiktok' | 'instagram' | 'blog'> = ['youtube_shorts', 'tiktok', 'instagram', 'blog'];
  const captionsByChannel = {} as PublicationPackage['captionsByChannel'];
  const visualByChannel = {} as PublicationPackage['visualByChannel'];
  const horarioSugerido = {} as PublicationPackage['horarioSugerido'];
  for (const c of canales) {
    captionsByChannel[c] = { canal: c, caption: `Caption para ${c}`, hashtags: ['#IA', '#Shorts'], srt: null };
    visualByChannel[c] = { dimensiones: '1080x1920', formato: '9:16 video', estilo: 'x', textoOverlay: 'x', thumbnail: 'https://x' };
    horarioSugerido[c] = 'lun 12:00';
  }
  return {
    briefId: 'b1',
    tema: 'El futuro de la IA',
    contenido: 'Contenido de prueba para la cola de publicaciones.',
    media: [],
    canales,
    captionsByChannel,
    visualByChannel,
    horarioSugerido,
    branding: { marca: 'UltraIa', paleta: [], fuente: 'Inter', logo: null, acento: '#8b5cf6' },
    generadoAt: '2026-08-15T00:00:00.000Z',
  };
}

interface Row {
  id: string;
  canal: string;
  estado: string;
  mediaScore: number | null;
}

let seq = 0;

function fakeDb(rows: Row[] = []) {
  const db = {
    publication: {
      findMany: async ({ select }: any) => rows,
    },
  };
  return { db: db as unknown as Db, rows };
}

describe('computeChannelKpis', () => {
  it('agrega por canal: publicadas/fallidas/pendientes + tasa de éxito', async () => {
    const { db } = fakeDb([
      { id: `a${++seq}`, canal: 'blog', estado: 'PUBLISHED', mediaScore: 90 },
      { id: `a${++seq}`, canal: 'blog', estado: 'PUBLISHED', mediaScore: 80 },
      { id: `a${++seq}`, canal: 'blog', estado: 'FAILED', mediaScore: 50 },
      { id: `a${++seq}`, canal: 'youtube_shorts', estado: 'DRAFT', mediaScore: 70 },
      { id: `a${++seq}`, canal: 'youtube_shorts', estado: 'APPROVED', mediaScore: 60 },
    ]);
    const kpis = await computeChannelKpis(db);
    expect(kpis.totales.total).toBe(5);
    expect(kpis.totales.publicadas).toBe(2);
    expect(kpis.totales.fallidas).toBe(1);
    expect(kpis.totales.pendientes).toBe(2);
    expect(kpis.totales.tasaExito).toBeCloseTo(0.67, 2); // redondeado a 2 decimales
    expect(kpis.totales.scorePromedio).toBe(70); // (90+80+50+70+60)/5 = 70

    const blog = kpis.porCanal.find((c) => c.canal === 'blog')!;
    expect(blog.total).toBe(3);
    expect(blog.publicadas).toBe(2);
    expect(blog.fallidas).toBe(1);
    expect(blog.pendientes).toBe(0);
    expect(blog.tasaExito).toBeCloseTo(0.67, 2); // redondeado a 2 decimales
    expect(blog.scorePromedio).toBe(73); // (90+80+50)/3 ≈ 73
  });

  it('sin publicaciones cerradas → tasaExito null', async () => {
    const { db } = fakeDb([
      { id: `a${++seq}`, canal: 'blog', estado: 'DRAFT', mediaScore: 80 },
    ]);
    const kpis = await computeChannelKpis(db);
    expect(kpis.totales.tasaExito).toBeNull();
    expect(kpis.porCanal[0].tasaExito).toBeNull();
  });

  it('tabla vacía → totales en cero sin errores', async () => {
    const { db } = fakeDb([]);
    const kpis = await computeChannelKpis(db);
    expect(kpis.totales.total).toBe(0);
    expect(kpis.totales.scorePromedio).toBeNull();
    expect(kpis.porCanal).toHaveLength(0);
  });

  it('orden por total descendente', async () => {
    const { db } = fakeDb([
      { id: `a${++seq}`, canal: 'blog', estado: 'PUBLISHED', mediaScore: 90 },
      { id: `a${++seq}`, canal: 'tiktok', estado: 'PUBLISHED', mediaScore: 85 },
      { id: `a${++seq}`, canal: 'tiktok', estado: 'PUBLISHED', mediaScore: 75 },
    ]);
    const kpis = await computeChannelKpis(db);
    expect(kpis.porCanal[0].canal).toBe('tiktok');
    expect(kpis.porCanal[1].canal).toBe('blog');
  });
});

describe('fetchChannelAnalytics (F5, fetch inyectable, cero llamadas reales)', () => {
  it('youtube: parsea statistics a numeros y mapea canal youtube_shorts', async () => {
    const fetchImpl = (async () => ({
      ok: true,
      json: async () => ({
        items: [{ statistics: { viewCount: '1234567', subscriberCount: '8901', videoCount: '42' } }],
      }),
    })) as unknown as typeof fetch;
    const a = await fetchChannelAnalytics({ platform: 'youtube', channelId: 'UC_x' }, { fetchImpl, apiKeys: { YOUTUBE_API_KEY: 'k' } });
    expect(a.ok).toBe(true);
    expect(a.canal).toBe('youtube_shorts');
    expect(a.vistas).toBe(1234567);
    expect(a.subscriptores).toBe(8901);
    expect(a.videoCount).toBe(42);
  });

  it('youtube: sin YOUTUBE_API_KEY -> fail-soft con razon', async () => {
    const a = await fetchChannelAnalytics({ platform: 'youtube', channelId: 'UC_x' }, { apiKeys: {} });
    expect(a.ok).toBe(false);
    expect(a.error).toContain('YOUTUBE_API_KEY');
  });

  it('youtube: sin channelId -> fail-soft', async () => {
    const a = await fetchChannelAnalytics({ platform: 'youtube' }, { apiKeys: { YOUTUBE_API_KEY: 'k' } });
    expect(a.ok).toBe(false);
    expect(a.error).toContain('channelId');
  });

  it('youtube: fetch HTTP error -> fail-soft con mensaje', async () => {
    const fetchImpl = (async () => ({ ok: false, status: 403 })) as unknown as typeof fetch;
    const a = await fetchChannelAnalytics({ platform: 'youtube', channelId: 'UC_x' }, { fetchImpl, apiKeys: { YOUTUBE_API_KEY: 'k' } });
    expect(a.ok).toBe(false);
    expect(a.error).toContain('403');
  });

  it('youtube: respuesta sin items -> fail-soft', async () => {
    const fetchImpl = (async () => ({ ok: true, json: async () => ({ items: [] }) })) as unknown as typeof fetch;
    const a = await fetchChannelAnalytics({ platform: 'youtube', channelId: 'UC_x' }, { fetchImpl, apiKeys: { YOUTUBE_API_KEY: 'k' } });
    expect(a.ok).toBe(false);
    expect(a.error).toContain('sin items');
  });

  it('youtube: hiddenSubscriberCount (sin subscriberCount) -> parse defensivo', async () => {
    const fetchImpl = (async () => ({
      ok: true,
      json: async () => ({ items: [{ statistics: { viewCount: '5', videoCount: '1' } }] }),
    })) as unknown as typeof fetch;
    const a = await fetchChannelAnalytics({ platform: 'youtube', channelId: 'UC_x' }, { fetchImpl, apiKeys: { YOUTUBE_API_KEY: 'k' } });
    expect(a.ok).toBe(true);
    expect(a.subscriptores).toBeUndefined();
    expect(a.vistas).toBe(5);
  });

  it('tiktok: requiere aprobacion Research API (fail-soft)', async () => {
    const a = await fetchChannelAnalytics({ platform: 'tiktok' });
    expect(a.ok).toBe(false);
    expect(a.error).toContain('Research API');
    expect(a.canal).toBe('tiktok');
  });

  it('x: requiere OAuth2 (fail-soft), canal null', async () => {
    const a = await fetchChannelAnalytics({ platform: 'x' });
    expect(a.ok).toBe(false);
    expect(a.error).toContain('OAuth2');
    expect(a.canal).toBeNull();
  });

  it('instagram/threads: requieren token Graph (fail-soft)', async () => {
    const ig = await fetchChannelAnalytics({ platform: 'instagram' });
    expect(ig.ok).toBe(false);
    expect(ig.error).toContain('IG_ACCESS_TOKEN');
    const th = await fetchChannelAnalytics({ platform: 'threads' });
    expect(th.ok).toBe(false);
  });

  it('telegram: requiere bot admin (fail-soft)', async () => {
    const a = await fetchChannelAnalytics({ platform: 'telegram' });
    expect(a.ok).toBe(false);
    expect(a.error).toContain('bot admin');
  });
});

describe('mergeAnalyticsIntoKpis (F5)', () => {
  it('fusiona vistas/likes reales en el canal mapeado', async () => {
    const kpis = await computeChannelKpis(fakeDb([{ id: 'p1', canal: 'youtube_shorts', estado: 'PUBLISHED', mediaScore: 80 }]).db);
    const merged = mergeAnalyticsIntoKpis(kpis, [
      { platform: 'youtube', ok: true, canal: 'youtube_shorts', vistas: 1000, likes: 50, fetchedAt: 'x' },
    ]);
    expect(merged.porCanal[0].vistasReales).toBe(1000);
    expect(merged.porCanal[0].likesReales).toBe(50);
  });

  it('skips analytics ok=false y canales sin mapeo (x/threads)', async () => {
    const kpis = await computeChannelKpis(fakeDb([{ id: 'p1', canal: 'blog', estado: 'PUBLISHED', mediaScore: 80 }]).db);
    const merged = mergeAnalyticsIntoKpis(kpis, [
      { platform: 'x', ok: true, canal: null, vistas: 999, fetchedAt: 'x' },
      { platform: 'youtube', ok: false, canal: 'youtube_shorts', error: 'fail', fetchedAt: 'x' },
    ]);
    expect(merged.porCanal[0].vistasReales).toBeUndefined();
  });

  it('canal analitico sin fila en la cola: no agrega nada', async () => {
    const kpis = await computeChannelKpis(fakeDb([{ id: 'p1', canal: 'blog', estado: 'PUBLISHED', mediaScore: 80 }]).db);
    const merged = mergeAnalyticsIntoKpis(kpis, [
      { platform: 'youtube', ok: true, canal: 'youtube_shorts', vistas: 7, fetchedAt: 'x' },
    ]);
    expect(merged.porCanal).toHaveLength(1);
    expect(merged.porCanal[0].canal).toBe('blog');
    expect(merged.porCanal[0].vistasReales).toBeUndefined();
  });
});