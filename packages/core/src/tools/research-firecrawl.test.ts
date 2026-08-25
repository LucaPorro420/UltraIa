import { describe, expect, it } from 'vitest';
import { parseFirecrawlResponse, researchFirecrawl, type FetchLike } from './research';

const OK_JSON = {
  success: true,
  data: [
    { title: 'UltraIa repo', url: 'https://github.com/x/ultraia', description: 'AI product monorepo' },
    { title: 'Docs', url: 'https://docs.example.com', description: 'guía' },
    { url: '' }, // filtrado: sin URL
    { description: 'sin url tampoco' },
  ],
};

function okFetch(json: unknown): FetchLike {
  return async (_url: string, _init?: RequestInit) => ({
    ok: true,
    status: 200,
    text: async () => '',
    json: async () => json,
  });
}

describe('parseFirecrawlResponse', () => {
  it('mapea docs a ResearchItem con source firecrawl y filtra sin-url', () => {
    const items = parseFirecrawlResponse(OK_JSON, 10);
    expect(items.length).toBe(2);
    expect(items[0]).toMatchObject({ title: 'UltraIa repo', source: 'firecrawl' });
    expect(items[1].url).toBe('https://docs.example.com');
  });
  it('respeta maxResults y acota snippet/title', () => {
    const items = parseFirecrawlResponse(OK_JSON, 1);
    expect(items.length).toBe(1);
    expect(items[0].title.length).toBeLessThanOrEqual(200);
  });
  it('payload inválido → vacío (sin lanzar)', () => {
    expect(parseFirecrawlResponse(null, 5)).toEqual([]);
    expect(parseFirecrawlResponse({}, 5)).toEqual([]);
    expect(parseFirecrawlResponse({ data: 'no-array' }, 5)).toEqual([]);
  });
});

describe('researchFirecrawl', () => {
  it('sin API key → fail-soft source none', async () => {
    const prev = process.env.FIRECRAWL_API_KEY;
    process.env.FIRECRAWL_API_KEY = '';
    try {
      const r = await researchFirecrawl('q');
      expect(r.source).toBe('none');
      expect(r.items).toEqual([]);
    } finally {
      if (prev === undefined) delete process.env.FIRECRAWL_API_KEY;
      else process.env.FIRECRAWL_API_KEY = prev;
    }
  });
  it('con key inyectada → items mapeados y source firecrawl', async () => {
    let calledUrl = '';
    let calledAuth = '';
    const inner = okFetch(OK_JSON);
    const f: FetchLike = async (url, init) => {
      calledUrl = String(url);
      calledAuth = String(((init?.headers ?? {}) as Record<string, string>).authorization ?? '');
      return inner(url, init);
    };
    const r = await researchFirecrawl('ultraia', { apiKey: 'fc-test', fetchImpl: f });
    expect(r.source).toBe('firecrawl');
    expect(r.items.length).toBe(2);
    expect(calledUrl).toContain('/v1/search');
    expect(calledAuth).toBe('Bearer fc-test');
  });
  it('HTTP error o fetch que lanza → none fail-soft', async () => {
    const bad: FetchLike = async () => ({ ok: false, status: 500, text: async () => '', json: async () => ({}) });
    expect((await researchFirecrawl('q', { apiKey: 'k', fetchImpl: bad })).source).toBe('none');
    const boom: FetchLike = async () => {
      throw new Error('network');
    };
    expect((await researchFirecrawl('q', { apiKey: 'k', fetchImpl: boom })).source).toBe('none');
  });
});
