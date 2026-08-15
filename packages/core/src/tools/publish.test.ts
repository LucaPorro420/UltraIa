import { describe, expect, it } from 'vitest';
import {
  buildBilingualMetadata,
  createDefaultPublishers,
  createTikTokAdapter,
  createYouTubeAdapter,
  DEFAULT_METADATA,
  publishToAll,
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
});