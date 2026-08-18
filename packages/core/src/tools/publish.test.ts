import { describe, expect, it } from 'vitest';
import {
  buildBilingualMetadata,
  buildXPostText,
  createDefaultPublishers,
  createInstagramAdapter,
  createLinkedInAdapter,
  createThreadsAdapter,
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

  it('createDefaultPublishers({ includeMeta: true }): 4 adapters, IG+Threads fail-soft sin token', async () => {
    const adapters = createDefaultPublishers({ includeMeta: true });
    expect(adapters.map((a) => a.platform).sort()).toEqual(['instagram', 'threads', 'tiktok', 'youtube']);
    const results = await publishToAll(adapters, { videoBuffer: MP4_BYTES });
    expect(results).toHaveLength(4);
    const ig = results.find((r) => r.platform === 'instagram')!;
    expect(ig.ok).toBe(false);
    expect(ig.error).toContain('IG_ACCESS_TOKEN');
    const th = results.find((r) => r.platform === 'threads')!;
    expect(th.ok).toBe(false);
    expect(th.error).toContain('THREADS_ACCESS_TOKEN');
  });

  it('createDefaultPublishers({ includeX: true, includeMeta: true }): 5 adapters', () => {
    const adapters = createDefaultPublishers({ includeX: true, includeMeta: true });
    expect(adapters.map((a) => a.platform).sort()).toEqual(['instagram', 'threads', 'tiktok', 'x', 'youtube']);
  });

  it('createDefaultPublishers({ includeTelegram: true }): 3 adapters, Telegram fail-soft sin token', async () => {
    const adapters = createDefaultPublishers({ includeTelegram: true });
    expect(adapters.map((a) => a.platform).sort()).toEqual(['telegram', 'tiktok', 'youtube']);
    const results = await publishToAll(adapters, { videoBuffer: MP4_BYTES });
    expect(results).toHaveLength(3);
    const tg = results.find((r) => r.platform === 'telegram')!;
    expect(tg.ok).toBe(false);
    expect(tg.error).toContain('TELEGRAM_BOT_TOKEN');
  });

  it('createDefaultPublishers({ includeX, includeMeta, includeTelegram }): 6 adapters', () => {
    const adapters = createDefaultPublishers({ includeX: true, includeMeta: true, includeTelegram: true });
    expect(adapters.map((a) => a.platform).sort()).toEqual(['instagram', 'telegram', 'threads', 'tiktok', 'x', 'youtube']);
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

describe('createInstagramAdapter (IG Reels, F4 paso 5)', () => {
  const IG_TOKEN = 'ig-token-1';
  const IG_USER = '17841400000000000';
  const VIDEO_URL = 'https://cdn.example.com/final.mp4';

  function igFetchMock(calls: string[]) {
    return stubFetch([
      {
        match: (url, init) => url.includes('/media') && !url.includes('media_publish') && String(init.body).includes('REELS'),
        respond: () => {
          calls.push('create');
          return jsonResponse(200, { id: 'c1' });
        },
      },
      {
        match: (url) => url.includes('media_publish'),
        respond: () => {
          calls.push('publish');
          return jsonResponse(200, { id: 'm1' });
        },
      },
      { match: () => true, respond: () => jsonResponse(500, {}) },
    ]);
  }

  it('validate: sin token → ok:false con razón clara', async () => {
    const v = await createInstagramAdapter().validate();
    expect(v.ok).toBe(false);
    expect(v.reason).toContain('IG_ACCESS_TOKEN');
  });

  it('validate: con token pero sin IG_USER_ID → ok:false', async () => {
    const v = await createInstagramAdapter({ accessToken: IG_TOKEN }).validate();
    expect(v.ok).toBe(false);
    expect(v.reason).toContain('IG_USER_ID');
  });

  it('flujo feliz: media (REELS) → media_publish → id + url reel', async () => {
    const calls: string[] = [];
    const adapter = createInstagramAdapter({ accessToken: IG_TOKEN, igUserId: IG_USER, videoUrl: VIDEO_URL, fetchFn: igFetchMock(calls) });
    const res = await adapter.publish({ metadata: { title: 'Reel de prueba' } });
    expect(res.ok).toBe(true);
    expect(res.id).toBe('m1');
    expect(res.url).toBe('https://www.instagram.com/reel/m1/');
    expect(calls).toEqual(['create', 'publish']);
  });

  it('sin videoUrl → error claro (fail-soft)', async () => {
    const adapter = createInstagramAdapter({ accessToken: IG_TOKEN, igUserId: IG_USER });
    const res = await adapter.publish({});
    expect(res.ok).toBe(false);
    expect(res.error).toContain('video_url');
  });

  it('media create falla → ok:false con HTTP y mensaje', async () => {
    const adapter = createInstagramAdapter({
      accessToken: IG_TOKEN,
      igUserId: IG_USER,
      videoUrl: VIDEO_URL,
      fetchFn: stubFetch([{ match: () => true, respond: () => jsonResponse(400, { error: { message: 'bad request' } }) }]),
    });
    const res = await adapter.publish({});
    expect(res.ok).toBe(false);
    expect(res.error).toContain('HTTP 400');
    expect(res.error).toContain('bad request');
  });

  it('media_publish falla → ok:false con HTTP', async () => {
    const adapter = createInstagramAdapter({
      accessToken: IG_TOKEN,
      igUserId: IG_USER,
      videoUrl: VIDEO_URL,
      fetchFn: stubFetch([
        { match: (url) => url.includes('/media') && !url.includes('media_publish'), respond: () => jsonResponse(200, { id: 'c1' }) },
        { match: () => true, respond: () => jsonResponse(400, { error: { message: 'container not ready' } }) },
      ]),
    });
    const res = await adapter.publish({});
    expect(res.ok).toBe(false);
    expect(res.error).toContain('HTTP 400');
    expect(res.error).toContain('container not ready');
  });

  it('caption usa el título con cap 2200', async () => {
    let capturedBody = '';
    const adapter = createInstagramAdapter({
      accessToken: IG_TOKEN,
      igUserId: IG_USER,
      videoUrl: VIDEO_URL,
      fetchFn: stubFetch([
        {
          match: (url, init) => {
            if (url.includes('/media') && !url.includes('media_publish')) {
              capturedBody = String(init.body);
              return true;
            }
            return false;
          },
          respond: () => jsonResponse(200, { id: 'c1' }),
        },
        { match: (url) => url.includes('media_publish'), respond: () => jsonResponse(200, { id: 'm1' }) },
        { match: () => true, respond: () => jsonResponse(500, {}) },
      ]),
    });
    const res = await adapter.publish({ metadata: { title: 'R'.repeat(3000) } });
    expect(res.ok).toBe(true);
    const caption = new URLSearchParams(capturedBody).get('caption') ?? '';
    expect(caption.length).toBe(2200);
  });
});

describe('createThreadsAdapter (Threads, F4 paso 5)', () => {
  const TH_TOKEN = 'th-token-1';
  const TH_USER = '123456789';
  const VIDEO_URL = 'https://cdn.example.com/final.mp4';

  function threadsFetchMock(calls: string[], failStep?: 'create' | 'publish') {
    return stubFetch([
      {
        match: (url, init) => url.includes('/threads') && !url.includes('threads_publish'),
        respond: () => {
          calls.push('create');
          return failStep === 'create' ? jsonResponse(400, { error: { message: 'invalid video_url' } }) : jsonResponse(200, { id: 'c1' });
        },
      },
      {
        match: (url) => url.includes('threads_publish'),
        respond: () => {
          calls.push('publish');
          return failStep === 'publish' ? jsonResponse(400, { error: { message: 'creation expired' } }) : jsonResponse(200, { id: 't1' });
        },
      },
      { match: () => true, respond: () => jsonResponse(500, {}) },
    ]);
  }

  it('validate: sin token → ok:false con razón clara', async () => {
    const v = await createThreadsAdapter().validate();
    expect(v.ok).toBe(false);
    expect(v.reason).toContain('THREADS_ACCESS_TOKEN');
  });

  it('validate: con token pero sin THREADS_USER_ID → ok:false', async () => {
    const v = await createThreadsAdapter({ accessToken: TH_TOKEN }).validate();
    expect(v.ok).toBe(false);
    expect(v.reason).toContain('THREADS_USER_ID');
  });

  it('flujo feliz: threads (VIDEO) → threads_publish → id', async () => {
    const calls: string[] = [];
    const adapter = createThreadsAdapter({ accessToken: TH_TOKEN, threadsUserId: TH_USER, videoUrl: VIDEO_URL, fetchFn: threadsFetchMock(calls) });
    const res = await adapter.publish({ metadata: { title: 'Thread de prueba' } });
    expect(res.ok).toBe(true);
    expect(res.id).toBe('t1');
    expect(calls).toEqual(['create', 'publish']);
  });

  it('el create manda media_type=VIDEO + video_url + text', async () => {
    let capturedBody = '';
    const adapter = createThreadsAdapter({
      accessToken: TH_TOKEN,
      threadsUserId: TH_USER,
      videoUrl: VIDEO_URL,
      fetchFn: stubFetch([
        {
          match: (url, init) => {
            if (url.includes('/threads') && !url.includes('threads_publish')) {
              capturedBody = String(init.body);
              return true;
            }
            return false;
          },
          respond: () => jsonResponse(200, { id: 'c1' }),
        },
        { match: (url) => url.includes('threads_publish'), respond: () => jsonResponse(200, { id: 't1' }) },
        { match: () => true, respond: () => jsonResponse(500, {}) },
      ]),
    });
    const res = await adapter.publish({ metadata: { title: 'Hola Threads' } });
    expect(res.ok).toBe(true);
    const params = new URLSearchParams(capturedBody);
    expect(params.get('media_type')).toBe('VIDEO');
    expect(params.get('video_url')).toBe(VIDEO_URL);
    expect(params.get('text')).toBe('Hola Threads');
  });

  it('sin videoUrl → error claro (fail-soft)', async () => {
    const adapter = createThreadsAdapter({ accessToken: TH_TOKEN, threadsUserId: TH_USER });
    const res = await adapter.publish({});
    expect(res.ok).toBe(false);
    expect(res.error).toContain('video_url');
  });

  it('create falla → ok:false con HTTP y mensaje', async () => {
    const calls: string[] = [];
    const adapter = createThreadsAdapter({ accessToken: TH_TOKEN, threadsUserId: TH_USER, videoUrl: VIDEO_URL, fetchFn: threadsFetchMock(calls, 'create') });
    const res = await adapter.publish({});
    expect(res.ok).toBe(false);
    expect(res.error).toContain('HTTP 400');
    expect(res.error).toContain('invalid video_url');
  });

  it('threads_publish falla → ok:false con HTTP y mensaje', async () => {
    const calls: string[] = [];
    const adapter = createThreadsAdapter({ accessToken: TH_TOKEN, threadsUserId: TH_USER, videoUrl: VIDEO_URL, fetchFn: threadsFetchMock(calls, 'publish') });
    const res = await adapter.publish({});
    expect(res.ok).toBe(false);
    expect(res.error).toContain('HTTP 400');
    expect(res.error).toContain('creation expired');
  });

  it('text usa el título con cap 500', async () => {
    let capturedBody = '';
    const adapter = createThreadsAdapter({
      accessToken: TH_TOKEN,
      threadsUserId: TH_USER,
      videoUrl: VIDEO_URL,
      fetchFn: stubFetch([
        {
          match: (url, init) => {
            if (url.includes('/threads') && !url.includes('threads_publish')) {
              capturedBody = String(init.body);
              return true;
            }
            return false;
          },
          respond: () => jsonResponse(200, { id: 'c1' }),
        },
        { match: (url) => url.includes('threads_publish'), respond: () => jsonResponse(200, { id: 't1' }) },
        { match: () => true, respond: () => jsonResponse(500, {}) },
      ]),
    });
    const res = await adapter.publish({ metadata: { title: 'T'.repeat(800) } });
    expect(res.ok).toBe(true);
    const text = new URLSearchParams(capturedBody).get('text') ?? '';
    expect(text.length).toBe(500);
  });

  it('publishToAll: Meta sin token → fail-soft razonado', async () => {
    const results = await publishToAll([createInstagramAdapter(), createThreadsAdapter(), createXAdapter()], { videoBuffer: MP4_BYTES });
    expect(results).toHaveLength(3);
    expect(results.every((r) => r.ok === false)).toBe(true);
    expect(results[0].error).toContain('IG_ACCESS_TOKEN');
    expect(results[1].error).toContain('THREADS_ACCESS_TOKEN');
    expect(results[2].error).toContain('X_ACCESS_TOKEN');
  });
});

describe('createLinkedInAdapter (LinkedIn Marketing API, F4 paso 9)', () => {
  const LI_TOKEN = 'li-token-1';
  const LI_AUTHOR = 'urn:li:organization:12345678';
  const MP4 = Buffer.from('fake-mp4-for-linkedin');

  function liFetchMock(calls: string[], failStep?: 'register' | 'upload' | 'ugc') {
    return stubFetch([
      {
        match: (url, init) => url.includes('/rest/assets?action=registerUpload'),
        respond: () => {
          calls.push('register');
          if (failStep === 'register') return jsonResponse(400, { error: { message: 'invalid owner' } });
          return jsonResponse(200, {
            value: {
              asset: 'urn:li:digitalmediaAsset:C123',
              uploadMechanism: {
                'com.linkedin.digitalmedia.uploading.MediaUploadHttpRequest': {
                  uploadUrl: 'https://dms-uploads.linkedin.com/uploadedVideo/0',
                  headers: { 'media-type-family': 'VIDEO' },
                },
              },
            },
          });
        },
      },
      {
        match: (url, init) => url.includes('dms-uploads.linkedin.com') && init.method === 'PUT',
        respond: () => {
          calls.push('upload');
          if (failStep === 'upload') return jsonResponse(500, {});
          return jsonResponse(201, {});
        },
      },
      {
        match: (url, init) => url.includes('/v2/ugcPosts'),
        respond: () => {
          calls.push('ugc');
          if (failStep === 'ugc') return jsonResponse(400, { error: { message: 'ugc failed' } });
          return new Response(null, {
            status: 201,
            headers: { 'x-restli-id': 'urn:li:ugcPost:987654321', 'content-type': 'application/json' },
          });
        },
      },
      { match: () => true, respond: () => jsonResponse(500, {}) },
    ]);
  }

  it('validate: sin token → ok:false con razón clara', async () => {
    const v = await createLinkedInAdapter().validate();
    expect(v.ok).toBe(false);
    expect(v.reason).toContain('LINKEDIN_ACCESS_TOKEN');
  });

  it('validate: con token pero sin author URN → ok:false', async () => {
    const v = await createLinkedInAdapter({ accessToken: LI_TOKEN }).validate();
    expect(v.ok).toBe(false);
    expect(v.reason).toContain('LINKEDIN_AUTHOR_URN');
  });

  it('validate: con token + author URN → ok:true', async () => {
    const v = await createLinkedInAdapter({ accessToken: LI_TOKEN, authorUrn: LI_AUTHOR }).validate();
    expect(v.ok).toBe(true);
  });

  it('flujo feliz: registerUpload → PUT → ugcPosts → id + url', async () => {
    const calls: string[] = [];
    const adapter = createLinkedInAdapter({ accessToken: LI_TOKEN, authorUrn: LI_AUTHOR, fetchFn: liFetchMock(calls) });
    const res = await adapter.publish({ videoBuffer: MP4, metadata: { title: 'Video LinkedIn', description: 'Desc' } });
    expect(res.ok).toBe(true);
    expect(res.id).toBe('urn:li:ugcPost:987654321');
    expect(res.url).toBe('https://www.linkedin.com/feed/update/urn%3Ali%3AugcPost%3A987654321/');
    expect(calls).toEqual(['register', 'upload', 'ugc']);
  });

  it('registerUpload falla → ok:false con HTTP y mensaje', async () => {
    const adapter = createLinkedInAdapter({ accessToken: LI_TOKEN, authorUrn: LI_AUTHOR, fetchFn: liFetchMock([], 'register') });
    const res = await adapter.publish({ videoBuffer: MP4 });
    expect(res.ok).toBe(false);
    expect(res.error).toContain('HTTP 400');
    expect(res.error).toContain('invalid owner');
  });

  it('upload PUT falla → ok:false con HTTP', async () => {
    const adapter = createLinkedInAdapter({ accessToken: LI_TOKEN, authorUrn: LI_AUTHOR, fetchFn: liFetchMock([], 'upload') });
    const res = await adapter.publish({ videoBuffer: MP4 });
    expect(res.ok).toBe(false);
    expect(res.error).toContain('LinkedIn upload falló: HTTP 500');
  });

  it('ugcPosts falla → ok:false con HTTP', async () => {
    const adapter = createLinkedInAdapter({ accessToken: LI_TOKEN, authorUrn: LI_AUTHOR, fetchFn: liFetchMock([], 'ugc') });
    const res = await adapter.publish({ videoBuffer: MP4 });
    expect(res.ok).toBe(false);
    expect(res.error).toContain('LinkedIn ugcPosts falló: HTTP 400');
  });

  it('sin video → ok:false con razón (fail-soft)', async () => {
    const adapter = createLinkedInAdapter({ accessToken: LI_TOKEN, authorUrn: LI_AUTHOR });
    const res = await adapter.publish({});
    expect(res.ok).toBe(false);
    expect(res.error).toContain('No se pudo leer el video');
  });

  it('commentary truncado a 3000 chars', async () => {
    let capturedUgcBody = '';
    const adapter = createLinkedInAdapter({
      accessToken: LI_TOKEN,
      authorUrn: LI_AUTHOR,
      fetchFn: stubFetch([
        {
          match: (url) => url.includes('/rest/assets?action=registerUpload'),
          respond: () =>
            jsonResponse(200, {
              value: {
                asset: 'urn:li:digitalmediaAsset:C123',
                uploadMechanism: {
                  'com.linkedin.digitalmedia.uploading.MediaUploadHttpRequest': {
                    uploadUrl: 'https://dms-uploads.linkedin.com/uploadedVideo/0',
                    headers: { 'media-type-family': 'VIDEO' },
                  },
                },
              },
            }),
        },
        { match: (url) => url.includes('dms-uploads.linkedin.com'), respond: () => jsonResponse(201, {}) },
        {
          match: (url, init) => {
            if (url.includes('/v2/ugcPosts')) {
              capturedUgcBody = String(init.body);
              return true;
            }
            return false;
          },
          respond: () => new Response(null, { status: 201, headers: { 'x-restli-id': 'urn:li:ugcPost:987' } }),
        },
        { match: () => true, respond: () => jsonResponse(500, {}) },
      ]),
    });
    const longTitle = 'T'.repeat(200);
    const longDesc = 'D'.repeat(3000);
    await adapter.publish({ videoBuffer: MP4, metadata: { title: longTitle, description: longDesc } });
    const ugcJson = JSON.parse(capturedUgcBody);
    const commentary = ugcJson.specificContent['com.linkedin.ugc.ShareContent'].shareCommentary.text;
    expect(commentary.length).toBeLessThanOrEqual(3000);
  });

  it('publishToAll con LinkedIn sin token → fail-soft razonado', async () => {
    const results = await publishToAll([createLinkedInAdapter(), createXAdapter()], { videoBuffer: MP4 });
    expect(results).toHaveLength(2);
    expect(results.every((r) => r.ok === false)).toBe(true);
    expect(results[0].error).toContain('LINKEDIN_ACCESS_TOKEN');
    expect(results[1].error).toContain('X_ACCESS_TOKEN');
  });

  it('createDefaultPublishers({ includeLinkedIn: true }): 3 adapters', () => {
    const adapters = createDefaultPublishers({ includeLinkedIn: true });
    expect(adapters.map((a) => a.platform).sort()).toEqual(['linkedin', 'tiktok', 'youtube']);
  });

  it('createDefaultPublishers({ includeX: true, includeMeta: true, includeTelegram: true, includeDiscord: true, includeSlack: true, includeLinkedIn: true }): 9 adapters', () => {
    const adapters = createDefaultPublishers({ includeX: true, includeMeta: true, includeTelegram: true, includeDiscord: true, includeSlack: true, includeLinkedIn: true });
    expect(adapters.map((a) => a.platform).sort()).toEqual(['discord', 'instagram', 'linkedin', 'slack', 'telegram', 'threads', 'tiktok', 'x', 'youtube']);
  });
});