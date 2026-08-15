import { describe, expect, it } from 'vitest';
import { computeChannelKpis } from './metrics';
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