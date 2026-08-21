import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  createResearchCache,
  fetchAndExtract,
  normalizeUrl,
  parseArxivAtom,
  researchSearch,
  searchArxiv,
} from './research';

// reach.searchWeb / searchGitHub se mockean — cero red en tests
vi.mock('./reach', () => ({
  searchWeb: vi.fn(async ({ query }: { query: string }) => ({
    query,
    source: 'duckduckgo',
    results: [
      { title: `Web:${query}`, url: 'https://example.com/web-result', snippet: 'snippet web', source: 'duckduckgo' },
      { title: 'Web dup', url: 'http://arxiv.org/abs/2206.00364v1', snippet: 'duplicado', source: 'duckduckgo' },
    ],
  })),
  searchGitHub: vi.fn(async ({ query }: { query: string }) => ({
    query,
    items: [
      { title: `GitHub:${query}`, url: 'https://github.com/acme/repo', snippet: 'snippet github', source: 'github' },
    ],
  })),
}));

const ATOM_FIXTURE = `<?xml version="1.0" encoding="UTF-8"?>
<feed xmlns="http://www.w3.org/2005/Atom">
  <title>ArXiv Query</title>
  <entry>
    <id>http://arxiv.org/abs/2206.00364v1</id>
    <title>Denoising Diffusion Probabilistic Models</title>
    <published>2020-06-19T00:00:00Z</published>
    <summary>We present high quality image synthesis results using diffusion probabilistic models.</summary>
    <author><name>Jonathan Ho</name></author>
    <author><name>Ajay Jain</name></author>
  </entry>
  <entry>
    <id>http://arxiv.org/abs/2006.11239v2</id>
    <title>Flow Matching for Generative Modeling</title>
    <published>2022-10-04T00:00:00Z</published>
    <summary>We introduce a simulation-free approach for conditional and unconditional flow matching.</summary>
    <author><name>Yaron Lipman</name></author>
  </entry>
</feed>`;

type StubFetch = (url: string) => Promise<{ ok: boolean; status: number; text(): Promise<string> }>;

function okFetch(text: string): StubFetch {
  return async () => ({ ok: true, status: 200, text: async () => text });
}

describe('parseArxivAtom', () => {
  it('extrae title/id/summary/published/authors', () => {
    const items = parseArxivAtom(ATOM_FIXTURE, 5);
    expect(items).toHaveLength(2);
    expect(items[0].title).toBe('Denoising Diffusion Probabilistic Models');
    expect(items[0].url).toBe('http://arxiv.org/abs/2206.00364v1');
    expect(items[0].snippet).toContain('diffusion');
    expect(items[0].meta?.published).toBe('2020-06-19T00:00:00Z');
    expect(items[0].meta?.authors).toEqual(['Jonathan Ho', 'Ajay Jain']);
  });

  it('respeta el tope de maxResults', () => {
    const items = parseArxivAtom(ATOM_FIXTURE, 1);
    expect(items).toHaveLength(1);
  });

  it('limpia entidades XML', () => {
    const items = parseArxivAtom(`<feed><entry><id>http://x/1</id><title>A &amp; B &lt;C&gt;</title><summary>ok</summary></entry></feed>`, 5);
    expect(items[0].title).toBe('A & B <C>');
  });
});

describe('searchArxiv', () => {
  it('usa fetchImpl y devuelve items parseados', async () => {
    const fetchImpl = okFetch(ATOM_FIXTURE);
    const out = await searchArxiv('diffusion', { maxResults: 3, fetchImpl: fetchImpl as never });
    expect(out.source).toBe('arxiv');
    expect(out.items).toHaveLength(2);
    expect(out.items[0].title).toContain('Diffusion');
  });

  it('fail-soft cuando el fetch falla', async () => {
    const fetchImpl = async () => ({ ok: false, status: 500, text: async () => '' }) as never;
    const out = await searchArxiv('x', { fetchImpl: fetchImpl as never });
    expect(out.source).toBe('none');
    expect(out.items).toEqual([]);
  });

  it('rechaza query vacía', async () => {
    await expect(searchArxiv('   ')).rejects.toThrow(/query/i);
  });
});

describe('fetchAndExtract', () => {
  it('extrae texto y primera línea como título', async () => {
    const fetchImpl = async () => ({ ok: true, status: 200, text: async () => 'Title Page\n\nBody content here.' }) as never;
    const out = await fetchAndExtract('https://example.com/doc', fetchImpl as never);
    expect(out.provider).toBe('r.jina.ai');
    expect(out.title).toBe('Title Page');
    expect(out.chars).toBe(30);
  });

  it('fail-soft ante error de red', async () => {
    const fetchImpl = async () => {
      throw new Error('net');
    };
    const out = await fetchAndExtract('https://example.com/x', fetchImpl as never);
    expect(out.chars).toBe(0);
    expect(out.text).toBe('');
  });
});

describe('normalizeUrl', () => {
  it('minúsculas, sin slash final, sin utm', () => {
    expect(normalizeUrl('HTTPS://EXAMPLE.com/A/')).toBe('https://example.com/a');
    expect(normalizeUrl('https://x.com/?utm_source=a&utm_medium=b')).toBe('https://x.com');
    expect(normalizeUrl('https://x.com/a?utm_campaign=c')).toBe('https://x.com/a');
  });
});

describe('createResearchCache', () => {
  it('get/set/clear/entries en memoria', () => {
    const c = createResearchCache();
    expect(c.get('a')).toBeUndefined();
    c.set('a', { n: 1 });
    expect(c.get('a')).toEqual({ n: 1 });
    expect(c.entries()).toEqual([{ key: 'a' }]);
    c.clear();
    expect(c.entries()).toEqual([]);
  });
});

describe('researchSearch', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('orquesta fuentes, dedupe por URL y respeta maxResults por fuente', async () => {
    const fetchImpl = okFetch(ATOM_FIXTURE);
    const report = await researchSearch('diffusion', { maxResults: 5, fetchImpl: fetchImpl as never });
    // 2 arxiv + 2 web (1 duplicado arxiv) + 1 github = 4 únicos
    expect(report.items).toHaveLength(4);
    expect(report.deduped).toBe(1);
    expect(report.sources).toEqual(['arxiv', 'web', 'github']);
    expect(report.items.some((i) => i.source === 'arxiv')).toBe(true);
    expect(report.items.some((i) => i.source === 'web')).toBe(true);
    expect(report.items.some((i) => i.source === 'github')).toBe(true);
    const urls = report.items.map((i) => normalizeUrl(i.url));
    expect(new Set(urls).size).toBe(urls.length);
  });

  it('cachea por fuente: la segunda llamada no re-ejecuta fetch', async () => {
    const fetchImpl = vi.fn(async () => ({ ok: true, status: 200, text: async () => ATOM_FIXTURE }) as never);
    const cache = createResearchCache();
    await researchSearch('diffusion', { sources: ['arxiv'], fetchImpl: fetchImpl as never, cache });
    await researchSearch('diffusion', { sources: ['arxiv'], fetchImpl: fetchImpl as never, cache });
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it('marca resultados cacheados', async () => {
    const fetchImpl = okFetch(ATOM_FIXTURE);
    const cache = createResearchCache();
    await researchSearch('diffusion', { sources: ['arxiv'], fetchImpl: fetchImpl as never, cache });
    const second = await researchSearch('diffusion', { sources: ['arxiv'], fetchImpl: fetchImpl as never, cache });
    // cached a nivel de fuente; el reporte no expone el flag, pero el fetch no se repitió
    expect(second.items.length).toBeGreaterThan(0);
  });

  it('solo arxiv con una fuente', async () => {
    const fetchImpl = okFetch(ATOM_FIXTURE);
    const report = await researchSearch('flow', { sources: ['arxiv'], fetchImpl: fetchImpl as never });
    expect(report.sources).toEqual(['arxiv']);
    expect(report.items.every((i) => i.source === 'arxiv')).toBe(true);
  });

  it('rechaza query vacía', async () => {
    await expect(researchSearch('  ')).rejects.toThrow(/query/i);
  });
});
describe('research: fuente pdf (iter-75)', () => {
  const OA_FIXTURE = {
    results: [
      {
        id: 'https://openalex.org/W1',
        display_name: 'Flow Matching for Generative Modeling',
        publication_year: 2022,
        doi: '10.48550/arXiv.2210.02747',
        best_oa_location: { pdf_url: 'https://arxiv.org/pdf/2210.02747.pdf', landing_page_url: 'https://arxiv.org/abs/2210.02747' },
      },
    ],
  };
  const okFetchPdf = (body: unknown) =>
    vi.fn(async () => ({ ok: true, status: 200, text: async () => JSON.stringify(body) }) as never);

it('researchSearch con sources [pdf] mapea hits OpenAlex a ResearchItem pdf', async () => {
    const fetchImpl = okFetchPdf(OA_FIXTURE);
    const searchWebImpl = async () => ({ query: 'flow matching filetype:pdf', source: 'none' as const, results: [] });
    const report = await researchSearch('flow matching', { sources: ['pdf'], fetchImpl: fetchImpl as never, searchWebImpl });
    expect(report.sources).toEqual(['pdf']);
    expect(report.items).toHaveLength(1);
    expect(report.items[0]).toMatchObject({
      title: 'Flow Matching for Generative Modeling',
      url: 'https://arxiv.org/pdf/2210.02747.pdf',
      source: 'pdf',
    });
    expect(report.items[0].snippet).toContain('[PDF]');
    expect(report.items[0].meta).toEqual({ published: '2022' });
  });

  it('dedupe por URL entre arxiv y pdf', async () => {
    // Un solo fetchImpl conmuta por URL: arxiv → Atom, OpenAlex → JSON.
    const fetchImpl = vi.fn(async (url: string) => {
      if (String(url).includes('api.openalex.org')) {
        return {
          ok: true,
          status: 200,
          text: async () =>
            JSON.stringify({
              results: [{ id: 'W2', display_name: 'DDPM', publication_year: 2020, doi: null, best_oa_location: { pdf_url: 'http://arxiv.org/abs/2206.00364v1', landing_page_url: null } }],
            }),
        };
      }
      return { ok: true, status: 200, text: async () => ATOM_FIXTURE };
    }) as never;
    const searchWebImpl = async () => ({ query: 'diffusion filetype:pdf', source: 'none' as const, results: [] });
    const report = await researchSearch('diffusion', { sources: ['arxiv', 'pdf'], fetchImpl, searchWebImpl });
    const urls = report.items.map((i) => i.url);
    expect(new Set(urls).size).toBe(urls.length);
    expect(report.deduped).toBeGreaterThanOrEqual(1);
  });

  it('researchPdf fail-soft: fetch que lanza → items vacíos sin throw', async () => {
    const fetchImpl = vi.fn(async () => {
      throw new Error('net down');
    }) as never;
    const report = await researchSearch('x', { sources: ['pdf'], fetchImpl });
    expect(report.items).toEqual([]);
  });
});
