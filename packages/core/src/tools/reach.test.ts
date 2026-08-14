import { afterEach, describe, expect, it, vi } from 'vitest';
import { parseRss, readWeb, searchGitHub, searchWeb, videoInfo } from './reach';

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
  delete process.env.EXA_API_KEY;
  delete process.env.GITHUB_TOKEN;
});

function res(ok: boolean, status: number, body: string | object) {
  const text = typeof body === 'string' ? body : JSON.stringify(body);
  return { ok, status, text: vi.fn().mockResolvedValue(text), json: vi.fn().mockResolvedValue(body) };
}

describe('readWeb', () => {
  it('rejects invalid URLs', async () => {
    await expect(readWeb({ url: 'not-a-url' })).rejects.toThrow(/http/i);
  });

  it('reads via Jina Reader and strips the header block', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        res(true, 200, `Title: Example\nDescription: A page\n# Hello\n\nSome body text.\n${'filler '.repeat(60)}`),
      ),
    );
    const out = await readWeb({ url: 'https://example.com' });
    expect(out.provider).toBe('jina-reader');
    expect(out.title).toBe('Example');
    expect(out.description).toBe('A page');
    expect(out.text).toContain('Some body text');
    expect(out.text).not.toContain('Title:');
    expect(out.text.length).toBeLessThanOrEqual(12_000);
  });

  it('falls back to direct fetch when Jina returns a tiny/empty body', async () => {
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValueOnce(res(true, 200, 'ok'))
        .mockResolvedValueOnce(
          res(true, 200, '<html><head><title>Direct</title></head><body><p>Hello <b>world</b></p></body></html>'),
        ),
    );
    const out = await readWeb({ url: 'https://example.com' });
    expect(out.provider).toBe('direct');
    expect(out.title).toBe('Direct');
    expect(out.text).toContain('Hello world');
  });

  it('falls back to direct fetch when Jina throws', async () => {
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockRejectedValueOnce(new Error('network down'))
        .mockResolvedValueOnce(res(true, 200, '<title>Fallback</title><p>content</p>')),
    );
    const out = await readWeb({ url: 'https://example.com' });
    expect(out.provider).toBe('direct');
    expect(out.title).toBe('Fallback');
  });

  it('respects maxLength truncation', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(res(true, 200, 'Title: X\n' + 'y'.repeat(500))),
    );
    const out = await readWeb({ url: 'https://example.com', maxLength: 100 });
    expect(out.text.length).toBeLessThanOrEqual(101);
    expect(out.text.endsWith('…')).toBe(true);
  });
});

describe('searchWeb', () => {
  it('returns no results without EXA_API_KEY when DDG has none', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(res(true, 200, { AbstractText: '', RelatedTopics: [] })),
    );
    const out = await searchWeb({ query: 'nothing here' });
    expect(out.source).toBe('none');
    expect(out.results).toEqual([]);
  });

  it('parses DuckDuckGo abstract + related topics', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        res(true, 200, {
          AbstractText: 'Peru is a country.',
          AbstractURL: 'https://en.wikipedia.org/wiki/Peru',
          Heading: 'Peru',
          RelatedTopics: [
            { Text: 'Lima - capital', FirstURL: 'https://en.wikipedia.org/wiki/Lima' },
            {
              Topics: [
                { Text: 'Cusco - city', FirstURL: 'https://en.wikipedia.org/wiki/Cusco' },
                { Text: 'Machu Picchu - site', FirstURL: 'https://en.wikipedia.org/wiki/Machu_Picchu' },
              ],
            },
          ],
        }),
      ),
    );
    const out = await searchWeb({ query: 'peru', maxResults: 3 });
    expect(out.source).toBe('duckduckgo');
    expect(out.results[0].title).toBe('Peru');
    expect(out.results[0].url).toBe('https://en.wikipedia.org/wiki/Peru');
    expect(out.results.length).toBe(3);
  });

  it('prefers Exa when EXA_API_KEY is set and it responds', async () => {
    process.env.EXA_API_KEY = 'exa_test';
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        res(true, 200, {
          results: [{ title: 'T', url: 'https://exa.ai', text: '  snippet  text ' }],
        }),
      ),
    );
    const out = await searchWeb({ query: 'q' });
    expect(out.source).toBe('exa');
    expect(out.results[0].snippet).toBe('snippet text');
    const call = (fetch as unknown as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(call[0]).toBe('https://api.exa.ai/search');
    expect(call[1].headers['x-api-key']).toBe('exa_test');
  });

  it('falls back to DuckDuckGo when Exa fails', async () => {
    process.env.EXA_API_KEY = 'exa_test';
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValueOnce(res(false, 500, 'boom'))
        .mockResolvedValueOnce(
          res(true, 200, { AbstractText: 'ok', AbstractURL: 'https://ok.com', Heading: 'OK' }),
        ),
    );
    const out = await searchWeb({ query: 'q' });
    expect(out.source).toBe('duckduckgo');
    expect(out.results).toHaveLength(1);
  });

  it('requires a query', async () => {
    await expect(searchWeb({ query: '   ' })).rejects.toThrow(/query/i);
  });
});

describe('searchGitHub', () => {
  it('maps repository results', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        res(true, 200, {
          items: [
            {
              name: 'next.js',
              full_name: 'vercel/next.js',
              html_url: 'https://github.com/vercel/next.js',
              description: 'The React framework',
              stargazers_count: 120000,
              language: 'TypeScript',
              updated_at: '2026-01-01T00:00:00Z',
            },
          ],
        }),
      ),
    );
    const out = await searchGitHub({ query: 'next.js' });
    expect(out.items).toHaveLength(1);
    expect(out.items[0].stars).toBe(120000);
    expect(out.items[0].language).toBe('TypeScript');
  });

  it('throws on non-ok responses', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(res(false, 403, 'rate limited')));
    await expect(searchGitHub({ query: 'x' })).rejects.toThrow(/403/);
  });
});

describe('parseRss', () => {
  it('parses an RSS 2.0 feed', async () => {
    const xml =
      '<?xml version="1.0"?><rss version="2.0"><channel><title>My Feed</title>' +
      '<item><title>First</title><link>https://a.com/1</link><description><![CDATA[<p>desc</p>]]></description><pubDate>Mon, 01 Jan 2026 00:00:00 GMT</pubDate></item>' +
      '<item><title>Second</title><link>https://a.com/2</link></item>' +
      '</channel></rss>';
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(res(true, 200, xml)));
    const out = await parseRss({ url: 'https://a.com/feed.xml' });
    expect(out.feedTitle).toBe('My Feed');
    expect(out.items).toHaveLength(2);
    expect(out.items[0].title).toBe('First');
    expect(out.items[0].link).toBe('https://a.com/1');
    expect(out.items[0].description).toBe('desc');
    expect(out.items[0].pubDate).toContain('2026');
  });

  it('parses an Atom feed with href links', async () => {
    const xml =
      '<?xml version="1.0"?><feed xmlns="http://www.w3.org/2005/Atom"><title>Atom Feed</title>' +
      '<entry><title>Post</title><link href="https://b.com/post"/><published>2026-02-02T00:00:00Z</published></entry>' +
      '</feed>';
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(res(true, 200, xml)));
    const out = await parseRss({ url: 'https://b.com/atom.xml' });
    expect(out.feedTitle).toBe('Atom Feed');
    expect(out.items[0].link).toBe('https://b.com/post');
    expect(out.items[0].pubDate).toContain('2026');
  });

  it('rejects invalid URLs', async () => {
    await expect(parseRss({ url: 'ftp://x' })).rejects.toThrow(/http/i);
  });
});

describe('videoInfo', () => {
  it('returns oEmbed metadata', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        res(true, 200, { title: 'Video', author_name: 'Author', thumbnail_url: 'https://i.ytimg.com/t.jpg' }),
      ),
    );
    const out = await videoInfo({ url: 'https://www.youtube.com/watch?v=abc' });
    expect(out.title).toBe('Video');
    expect(out.author).toBe('Author');
    expect(out.thumbnailUrl).toBe('https://i.ytimg.com/t.jpg');
  });

  it('handles missing metadata fields', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(res(true, 200, {})));
    const out = await videoInfo({ url: 'https://vimeo.com/123' });
    expect(out.title).toBeNull();
  });
});
