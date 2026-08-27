import { describe, it, expect } from 'vitest';
import { createPinterestAdapter, PINTEREST_PLATFORM } from './pinterest';

function makeFetch(impl: (url: string, init?: any) => any) {
  return ((url: any, init?: any) => Promise.resolve(impl(String(url), init))) as unknown as typeof fetch;
}

describe('pinterest adapter', () => {
  it('platform is pinterest', () => {
    expect((createPinterestAdapter() as any).platform).toBe('pinterest');
    expect(PINTEREST_PLATFORM).toBe('pinterest');
  });

  it('validate fails without token', async () => {
    const a = createPinterestAdapter({ boardId: 'b1' });
    const r = await a.validate();
    expect(r.ok).toBe(false);
    expect(r.reason).toMatch(/PINTEREST_ACCESS_TOKEN/);
  });

  it('validate fails without boardId', async () => {
    const a = createPinterestAdapter({ accessToken: 'tok' });
    const r = await a.validate();
    expect(r.ok).toBe(false);
    expect(r.reason).toMatch(/PINTEREST_BOARD_ID/);
  });

  it('publish requires videoUrl', async () => {
    const a = createPinterestAdapter({ accessToken: 'tok', boardId: 'b1' });
    const res = await a.publish({ metadata: { title: 'T' } });
    expect(res.ok).toBe(false);
    expect(res.error).toMatch(/video_url/);
  });

  it('publish success returns id + url', async () => {
    let sent: any = null;
    const fetch = makeFetch((_url, init) => {
      sent = { body: JSON.parse(init.body), headers: init.headers };
      return { ok: true, status: 201, json: async () => ({ id: 'pin_123' }) };
    });
    const a = createPinterestAdapter({ accessToken: 'tok', boardId: 'b1', fetchFn: fetch });
    const res = await a.publish({ videoUrl: 'https://example.com/v.mp4', metadata: { title: 'Mi pin', description: 'Desc', tags: ['#diy'] } });
    expect(res.ok).toBe(true);
    expect(res.id).toBe('pin_123');
    expect(res.url).toBe('https://pinterest.com/pin/pin_123/');
    expect(sent.body.board_id).toBe('b1');
    expect(sent.body.media.media_type).toBe('video');
    expect(sent.body.media.video_link).toBe('https://example.com/v.mp4');
    expect(sent.headers.Authorization).toBe('Bearer tok');
  });

  it('publish fails soft on HTTP error', async () => {
    const fetch = makeFetch(() => ({ ok: false, status: 403, json: async () => ({}) }));
    const a = createPinterestAdapter({ accessToken: 'tok', boardId: 'b1', fetchFn: fetch });
    const res = await a.publish({ videoUrl: 'https://x/v.mp4' });
    expect(res.ok).toBe(false);
    expect(res.error).toMatch(/HTTP 403/);
  });

  it('publish fails soft on network error', async () => {
    const fetch = makeFetch(() => { throw new Error('net'); });
    const a = createPinterestAdapter({ accessToken: 'tok', boardId: 'b1', fetchFn: fetch });
    const res = await a.publish({ videoUrl: 'https://x/v.mp4' });
    expect(res.ok).toBe(false);
    expect(res.error).toMatch(/net/);
  });
});
