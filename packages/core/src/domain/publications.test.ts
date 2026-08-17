import { describe, expect, it, vi } from 'vitest';
import {
  approvePublication,
  canalRequiereAprobacion,
  createPublication,
  listBlogPosts,
  listPublications,
  markFailed,
  markPublished,
  publicationSignals,
  publishDue,
  registrarFeedback,
  rejectPublication,
  type PublicationEstado,
} from './publications';
import type { Db } from '../db/client';
import type { PublicationPackage } from '../tools/present';
import { CloudService, InMemoryCloudAdapter } from '../tools/cloud';

function makePaquete(canal: 'youtube_shorts' | 'tiktok' | 'instagram' | 'blog'): PublicationPackage {
  const canales: Array<'youtube_shorts' | 'tiktok' | 'instagram' | 'blog'> = ['youtube_shorts', 'tiktok', 'instagram', 'blog'];
  const captionsByChannel = {} as PublicationPackage['captionsByChannel'];
  const visualByChannel = {} as PublicationPackage['visualByChannel'];
  const horarioSugerido = {} as PublicationPackage['horarioSugerido'];
  for (const c of canales) {
    captionsByChannel[c] = { canal: c, caption: `Caption para ${c}`, hashtags: ['#IA', '#Shorts'], srt: `1\n00:00:00,000 --> 00:00:02,000\nHola` };
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
  tema: string;
  canal: string;
  estado: PublicationEstado;
  requiereAprobacion: boolean;
  scheduledAt: Date | null;
  paqueteJson: string;
  caption: string;
  hashtags: string;
  error: string | null;
  resultadoJson: string | null;
  publishedAt: Date | null;
  mediaScore: number | null;
  feedbackJson: string | null;
  updatedAt: Date;
}

let seq = 0;

function fakeDb(rows: Row[] = []) {
  const db = {
    publication: {
      create: async ({ data }: any) => {
        const row: Row = {
          id: `p${++seq}`,
          tema: data.tema,
          canal: data.canal,
          estado: data.estado as PublicationEstado,
          requiereAprobacion: data.requiereAprobacion,
          scheduledAt: data.scheduledAt ?? null,
          paqueteJson: data.paqueteJson,
          caption: data.caption,
          hashtags: data.hashtags,
          error: null,
          resultadoJson: null,
          publishedAt: null,
          mediaScore: data.mediaScore ?? null,
          feedbackJson: data.feedbackJson ?? null,
          updatedAt: new Date(),
        };
        rows.push(row);
        return row;
      },
      findMany: async ({ where, orderBy, take }: any) => {
        let out = rows.filter((r) => {
          if (where?.estado && r.estado !== where.estado) return false;
          if (where?.canal && r.canal !== where.canal) return false;
          if (where?.scheduledAt?.lte && !(r.scheduledAt && r.scheduledAt <= where.scheduledAt.lte)) return false;
          return true;
        });
        if (orderBy?.[0]?.scheduledAt === 'desc') {
          out = [...out].sort((a, b) => {
            if (!a.scheduledAt) return 1;
            if (!b.scheduledAt) return -1;
            return b.scheduledAt.getTime() - a.scheduledAt.getTime();
          });
        }
        return take ? out.slice(0, take) : out;
      },
      findUnique: async ({ where }: any) => rows.find((r) => r.id === where.id) ?? null,
      update: async ({ where, data }: any) => {
        const row = rows.find((r) => r.id === where.id)!;
        Object.assign(row, data);
        return row;
      },
    },
  };
  return { db: db as unknown as Db, rows };
}

describe('canalRequiereAprobacion', () => {
  it('video/imagen requieren aprobación; blog no', () => {
    expect(canalRequiereAprobacion('youtube_shorts')).toBe(true);
    expect(canalRequiereAprobacion('tiktok')).toBe(true);
    expect(canalRequiereAprobacion('instagram')).toBe(true);
    expect(canalRequiereAprobacion('blog')).toBe(false);
    expect(canalRequiereAprobacion('telegram')).toBe(true);
  });
});

describe('createPublication', () => {
  it('crea DRAFT con requiereAprobacion=true para video', async () => {
    const { db } = fakeDb();
    const res = await createPublication(db, { paquete: makePaquete('youtube_shorts'), canal: 'youtube_shorts' });
    expect(res.estado).toBe('DRAFT');
    expect(res.requiereAprobacion).toBe(true);
  });

  it('auto-aprueba (APPROVED) para blog/texto', async () => {
    const { db } = fakeDb();
    const res = await createPublication(db, { paquete: makePaquete('blog'), canal: 'blog' });
    expect(res.estado).toBe('APPROVED');
    expect(res.requiereAprobacion).toBe(false);
  });

  it('telegram (video) requiere aprobación → DRAFT y canal persistido (iteración 39)', async () => {
    const { db, rows } = fakeDb();
    const res = await createPublication(db, { paquete: makePaquete('tiktok'), canal: 'telegram' });
    expect(res.estado).toBe('DRAFT');
    expect(res.requiereAprobacion).toBe(true);
    const row = rows.find((r) => r.id === res.id);
    expect(row?.canal).toBe('telegram');
  });

  it('guarda caption + hashtags del canal y programación', async () => {
    const { db, rows } = fakeDb();
    const cuando = new Date('2026-08-16T12:00:00Z');
    await createPublication(db, { paquete: makePaquete('tiktok'), canal: 'tiktok', scheduledAt: cuando });
    expect(rows[0].caption).toBe('Caption para tiktok');
    expect(rows[0].scheduledAt).toEqual(cuando);
    expect(JSON.parse(rows[0].hashtags)).toEqual(['#IA', '#Shorts']);
  });
});

describe('approve/reject', () => {
  it('aprueba una DRAFT → APPROVED', async () => {
    const { db, rows } = fakeDb();
    await createPublication(db, { paquete: makePaquete('youtube_shorts'), canal: 'youtube_shorts' });
    const estado = await approvePublication(db, rows[0].id);
    expect(estado).toBe('APPROVED');
    expect(rows[0].estado).toBe('APPROVED');
  });

  it('rechaza una DRAFT → REJECTED', async () => {
    const { db, rows } = fakeDb();
    await createPublication(db, { paquete: makePaquete('youtube_shorts'), canal: 'youtube_shorts' });
    const estado = await rejectPublication(db, rows[0].id);
    expect(estado).toBe('REJECTED');
    expect(rows[0].estado).toBe('REJECTED');
  });

  it('no aprueba una ya APPROVED (error)', async () => {
    const { db, rows } = fakeDb();
    await createPublication(db, { paquete: makePaquete('blog'), canal: 'blog' });
    await expect(approvePublication(db, rows[0].id)).rejects.toThrow('No se puede aprobar');
  });

  it('no existe → error', async () => {
    const { db } = fakeDb();
    await expect(approvePublication(db, 'nope')).rejects.toThrow('no encontrada');
  });
});

describe('markPublished / markFailed', () => {
  it('marca PUBLISHED con resultado', async () => {
    const { db, rows } = fakeDb();
    await createPublication(db, { paquete: makePaquete('blog'), canal: 'blog' });
    await markPublished(db, rows[0].id, [{ platform: 'youtube', ok: true, id: 'v1', url: 'https://youtube.com/shorts/v1' }]);
    expect(rows[0].estado).toBe('PUBLISHED');
    expect(rows[0].publishedAt).toBeInstanceOf(Date);
    expect(JSON.parse(rows[0].resultadoJson!)[0].url).toBe('https://youtube.com/shorts/v1');
  });

  it('marca FAILED con error', async () => {
    const { db, rows } = fakeDb();
    await createPublication(db, { paquete: makePaquete('blog'), canal: 'blog' });
    await markFailed(db, rows[0].id, 'TIKTOK_ACCESS_TOKEN no configurado');
    expect(rows[0].estado).toBe('FAILED');
    expect(rows[0].error).toContain('TIKTOK_ACCESS_TOKEN');
  });

  it('no publica una DRAFT (error)', async () => {
    const { db, rows } = fakeDb();
    await createPublication(db, { paquete: makePaquete('youtube_shorts'), canal: 'youtube_shorts' });
    await expect(markPublished(db, rows[0].id, [])).rejects.toThrow('No se puede publicar');
  });
});

describe('publishDue', () => {
  it('publica solo las APPROVED vencidas, usando publishFn', async () => {
    const { db, rows } = fakeDb();
    const vencida = new Date('2026-08-14T10:00:00Z');
    const futura = new Date('2099-01-01T00:00:00Z');
    await createPublication(db, { paquete: makePaquete('blog'), canal: 'blog', scheduledAt: vencida });
    await createPublication(db, { paquete: makePaquete('blog'), canal: 'blog', scheduledAt: futura });
    await createPublication(db, { paquete: makePaquete('blog'), canal: 'blog', scheduledAt: null });
    // DRAFT vencida no se publica
    const draft = await createPublication(db, { paquete: makePaquete('youtube_shorts'), canal: 'youtube_shorts', scheduledAt: vencida });

    const publishFn = async () => [{ platform: 'youtube' as const, ok: true, id: 'v9' }];
    const res = await publishDue(db, { publishFn });

    expect(res).toEqual({ publicadas: 1, fallidas: 0 }); // solo la APPROVED vencida
    const pub = rows.find((r) => r.id === draft.id)!;
    expect(pub.estado).toBe('DRAFT'); // la DRAFT no se tocó
    const publicada = rows.find((r) => r.estado === 'PUBLISHED')!;
    expect(publicada.scheduledAt).toEqual(vencida);
  });

  it('fail-soft: resultado sin ok → FAILED con razón', async () => {
    const { db, rows } = fakeDb();
    await createPublication(db, { paquete: makePaquete('blog'), canal: 'blog', scheduledAt: new Date('2026-08-14T10:00:00Z') });
    const publishFn = async () => [{ platform: 'youtube' as const, ok: false, error: 'YOUTUBE_ACCESS_TOKEN no configurado' }];
    const res = await publishDue(db, { publishFn });
    expect(res).toEqual({ publicadas: 0, fallidas: 1 });
    expect(rows[0].estado).toBe('FAILED');
    expect(rows[0].error).toContain('YOUTUBE_ACCESS_TOKEN');
  });

  it('publishFn lanza → FAILED', async () => {
    const { db, rows } = fakeDb();
    await createPublication(db, { paquete: makePaquete('blog'), canal: 'blog', scheduledAt: new Date('2026-08-14T10:00:00Z') });
    const publishFn = async () => {
      throw new Error('red caída');
    };
    const res = await publishDue(db, { publishFn });
    expect(res).toEqual({ publicadas: 0, fallidas: 1 });
    expect(rows[0].error).toBe('red caída');
  });

  it('resultado ok con plataforma x → PUBLISHED (canal X fluye por markPublished)', async () => {
    const { db, rows } = fakeDb();
    await createPublication(db, { paquete: makePaquete('blog'), canal: 'blog', scheduledAt: new Date('2026-08-14T10:00:00Z') });
    const publishFn = async () => [{ platform: 'x' as const, ok: true, id: 'x1', url: 'https://x.com/i/status/x1' }];
    const res = await publishDue(db, { publishFn });
    expect(res).toEqual({ publicadas: 1, fallidas: 0 });
    expect(rows[0].estado).toBe('PUBLISHED');
  });

  it('resultado ok con plataforma instagram → PUBLISHED (Meta fluye por markPublished)', async () => {
    const { db, rows } = fakeDb();
    await createPublication(db, { paquete: makePaquete('blog'), canal: 'blog', scheduledAt: new Date('2026-08-14T10:00:00Z') });
    const publishFn = async () => [{ platform: 'instagram' as const, ok: true, id: 'ig1', url: 'https://www.instagram.com/reel/ig1/' }];
    const res = await publishDue(db, { publishFn });
    expect(res).toEqual({ publicadas: 1, fallidas: 0 });
    expect(rows[0].estado).toBe('PUBLISHED');
  });
});

describe('listPublications', () => {
  it('filtra por estado y canal', async () => {
    const { db } = fakeDb();
    await createPublication(db, { paquete: makePaquete('blog'), canal: 'blog' });
    await createPublication(db, { paquete: makePaquete('youtube_shorts'), canal: 'youtube_shorts' });

    const todos = await listPublications(db);
    expect(todos.items).toHaveLength(2);

    const aprobadas = await listPublications(db, { estado: 'APPROVED' });
    expect(aprobadas.items).toHaveLength(1);
    expect(aprobadas.items[0].canal).toBe('blog');

    const video = await listPublications(db, { canal: 'youtube_shorts' });
    expect(video.items).toHaveLength(1);
    expect(video.items[0].estado).toBe('DRAFT');
  });
});

describe('listBlogPosts', () => {
  it('devuelve solo PUBLISHED/blog con contenido parseado, ordenado por publishedAt desc', async () => {
    const { db, rows } = fakeDb();
    const pub = await createPublication(db, { paquete: makePaquete('blog'), canal: 'blog' });
    await createPublication(db, { paquete: makePaquete('youtube_shorts'), canal: 'youtube_shorts' });
    // marca la de blog como publicada
    await markPublished(db, pub.id, [{ platform: 'youtube', ok: true, id: 'v1' }]);
    rows[0].publishedAt = new Date('2026-08-15T10:00:00Z');

    const posts = await listBlogPosts(db);
    expect(posts).toHaveLength(1);
    expect(posts[0].tema).toBe('El futuro de la IA');
    expect(posts[0].caption).toBe('Caption para blog');
    expect(posts[0].contenido).toContain('Contenido de prueba');
    expect(posts[0].publishedAt.toISOString()).toBe('2026-08-15T10:00:00.000Z');
  });

  it('ignora publicaciones sin publishedAt y respeta take', async () => {
    const { db, rows } = fakeDb();
    const pub = await createPublication(db, { paquete: makePaquete('blog'), canal: 'blog' });
    await markPublished(db, pub.id, []);
    rows[0].publishedAt = new Date('2026-08-15T10:00:00Z');
    // segunda sin publishedAt (PUBLISHED pero fecha null — caso raro, se filtra)
    const pub2 = await createPublication(db, { paquete: makePaquete('blog'), canal: 'blog' });
    await markPublished(db, pub2.id, []);
    rows[1].publishedAt = null;

    expect(await listBlogPosts(db, 1)).toHaveLength(1);
    expect(await listBlogPosts(db, 10)).toHaveLength(1);
  });

  it('no devuelve drafts ni videos', async () => {
    const { db } = fakeDb();
    await createPublication(db, { paquete: makePaquete('blog'), canal: 'blog' }); // APPROVED (auto)
    await createPublication(db, { paquete: makePaquete('youtube_shorts'), canal: 'youtube_shorts' }); // DRAFT
    expect(await listBlogPosts(db)).toHaveLength(0);
  });
});

describe('mediaScore (F5)', () => {
  it('createPublication calcula y persiste el mediaScore del paquete', async () => {
    const { db, rows } = fakeDb();
    await createPublication(db, { paquete: makePaquete('blog'), canal: 'blog' });
    expect(rows[0].mediaScore).toBeGreaterThan(0);
    expect(rows[0].mediaScore).toBeLessThanOrEqual(100);
  });

  it('el paquete de makePaquete tiene score alto (contenido+caption+visual+horario)', async () => {
    const { db, rows } = fakeDb();
    await createPublication(db, { paquete: makePaquete('blog'), canal: 'blog' });
    // 15 contenido corto + 20 caption + 15 visual + 10 srt + 15 horario = 75
    expect(rows[0].mediaScore).toBeGreaterThanOrEqual(70);
  });
});

describe('registrarFeedback / publicationSignals (F5)', () => {
  it('registra GOOD y BAD con timestamp y las acumula', async () => {
    const { db, rows } = fakeDb();
    const pub = await createPublication(db, { paquete: makePaquete('blog'), canal: 'blog' });
    await registrarFeedback(db, pub.id, { rating: 'GOOD', critique: 'muy buen post' });
    await registrarFeedback(db, pub.id, { rating: 'BAD', critique: 'caption demasiado largo' });
    const senales = JSON.parse(rows[0].feedbackJson!);
    expect(senales).toHaveLength(2);
    expect(senales[0].rating).toBe('GOOD');
    expect(senales[0].ts).toBeTruthy();
    expect(senales[1].critique).toBe('caption demasiado largo');
  });

  it('publicationSignals devuelve solo BAD con critique no vacía', async () => {
    const { db } = fakeDb();
    const p1 = await createPublication(db, { paquete: makePaquete('blog'), canal: 'blog' });
    const p2 = await createPublication(db, { paquete: makePaquete('blog'), canal: 'blog' });
    await registrarFeedback(db, p1.id, { rating: 'BAD', critique: 'mejorar el hook' });
    await registrarFeedback(db, p1.id, { rating: 'GOOD', critique: 'ok' });
    await registrarFeedback(db, p2.id, { rating: 'BAD', critique: '   ' });
    const { critiques, total } = await publicationSignals(db);
    expect(total).toBe(1);
    expect(critiques).toEqual(['mejorar el hook']);
  });

  it('registrarFeedback lanza si la publicación no existe', async () => {
    const { db } = fakeDb();
    await expect(registrarFeedback(db, 'nope', { rating: 'BAD', critique: 'x' })).rejects.toThrow();
  });
});

describe('respaldo en UltraIA Cloud (TAREA-CLOUD-PUBLICATIONS)', () => {
  it('createPublication con cloud inyectado sube media y paquete JSON al cloud', async () => {
    const { db } = fakeDb();
    const cloud = new CloudService({ adapter: new InMemoryCloudAdapter() });
    const paquete = { ...makePaquete('youtube_shorts'), media: ['https://example.com/clip.mp4'] };
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, arrayBuffer: async () => new ArrayBuffer(4) }));
    try {
      const res = await createPublication(db, { paquete, canal: 'youtube_shorts', cloud });
      expect(res.estado).toBe('DRAFT');
      expect(res.cloudGuardado).not.toBeNull();
      expect(res.cloudGuardado!.savedMedia).toContain('media/videos/clip.mp4');
      expect(res.cloudGuardado!.savedPackage).toMatch(/^exports\/publications\/p\d+\.json$/);
      expect(res.cloudGuardado!.ok).toBe(true);
      expect(res.cloudGuardado!.errors).toHaveLength(0);
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it('createPublication con URL caída es fail-soft: publica igual y registra errores', async () => {
    const { db, rows } = fakeDb();
    const cloud = new CloudService({ adapter: new InMemoryCloudAdapter() });
    const paquete = { ...makePaquete('youtube_shorts'), media: ['https://example.com/roto.mp4'] };
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 500 }));
    try {
      const res = await createPublication(db, { paquete, canal: 'youtube_shorts', cloud });
      expect(res.estado).toBe('DRAFT'); // la publicación NO se bloquea
      expect(rows).toHaveLength(1);
      expect(res.cloudGuardado!.savedMedia).toHaveLength(0);
      expect(res.cloudGuardado!.errors[0]).toContain('roto.mp4');
      // ok = true porque el paquete JSON sí se guardó (traza auditable)
      expect(res.cloudGuardado!.ok).toBe(true);
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it('createPublication sin cloud no respalda (regresión: cloudGuardado === null)', async () => {
    const { db } = fakeDb();
    const res = await createPublication(db, { paquete: makePaquete('blog'), canal: 'blog' });
    expect(res.cloudGuardado).toBeNull();
  });
});