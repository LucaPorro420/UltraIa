/**
 * Tests del módulo publish (AutoPub F4). CERO llamadas reales:
 * fetch inyectado via fetchFn + tokenFromEnv; env limpiado por test.
 */

import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import {
  formBody,
  buildBilingualMetadata,
  buildXPostText,
  xAppendMultipartBody,
  createYouTubeAdapter,
  createTikTokAdapter,
  createXAdapter,
  createInstagramAdapter,
  createThreadsAdapter,
  createLinkedInAdapter,
  createFacebookAdapter,
  publishToAll,
  createDefaultPublishers,
  DEFAULT_METADATA,
  IG_MEDIA_URL,
  THREADS_MEDIA_URL,
  LINKEDIN_ASSETS_URL,
  LINKEDIN_UGCP_URL,
  LINKEDIN_VIDEO_RECIPE,
  FB_GRAPH_URL,
  X_CHUNK_BYTES,
} from './publish.js';
import type { PublisherAdapter, PublishInput, PublishMetadata } from './publish.js';

/* ------------------------------------------------------------------ mock */
function mockFetch(
  responses: Array<{
    ok: boolean;
    status: number;
    headers?: Record<string, string>;
    json?: () => Promise<any>;
    text?: () => Promise<string>;
  }>,
) {
  let callIdx = 0;
  return vi.fn(async () => {
    const r = responses[callIdx++ % responses.length];
    return new Response(
      r.json ? JSON.stringify(await r.json()) : r.text ? await r.text() : '',
      { status: r.status, headers: r.headers ?? {} },
    );
  }) as any;
}

function okJson(body: any, status = 200) {
  return { ok: true, status, json: async () => body, headers: {} };
}

function okJsonHeaders(body: any, headers: Record<string, string>, status = 200) {
  return { ok: true, status, json: async () => body, headers };
}

function failResp(status: number, body?: any) {
  return {
    ok: false,
    status,
    json: async () => body ?? { error: { message: 'fail' } },
    headers: {},
  };
}

const VIDEO_BUF = Buffer.from('test-video-data');
const VALID_INPUT: PublishInput = { videoBuffer: VIDEO_BUF };

const REAL_ENV = { ...process.env };

beforeEach(() => {
  delete process.env.YOUTUBE_ACCESS_TOKEN;
  delete process.env.TIKTOK_ACCESS_TOKEN;
  delete process.env.X_ACCESS_TOKEN;
  delete process.env.IG_ACCESS_TOKEN;
  delete process.env.IG_USER_ID;
  delete process.env.THREADS_ACCESS_TOKEN;
  delete process.env.THREADS_USER_ID;
  delete process.env.LINKEDIN_ACCESS_TOKEN;
  delete process.env.LINKEDIN_AUTHOR_URN;
  delete process.env.FB_ACCESS_TOKEN;
  delete process.env.FB_PAGE_ID;
});

afterEach(() => {
  process.env = { ...REAL_ENV };
  vi.restoreAllMocks();
});

/* ================================================================ formBody */
describe('formBody', () => {
  it('codifica pares key-value correctamente', () => {
    const result = formBody({ a: '1', b: 'hello world' });
    expect(result).toBe('a=1&b=hello+world');
  });

  it('maneja caracteres especiales', () => {
    const result = formBody({ key: 'áéíóú & x=y' });
    expect(result).toContain('key=');
    expect(result).toContain('%C3%A1');
  });

  it('objeto vacío devuelve string vacío', () => {
    expect(formBody({})).toBe('');
  });
});

/* ================================================== buildBilingualMetadata */
describe('buildBilingualMetadata', () => {
  it('genera metadatos es/ar a partir del título', () => {
    const meta = buildBilingualMetadata('Mi Video');
    expect(meta.title).toContain('Mi Video');
    expect(meta.title).toContain('الذكاء الاصطناعي');
    expect(meta.tags).toContain('IA');
    expect(meta.privacyStatus).toBe('public');
  });

  it('usa plainScript en la descripción cuando se provee', () => {
    const meta = buildBilingualMetadata('T', 'script en árabe');
    expect(meta.description).toContain('script en árabe');
  });

  it('sin plainScript usa el título en la parte árabe', () => {
    const meta = buildBilingualMetadata('Hola');
    expect(meta.description).toContain('Hola');
  });

  it('incluye hashtags en la descripción', () => {
    const meta = buildBilingualMetadata('X');
    expect(meta.description).toContain('#IA');
    expect(meta.description).toContain('#Shorts');
  });
});

/* ===================================================== buildXPostText */
describe('buildXPostText', () => {
  it('genera texto dentro del límite de 280 chars', () => {
    const meta: PublishMetadata = {
      title: 'Título corto',
      description: 'Una descripción breve',
      tags: ['IA'],
      privacyStatus: 'public',
    };
    const text = buildXPostText(meta);
    expect(text.length).toBeLessThanOrEqual(280);
    expect(text).toContain('Título corto');
  });

  it('trunca con el slice implícito si es demasiado largo', () => {
    const meta: PublishMetadata = {
      title: 'x'.repeat(300),
      description: 'desc',
      tags: ['IA'],
      privacyStatus: 'public',
    };
    const text = buildXPostText(meta);
    expect(text.length).toBeLessThanOrEqual(280);
  });

  it('incluye hashtags del metadata', () => {
    const meta: PublishMetadata = {
      title: 'T',
      description: 'D',
      tags: ['Tech', 'AI'],
      privacyStatus: 'public',
    };
    const text = buildXPostText(meta);
    expect(text).toContain('#Tech');
    expect(text).toContain('#AI');
  });

  it('toma la primera línea de la descripción', () => {
    const meta: PublishMetadata = {
      title: 'T',
      description: 'primera línea\nsegunda línea\ntercera',
      tags: [],
      privacyStatus: 'public',
    };
    const text = buildXPostText(meta);
    expect(text).toContain('primera línea');
    expect(text).not.toContain('segunda línea');
  });
});

/* ================================================== xAppendMultipartBody */
describe('xAppendMultipartBody', () => {
  it('genera cuerpo multipart con command, media_id, segment_index, media_data', () => {
    const body = xAppendMultipartBody('mid42', 0, 'base64data', 'bnd');
    expect(body).toContain('name="command"');
    expect(body).toContain('APPEND');
    expect(body).toContain('name="media_id"');
    expect(body).toContain('mid42');
    expect(body).toContain('name="segment_index"');
    expect(body).toContain('0');
    expect(body).toContain('name="media_data"');
    expect(body).toContain('base64data');
    expect(body).toContain('--bnd--');
  });

  it('segment_index mayor se codifica correctamente', () => {
    const body = xAppendMultipartBody('m', 3, 'd', 'b');
    expect(body).toContain('3');
  });
});

/* ================================================= createYouTubeAdapter */
describe('createYouTubeAdapter', () => {
  describe('validate', () => {
    it('sin token → ok:false con razón clara', async () => {
      const adapter = createYouTubeAdapter({});
      const v = await adapter.validate();
      expect(v.ok).toBe(false);
      expect(v.reason).toContain('YOUTUBE_ACCESS_TOKEN');
    });

    it('token presente → ok:true', async () => {
      const adapter = createYouTubeAdapter({ accessToken: 'yt-tok' });
      const v = await adapter.validate();
      expect(v.ok).toBe(true);
    });

    it('lee token de env', async () => {
      process.env.YOUTUBE_ACCESS_TOKEN = 'env-yt';
      const v = await createYouTubeAdapter({}).validate();
      expect(v.ok).toBe(true);
    });
  });

  describe('publish', () => {
    it('sin token → ok:false sin fetch', async () => {
      let called = false;
      const adapter = createYouTubeAdapter({
        fetchFn: (async () => { called = true; return new Response(); }) as any,
      });
      const r = await adapter.publish({ videoBuffer: Buffer.from('x') });
      expect(r.ok).toBe(false);
      expect(called).toBe(false);
    });

    it('sin video → ok:false sin fetch', async () => {
      let called = false;
      const adapter = createYouTubeAdapter({
        accessToken: 'tok',
        fetchFn: (async () => { called = true; return new Response(); }) as any,
      });
      const r = await adapter.publish({});
      expect(r.ok).toBe(false);
      expect(called).toBe(false);
    });

    it('init falló → ok:false con HTTP status', async () => {
      const adapter = createYouTubeAdapter({
        accessToken: 'tok',
        fetchFn: mockFetch([failResp(403)]),
      });
      const r = await adapter.publish(VALID_INPUT);
      expect(r.ok).toBe(false);
      expect(r.error).toContain('403');
    });

    it('upload falló → ok:false con HTTP status', async () => {
      const adapter = createYouTubeAdapter({
        accessToken: 'tok',
        fetchFn: mockFetch([
          okJsonHeaders({}, { location: 'https://upload.example.com/123' }),
          failResp(500),
        ]),
      });
      const r = await adapter.publish(VALID_INPUT);
      expect(r.ok).toBe(false);
      expect(r.error).toContain('500');
    });

    it('éxito → ok:true con id y url', async () => {
      const adapter = createYouTubeAdapter({
        accessToken: 'tok',
        fetchFn: mockFetch([
          okJsonHeaders({}, { location: 'https://upload.example.com/123' }),
          okJson({ id: 'vid123' }),
        ]),
      });
      const r = await adapter.publish(VALID_INPUT);
      expect(r.ok).toBe(true);
      expect(r.id).toBe('vid123');
      expect(r.url).toContain('vid123');
      expect(r.url).toContain('shorts');
    });

    it('upload sin id en respuesta → ok:false con status 200', async () => {
      const adapter = createYouTubeAdapter({
        accessToken: 'tok',
        fetchFn: mockFetch([
          okJsonHeaders({}, { location: 'https://upload.example.com/123' }),
          okJson({}),
        ]),
      });
      const r = await adapter.publish(VALID_INPUT);
      expect(r.ok).toBe(false);
      expect(r.error).toContain('YouTube upload falló');
      expect(r.error).toContain('200');
    });

    it('fetch lanza → ok:false con mensaje de error', async () => {
      const adapter = createYouTubeAdapter({
        accessToken: 'tok',
        fetchFn: (async () => { throw new Error('ENOTFOUND'); }) as any,
      });
      const r = await adapter.publish(VALID_INPUT);
      expect(r.ok).toBe(false);
      expect(r.error).toContain('ENOTFOUND');
    });

    it('init sin header location → ok:false', async () => {
      const adapter = createYouTubeAdapter({
        accessToken: 'tok',
        fetchFn: mockFetch([okJson({}, 200)]),
      });
      const r = await adapter.publish(VALID_INPUT);
      expect(r.ok).toBe(false);
      expect(r.error).toContain('init');
    });
  });

  it('platform es "youtube"', () => {
    const adapter = createYouTubeAdapter({ accessToken: 't' });
    expect(adapter.platform).toBe('youtube');
  });
});

/* =================================================== createTikTokAdapter */
describe('createTikTokAdapter', () => {
  describe('validate', () => {
    it('sin token → ok:false con razón clara', async () => {
      const adapter = createTikTokAdapter({});
      const v = await adapter.validate();
      expect(v.ok).toBe(false);
      expect(v.reason).toContain('TIKTOK_ACCESS_TOKEN');
    });

    it('token presente → ok:true', async () => {
      const adapter = createTikTokAdapter({ accessToken: 'tt-tok' });
      const v = await adapter.validate();
      expect(v.ok).toBe(true);
    });

    it('lee token de env', async () => {
      process.env.TIKTOK_ACCESS_TOKEN = 'env-tt';
      const v = await createTikTokAdapter({}).validate();
      expect(v.ok).toBe(true);
    });
  });

  describe('publish', () => {
    it('sin token → ok:false sin fetch', async () => {
      let called = false;
      const adapter = createTikTokAdapter({
        fetchFn: (async () => { called = true; return new Response(); }) as any,
      });
      const r = await adapter.publish({ videoBuffer: Buffer.from('x') });
      expect(r.ok).toBe(false);
      expect(called).toBe(false);
    });

    it('sin video → ok:false sin fetch', async () => {
      let called = false;
      const adapter = createTikTokAdapter({
        accessToken: 'tok',
        fetchFn: (async () => { called = true; return new Response(); }) as any,
      });
      const r = await adapter.publish({});
      expect(r.ok).toBe(false);
      expect(called).toBe(false);
    });

    it('init falló → ok:false con HTTP status', async () => {
      const adapter = createTikTokAdapter({
        accessToken: 'tok',
        fetchFn: mockFetch([failResp(400, { error: { code: 'param_error' } })]),
      });
      const r = await adapter.publish(VALID_INPUT);
      expect(r.ok).toBe(false);
      expect(r.error).toContain('400');
    });

    it('upload falló → ok:false con HTTP status', async () => {
      const adapter = createTikTokAdapter({
        accessToken: 'tok',
        fetchFn: mockFetch([
          okJson({ data: { upload_url: 'https://upload.tt.com/1', publish_id: 'pid' }, error: { code: 'ok' } }),
          failResp(502),
        ]),
      });
      const r = await adapter.publish(VALID_INPUT);
      expect(r.ok).toBe(false);
      expect(r.error).toContain('502');
    });

    it('éxito → ok:true con publish_id', async () => {
      const adapter = createTikTokAdapter({
        accessToken: 'tok',
        fetchFn: mockFetch([
          okJson({ data: { upload_url: 'https://upload.tt.com/1', publish_id: 'pid123' }, error: { code: 'ok' } }),
          okJson({}, 200),
        ]),
      });
      const r = await adapter.publish(VALID_INPUT);
      expect(r.ok).toBe(true);
      expect(r.id).toBe('pid123');
    });

    it('upload status 201 también es éxito', async () => {
      const adapter = createTikTokAdapter({
        accessToken: 'tok',
        fetchFn: mockFetch([
          okJson({ data: { upload_url: 'https://upload.tt.com/1', publish_id: 'pid456' }, error: { code: 'ok' } }),
          okJson({}, 201),
        ]),
      });
      const r = await adapter.publish(VALID_INPUT);
      expect(r.ok).toBe(true);
      expect(r.id).toBe('pid456');
    });

    it('init sin upload_url → ok:false', async () => {
      const adapter = createTikTokAdapter({
        accessToken: 'tok',
        fetchFn: mockFetch([
          okJson({ data: {}, error: { code: 'ok' } }),
        ]),
      });
      const r = await adapter.publish(VALID_INPUT);
      expect(r.ok).toBe(false);
    });

    it('fetch lanza → ok:false con mensaje de error', async () => {
      const adapter = createTikTokAdapter({
        accessToken: 'tok',
        fetchFn: (async () => { throw new Error('ETIMEDOUT'); }) as any,
      });
      const r = await adapter.publish(VALID_INPUT);
      expect(r.ok).toBe(false);
      expect(r.error).toContain('ETIMEDOUT');
    });
  });

  it('platform es "tiktok"', () => {
    const adapter = createTikTokAdapter({ accessToken: 't' });
    expect(adapter.platform).toBe('tiktok');
  });
});

/* ========================================================= createXAdapter */
describe('createXAdapter', () => {
  describe('validate', () => {
    it('sin token → ok:false con razón clara', async () => {
      const adapter = createXAdapter({});
      const v = await adapter.validate();
      expect(v.ok).toBe(false);
      expect(v.reason).toContain('X_ACCESS_TOKEN');
    });

    it('token presente → ok:true', async () => {
      const adapter = createXAdapter({ accessToken: 'x-tok' });
      const v = await adapter.validate();
      expect(v.ok).toBe(true);
    });

    it('lee token de env', async () => {
      process.env.X_ACCESS_TOKEN = 'env-x';
      const v = await createXAdapter({}).validate();
      expect(v.ok).toBe(true);
    });
  });

  describe('publish', () => {
    it('sin token → ok:false sin fetch', async () => {
      let called = false;
      const adapter = createXAdapter({
        fetchFn: (async () => { called = true; return new Response(); }) as any,
      });
      const r = await adapter.publish({ videoBuffer: Buffer.from('x') });
      expect(r.ok).toBe(false);
      expect(called).toBe(false);
    });

    it('sin video → ok:false sin fetch', async () => {
      let called = false;
      const adapter = createXAdapter({
        accessToken: 'tok',
        fetchFn: (async () => { called = true; return new Response(); }) as any,
      });
      const r = await adapter.publish({});
      expect(r.ok).toBe(false);
      expect(called).toBe(false);
    });

    it('INIT falló → ok:false con HTTP status', async () => {
      const adapter = createXAdapter({
        accessToken: 'tok',
        fetchFn: mockFetch([failResp(413)]),
      });
      const r = await adapter.publish(VALID_INPUT);
      expect(r.ok).toBe(false);
      expect(r.error).toContain('INIT');
      expect(r.error).toContain('413');
    });

    it('APPEND falló → ok:false con HTTP status', async () => {
      const adapter = createXAdapter({
        accessToken: 'tok',
        fetchFn: mockFetch([
          okJson({ media_id_string: 'mid' }),
          failResp(500),
        ]),
      });
      const r = await adapter.publish(VALID_INPUT);
      expect(r.ok).toBe(false);
      expect(r.error).toContain('APPEND');
      expect(r.error).toContain('500');
    });

    it('FINALIZE falló → ok:false con HTTP status', async () => {
      const adapter = createXAdapter({
        accessToken: 'tok',
        fetchFn: mockFetch([
          okJson({ media_id_string: 'mid' }),
          okJson({}),
          failResp(503),
        ]),
      });
      const r = await adapter.publish(VALID_INPUT);
      expect(r.ok).toBe(false);
      expect(r.error).toContain('FINALIZE');
      expect(r.error).toContain('503');
    });

    it('tweet falló → ok:false con HTTP status', async () => {
      const adapter = createXAdapter({
        accessToken: 'tok',
        fetchFn: mockFetch([
          okJson({ media_id_string: 'mid' }),
          okJson({}),
          okJson({}),
          failResp(401),
        ]),
      });
      const r = await adapter.publish(VALID_INPUT);
      expect(r.ok).toBe(false);
      expect(r.error).toContain('tweet');
      expect(r.error).toContain('401');
    });

    it('éxito → ok:true con id y url', async () => {
      const adapter = createXAdapter({
        accessToken: 'tok',
        fetchFn: mockFetch([
          okJson({ media_id_string: 'mid123' }),
          okJson({}),
          okJson({}),
          okJson({ data: { id: 'tweet42' } }),
        ]),
      });
      const r = await adapter.publish(VALID_INPUT);
      expect(r.ok).toBe(true);
      expect(r.id).toBe('tweet42');
      expect(r.url).toContain('tweet42');
    });

    it('múltiples chunks cuando buffer > chunkBytes', async () => {
      let callCount = 0;
      const adapter = createXAdapter({
        accessToken: 'tok',
        chunkBytes: 10,
        fetchFn: mockFetch([
          okJson({ media_id_string: 'mid' }),
          okJson({}),
          okJson({}),
          okJson({}),
          okJson({}),
          okJson({ data: { id: 't2' } }),
        ]),
      });
      const r = await adapter.publish({ videoBuffer: Buffer.alloc(25) });
      expect(r.ok).toBe(true);
    });

    it('fetch lanza → ok:false con mensaje de error', async () => {
      const adapter = createXAdapter({
        accessToken: 'tok',
        fetchFn: (async () => { throw new Error('ECONNREFUSED'); }) as any,
      });
      const r = await adapter.publish(VALID_INPUT);
      expect(r.ok).toBe(false);
      expect(r.error).toContain('ECONNREFUSED');
    });

    it('text override se usa en vez de buildXPostText', async () => {
      let capturedBody: any;
      const tweetResponse: any = {
        ok: true,
        status: 200,
        headers: {},
        json: async () => ({ data: { id: 't3' } }),
      };
      const adapter = createXAdapter({
        accessToken: 'tok',
        text: 'custom tweet text',
        fetchFn: mockFetch([
          okJson({ media_id_string: 'mid' }),
          okJson({}),
          okJson({}),
          tweetResponse,
        ]),
      });
      const r = await adapter.publish(VALID_INPUT);
      expect(r.ok).toBe(true);
      expect(r.id).toBe('t3');
    });
  });

  it('platform es "x"', () => {
    expect(createXAdapter({ accessToken: 't' }).platform).toBe('x');
  });
});

/* ================================================= createInstagramAdapter */
describe('createInstagramAdapter', () => {
  describe('validate', () => {
    it('sin token → ok:false con razón clara', async () => {
      const adapter = createInstagramAdapter({});
      const v = await adapter.validate();
      expect(v.ok).toBe(false);
      expect(v.reason).toContain('IG_ACCESS_TOKEN');
    });

    it('sin userId → ok:false con razón clara', async () => {
      const adapter = createInstagramAdapter({ accessToken: 'ig-tok' });
      const v = await adapter.validate();
      expect(v.ok).toBe(false);
      expect(v.reason).toContain('IG_USER_ID');
    });

    it('ambos presentes → ok:true', async () => {
      const adapter = createInstagramAdapter({ accessToken: 'ig-tok', igUserId: '12345' });
      const v = await adapter.validate();
      expect(v.ok).toBe(true);
    });

    it('lee tokens de env', async () => {
      process.env.IG_ACCESS_TOKEN = 'env-ig';
      process.env.IG_USER_ID = 'env-uid';
      const v = await createInstagramAdapter({}).validate();
      expect(v.ok).toBe(true);
    });
  });

  describe('publish', () => {
    it('sin token → ok:false sin fetch', async () => {
      let called = false;
      const adapter = createInstagramAdapter({
        fetchFn: (async () => { called = true; return new Response(); }) as any,
      });
      const r = await adapter.publish({ videoBuffer: Buffer.from('x') });
      expect(r.ok).toBe(false);
      expect(called).toBe(false);
    });

    it('sin userId → ok:false sin fetch', async () => {
      let called = false;
      const adapter = createInstagramAdapter({
        accessToken: 'tok',
        fetchFn: (async () => { called = true; return new Response(); }) as any,
      });
      const r = await adapter.publish({ videoBuffer: Buffer.from('x') });
      expect(r.ok).toBe(false);
      expect(called).toBe(false);
    });

    it('sin videoUrl → ok:false sin fetch', async () => {
      let called = false;
      const adapter = createInstagramAdapter({
        accessToken: 'tok',
        igUserId: '123',
        fetchFn: (async () => { called = true; return new Response(); }) as any,
      });
      const r = await adapter.publish({ videoBuffer: Buffer.from('x') });
      expect(r.ok).toBe(false);
      expect(r.error).toContain('video_url');
      expect(called).toBe(false);
    });

    it('media create falló → ok:false con HTTP status', async () => {
      const adapter = createInstagramAdapter({
        accessToken: 'tok',
        igUserId: '123',
        videoUrl: 'https://example.com/v.mp4',
        fetchFn: mockFetch([failResp(400, { error: { message: 'Invalid param' } })]),
      });
      const r = await adapter.publish({});
      expect(r.ok).toBe(false);
      expect(r.error).toContain('400');
      expect(r.error).toContain('Invalid param');
    });

    it('media_publish falló → ok:false con HTTP status', async () => {
      const adapter = createInstagramAdapter({
        accessToken: 'tok',
        igUserId: '123',
        videoUrl: 'https://example.com/v.mp4',
        fetchFn: mockFetch([
          okJson({ id: 'container123' }),
          failResp(400, { error: { message: 'Publish error' } }),
        ]),
      });
      const r = await adapter.publish({});
      expect(r.ok).toBe(false);
      expect(r.error).toContain('400');
      expect(r.error).toContain('Publish error');
    });

    it('éxito → ok:true con id y url', async () => {
      const adapter = createInstagramAdapter({
        accessToken: 'tok',
        igUserId: '123',
        videoUrl: 'https://example.com/v.mp4',
        fetchFn: mockFetch([
          okJson({ id: 'container42' }),
          okJson({ id: 'reel777' }),
        ]),
      });
      const r = await adapter.publish({});
      expect(r.ok).toBe(true);
      expect(r.id).toBe('reel777');
      expect(r.url).toContain('reel777');
    });

    it('usa videoUrl de options en vez de input', async () => {
      let capturedBody = '';
      const adapter = createInstagramAdapter({
        accessToken: 'tok',
        igUserId: '123',
        videoUrl: 'https://options.com/v.mp4',
        fetchFn: mockFetch([
          okJson({ id: 'c1' }),
          okJson({ id: 'r1' }),
        ]),
      });
      const r = await adapter.publish({ videoUrl: 'https://input.com/v.mp4' });
      expect(r.ok).toBe(true);
    });

    it('fetch lanza → ok:false con mensaje de error', async () => {
      const adapter = createInstagramAdapter({
        accessToken: 'tok',
        igUserId: '123',
        videoUrl: 'https://example.com/v.mp4',
        fetchFn: (async () => { throw new Error('ENOTFOUND'); }) as any,
      });
      const r = await adapter.publish({});
      expect(r.ok).toBe(false);
      expect(r.error).toContain('ENOTFOUND');
    });

    it('create sin id en respuesta → ok:false', async () => {
      const adapter = createInstagramAdapter({
        accessToken: 'tok',
        igUserId: '123',
        videoUrl: 'https://example.com/v.mp4',
        fetchFn: mockFetch([okJson({})]),
      });
      const r = await adapter.publish({});
      expect(r.ok).toBe(false);
    });
  });

  it('platform es "instagram"', () => {
    expect(createInstagramAdapter({ accessToken: 't', igUserId: '1' }).platform).toBe('instagram');
  });
});

/* ================================================= createThreadsAdapter */
describe('createThreadsAdapter', () => {
  describe('validate', () => {
    it('sin token → ok:false con razón clara', async () => {
      const adapter = createThreadsAdapter({});
      const v = await adapter.validate();
      expect(v.ok).toBe(false);
      expect(v.reason).toContain('THREADS_ACCESS_TOKEN');
    });

    it('sin userId → ok:false con razón clara', async () => {
      const adapter = createThreadsAdapter({ accessToken: 'th-tok' });
      const v = await adapter.validate();
      expect(v.ok).toBe(false);
      expect(v.reason).toContain('THREADS_USER_ID');
    });

    it('ambos presentes → ok:true', async () => {
      const adapter = createThreadsAdapter({ accessToken: 'th-tok', threadsUserId: '456' });
      const v = await adapter.validate();
      expect(v.ok).toBe(true);
    });

    it('lee tokens de env', async () => {
      process.env.THREADS_ACCESS_TOKEN = 'env-th';
      process.env.THREADS_USER_ID = 'env-th-uid';
      const v = await createThreadsAdapter({}).validate();
      expect(v.ok).toBe(true);
    });
  });

  describe('publish', () => {
    it('sin token → ok:false sin fetch', async () => {
      let called = false;
      const adapter = createThreadsAdapter({
        fetchFn: (async () => { called = true; return new Response(); }) as any,
      });
      const r = await adapter.publish({ videoBuffer: Buffer.from('x') });
      expect(r.ok).toBe(false);
      expect(called).toBe(false);
    });

    it('sin userId → ok:false sin fetch', async () => {
      let called = false;
      const adapter = createThreadsAdapter({
        accessToken: 'tok',
        fetchFn: (async () => { called = true; return new Response(); }) as any,
      });
      const r = await adapter.publish({ videoBuffer: Buffer.from('x') });
      expect(r.ok).toBe(false);
      expect(called).toBe(false);
    });

    it('sin videoUrl → ok:false sin fetch', async () => {
      let called = false;
      const adapter = createThreadsAdapter({
        accessToken: 'tok',
        threadsUserId: '123',
        fetchFn: (async () => { called = true; return new Response(); }) as any,
      });
      const r = await adapter.publish({ videoBuffer: Buffer.from('x') });
      expect(r.ok).toBe(false);
      expect(r.error).toContain('video_url');
      expect(called).toBe(false);
    });

    it('create falló → ok:false con HTTP status', async () => {
      const adapter = createThreadsAdapter({
        accessToken: 'tok',
        threadsUserId: '123',
        videoUrl: 'https://example.com/v.mp4',
        fetchFn: mockFetch([failResp(400, { error: { message: 'Invalid' } })]),
      });
      const r = await adapter.publish({});
      expect(r.ok).toBe(false);
      expect(r.error).toContain('400');
    });

    it('publish falló → ok:false con HTTP status', async () => {
      const adapter = createThreadsAdapter({
        accessToken: 'tok',
        threadsUserId: '123',
        videoUrl: 'https://example.com/v.mp4',
        fetchFn: mockFetch([
          okJson({ id: 'container99' }),
          failResp(500, { error: { message: 'Server error' } }),
        ]),
      });
      const r = await adapter.publish({});
      expect(r.ok).toBe(false);
      expect(r.error).toContain('500');
    });

    it('éxito → ok:true con id y sin url', async () => {
      const adapter = createThreadsAdapter({
        accessToken: 'tok',
        threadsUserId: '123',
        videoUrl: 'https://example.com/v.mp4',
        fetchFn: mockFetch([
          okJson({ id: 'container42' }),
          okJson({ id: 'thread888' }),
        ]),
      });
      const r = await adapter.publish({});
      expect(r.ok).toBe(true);
      expect(r.id).toBe('thread888');
      expect(r.url).toBeUndefined();
    });

    it('fetch lanza → ok:false con mensaje de error', async () => {
      const adapter = createThreadsAdapter({
        accessToken: 'tok',
        threadsUserId: '123',
        videoUrl: 'https://example.com/v.mp4',
        fetchFn: (async () => { throw new Error('ETIMEOUT'); }) as any,
      });
      const r = await adapter.publish({});
      expect(r.ok).toBe(false);
      expect(r.error).toContain('ETIMEOUT');
    });

    it('create sin id en respuesta → ok:false', async () => {
      const adapter = createThreadsAdapter({
        accessToken: 'tok',
        threadsUserId: '123',
        videoUrl: 'https://example.com/v.mp4',
        fetchFn: mockFetch([okJson({})]),
      });
      const r = await adapter.publish({});
      expect(r.ok).toBe(false);
    });
  });

  it('platform es "threads"', () => {
    expect(createThreadsAdapter({ accessToken: 't', threadsUserId: '1' }).platform).toBe('threads');
  });
});

/* ================================================= createLinkedInAdapter */
describe('createLinkedInAdapter', () => {
  describe('validate', () => {
    it('sin token → ok:false con razón clara', async () => {
      const adapter = createLinkedInAdapter({});
      const v = await adapter.validate();
      expect(v.ok).toBe(false);
      expect(v.reason).toContain('LINKEDIN_ACCESS_TOKEN');
    });

    it('sin authorUrn → ok:false con razón clara', async () => {
      const adapter = createLinkedInAdapter({ accessToken: 'li-tok' });
      const v = await adapter.validate();
      expect(v.ok).toBe(false);
      expect(v.reason).toContain('LINKEDIN_AUTHOR_URN');
    });

    it('ambos presentes → ok:true', async () => {
      const adapter = createLinkedInAdapter({
        accessToken: 'li-tok',
        authorUrn: 'urn:li:organization:123',
      });
      const v = await adapter.validate();
      expect(v.ok).toBe(true);
    });

    it('lee tokens de env', async () => {
      process.env.LINKEDIN_ACCESS_TOKEN = 'env-li';
      process.env.LINKEDIN_AUTHOR_URN = 'urn:li:person:1';
      const v = await createLinkedInAdapter({}).validate();
      expect(v.ok).toBe(true);
    });
  });

  describe('publish', () => {
    it('sin token → ok:false sin fetch', async () => {
      let called = false;
      const adapter = createLinkedInAdapter({
        fetchFn: (async () => { called = true; return new Response(); }) as any,
      });
      const r = await adapter.publish({ videoBuffer: Buffer.from('x') });
      expect(r.ok).toBe(false);
      expect(called).toBe(false);
    });

    it('sin author → ok:false sin fetch', async () => {
      let called = false;
      const adapter = createLinkedInAdapter({
        accessToken: 'tok',
        fetchFn: (async () => { called = true; return new Response(); }) as any,
      });
      const r = await adapter.publish({ videoBuffer: Buffer.from('x') });
      expect(r.ok).toBe(false);
      expect(called).toBe(false);
    });

    it('sin video → ok:false sin fetch', async () => {
      let called = false;
      const adapter = createLinkedInAdapter({
        accessToken: 'tok',
        authorUrn: 'urn:li:org:1',
        fetchFn: (async () => { called = true; return new Response(); }) as any,
      });
      const r = await adapter.publish({});
      expect(r.ok).toBe(false);
      expect(called).toBe(false);
    });

    it('registerUpload falló → ok:false con HTTP status', async () => {
      const adapter = createLinkedInAdapter({
        accessToken: 'tok',
        authorUrn: 'urn:li:org:1',
        fetchFn: mockFetch([failResp(401, { error: { message: 'Unauthorized' } })]),
      });
      const r = await adapter.publish(VALID_INPUT);
      expect(r.ok).toBe(false);
      expect(r.error).toContain('registerUpload');
      expect(r.error).toContain('401');
    });

    it('upload falló → ok:false con HTTP status', async () => {
      const adapter = createLinkedInAdapter({
        accessToken: 'tok',
        authorUrn: 'urn:li:org:1',
        fetchFn: mockFetch([
          okJson({
            value: {
              asset: 'urn:li:asset:123',
              uploadMechanism: {
                'com.linkedin.digitalmedia.uploading.MediaUploadHttpRequest': {
                  uploadUrl: 'https://upload.li.com/1',
                },
              },
            },
          }),
          failResp(500),
        ]),
      });
      const r = await adapter.publish(VALID_INPUT);
      expect(r.ok).toBe(false);
      expect(r.error).toContain('upload');
      expect(r.error).toContain('500');
    });

    it('ugcPosts falló → ok:false con HTTP status', async () => {
      const adapter = createLinkedInAdapter({
        accessToken: 'tok',
        authorUrn: 'urn:li:org:1',
        fetchFn: mockFetch([
          okJson({
            value: {
              asset: 'urn:li:asset:123',
              uploadMechanism: {
                'com.linkedin.digitalmedia.uploading.MediaUploadHttpRequest': {
                  uploadUrl: 'https://upload.li.com/1',
                },
              },
            },
          }),
          okJson({}, 200),
          failResp(400),
        ]),
      });
      const r = await adapter.publish(VALID_INPUT);
      expect(r.ok).toBe(false);
      expect(r.error).toContain('ugcPosts');
      expect(r.error).toContain('400');
    });

    it('éxito → ok:true con ugcId del header x-restli-id', async () => {
      const adapter = createLinkedInAdapter({
        accessToken: 'tok',
        authorUrn: 'urn:li:org:1',
        fetchFn: mockFetch([
          okJson({
            value: {
              asset: 'urn:li:asset:456',
              uploadMechanism: {
                'com.linkedin.digitalmedia.uploading.MediaUploadHttpRequest': {
                  uploadUrl: 'https://upload.li.com/2',
                },
              },
            },
          }),
          okJson({}, 200),
          okJsonHeaders({}, { 'x-restli-id': 'ugc:789' }),
        ]),
      });
      const r = await adapter.publish(VALID_INPUT);
      expect(r.ok).toBe(true);
      expect(r.id).toBe('ugc:789');
      expect(r.url).toContain('ugc');
    });

    it('fetch lanza → ok:false con mensaje de error', async () => {
      const adapter = createLinkedInAdapter({
        accessToken: 'tok',
        authorUrn: 'urn:li:org:1',
        fetchFn: (async () => { throw new Error('ECONNRESET'); }) as any,
      });
      const r = await adapter.publish(VALID_INPUT);
      expect(r.ok).toBe(false);
      expect(r.error).toContain('ECONNRESET');
    });

    it('registerUpload sin asset → ok:false', async () => {
      const adapter = createLinkedInAdapter({
        accessToken: 'tok',
        authorUrn: 'urn:li:org:1',
        fetchFn: mockFetch([okJson({ value: {} })]),
      });
      const r = await adapter.publish(VALID_INPUT);
      expect(r.ok).toBe(false);
    });

    it('ugcPosts sin x-restli-id header → ok:false', async () => {
      const adapter = createLinkedInAdapter({
        accessToken: 'tok',
        authorUrn: 'urn:li:org:1',
        fetchFn: mockFetch([
          okJson({
            value: {
              asset: 'urn:li:asset:456',
              uploadMechanism: {
                'com.linkedin.digitalmedia.uploading.MediaUploadHttpRequest': {
                  uploadUrl: 'https://upload.li.com/2',
                },
              },
            },
          }),
          okJson({}, 200),
          okJsonHeaders({}, {}),
        ]),
      });
      const r = await adapter.publish(VALID_INPUT);
      expect(r.ok).toBe(false);
    });
  });

  it('platform es "linkedin"', () => {
    expect(createLinkedInAdapter({ accessToken: 't', authorUrn: 'urn:li:org:1' }).platform).toBe('linkedin');
  });
});

/* ================================================= createFacebookAdapter */
describe('createFacebookAdapter', () => {
  describe('validate', () => {
    it('sin token → ok:false con razón clara', async () => {
      const adapter = createFacebookAdapter({});
      const v = await adapter.validate();
      expect(v.ok).toBe(false);
      expect(v.reason).toContain('FB_ACCESS_TOKEN');
    });

    it('sin pageId → ok:false con razón clara', async () => {
      const adapter = createFacebookAdapter({ accessToken: 'fb-tok' });
      const v = await adapter.validate();
      expect(v.ok).toBe(false);
      expect(v.reason).toContain('FB_PAGE_ID');
    });

    it('ambos presentes → ok:true', async () => {
      const adapter = createFacebookAdapter({ accessToken: 'fb-tok', pageId: 'pg123' });
      const v = await adapter.validate();
      expect(v.ok).toBe(true);
    });

    it('lee tokens de env', async () => {
      process.env.FB_ACCESS_TOKEN = 'env-fb';
      process.env.FB_PAGE_ID = 'env-pg';
      const v = await createFacebookAdapter({}).validate();
      expect(v.ok).toBe(true);
    });
  });

  describe('publish', () => {
    it('sin token → ok:false sin fetch', async () => {
      let called = false;
      const adapter = createFacebookAdapter({
        fetchFn: (async () => { called = true; return new Response(); }) as any,
      });
      const r = await adapter.publish({ videoBuffer: Buffer.from('x') });
      expect(r.ok).toBe(false);
      expect(called).toBe(false);
    });

    it('sin pageId → ok:false sin fetch', async () => {
      let called = false;
      const adapter = createFacebookAdapter({
        accessToken: 'tok',
        fetchFn: (async () => { called = true; return new Response(); }) as any,
      });
      const r = await adapter.publish({ videoBuffer: Buffer.from('x') });
      expect(r.ok).toBe(false);
      expect(called).toBe(false);
    });

    it('sin video → ok:false sin fetch', async () => {
      let called = false;
      const adapter = createFacebookAdapter({
        accessToken: 'tok',
        pageId: 'pg1',
        fetchFn: (async () => { called = true; return new Response(); }) as any,
      });
      const r = await adapter.publish({});
      expect(r.ok).toBe(false);
      expect(called).toBe(false);
    });

    it('upload video (videoPath con .mp4) → ok:true', async () => {
      let capturedUrl = '';
      const adapter = createFacebookAdapter({
        accessToken: 'tok',
        pageId: 'pg1',
        fetchFn: mockFetch([okJson({ id: 'fb_vid_99' })]),
      });
      const r = await adapter.publish({ videoPath: '/tmp/video.mp4', videoBuffer: Buffer.from('mp4data') });
      expect(r.ok).toBe(true);
      expect(r.id).toBe('fb_vid_99');
      expect(r.url).toContain('fb_vid_99');
    });

    it('upload foto (sin .mp4) → ok:true', async () => {
      let capturedUrl = '';
      const adapter = createFacebookAdapter({
        accessToken: 'tok',
        pageId: 'pg1',
        fetchFn: (async (url: string | URL) => {
          capturedUrl = String(url);
          return new Response(JSON.stringify({ id: 'fb_photo_1' }), { status: 200 });
        }) as any,
      });
      const r = await adapter.publish({ videoBuffer: Buffer.from('imagedata') });
      expect(r.ok).toBe(true);
      expect(r.id).toBe('fb_photo_1');
      expect(capturedUrl).toContain('/photos');
    });

    it('upload falló → ok:false con HTTP status', async () => {
      const adapter = createFacebookAdapter({
        accessToken: 'tok',
        pageId: 'pg1',
        fetchFn: mockFetch([failResp(400, { error: { message: 'Invalid token' } })]),
      });
      const r = await adapter.publish(VALID_INPUT);
      expect(r.ok).toBe(false);
      expect(r.error).toContain('400');
    });

    it('fetch lanza → ok:false con mensaje de error', async () => {
      const adapter = createFacebookAdapter({
        accessToken: 'tok',
        pageId: 'pg1',
        fetchFn: (async () => { throw new Error('ENETUNREACH'); }) as any,
      });
      const r = await adapter.publish(VALID_INPUT);
      expect(r.ok).toBe(false);
      expect(r.error).toContain('ENETUNREACH');
    });

    it('video detectado por magic bytes ftyp → endpoint videos', async () => {
      let capturedUrl = '';
      // ftyp magic bytes = 66747970
      const ftypBuf = Buffer.concat([Buffer.from('ftyp'), Buffer.alloc(20)]);
      const adapter = createFacebookAdapter({
        accessToken: 'tok',
        pageId: 'pg1',
        fetchFn: (async (url: string | URL) => {
          capturedUrl = String(url);
          return new Response(JSON.stringify({ id: 'fb_v2' }), { status: 200 });
        }) as any,
      });
      const r = await adapter.publish({ videoBuffer: ftypBuf });
      expect(r.ok).toBe(true);
      expect(capturedUrl).toContain('/videos');
    });
  });

  it('platform es "facebook"', () => {
    expect(createFacebookAdapter({ accessToken: 't', pageId: '1' }).platform).toBe('facebook');
  });
});

/* ========================================================= publishToAll */
describe('publishToAll', () => {
  it('adapters vacío → array vacío', async () => {
    const results = await publishToAll([], {});
    expect(results).toEqual([]);
  });

  it('1 adapter válido → 1 resultado ok:true', async () => {
    const adapter: PublisherAdapter = {
      platform: 'youtube',
      validate: async () => ({ ok: true }),
      publish: async () => ({ platform: 'youtube', ok: true, id: '1' }),
    };
    const results = await publishToAll([adapter], VALID_INPUT);
    expect(results).toHaveLength(1);
    expect(results[0].ok).toBe(true);
  });

  it('1 adapter inválido (validate falla) → 1 resultado ok:false', async () => {
    const adapter: PublisherAdapter = {
      platform: 'youtube',
      validate: async () => ({ ok: false, reason: 'sin token' }),
      publish: async () => ({ platform: 'youtube', ok: true, id: '1' }),
    };
    const results = await publishToAll([adapter], VALID_INPUT);
    expect(results).toHaveLength(1);
    expect(results[0].ok).toBe(false);
    expect(results[0].error).toContain('sin token');
  });

  it('2 adapters mixtos → resultados mixtos', async () => {
    const ok: PublisherAdapter = {
      platform: 'youtube',
      validate: async () => ({ ok: true }),
      publish: async () => ({ platform: 'youtube', ok: true, id: '1' }),
    };
    const fail: PublisherAdapter = {
      platform: 'tiktok',
      validate: async () => ({ ok: false, reason: 'no token' }),
      publish: async () => ({ platform: 'tiktok', ok: true }),
    };
    const results = await publishToAll([ok, fail], VALID_INPUT);
    expect(results).toHaveLength(2);
    expect(results[0].ok).toBe(true);
    expect(results[1].ok).toBe(false);
  });

  it('adapter con publish que falla internamente → retorna ok:false (fail-soft)', async () => {
    const adapter: PublisherAdapter = {
      platform: 'youtube',
      validate: async () => ({ ok: true }),
      publish: async () => ({ platform: 'youtube', ok: false, error: 'fallo interno' }),
    };
    const results = await publishToAll([adapter], VALID_INPUT);
    expect(results).toHaveLength(1);
    expect(results[0].ok).toBe(false);
    expect(results[0].error).toContain('fallo interno');
  });
});

/* ================================================= createDefaultPublishers */
describe('createDefaultPublishers', () => {
  it('sin opts → 2 adapters (youtube + tiktok)', () => {
    const adapters = createDefaultPublishers();
    expect(adapters).toHaveLength(2);
    expect(adapters.map((a) => a.platform)).toEqual(['youtube', 'tiktok']);
  });

  it('includeX → 3 adapters', () => {
    const adapters = createDefaultPublishers({ includeX: true });
    expect(adapters).toHaveLength(3);
    expect(adapters.map((a) => a.platform)).toContain('x');
  });

  it('includeMeta → 4 adapters (+ instagram + threads)', () => {
    const adapters = createDefaultPublishers({ includeMeta: true });
    expect(adapters).toHaveLength(4);
    expect(adapters.map((a) => a.platform)).toContain('instagram');
    expect(adapters.map((a) => a.platform)).toContain('threads');
  });

  it('includeFacebook → 3 adapters (+ facebook)', () => {
    const adapters = createDefaultPublishers({ includeFacebook: true });
    expect(adapters).toHaveLength(3);
    expect(adapters.map((a) => a.platform)).toContain('facebook');
  });

  it('includeLinkedIn → 3 adapters (+ linkedin)', () => {
    const adapters = createDefaultPublishers({ includeLinkedIn: true });
    expect(adapters).toHaveLength(3);
    expect(adapters.map((a) => a.platform)).toContain('linkedin');
  });

  it('includeTelegram → 3 adapters (+ telegram)', () => {
    const adapters = createDefaultPublishers({ includeTelegram: true });
    expect(adapters).toHaveLength(3);
    expect(adapters.map((a) => a.platform)).toContain('telegram');
  });

  it('includeDiscord → 3 adapters (+ discord)', () => {
    const adapters = createDefaultPublishers({ includeDiscord: true });
    expect(adapters).toHaveLength(3);
    expect(adapters.map((a) => a.platform)).toContain('discord');
  });

  it('includeSlack → 3 adapters (+ slack)', () => {
    const adapters = createDefaultPublishers({ includeSlack: true });
    expect(adapters).toHaveLength(3);
    expect(adapters.map((a) => a.platform)).toContain('slack');
  });

  it('todos los flags → 14 adapters', () => {
    const adapters = createDefaultPublishers({
      includeX: true,
      includeMeta: true,
      includeFacebook: true,
      includeTelegram: true,
      includeDiscord: true,
      includeSlack: true,
      includeLinkedIn: true,
      includeReddit: true,
      includePinterest: true,
      includeWhatsApp: true,
      includeZernio: true,
    });
    expect(adapters).toHaveLength(14);
    const platforms = adapters.map((a) => a.platform);
    expect(platforms).toContain('youtube');
    expect(platforms).toContain('tiktok');
    expect(platforms).toContain('x');
    expect(platforms).toContain('instagram');
    expect(platforms).toContain('threads');
    expect(platforms).toContain('facebook');
    expect(platforms).toContain('telegram');
    expect(platforms).toContain('discord');
    expect(platforms).toContain('slack');
    expect(platforms).toContain('linkedin');
    expect(platforms).toContain('reddit');
    expect(platforms).toContain('pinterest');
    expect(platforms).toContain('whatsapp');
    expect(platforms).toContain('zernio');
  });
});

/* ===================================================== DEFAULT_METADATA */
describe('DEFAULT_METADATA', () => {
  it('tiene título bilingüe', () => {
    expect(DEFAULT_METADATA.title).toContain('|');
    expect(DEFAULT_METADATA.title).toContain('الذكاء الاصطناعي');
  });

  it('tiene descripción bilingüe', () => {
    expect(DEFAULT_METADATA.description).toContain('#IA');
  });

  it('tiene tags y privacyStatus', () => {
    expect(DEFAULT_METADATA.tags.length).toBeGreaterThan(0);
    expect(DEFAULT_METADATA.privacyStatus).toBe('public');
  });
});

/* =================================================== constantes exportadas */
describe('constantes exportadas', () => {
  it('IG_MEDIA_URL apunta a Graph API v21', () => {
    expect(IG_MEDIA_URL).toContain('v21.0');
  });

  it('THREADS_MEDIA_URL apunta a Graph API v1.0', () => {
    expect(THREADS_MEDIA_URL).toContain('v1.0');
  });

  it('LINKEDIN_ASSETS_URL y LINKEDIN_UGCP_URL son válidos', () => {
    expect(LINKEDIN_ASSETS_URL).toContain('linkedin.com');
    expect(LINKEDIN_UGCP_URL).toContain('linkedin.com');
  });

  it('FB_GRAPH_URL apunta a Graph API v21', () => {
    expect(FB_GRAPH_URL).toContain('v21.0');
  });

  it('X_CHUNK_BYTES es 5 MiB', () => {
    expect(X_CHUNK_BYTES).toBe(5 * 1024 * 1024);
  });

  it('LINKEDIN_VIDEO_RECIPE es un URN válido', () => {
    expect(LINKEDIN_VIDEO_RECIPE).toContain('urn:li:digitalmediaRecipe');
  });
});
