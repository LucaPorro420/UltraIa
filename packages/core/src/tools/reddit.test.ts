import { describe, it, expect } from 'vitest';
import { createRedditAdapter, REDDIT_PLATFORM } from './reddit';

function makeFetch(impl: (url: string, init?: any) => any) {
  return ((url: any, init?: any) => Promise.resolve(impl(String(url), init))) as unknown as typeof fetch;
}

describe('reddit adapter', () => {
  it('platform is reddit', () => {
    expect((createRedditAdapter() as any).platform).toBe('reddit');
    expect(REDDIT_PLATFORM).toBe('reddit');
  });

  it('validate fails without token', async () => {
    const a = createRedditAdapter({ subreddit: 'test' });
    const r = await a.validate();
    expect(r.ok).toBe(false);
    expect(r.reason).toMatch(/REDDIT_ACCESS_TOKEN/);
  });

  it('validate fails without subreddit', async () => {
    const a = createRedditAdapter({ accessToken: 'tok' });
    const r = await a.validate();
    expect(r.ok).toBe(false);
    expect(r.reason).toMatch(/REDDIT_SUBREDDIT/);
  });

  it('validate ok with token + subreddit', async () => {
    const a = createRedditAdapter({ accessToken: 'tok', subreddit: 'test' });
    expect((await a.validate()).ok).toBe(true);
  });

  it('publish link success returns id + url', async () => {
    let sent: any = null;
    const fetch = makeFetch((_url, init) => {
      sent = { body: init.body, headers: init.headers };
      return { ok: true, status: 200, json: async () => ({ json: { data: { id: 'abc123', name: 't3_abc123' } } }) };
    });
    const a = createRedditAdapter({ accessToken: 'tok', subreddit: 'test', fetchFn: fetch });
    const res = await a.publish({ videoUrl: 'https://example.com/v.mp4', metadata: { title: 'Mi post' } });
    expect(res.ok).toBe(true);
    expect(res.id).toBe('abc123');
    expect(res.url).toBe('https://reddit.com/abc123');
    expect(sent.body).toContain('kind=link');
    expect(sent.body).toContain('url=https%3A%2F%2Fexample.com%2Fv.mp4');
    expect(sent.headers.Authorization).toBe('Bearer tok');
  });

  it('publish self (no videoUrl) success', async () => {
    const fetch = makeFetch(() => ({ ok: true, status: 200, json: async () => ({ json: { data: { id: 'self1', name: 't3_self1' } } }) }));
    const a = createRedditAdapter({ accessToken: 'tok', subreddit: 'test', fetchFn: fetch });
    const res = await a.publish({ metadata: { title: 'T', description: 'D', tags: ['#x'] } });
    expect(res.ok).toBe(true);
  });

  it('publish fails soft on HTTP error', async () => {
    const fetch = makeFetch(() => ({ ok: false, status: 400, json: async () => ({}) }));
    const a = createRedditAdapter({ accessToken: 'tok', subreddit: 'test', fetchFn: fetch });
    const res = await a.publish({ videoUrl: 'https://x/v.mp4' });
    expect(res.ok).toBe(false);
    expect(res.error).toMatch(/HTTP 400/);
  });

  it('publish fails soft on network error', async () => {
    const fetch = makeFetch(() => { throw new Error('boom'); });
    const a = createRedditAdapter({ accessToken: 'tok', subreddit: 'test', fetchFn: fetch });
    const res = await a.publish({ videoUrl: 'https://x/v.mp4' });
    expect(res.ok).toBe(false);
    expect(res.error).toMatch(/boom/);
  });
});
