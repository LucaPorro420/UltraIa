/**
 * Tests del adapter Zernio de publicación (fetch inyectable, sin red real).
 * Vive en zernioPublish.ts para no colisionar con zernio.ts (cliente MCP de la sesión concurrente).
 */
import { describe, it, expect } from 'vitest';
import {
  createZernioAdapter,
  isValidZernioApiKey,
  buildZernioCaption,
  ZERNIO_PLATFORM,
} from './zernioPublish';
import type { PublishInput } from './publish';

const META = { title: 'T', description: 'D', tags: ['ia', 'tech'] };

/** Mock fetch que enruta por URL+método. */
function mockFetch(handler: (url: string, init?: RequestInit) => { status: number; json: unknown }) {
  return (async (url: string, init?: RequestInit) => {
    const r = handler(url, init);
    return {
      ok: r.status >= 200 && r.status < 300,
      status: r.status,
      statusText: `STATUS_${r.status}`,
      json: async () => r.json,
    } as unknown as Response;
  }) as typeof fetch;
}

describe('zernio publish adapter validation', () => {
  it('rechaza sin API key', () => {
    expect(isValidZernioApiKey('')).toBe(false);
    const a = createZernioAdapter({ apiKey: '' });
    return a.validate().then((v) => {
      expect(v.ok).toBe(false);
      expect(v.reason).toMatch(/ZERNIO_API_KEY/);
    });
  });

  it('acepta con API key', () => {
    const a = createZernioAdapter({ apiKey: 'zk_test' });
    return a.validate().then((v) => expect(v.ok).toBe(true));
  });
});

describe('buildZernioCaption', () => {
  it('une title/desc/tags', () => {
    const c = buildZernioCaption(META);
    expect(c).toContain('T');
    expect(c).toContain('D');
    expect(c).toContain('#ia');
  });
  it('fallback si vacío', () => {
    expect(buildZernioCaption()).toBe('Contenido generado con IA');
  });
});

describe('zernioPublish adapter publish', () => {
  it('publica con videoUrl (URL pública) en una sola llamada', async () => {
    let captured: any = null;
    const fetchImpl = mockFetch((url, init) => {
      if (url.endsWith('/posts') && init?.method === 'POST') {
        captured = JSON.parse(String(init!.body));
        return { status: 201, json: { _id: 'post_123' } };
      }
      return { status: 404, json: {} };
    });
    const a = createZernioAdapter({ apiKey: 'zk', platforms: ['instagram', 'tiktok'], fetch: fetchImpl });
    const input: PublishInput = { metadata: META, videoUrl: 'https://x/video.mp4' } as PublishInput;
    const res = await a.publish(input);
    expect(res.ok).toBe(true);
    expect(res.id).toBe('post_123');
    expect(captured.platforms).toEqual([{ platform: 'instagram', accountId: undefined }, { platform: 'tiktok', accountId: undefined }]);
    expect(captured.mediaItems).toEqual([{ type: 'video', url: 'https://x/video.mp4' }]);
    expect(captured.publishNow).toBe(true);
  });

  it('sube video local vía presign+PUT', async () => {
    let postsBody: any = null;
    let putCalled = false;
    const fetchImpl = mockFetch((url, init) => {
      if (url.endsWith('/media/presign')) return { status: 200, json: { uploadUrl: 'https://up/xyz', publicUrl: 'https://cdn/xyz.mp4' } };
      if (init?.method === 'PUT') { putCalled = true; return { status: 200, json: {} }; }
      if (url.endsWith('/posts')) { postsBody = JSON.parse(String(init!.body)); return { status: 201, json: { _id: 'p2' } }; }
      return { status: 404, json: {} };
    });
    const a = createZernioAdapter({ apiKey: 'zk', platforms: ['youtube'], fetch: fetchImpl });
    const input: PublishInput = { metadata: META, videoBuffer: Buffer.from('fake') } as PublishInput;
    const res = await a.publish(input);
    expect(res.ok).toBe(true);
    expect(putCalled).toBe(true);
    expect(postsBody.mediaItems).toEqual([{ type: 'video', url: 'https://cdn/xyz.mp4' }]);
  });

  it('falla 401 fail-soft', async () => {
    const fetchImpl = mockFetch(() => ({ status: 401, json: { error: 'unauthorized' } }));
    const a = createZernioAdapter({ apiKey: 'zk', platforms: ['instagram'], fetch: fetchImpl });
    const res = await a.publish({ metadata: META } as PublishInput);
    expect(res.ok).toBe(false);
    expect(res.error).toMatch(/401/);
  });

  it('sin plataformas ni cuentas → error fail-soft', async () => {
    const fetchImpl = mockFetch((url) => (url.endsWith('/accounts') ? { status: 200, json: { accounts: [] } } : { status: 404, json: {} }));
    const a = createZernioAdapter({ apiKey: 'zk', fetch: fetchImpl });
    const res = await a.publish({ metadata: META } as PublishInput);
    expect(res.ok).toBe(false);
    expect(res.error).toMatch(/cuentas activas/);
  });

  it('descubre cuentas activas vía GET /accounts', async () => {
    let postsBody: any = null;
    const fetchImpl = mockFetch((url, init) => {
      if (url.endsWith('/accounts')) return { status: 200, json: { accounts: [{ platform: 'linkedin', status: 'active' }, { platform: 'disabled', status: 'disabled' }] } };
      if (url.endsWith('/posts')) { postsBody = JSON.parse(String(init!.body)); return { status: 201, json: { _id: 'p3' } }; }
      return { status: 404, json: {} };
    });
    const a = createZernioAdapter({ apiKey: 'zk', fetch: fetchImpl });
    const res = await a.publish({ metadata: META, text: 'hola' } as PublishInput);
    expect(res.ok).toBe(true);
    expect(postsBody.platforms).toEqual([{ platform: 'linkedin', accountId: undefined }]);
  });
});
