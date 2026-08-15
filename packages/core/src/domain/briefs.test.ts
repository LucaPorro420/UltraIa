import { describe, expect, it } from 'vitest';
import {
  guardarBriefs,
  listarBriefs,
  marcarBriefDescartado,
  marcarBriefProcesado,
  type BriefEstado,
} from './briefs';
import type { Db } from '../db/client';
import type { TopicBrief } from '../tools/topics';

function brief(overrides: Partial<TopicBrief> = {}): TopicBrief {
  return {
    tema: 'RAG en producción',
    canal: 'blog',
    formato: '16:9 articulo',
    tono: 'educativo',
    angulo: 'los 5 fallos al integrar RAG',
    fuentes: ['https://example.com/rag'],
    score: 0.9,
    pubDate: '2026-08-15',
    ...overrides,
  };
}

/** Fila tal como Prisma la devuelve (fuentesJson serializado). */
interface PrismaRow {
  id: string;
  tema: string;
  canal: string;
  formato: string;
  tono: string;
  angulo: string;
  fuentesJson: string;
  score: number;
  pubDate: string | null;
  estado: BriefEstado;
  creadoEn: Date;
  procesadoEn: Date | null;
}

let seq = 0;

function fakeDb(rows: PrismaRow[] = []) {
  const db = {
    topicBrief: {
      create: async ({ data }: any) => {
        const row: PrismaRow = {
          id: `b${++seq}`,
          tema: data.tema,
          canal: data.canal,
          formato: data.formato,
          tono: data.tono,
          angulo: data.angulo,
          fuentesJson: data.fuentesJson,
          score: data.score,
          pubDate: data.pubDate ?? null,
          estado: (data.estado ?? 'NUEVO') as BriefEstado,
          creadoEn: data.creadoEn ?? new Date(),
          procesadoEn: null,
        };
        rows.push(row);
        return row;
      },
      findFirst: async ({ where }: any) => rows.find((r) => r.tema === where.tema && r.canal === where.canal) ?? null,
      findMany: async ({ where, orderBy, take, cursor, skip }: any) => {
        let out = rows.filter((r) => {
          if (where?.estado && r.estado !== where.estado) return false;
          if (where?.canal && r.canal !== where.canal) return false;
          return true;
        });
        if (orderBy?.[0]?.score === 'desc') out = [...out].sort((a, b) => b.score - a.score);
        if (cursor && skip) {
          const idx = out.findIndex((r) => r.id === cursor.id);
          if (idx >= 0) out = out.slice(idx + 1);
        }
        return take ? out.slice(0, take) : out;
      },
      update: async ({ where, data }: any) => {
        const row = rows.find((r) => r.id === where.id)!;
        Object.assign(row, data);
        return row;
      },
    },
  };
  return { db: db as unknown as Db, rows };
}

describe('guardarBriefs', () => {
  it('persiste briefs nuevos y reporta los ya existentes (dedupe tema+canal)', async () => {
    const { db, rows } = fakeDb();
    const r1 = await guardarBriefs(db, [brief(), brief({ tema: 'Otro tema' })]);
    expect(r1.creados).toBe(2);
    expect(r1.yaExistentes).toBe(0);
    const r2 = await guardarBriefs(db, [brief(), brief({ tema: 'Tercero', canal: 'tiktok' })]);
    expect(r2.creados).toBe(1); // solo el tercero
    expect(r2.yaExistentes).toBe(1);
    expect(rows).toHaveLength(3);
  });

  it('guarda fuentes como JSON y score', async () => {
    const { db, rows } = fakeDb();
    await guardarBriefs(db, [brief({ fuentes: ['https://a.com', 'https://b.com'], score: 0.77 })]);
    expect(JSON.parse(rows[0].fuentesJson)).toEqual(['https://a.com', 'https://b.com']);
    expect(rows[0].score).toBe(0.77);
    expect(rows[0].estado).toBe('NUEVO');
  });
});

describe('listarBriefs', () => {
  it('ordena por score desc y filtra por estado/canal', async () => {
    const { db } = fakeDb();
    await guardarBriefs(db, [
      brief({ tema: 'Bajo', score: 0.3 }),
      brief({ tema: 'Alto', score: 0.95, canal: 'youtube_shorts', formato: '9:16 video' }),
      brief({ tema: 'Medio', score: 0.6 }),
    ]);
    const todos = await listarBriefs(db);
    expect(todos.items.map((i) => i.tema)).toEqual(['Alto', 'Medio', 'Bajo']);
    const shorts = await listarBriefs(db, { canal: 'youtube_shorts' });
    expect(shorts.items).toHaveLength(1);
    expect(shorts.items[0].tema).toBe('Alto');
  });

  it('respeta take + paginación con cursor', async () => {
    const { db } = fakeDb();
    await guardarBriefs(db, [brief({ tema: 'A', score: 0.9 }), brief({ tema: 'B', score: 0.8 }), brief({ tema: 'C', score: 0.7 })]);
    const page1 = await listarBriefs(db, { take: 2 });
    expect(page1.items).toHaveLength(2);
    expect(page1.nextCursor).toBe(page1.items[1].id);
    const page2 = await listarBriefs(db, { take: 2, cursor: page1.nextCursor! });
    expect(page2.items).toHaveLength(1);
    expect(page2.items[0].tema).toBe('C');
    expect(page2.nextCursor).toBeNull();
  });

  it('filtra por estado', async () => {
    const { db, rows } = fakeDb();
    await guardarBriefs(db, [brief()]);
    await guardarBriefs(db, [brief({ tema: 'Otro' })]);
    await marcarBriefProcesado(db, rows[0].id);
    const nuevos = await listarBriefs(db, { estado: 'NUEVO' });
    expect(nuevos.items).toHaveLength(1);
    const procesados = await listarBriefs(db, { estado: 'PROCESADO' });
    expect(procesados.items).toHaveLength(1);
  });
});

describe('transiciones', () => {
  it('marca PROCESADO y DESCARTADO con fecha', async () => {
    const { db, rows } = fakeDb();
    await guardarBriefs(db, [brief()]);
    const e1 = await marcarBriefProcesado(db, rows[0].id);
    expect(e1).toBe('PROCESADO');
    expect(rows[0].procesadoEn).toBeInstanceOf(Date);
    const e2 = await marcarBriefDescartado(db, rows[0].id);
    expect(e2).toBe('DESCARTADO');
  });
});