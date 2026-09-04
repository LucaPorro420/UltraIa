import { describe, expect, it } from 'vitest';
import {
  canalRequiereAprobacion,
  createPublication,
  registrarFeedback,
  publicationSignals,
  listPublications,
  listBlogPosts,
  approvePublication,
  rejectPublication,
  markPublished,
  markFailed,
  publishDue,
  CANALES_CON_APROBACION,
  type PublicationEstado,
  type FeedbackSenal,
} from './publications';
import type { Db } from '../db/client';
import type { PublicationPackage, PresentChannel, ChannelCaption, VisualSpec, BrandingKit } from '../tools/present';
import type { PublishResult } from '../tools/publish';

/* ------------------------------------------------------------------ */
/*  Helpers                                                           */
/* ------------------------------------------------------------------ */

const DEFAULT_BRANDING: BrandingKit = {
  marca: 'UltraIa',
  paleta: ['#08080a', '#111115', '#8b5cf6'],
  fuente: 'Inter',
  logo: null,
  acento: '#8b5cf6',
};

function makeCaption(text: string, canal: PresentChannel = 'blog'): ChannelCaption {
  return { canal, caption: text, hashtags: ['#test'], srt: null };
}

function makePackage(overrides: Partial<PublicationPackage> = {}): PublicationPackage {
  const caption: ChannelCaption = { canal: 'blog', caption: 'Caption de prueba generico', hashtags: ['#test'], srt: null };
  const visual: VisualSpec = { dimensiones: '1080x1920', formato: '9:16 video', estilo: 'dark', textoOverlay: '', thumbnail: '' };
  const captionsByChannel = {} as Record<PresentChannel, ChannelCaption>;
  const visualByChannel = {} as Record<PresentChannel, VisualSpec>;
  const horarioSugerido = {} as Record<PresentChannel, string>;
  const channels: PresentChannel[] = ['blog'];
  for (const c of channels) {
    captionsByChannel[c] = caption;
    visualByChannel[c] = visual;
    horarioSugerido[c] = 'lun-vie 09:00';
  }
  return {
    briefId: 'brief-1',
    tema: 'Tema de prueba',
    contenido: 'Contenido de prueba largo suficiente para cumplir el minimo de calidad del media score y que el test pase bien sin problemas de scoring.',
    media: [],
    canales: channels,
    captionsByChannel,
    visualByChannel,
    horarioSugerido,
    branding: DEFAULT_BRANDING,
    generadoAt: '2026-08-15T12:00:00.000Z',
    ...overrides,
  };
}

/** Minimal channel connection row. */
interface FakeChannelRow {
  id: string;
  canal: string;
  accessToken: string;
}

interface PublicationRow {
  id: string;
  briefId: string | null;
  tema: string;
  canal: string;
  paqueteJson: string;
  caption: string;
  hashtags: string;
  estado: PublicationEstado;
  requiereAprobacion: boolean;
  scheduledAt: Date | null;
  creadoPorId: string | null;
  mediaScore: number;
  feedbackJson: string | null;
  resultadoJson: string | null;
  error: string | null;
  publishedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

function fakeDb(existing: PublicationRow[] = [], channels: FakeChannelRow[] = []) {
  const pubs: PublicationRow[] = [...existing];
  const chs: FakeChannelRow[] = [...channels];
  let seq = pubs.length;

  const db = {
    publication: {
      create: async ({ data }: any) => {
        const now = new Date();
        const row: PublicationRow = {
          id: `pub-${++seq}`,
          briefId: data.briefId ?? null,
          tema: data.tema,
          canal: data.canal,
          paqueteJson: data.paqueteJson,
          caption: data.caption,
          hashtags: data.hashtags,
          estado: data.estado,
          requiereAprobacion: data.requiereAprobacion,
          scheduledAt: data.scheduledAt ?? null,
          creadoPorId: data.creadoPorId ?? null,
          mediaScore: data.mediaScore ?? 0,
          feedbackJson: null,
          resultadoJson: null,
          error: null,
          publishedAt: null,
          createdAt: now,
          updatedAt: now,
        };
        pubs.push(row);
        return row;
      },

      findUnique: async ({ where }: any) => {
        return pubs.find((p) => p.id === where.id) ?? null;
      },

      findMany: async ({ where, orderBy, take, cursor, skip }: any) => {
        let out = [...pubs];

        // Filter by estado
        if (where?.estado && where.estado !== 'ALL') {
          out = out.filter((p) => p.estado === where.estado);
        }
        // Filter by canal
        if (where?.canal) {
          out = out.filter((p) => p.canal === where.canal);
        }
        // Filter by feedbackJson not null
        if (where?.feedbackJson?.not === null) {
          out = out.filter((p) => p.feedbackJson !== null);
        }
        // Filter by scheduledAt lte
        if (where?.scheduledAt?.lte) {
          out = out.filter((p) => p.scheduledAt && p.scheduledAt <= where.scheduledAt.lte);
        }

        // Order by scheduledAt desc, then createdAt desc
        if (orderBy) {
          const orderArr = Array.isArray(orderBy) ? orderBy : [orderBy];
          out.sort((a, b) => {
            for (const o of orderArr) {
              for (const key of Object.keys(o)) {
                const dir = o[key] === 'desc' ? -1 : 1;
                const aVal = a[key as keyof PublicationRow];
                const bVal = b[key as keyof PublicationRow];
                if (aVal == null && bVal == null) continue;
                if (aVal == null) return 1; // nulls last
                if (bVal == null) return -1;
                if ((aVal as any) < (bVal as any)) return -dir;
                if ((aVal as any) > (bVal as any)) return dir;
              }
            }
            return 0;
          });
        }

        // Cursor pagination
        if (cursor?.id && skip) {
          const idx = out.findIndex((p) => p.id === cursor.id);
          if (idx >= 0) out = out.slice(idx + 1);
        }

        // take
        if (take) out = out.slice(0, take);

        return out;
      },

      update: async ({ where, data }: any) => {
        const idx = pubs.findIndex((p) => p.id === where.id);
        if (idx < 0) return null;
        Object.assign(pubs[idx], data, { updatedAt: new Date() });
        return pubs[idx];
      },
    },

    channelConnection: {
      findMany: async () => chs,
      findUnique: async ({ where }: any) => chs.find((c) => c.canal === where.canal) ?? null,
    },
  };

  return { db: db as unknown as Db, pubs, chs };
}

/* ------------------------------------------------------------------ */
/*  canalRequiereAprobacion                                           */
/* ------------------------------------------------------------------ */

describe('canalRequiereAprobacion', () => {
  const channelsRequiringApproval: PresentChannel[] = [
    'youtube_shorts', 'tiktok', 'instagram', 'telegram',
    'discord', 'slack', 'facebook', 'reddit', 'pinterest', 'whatsapp',
  ];

  for (const ch of channelsRequiringApproval) {
    it(`${ch} requiere aprobacion → true`, () => {
      expect(canalRequiereAprobacion(ch)).toBe(true);
    });
  }

  it('blog no requiere aprobacion → false', () => {
    expect(canalRequiereAprobacion('blog')).toBe(false);
  });

  it('CANALES_CON_APROBACION tiene exactamente 10 canales', () => {
    expect(CANALES_CON_APROBACION).toHaveLength(10);
  });
});

/* ------------------------------------------------------------------ */
/*  createPublication                                                 */
/* ------------------------------------------------------------------ */

describe('createPublication', () => {
  it('canal de video (youtube_shorts) crea publicacion en estado DRAFT', async () => {
    const { db } = fakeDb();
    const paquete = makePackage({ canales: ['youtube_shorts'] });
    const result = await createPublication(db, {
      paquete,
      canal: 'youtube_shorts',
    });
    expect(result.estado).toBe('DRAFT');
    expect(result.requiereAprobacion).toBe(true);
  });

  it('canal blog crea publicacion en estado APPROVED automaticamente', async () => {
    const { db } = fakeDb();
    const paquete = makePackage();
    const result = await createPublication(db, { paquete, canal: 'blog' });
    expect(result.estado).toBe('APPROVED');
    expect(result.requiereAprobacion).toBe(false);
  });

  it('con cloud inyectado llama a guardarPaqueteEnCloud', async () => {
    const { db, pubs } = fakeDb();
    const paquete = makePackage();
    let cloudCalled = false;
    const fakeCloud = {
      upload: async (name: string, bytes: Uint8Array, dir: string) => {
        cloudCalled = true;
        return { path: `${dir}/${name}` };
      },
    } as any;
    const result = await createPublication(db, { paquete, canal: 'blog', cloud: fakeCloud });
    expect(cloudCalled).toBe(true);
    expect(result.cloudGuardado).toBeTruthy();
    expect(result.cloudGuardado!.ok).toBe(true);
  });

  it('sin cloud no ejecuta respaldo', async () => {
    const { db } = fakeDb();
    const paquete = makePackage();
    const result = await createPublication(db, { paquete, canal: 'blog' });
    expect(result.cloudGuardado).toBeNull();
  });

  it('mediaScore se calcula desde puntuarPaquete', async () => {
    const { db, pubs } = fakeDb();
    const paquete = makePackage({ contenido: 'x'.repeat(100) });
    await createPublication(db, { paquete, canal: 'blog' });
    const created = pubs[0];
    expect(typeof created.mediaScore).toBe('number');
    expect(created.mediaScore).toBeGreaterThanOrEqual(0);
    expect(created.mediaScore).toBeLessThanOrEqual(100);
  });

  it('captionsByChannel se extrae correctamente para el canal', async () => {
    const { db, pubs } = fakeDb();
    const captionsByChannel = {} as Record<PresentChannel, ChannelCaption>;
    captionsByChannel.blog = makeCaption('Caption personalizada');
    const paquete = makePackage({ captionsByChannel });
    await createPublication(db, { paquete, canal: 'blog' });
    expect(pubs[0].caption).toBe('Caption personalizada');
  });

  it('sin caption del canal usa contenido truncado a 300 chars', async () => {
    const { db, pubs } = fakeDb();
    const captionsByChannel = {} as Record<PresentChannel, ChannelCaption>;
    captionsByChannel.blog = { canal: 'blog', caption: undefined as unknown as string, hashtags: [], srt: null };
    const paquete = makePackage({ captionsByChannel, contenido: 'x'.repeat(400) });
    await createPublication(db, { paquete, canal: 'blog' });
    expect(pubs[0].caption.length).toBeLessThanOrEqual(300);
    expect(pubs[0].caption.length).toBeGreaterThan(0);
  });

  it('briefId se persiste en la publicacion', async () => {
    const { db, pubs } = fakeDb();
    const paquete = makePackage({ briefId: 'b-99' });
    await createPublication(db, { paquete, canal: 'blog' });
    expect(pubs[0].briefId).toBe('b-99');
  });

  it('scheduledAt se persiste cuando se provee', async () => {
    const { db, pubs } = fakeDb();
    const date = new Date('2026-09-01T10:00:00Z');
    const paquete = makePackage();
    await createPublication(db, { paquete, canal: 'blog', scheduledAt: date });
    expect(pubs[0].scheduledAt).toEqual(date);
  });

  it('creadoPorId se persiste cuando se provee', async () => {
    const { db, pubs } = fakeDb();
    const paquete = makePackage();
    await createPublication(db, { paquete, canal: 'blog', creadoPorId: 'user-42' });
    expect(pubs[0].creadoPorId).toBe('user-42');
  });

  it('cloud con media sube cada archivo', async () => {
    const { db } = fakeDb();
    const uploads: string[] = [];
    const fakeCloud = {
      upload: async (name: string, _bytes: Uint8Array, dir: string) => {
        uploads.push(`${dir}/${name}`);
        return { path: `${dir}/${name}` };
      },
    } as any;
    const paquete = makePackage({
      media: ['https://example.com/video.mp4', 'https://example.com/image.png'],
    });
    const origFetch = globalThis.fetch;
    globalThis.fetch = async () => ({ ok: true, arrayBuffer: async () => new ArrayBuffer(8) } as any);
    try {
      await createPublication(db, { paquete, canal: 'blog', cloud: fakeCloud });
    } finally {
      globalThis.fetch = origFetch;
    }
    expect(uploads.length).toBe(3); // 2 media + 1 JSON
  });

  it('cloud fail-soft: error en upload no revierte la publicacion', async () => {
    const { db, pubs } = fakeDb();
    const fakeCloud = {
      upload: async () => { throw new Error('network error'); },
    } as any;
    const paquete = makePackage({ media: ['https://example.com/bad.mp4'] });
    const origFetch = globalThis.fetch;
    globalThis.fetch = async () => ({ ok: true, arrayBuffer: async () => new ArrayBuffer(8) } as any);
    let result: any;
    try {
      result = await createPublication(db, { paquete, canal: 'blog', cloud: fakeCloud });
    } finally {
      globalThis.fetch = origFetch;
    }
    expect(pubs.length).toBe(1);
    expect(result.cloudGuardado!.ok).toBe(false);
    expect(result.cloudGuardado!.errors.length).toBeGreaterThan(0);
  });
});

/* ------------------------------------------------------------------ */
/*  registrarFeedback                                                 */
/* ------------------------------------------------------------------ */

describe('registrarFeedback', () => {
  it('agrega feedback a publicacion con feedbackJson null', async () => {
    const pub: PublicationRow = {
      id: 'pub-f1',
      briefId: null,
      tema: 'test',
      canal: 'blog',
      paqueteJson: '{}',
      caption: '',
      hashtags: '[]',
      estado: 'PUBLISHED',
      requiereAprobacion: false,
      scheduledAt: null,
      creadoPorId: null,
      mediaScore: 50,
      feedbackJson: null,
      resultadoJson: null,
      error: null,
      publishedAt: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    const { db, pubs } = fakeDb([pub]);
    const senal = { rating: 'GOOD' as const, critique: 'Muy buen contenido' };
    const result = await registrarFeedback(db, 'pub-f1', senal);
    expect(result).toHaveLength(1);
    expect(result[0].rating).toBe('GOOD');
    expect(result[0].critique).toBe('Muy buen contenido');
    expect(typeof result[0].ts).toBe('string');
  });

  it('agrega feedback a publicacion que ya tiene feedbackJson previo', async () => {
    const previa: FeedbackSenal = { rating: 'BAD', critique: 'Mal audio', ts: '2026-08-01T00:00:00Z' };
    const pub: PublicationRow = {
      id: 'pub-f2',
      briefId: null,
      tema: 'test',
      canal: 'blog',
      paqueteJson: '{}',
      caption: '',
      hashtags: '[]',
      estado: 'PUBLISHED',
      requiereAprobacion: false,
      scheduledAt: null,
      creadoPorId: null,
      mediaScore: 50,
      feedbackJson: JSON.stringify([previa]),
      resultadoJson: null,
      error: null,
      publishedAt: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    const { db } = fakeDb([pub]);
    const senal = { rating: 'GOOD' as const, critique: 'Mejoro el video' };
    const result = await registrarFeedback(db, 'pub-f2', senal);
    expect(result).toHaveLength(2);
    expect(result[0].critique).toBe('Mal audio');
    expect(result[1].critique).toBe('Mejoro el video');
  });

  it('lanza error si la publicacion no existe', async () => {
    const { db } = fakeDb();
    await expect(
      registrarFeedback(db, 'pub-inexistente', { rating: 'GOOD', critique: 'ok' }),
    ).rejects.toThrow('Publication pub-inexistente no encontrada');
  });

  it('guarda ts como ISO string', async () => {
    const pub: PublicationRow = {
      id: 'pub-f3',
      briefId: null,
      tema: 'test',
      canal: 'blog',
      paqueteJson: '{}',
      caption: '',
      hashtags: '[]',
      estado: 'PUBLISHED',
      requiereAprobacion: false,
      scheduledAt: null,
      creadoPorId: null,
      mediaScore: 50,
      feedbackJson: null,
      resultadoJson: null,
      error: null,
      publishedAt: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    const { db } = fakeDb([pub]);
    const result = await registrarFeedback(db, 'pub-f3', { rating: 'BAD', critique: 'x' });
    expect(new Date(result[0].ts).toISOString()).toBe(result[0].ts);
  });
});

/* ------------------------------------------------------------------ */
/*  publicationSignals                                                */
/* ------------------------------------------------------------------ */

describe('publicationSignals', () => {
  function pubWithFeedback(id: string, feedback: FeedbackSenal[]) {
    return {
      id,
      briefId: null,
      tema: 'test',
      canal: 'blog',
      paqueteJson: '{}',
      caption: '',
      hashtags: '[]',
      estado: 'PUBLISHED' as PublicationEstado,
      requiereAprobacion: false,
      scheduledAt: null,
      creadoPorId: null,
      mediaScore: 50,
      feedbackJson: JSON.stringify(feedback),
      resultadoJson: null,
      error: null,
      publishedAt: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  }

  it('sin publicaciones con feedback devuelve critiques vacio', async () => {
    const { db } = fakeDb();
    const result = await publicationSignals(db);
    expect(result.critiques).toEqual([]);
    expect(result.total).toBe(0);
  });

  it('sin senales BAD devuelve critiques vacio', async () => {
    const pub = pubWithFeedback('p1', [
      { rating: 'GOOD', critique: 'Excelente', ts: '2026-08-01T00:00:00Z' },
    ]);
    const { db } = fakeDb([pub]);
    const result = await publicationSignals(db);
    expect(result.critiques).toEqual([]);
    expect(result.total).toBe(0);
  });

  it('mezcla de GOOD/BAD solo devuelve critiques de BAD', async () => {
    const pub = pubWithFeedback('p2', [
      { rating: 'GOOD', critique: 'Perfecto', ts: '2026-08-01T00:00:00Z' },
      { rating: 'BAD', critique: 'Mal audio', ts: '2026-08-01T01:00:00Z' },
      { rating: 'GOOD', critique: 'Genial', ts: '2026-08-01T02:00:00Z' },
      { rating: 'BAD', critique: 'Lento el video', ts: '2026-08-01T03:00:00Z' },
    ]);
    const { db } = fakeDb([pub]);
    const result = await publicationSignals(db);
    expect(result.critiques).toEqual(['Mal audio', 'Lento el video']);
    expect(result.total).toBe(2);
  });

  it('critique vacia o con solo espacios se filtra', async () => {
    const pub = pubWithFeedback('p3', [
      { rating: 'BAD', critique: '   ', ts: '2026-08-01T00:00:00Z' },
      { rating: 'BAD', critique: '', ts: '2026-08-01T01:00:00Z' },
      { rating: 'BAD', critique: 'Valido', ts: '2026-08-01T02:00:00Z' },
    ]);
    const { db } = fakeDb([pub]);
    const result = await publicationSignals(db);
    expect(result.critiques).toEqual(['Valido']);
    expect(result.total).toBe(1);
  });

  it('respeta el limite de publicaciones', async () => {
    const pubs = Array.from({ length: 5 }, (_, i) =>
      pubWithFeedback(`p${i}`, [{ rating: 'BAD', critique: `critique-${i}`, ts: '2026-08-01T00:00:00Z' }]),
    );
    const { db } = fakeDb(pubs);
    const result = await publicationSignals(db, 2);
    expect(result.total).toBe(2);
  });
});

/* ------------------------------------------------------------------ */
/*  listPublications                                                  */
/* ------------------------------------------------------------------ */

describe('listPublications', () => {
  function makePub(id: string, estado: PublicationEstado, canal = 'blog', scheduledAt: Date | null = null) {
    return {
      id,
      briefId: null,
      tema: `tema-${id}`,
      canal,
      paqueteJson: '{}',
      caption: '',
      hashtags: '[]',
      estado,
      requiereAprobacion: false,
      scheduledAt,
      creadoPorId: null,
      mediaScore: 50,
      feedbackJson: null,
      resultadoJson: null,
      error: null,
      publishedAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  }

  it('paginacion default toma 20 elementos', async () => {
    const pubs = Array.from({ length: 30 }, (_, i) => makePub(`p${i}`, 'DRAFT'));
    const { db } = fakeDb(pubs);
    const result = await listPublications(db);
    expect(result.items.length).toBe(20);
    expect(result.nextCursor).toBeTruthy();
  });

  it('take=0 se ajusta a minimo 1', async () => {
    const { db } = fakeDb([makePub('p1', 'DRAFT')]);
    const result = await listPublications(db, { take: 0 });
    expect(result.items.length).toBe(1);
  });

  it('take=200 se ajusta a maximo 100', async () => {
    const pubs = Array.from({ length: 150 }, (_, i) => makePub(`p${i}`, 'DRAFT'));
    const { db } = fakeDb(pubs);
    const result = await listPublications(db, { take: 200 });
    expect(result.items.length).toBe(100);
  });

  it('estado=ALL no aplica filtro de estado', async () => {
    const pubs = [
      makePub('p1', 'DRAFT'),
      makePub('p2', 'APPROVED'),
      makePub('p3', 'PUBLISHED'),
    ];
    const { db } = fakeDb(pubs);
    const result = await listPublications(db, { estado: 'ALL' });
    expect(result.items.length).toBe(3);
  });

  it('filtro por canal se aplica correctamente', async () => {
    const pubs = [
      makePub('p1', 'DRAFT', 'blog'),
      makePub('p2', 'DRAFT', 'tiktok'),
      makePub('p3', 'DRAFT', 'blog'),
    ];
    const { db } = fakeDb(pubs);
    const result = await listPublications(db, { canal: 'blog' });
    expect(result.items.length).toBe(2);
    expect(result.items.every((p) => p.canal === 'blog')).toBe(true);
  });

  it('cursor pagination devuelve siguiente pagina', async () => {
    const pubs = Array.from({ length: 5 }, (_, i) => makePub(`p${i}`, 'DRAFT'));
    const { db } = fakeDb(pubs);
    const first = await listPublications(db, { take: 2 });
    expect(first.items.length).toBe(2);
    const second = await listPublications(db, { take: 2, cursor: first.nextCursor ?? undefined });
    expect(second.items.length).toBe(2);
    expect(second.items[0].id).not.toBe(first.items[0].id);
  });

  it('sin mas resultados nextCursor es null', async () => {
    const { db } = fakeDb([makePub('p1', 'DRAFT')]);
    const result = await listPublications(db);
    expect(result.nextCursor).toBeNull();
  });

  it('filtro por estado especifico', async () => {
    const pubs = [
      makePub('p1', 'DRAFT'),
      makePub('p2', 'APPROVED'),
      makePub('p3', 'DRAFT'),
    ];
    const { db } = fakeDb(pubs);
    const result = await listPublications(db, { estado: 'DRAFT' });
    expect(result.items.length).toBe(2);
    expect(result.items.every((p) => p.estado === 'DRAFT')).toBe(true);
  });
});

/* ------------------------------------------------------------------ */
/*  listBlogPosts                                                     */
/* ------------------------------------------------------------------ */

describe('listBlogPosts', () => {
  function blogPost(id: string, publishedAt: Date | null, contenido = 'Contenido del post') {
    return {
      id,
      briefId: null,
      tema: `tema-${id}`,
      canal: 'blog',
      paqueteJson: JSON.stringify({ contenido, media: ['https://img.png'] }),
      caption: `caption-${id}`,
      hashtags: '[]',
      estado: 'PUBLISHED' as PublicationEstado,
      requiereAprobacion: false,
      scheduledAt: null,
      creadoPorId: null,
      mediaScore: 80,
      feedbackJson: null,
      resultadoJson: null,
      error: null,
      publishedAt,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  }

  it('devuelve posts del blog publicados', async () => {
    const pubs = [blogPost('b1', new Date('2026-08-10')), blogPost('b2', new Date('2026-08-12'))];
    const { db } = fakeDb(pubs);
    const result = await listBlogPosts(db);
    expect(result.length).toBe(2);
    expect(result[0].contenido).toBeTruthy();
  });

  it('publicaciones con publishedAt null se filtran', async () => {
    const pubs = [
      blogPost('b1', new Date('2026-08-10')),
      blogPost('b2', null),
    ];
    const { db } = fakeDb(pubs);
    const result = await listBlogPosts(db);
    expect(result.length).toBe(1);
    expect(result[0].id).toBe('b1');
  });

  it('take=0 se ajusta a minimo 1', async () => {
    const { db } = fakeDb([blogPost('b1', new Date())]);
    const result = await listBlogPosts(db, 0);
    expect(result.length).toBe(1);
  });

  it('take=100 se ajusta a maximo 50', async () => {
    const pubs = Array.from({ length: 60 }, (_, i) => blogPost(`b${i}`, new Date()));
    const { db } = fakeDb(pubs);
    const result = await listBlogPosts(db, 100);
    expect(result.length).toBe(50);
  });

  it('contenido y media se extraen del paqueteJson', async () => {
    const pub = blogPost('b1', new Date());
    pub.paqueteJson = JSON.stringify({ contenido: 'Mi contenido', media: ['a.png', 'b.mp4'] });
    const { db } = fakeDb([pub]);
    const result = await listBlogPosts(db);
    expect(result[0].contenido).toBe('Mi contenido');
    expect(result[0].media).toEqual(['a.png', 'b.mp4']);
  });

  it('contenido faltante en paquete devuelve string vacio', async () => {
    const pub = blogPost('b1', new Date());
    pub.paqueteJson = JSON.stringify({});
    const { db } = fakeDb([pub]);
    const result = await listBlogPosts(db);
    expect(result[0].contenido).toBe('');
    expect(result[0].media).toEqual([]);
  });
});

/* ------------------------------------------------------------------ */
/*  approvePublication                                                */
/* ------------------------------------------------------------------ */

describe('approvePublication', () => {
  function draftPub(id: string, estado: PublicationEstado = 'DRAFT') {
    return {
      id,
      briefId: null,
      tema: 'test',
      canal: 'youtube_shorts',
      paqueteJson: '{}',
      caption: '',
      hashtags: '[]',
      estado,
      requiereAprobacion: true,
      scheduledAt: null,
      creadoPorId: null,
      mediaScore: 50,
      feedbackJson: null,
      resultadoJson: null,
      error: null,
      publishedAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  }

  it('DRAFT se aprueba exitosamente → APPROVED', async () => {
    const { db } = fakeDb([draftPub('p1')]);
    const result = await approvePublication(db, 'p1');
    expect(result).toBe('APPROVED');
  });

  it('lanza error si la publicacion no existe', async () => {
    const { db } = fakeDb();
    await expect(approvePublication(db, 'p-no')).rejects.toThrow('Publication no encontrada');
  });

  it('lanza error si el estado no es DRAFT (ya APPROVED)', async () => {
    const { db } = fakeDb([draftPub('p2', 'APPROVED')]);
    await expect(approvePublication(db, 'p2')).rejects.toThrow('No se puede aprobar una publicación en estado APPROVED');
  });

  it('lanza error si el estado es PUBLISHED', async () => {
    const { db } = fakeDb([draftPub('p3', 'PUBLISHED')]);
    await expect(approvePublication(db, 'p3')).rejects.toThrow('No se puede aprobar una publicación en estado PUBLISHED');
  });

  it('lanza error si el estado es REJECTED', async () => {
    const { db } = fakeDb([draftPub('p4', 'REJECTED')]);
    await expect(approvePublication(db, 'p4')).rejects.toThrow('No se puede aprobar una publicación en estado REJECTED');
  });

  it('lanza error si el estado es FAILED', async () => {
    const { db } = fakeDb([draftPub('p5', 'FAILED')]);
    await expect(approvePublication(db, 'p5')).rejects.toThrow('No se puede aprobar una publicación en estado FAILED');
  });
});

/* ------------------------------------------------------------------ */
/*  rejectPublication                                                 */
/* ------------------------------------------------------------------ */

describe('rejectPublication', () => {
  function draftPub(id: string, estado: PublicationEstado = 'DRAFT') {
    return {
      id,
      briefId: null,
      tema: 'test',
      canal: 'tiktok',
      paqueteJson: '{}',
      caption: '',
      hashtags: '[]',
      estado,
      requiereAprobacion: true,
      scheduledAt: null,
      creadoPorId: null,
      mediaScore: 50,
      feedbackJson: null,
      resultadoJson: null,
      error: null,
      publishedAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  }

  it('DRAFT se rechaza exitosamente → REJECTED', async () => {
    const { db } = fakeDb([draftPub('p1')]);
    const result = await rejectPublication(db, 'p1');
    expect(result).toBe('REJECTED');
  });

  it('lanza error si la publicacion no existe', async () => {
    const { db } = fakeDb();
    await expect(rejectPublication(db, 'p-no')).rejects.toThrow('Publication no encontrada');
  });

  it('lanza error si el estado no es DRAFT (ya APPROVED)', async () => {
    const { db } = fakeDb([draftPub('p2', 'APPROVED')]);
    await expect(rejectPublication(db, 'p2')).rejects.toThrow('No se puede rechazar una publicación en estado APPROVED');
  });

  it('lanza error si el estado es REJECTED', async () => {
    const { db } = fakeDb([draftPub('p3', 'REJECTED')]);
    await expect(rejectPublication(db, 'p3')).rejects.toThrow('No se puede rechazar una publicación en estado REJECTED');
  });
});

/* ------------------------------------------------------------------ */
/*  markPublished                                                     */
/* ------------------------------------------------------------------ */

describe('markPublished', () => {
  function approvedPub(id: string, estado: PublicationEstado = 'APPROVED') {
    return {
      id,
      briefId: null,
      tema: 'test',
      canal: 'blog',
      paqueteJson: '{}',
      caption: '',
      hashtags: '[]',
      estado,
      requiereAprobacion: false,
      scheduledAt: null,
      creadoPorId: null,
      mediaScore: 50,
      feedbackJson: null,
      resultadoJson: null,
      error: null,
      publishedAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  }

  it('APPROVED se marca como PUBLISHED con resultado', async () => {
    const { db, pubs } = fakeDb([approvedPub('p1')]);
    const resultado: PublishResult[] = [{ ok: true, platform: 'youtube' }];
    await markPublished(db, 'p1', resultado);
    expect(pubs[0].estado).toBe('PUBLISHED');
    expect(pubs[0].publishedAt).toBeInstanceOf(Date);
    expect(JSON.parse(pubs[0].resultadoJson!)).toEqual(resultado);
  });

  it('limpia error al marcar como publicada', async () => {
    const { db, pubs } = fakeDb([approvedPub('p1')]);
    pubs[0].error = 'error anterior';
    await markPublished(db, 'p1', [{ ok: true, platform: 'youtube' }]);
    expect(pubs[0].error).toBeNull();
  });

  it('lanza error si la publicacion no existe', async () => {
    const { db } = fakeDb();
    await expect(markPublished(db, 'p-no', [])).rejects.toThrow('Publication no encontrada');
  });

  it('lanza error si el estado no es APPROVED (es DRAFT)', async () => {
    const { db } = fakeDb([approvedPub('p2', 'DRAFT')]);
    await expect(markPublished(db, 'p2', [])).rejects.toThrow('No se puede publicar una publicación en estado DRAFT');
  });

  it('lanza error si el estado es PUBLISHED', async () => {
    const { db } = fakeDb([approvedPub('p3', 'PUBLISHED')]);
    await expect(markPublished(db, 'p3', [])).rejects.toThrow('No se puede publicar una publicación en estado PUBLISHED');
  });

  it('lanza error si el estado es FAILED', async () => {
    const { db } = fakeDb([approvedPub('p4', 'FAILED')]);
    await expect(markPublished(db, 'p4', [])).rejects.toThrow('No se puede publicar una publicación en estado FAILED');
  });
});

/* ------------------------------------------------------------------ */
/*  markFailed                                                        */
/* ------------------------------------------------------------------ */

describe('markFailed', () => {
  function approvedPub(id: string, estado: PublicationEstado = 'APPROVED') {
    return {
      id,
      briefId: null,
      tema: 'test',
      canal: 'telegram',
      paqueteJson: '{}',
      caption: '',
      hashtags: '[]',
      estado,
      requiereAprobacion: true,
      scheduledAt: null,
      creadoPorId: null,
      mediaScore: 50,
      feedbackJson: null,
      resultadoJson: null,
      error: null,
      publishedAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  }

  it('APPROVED se marca como FAILED con error', async () => {
    const { db, pubs } = fakeDb([approvedPub('p1')]);
    await markFailed(db, 'p1', 'sin token de acceso');
    expect(pubs[0].estado).toBe('FAILED');
    expect(pubs[0].error).toBe('sin token de acceso');
  });

  it('lanza error si la publicacion no existe', async () => {
    const { db } = fakeDb();
    await expect(markFailed(db, 'p-no', 'error')).rejects.toThrow('Publication no encontrada');
  });

  it('lanza error si el estado no es APPROVED (es DRAFT)', async () => {
    const { db } = fakeDb([approvedPub('p2', 'DRAFT')]);
    await expect(markFailed(db, 'p2', 'err')).rejects.toThrow('No se puede marcar fallida una publicación en estado DRAFT');
  });

  it('lanza error si el estado es PUBLISHED', async () => {
    const { db } = fakeDb([approvedPub('p3', 'PUBLISHED')]);
    await expect(markFailed(db, 'p3', 'err')).rejects.toThrow('No se puede marcar fallida una publicación en estado PUBLISHED');
  });

  it('lanza error si el estado es FAILED', async () => {
    const { db } = fakeDb([approvedPub('p4', 'FAILED')]);
    await expect(markFailed(db, 'p4', 'err')).rejects.toThrow('No se puede marcar fallida una publicación en estado FAILED');
  });

  it('lanza error si el estado es REJECTED', async () => {
    const { db } = fakeDb([approvedPub('p5', 'REJECTED')]);
    await expect(markFailed(db, 'p5', 'err')).rejects.toThrow('No se puede marcar fallida una publicación en estado REJECTED');
  });
});

/* ------------------------------------------------------------------ */
/*  publishDue                                                        */
/* ------------------------------------------------------------------ */

describe('publishDue', () => {
  function approvedDuePub(id: string, scheduledAt: Date, canal: PresentChannel = 'blog') {
    const pkg = makePackage({ canales: [canal] });
    return {
      id,
      briefId: null,
      tema: 'tema-due',
      canal,
      paqueteJson: JSON.stringify(pkg),
      caption: 'caption-due',
      hashtags: '[]',
      estado: 'APPROVED' as PublicationEstado,
      requiereAprobacion: false,
      scheduledAt,
      creadoPorId: null,
      mediaScore: 80,
      feedbackJson: null,
      resultadoJson: null,
      error: null,
      publishedAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  }

  it('sin publicaciones pendientes retorna 0/0', async () => {
    const { db } = fakeDb();
    const result = await publishDue(db);
    expect(result).toEqual({ publicadas: 0, fallidas: 0 });
  });

  it('todas exitosas con publishFn custom → publicadas=N', async () => {
    const past = new Date('2026-08-01');
    const pubs = [
      approvedDuePub('p1', past),
      approvedDuePub('p2', past),
      approvedDuePub('p3', past),
    ];
    const { db, pubs: rows } = fakeDb(pubs);
    const publishFn = async () => [{ ok: true, platform: 'youtube' } as PublishResult];
    const result = await publishDue(db, { publishFn });
    expect(result.publicadas).toBe(3);
    expect(result.fallidas).toBe(0);
    expect(rows.every((p) => p.estado === 'PUBLISHED')).toBe(true);
  });

  it('todas fallidas con publishFn custom → fallidas=N', async () => {
    const past = new Date('2026-08-01');
    const pubs = [approvedDuePub('p1', past), approvedDuePub('p2', past)];
    const { db, pubs: rows } = fakeDb(pubs);
    const publishFn = async () => [{ ok: false, platform: 'youtube', error: 'no token' } as PublishResult];
    const result = await publishDue(db, { publishFn });
    expect(result.publicadas).toBe(0);
    expect(result.fallidas).toBe(2);
    expect(rows.every((p) => p.estado === 'FAILED')).toBe(true);
  });

  it('resultados mixtos: exitosas + fallidas', async () => {
    const past = new Date('2026-08-01');
    const pubs = [approvedDuePub('p1', past), approvedDuePub('p2', past)];
    const { db } = fakeDb(pubs);
    let callCount = 0;
    const publishFn = async () => {
      callCount++;
      if (callCount === 1) return [{ ok: true, platform: 'youtube' } as PublishResult];
      return [{ ok: false, platform: 'youtube', error: 'falla' } as PublishResult];
    };
    const result = await publishDue(db, { publishFn });
    expect(result.publicadas).toBe(1);
    expect(result.fallidas).toBe(1);
  });

  it('excepcion en publishFn se marca como fallida', async () => {
    const past = new Date('2026-08-01');
    const pubs = [approvedDuePub('p1', past)];
    const { db, pubs: rows } = fakeDb(pubs);
    const publishFn = async () => { throw new Error('conexion rechazada'); };
    const result = await publishDue(db, { publishFn });
    expect(result.fallidas).toBe(1);
    expect(rows[0].estado).toBe('FAILED');
    expect(rows[0].error).toBe('conexion rechazada');
  });

  it('solo publicaciones con scheduledAt en el pasado se procesan', async () => {
    const past = new Date('2026-08-01');
    const future = new Date('2099-01-01');
    const pubs = [
      approvedDuePub('p1', past),
      approvedDuePub('p2', future),
    ];
    const { db } = fakeDb(pubs);
    const publishFn = async () => [{ ok: true, platform: 'youtube' } as PublishResult];
    const result = await publishDue(db, { publishFn });
    expect(result.publicadas).toBe(1);
  });

  it('publishFn recibe metadata con titulo y caption', async () => {
    const past = new Date('2026-08-01');
    const pub = approvedDuePub('p1', past);
    pub.tema = 'Mi tema';
    pub.caption = 'Mi caption';
    const { db } = fakeDb([pub]);
    let receivedMetadata: any = null;
    const publishFn = async (input: any) => {
      receivedMetadata = input.metadata;
      return [{ ok: true, platform: 'youtube' } as PublishResult];
    };
    await publishDue(db, { publishFn });
    expect(receivedMetadata).toEqual({ title: 'Mi tema', plainScript: 'Mi caption' });
  });
});
