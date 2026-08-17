import { describe, expect, it } from 'vitest';
import {
  buildBilingualMetadata,
  buildXPostText,
  createDefaultPublishers,
  createTikTokAdapter,
  createXAdapter,
  createYouTubeAdapter,
  DEFAULT_METADATA,
  publishToAll,
  xAppendMultipartBody,
  X_CHUNK_BYTES,
  type PublisherAdapter,
} from './publish';

const MP4_BYTES = Buffer.from('fake-mp4-content-for-tests-0123456789');

function stubFetch(routes: Array<{ match: (url: string, init: RequestInit) => boolean; respond: () => Response }>) {
  return (async (url: string | URL | Request, init?: RequestInit) => {
    const u = String(url);
    const route = routes.find((r) => r.match(u, init || {}));
    if (!route) throw new Error(`No route for ${u}`);
    return route.respond();
  }) as typeof fetch;
}

function jsonResponse(status: number, body: unknown, headers: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json', ...headers } });
}

const TOKEN = 'test-token-123';

describe('buildBilingualMetadata', () => {
  it('mezcla tags es/ar y título bilingüe con patrón RF-12', () => {
    const meta = buildBilingualMetadata('El Futuro de la IA');
    expect(meta.title).toBe('El Futuro de la IA | الذكاء الاصطناعي #Shorts');
    expect(meta.tags).toContain('IA');
    expect(meta.tags).toContain('الذكاء الاصطناعي');
    expect(meta.privacyStatus).toBe('public');
    expect(meta.description).toContain('#IA #Shorts');
  });

  it('incluye el guion árabe en la descripción si se pasa', () => {
    const meta = buildBilingualMetadata('Título', 'نص عربي');
    expect(meta.description).toContain('نص عربي');
  });
});

describe('validate', () => {
  it('YouTube sin token → ok:false con razón clara', async () => {
    const adapter = createYouTubeAdapter();
    const v = await adapter.validate();
    expect(v.ok).toBe(false);
    expect(v.reason).toContain('YOUTUBE_ACCESS_TOKEN');
  });

  it('TikTok sin token → ok:false con razón clara', async () => {
    const adapter = createTikTokAdapter();
    const v = await adapter.validate();
    expect(v.ok).toBe(false);
    expect(v.reason).toContain('TIKTOK_ACCESS_TOKEN');
  });

  it('con token (options) → ok:true', async () => {
    expect((await createYouTubeAdapter({ accessToken: TOKEN }).validate()).ok).toBe(true);
    expect((await createTikTokAdapter({ accessToken: TOKEN }).validate()).ok).toBe(true);
  });
});

describe('createYouTubeAdapter', () => {
  it('sube con flujo resumable (POST → Location → PUT) y devuelve id + url shorts', async () => {
    const fetchFn = stubFetch([
{
        match: (url) => url.includes('googleapis.com/upload/youtube/v3/videos'),
        respond: () =>
          new Response(null, { status: 200, headers: { location: 'https://upload.example/up1?upload_id=x' } }),
      },
      {
        match: (url) => url === 'https://upload.example/up1?upload_id=x',
        respond: () => jsonResponse(200, { id: 'vid123', kind: 'youtube#video' }),
      },
    ]);
    const adapter = createYouTubeAdapter({ accessToken: TOKEN, fetchFn });
    const r = await adapter.publish({ videoBuffer: MP4_BYTES, metadata: { title: 'T', tags: ['a'] } });
    expect(r.ok).toBe(true);
    expect(r.id).toBe('vid123');
    expect(r.url).toBe('https://youtube.com/shorts/vid123');
  });

  it('init falla → ok:false con error HTTP', async () => {
    const fetchFn = stubFetch([
      { match: () => true, respond: () => jsonResponse(403, { error: { message: 'denied' } }) },
    ]);
    const adapter = createYouTubeAdapter({ accessToken: TOKEN, fetchFn });
    const r = await adapter.publish({ videoBuffer: MP4_BYTES });
    expect(r.ok).toBe(false);
    expect(r.error).toContain('403');
  });

  it('sin video → error claro', async () => {
    const adapter = createYouTubeAdapter({ accessToken: TOKEN });
    const r = await adapter.publish({ metadata: {} });
    expect(r.ok).toBe(false);
    expect(r.error).toContain('video');
  });
});

describe('createTikTokAdapter', () => {
  it('Direct Post 2 pasos: init → PUT upload_url → publish_id', async () => {
    const fetchFn = stubFetch([
      {
        match: (url) => url.includes('open.tiktokapis.com/v2/post/publish/video/init'),
        respond: () =>
          jsonResponse(200, {
            data: { upload_url: 'https://upload.tiktok.example/up1', publish_id: 'pub456' },
            error: { code: 'ok' },
          }),
      },
      {
        match: (url, init) => url === 'https://upload.tiktok.example/up1' && init.method === 'PUT',
        respond: () => jsonResponse(201, {}),
      },
    ]);
    const adapter = createTikTokAdapter({ accessToken: TOKEN, fetchFn });
    const r = await adapter.publish({ videoBuffer: MP4_BYTES });
    expect(r.ok).toBe(true);
    expect(r.id).toBe('pub456');
  });

  it('title + hashtags recortado a 150 chars en el init', async () => {
    const seen: string[] = [];
    const fetchFn = stubFetch([
      {
        match: (url) => url.includes('tiktokapis.com'),
        respond: () => {
          return jsonResponse(200, { data: { upload_url: 'https://up', publish_id: 'p1' }, error: { code: 'ok' } });
        },
      },
      { match: () => true, respond: () => jsonResponse(201, {}) },
    ]);
    // capturamos el body del init vía un wrapper
    const wrapped = (async (url: string | URL | Request, init?: RequestInit) => {
      if (String(url).includes('tiktokapis.com') && init?.body) seen.push(String(init.body));
      return fetchFn(url, init);
    }) as typeof fetch;
    const adapter = createTikTokAdapter({ accessToken: TOKEN, fetchFn: wrapped });
    await adapter.publish({ videoBuffer: MP4_BYTES });
    const initBody = JSON.parse(seen[0]);
    expect(initBody.post_info.title.length).toBeLessThanOrEqual(150);
    expect(initBody.source_info.source).toBe('FILE_UPLOAD');
    expect(initBody.source_info.total_chunk_count).toBe(1);
  });

  it('init con error code != ok → ok:false', async () => {
    const fetchFn = stubFetch([
      {
        match: () => true,
        respond: () => jsonResponse(200, { error: { code: 'unauthorized' }, data: {} }),
      },
    ]);
    const adapter = createTikTokAdapter({ accessToken: TOKEN, fetchFn });
    const r = await adapter.publish({ videoBuffer: MP4_BYTES });
    expect(r.ok).toBe(false);
    expect(r.error).toContain('unauthorized');
  });

  it('PUT falla → ok:false con HTTP', async () => {
    const fetchFn = stubFetch([
      {
        match: (url) => url.includes('tiktokapis.com'),
        respond: () => jsonResponse(200, { data: { upload_url: 'https://up' }, error: { code: 'ok' } }),
      },
      { match: () => true, respond: () => jsonResponse(500, {}) },
    ]);
    const adapter = createTikTokAdapter({ accessToken: TOKEN, fetchFn });
    const r = await adapter.publish({ videoBuffer: MP4_BYTES });
    expect(r.ok).toBe(false);
    expect(r.error).toContain('500');
  });
});

describe('publishToAll + default publishers', () => {
  it('sin tokens: salta ambas plataformas con razón (fail-soft)', async () => {
    const results = await publishToAll(createDefaultPublishers(), { videoBuffer: MP4_BYTES });
    expect(results).toHaveLength(2);
    expect(results.every((r) => !r.ok)).toBe(true);
    expect(results.map((r) => r.platform).sort()).toEqual(['tiktok', 'youtube']);
  });

  it('YouTube ok + TikTok sin token → resultados mixtos', async () => {
    const fetchFn = stubFetch([
{
        match: (url) => url.includes('googleapis.com/upload/youtube'),
        respond: () => new Response(null, { status: 200, headers: { location: 'https://up' } }),
      },
      { match: () => true, respond: () => jsonResponse(200, { id: 'v1' }) },
    ]);
    const adapters: PublisherAdapter[] = [
      createYouTubeAdapter({ accessToken: TOKEN, fetchFn }),
      createTikTokAdapter(), // sin token
    ];
    const results = await publishToAll(adapters, { videoBuffer: MP4_BYTES });
    const yt = results.find((r) => r.platform === 'youtube')!;
    const tk = results.find((r) => r.platform === 'tiktok')!;
    expect(yt.ok).toBe(true);
    expect(yt.id).toBe('v1');
    expect(tk.ok).toBe(false);
    expect(tk.error).toContain('TIKTOK_ACCESS_TOKEN');
  });

  it('DEFAULT_METADATA exportado con tags es/ar', () => {
    expect(DEFAULT_METADATA.tags).toContain('الذكاء الاصطناعي');
    expect(DEFAULT_METADATA.privacyStatus).toBe('public');
  });

  it('createDefaultPublishers(): 2 adapters (youtube+tiktok) sin X — retrocompatible', () => {
    const adapters = createDefaultPublishers();
    expect(adapters.map((a) => a.platform).sort()).toEqual(['tiktok', 'youtube']);
  });

  it('createDefaultPublishers({ includeX: true }): 3 adapters, X fail-soft sin token', async () => {
    const adapters = createDefaultPublishers({ includeX: true });
    expect(adapters.map((a) => a.platform).sort()).toEqual(['tiktok', 'x', 'youtube']);
    const results = await publishToAll(adapters, { videoBuffer: MP4_BYTES });
    expect(results).toHaveLength(3);
    const x = results.find((r) => r.platform === 'x')!;
    expect(x.ok).toBe(false);
    expect(x.error).toContain('X_ACCESS_TOKEN');
  });
});

describe('createXAdapter (X API v2, F4 paso 4)', () => {
  const X_TOKEN = 'x-token-1';
  const VIDEOS = {
    pequeno: Buffer.from('x'.repeat(100)), // 1 chunk
    grande: Buffer.alloc(X_CHUNK_BYTES * 2 + 10), // 3 chunks
  };

  function xFetchMock(calls: string[]) {
    let lastAppendBody = '';
    return stubFetch([
      {
        match: (url, init) => url.includes('upload.x.com') && Boolean(init.body) && String(init.body).includes('INIT'),
        respond: () => jsonResponse(200, { media_id_string: 'm1' }),
      },
      {
        match: (url, init) => {
          if (url.includes('upload.x.com') && String(init.body).includes('APPEND')) {
            lastAppendBody = String(init.body);
            return true;
          }
          return false;
        },
        respond: () => {
          calls.push(lastAppendBody);
          return jsonResponse(200, {});
        },
      },
      {
        match: (url, init) => url.includes('upload.x.com') && String(init.body).includes('FINALIZE'),
        respond: () => jsonResponse(200, { media_id_string: 'm1' }),
      },
      {
        match: (url) => url.includes('api.x.com/2/tweets'),
        respond: () => jsonResponse(201, { data: { id: '999', text: 'ok' } }),
      },
      { match: () => true, respond: () => jsonResponse(500, {}) },
    ]);
  }

  it('validate: sin token → ok:false con razón clara', async () => {
    const v = await createXAdapter().validate();
    expect(v.ok).toBe(false);
    expect(v.reason).toContain('X_ACCESS_TOKEN');
  });

  it('buildXPostText: título + primera línea + hashtags con cap 280', () => {
    const meta = buildBilingualMetadata('El Futuro de la IA');
    const text = buildXPostText(meta);
    expect(text.length).toBeLessThanOrEqual(280);
    expect(text).toContain('El Futuro de la IA');
    expect(text).toContain('#IA');
  });

  it('xAppendMultipartBody: form-data manual con boundary, campos y base64', () => {
    const body = xAppendMultipartBody('m1', 2, 'QUJD', 'b1');
    expect(body).toContain('--b1\r\n');
    expect(body).toContain('name="command"\r\n\r\nAPPEND');
    expect(body).toContain('name="media_id"\r\n\r\nm1');
    expect(body).toContain('name="segment_index"\r\n\r\n2');
    expect(body).toContain('name="media_data"\r\n\r\nQUJD');
    expect(body.endsWith('--b1--\r\n')).toBe(true);
  });

  it('flujo feliz: INIT → APPEND → FINALIZE → tweet ok con url', async () => {
    const calls: string[] = [];
    const adapter = createXAdapter({ accessToken: X_TOKEN, fetchFn: xFetchMock(calls) });
    const res = await adapter.publish({ videoBuffer: VIDEOS.pequeno, metadata: { title: 'T', description: 'D' } });
    expect(res.ok).toBe(true);
    expect(res.id).toBe('999');
    expect(res.url).toBe('https://x.com/i/status/999');
  });

  it('chunking: video de 2 chunks + resto → 3 APPENDs con segment_index 0,1,2', async () => {
    const calls: string[] = [];
    const adapter = createXAdapter({ accessToken: X_TOKEN, fetchFn: xFetchMock(calls) });
    const res = await adapter.publish({ videoBuffer: VIDEOS.grande });
    expect(res.ok).toBe(true);
    expect(calls).toHaveLength(3);
    expect(calls[0]).toContain('name="segment_index"\r\n\r\n0');
    expect(calls[1]).toContain('name="segment_index"\r\n\r\n1');
    expect(calls[2]).toContain('name="segment_index"\r\n\r\n2');
  });

  it('INIT falla → ok:false con razón HTTP', async () => {
    const fetchFn = stubFetch([{ match: () => true, respond: () => jsonResponse(401, {}) }]);
    const adapter = createXAdapter({ accessToken: X_TOKEN, fetchFn });
    const res = await adapter.publish({ videoBuffer: VIDEOS.pequeno });
    expect(res.ok).toBe(false);
    expect(res.error).toContain('X INIT falló: HTTP 401');
  });

  it('APPEND falla → ok:false con índice', async () => {
    const fetchFn = stubFetch([
      { match: (u, i) => u.includes('upload.x.com') && String(i.body).includes('INIT'), respond: () => jsonResponse(200, { media_id_string: 'm1' }) },
      { match: () => true, respond: () => jsonResponse(500, {}) },
    ]);
    const adapter = createXAdapter({ accessToken: X_TOKEN, fetchFn });
    const res = await adapter.publish({ videoBuffer: VIDEOS.pequeno });
    expect(res.ok).toBe(false);
    expect(res.error).toContain('X APPEND 0 falló');
  });

  it('tweet falla → ok:false con razón', async () => {
    const fetchFn = stubFetch([
      { match: (u, i) => u.includes('upload.x.com') && String(i.body).includes('INIT'), respond: () => jsonResponse(200, { media_id_string: 'm1' }) },
      { match: (u, i) => u.includes('upload.x.com') && String(i.body).includes('APPEND'), respond: () => jsonResponse(200, {}) },
      { match: (u, i) => u.includes('upload.x.com') && String(i.body).includes('FINALIZE'), respond: () => jsonResponse(200, {}) },
      { match: () => true, respond: () => jsonResponse(403, {}) },
    ]);
    const adapter = createXAdapter({ accessToken: X_TOKEN, fetchFn });
    const res = await adapter.publish({ videoBuffer: VIDEOS.pequeno });
    expect(res.ok).toBe(false);
    expect(res.error).toContain('X tweet falló: HTTP 403');
  });

  it('sin video → ok:false con razón (fail-soft)', async () => {
    const adapter = createXAdapter({ accessToken: X_TOKEN });
    const res = await adapter.publish({});
    expect(res.ok).toBe(false);
    expect(res.error).toContain('No se pudo leer el video');
  });

  it('publishToAll con X sin token → fail-soft razonado', async () => {
    const results = await publishToAll([createXAdapter()], { videoBuffer: VIDEOS.pequeno });
    expect(results).toHaveLength(1);
    expect(results[0].platform).toBe('x');
    expect(results[0].ok).toBe(false);
    expect(results[0].error).toContain('X_ACCESS_TOKEN');
  });
});