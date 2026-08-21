import { describe, it, expect } from 'vitest';
import {
  parseOpenAlex,
  searchOpenAlex,
  filterPdfUrls,
  searchPdfWeb,
  planPdfHarvest,
  indexPdfEntry,
  searchPdfs,
  runPdfsearchTool,
} from './pdfsearch';
import type { FetchLike } from './research';
import type { ReachSearchResult } from './reach';

const OA_SAMPLE = {
  results: [
    {
      id: 'https://openalex.org/W1',
      display_name: 'Flow Matching for Generative Modeling',
      publication_year: 2022,
      doi: '10.48550/arXiv.2210.02747',
      best_oa_location: { pdf_url: 'https://arxiv.org/pdf/2210.02747.pdf', landing_page_url: 'https://arxiv.org/abs/2210.02747' },
    },
    {
      id: 'https://openalex.org/W2',
      display_name: 'Denoising Diffusion Probabilistic Models',
      publication_year: 2020,
      doi: '10.48550/arXiv.2006.11239',
      best_oa_location: null,
    },
    {
      id: 'https://openalex.org/W3',
      display_name: null,
      doi: null,
      best_oa_location: null,
    },
  ],
};

describe('pdfsearch: parseOpenAlex', () => {
  it('parsa works con PDF accesible; salta sin título o sin URL', () => {
    const hits = parseOpenAlex(OA_SAMPLE);
    expect(hits).toHaveLength(2);
    expect(hits[0]).toMatchObject({
      title: 'Flow Matching for Generative Modeling',
      source: 'openalex',
      year: 2022,
      directPdf: true,
    });
    expect(hits[1].directPdf).toBe(false);
    expect(hits[1].snippet).toContain('DOI');
  });

  it('input no-array → [] (fail-soft)', () => {
    expect(parseOpenAlex({})).toEqual([]);
    expect(parseOpenAlex(null)).toEqual([]);
  });
});

describe('pdfsearch: searchOpenAlex', () => {
  it('llama a /works con search y filter, parsea y limita maxResults', async () => {
    const calls: string[] = [];
    const fetchImpl = (async (url: string) => {
      calls.push(url);
      return { ok: true, status: 200, text: async () => JSON.stringify(OA_SAMPLE) };
    }) as FetchLike;
    const r = await searchOpenAlex('flow matching', { maxResults: 2, fetchImpl });
    expect(calls[0]).toContain('api.openalex.org/works?search=flow%20matching');
    expect(calls[0]).toContain('filter=has_oa_location:true');
    expect(r.total).toBe(2);
    expect(r.hits).toHaveLength(2);
  });

  it('HTTP error → resultado vacío (fail-soft)', async () => {
    const fetchImpl = (async () => ({ ok: false, status: 500, text: async () => '' })) as FetchLike;
    const r = await searchOpenAlex('x', { fetchImpl });
    expect(r.hits).toEqual([]);
    expect(r.total).toBe(0);
  });

  it('query vacía → throw', async () => {
    await expect(searchOpenAlex('  ')).rejects.toThrow('Query is required');
  });
});

describe('pdfsearch: filterPdfUrls y searchPdfWeb', () => {
  it('filterPdfUrls: solo .pdf, dedupe, limpia query/fragmento', () => {
    const urls = [
      'https://a.com/paper.pdf',
      'https://a.com/paper.pdf?download=1',
      'https://a.com/paper.PDF#page=2',
      'https://a.com/not-pdf.html',
      'https://a.com/paper.pdf',
    ];
    expect(filterPdfUrls(urls)).toEqual(['https://a.com/paper.pdf', 'https://a.com/paper.PDF']);
  });

  it('searchPdfWeb: añade filetype:pdf y marca directPdf', async () => {
    const searchWebImpl = async (input: { query: string; maxResults?: number }) => {
      expect(input.query).toBe('diffusion filetype:pdf');
      const result: ReachSearchResult = {
        query: input.query,
        source: 'duckduckgo',
        results: [
          { title: 'Paper A', url: 'https://b.com/a.pdf', snippet: '...', source: 'duckduckgo' },
          { title: 'Paper B', url: 'https://b.com/b.html', snippet: '...', source: 'duckduckgo' },
        ],
      };
      return result;
    };
    const r = await searchPdfWeb('diffusion', { maxResults: 5, searchWebImpl });
    expect(r.hits).toHaveLength(2);
    expect(r.hits[0].directPdf).toBe(true);
    expect(r.hits[1].directPdf).toBe(false);
  });

  it('searchPdfWeb: error del impl → vacío (fail-soft)', async () => {
    const searchWebImpl = async () => {
      throw new Error('net');
    };
    const r = await searchPdfWeb('x', { searchWebImpl });
    expect(r.hits).toEqual([]);
  });
});

describe('pdfsearch: harvest → vault/pdfs', () => {
  it('planPdfHarvest: solo directPdf, dedupe por URL, nombre .pdf', () => {
    const hits = [
      { title: 'A', url: 'https://a.com/flow.pdf', source: 'openalex' as const, snippet: '', directPdf: true, year: 2022 },
      { title: 'B', url: 'https://a.com/flow.pdf', source: 'ddg' as const, snippet: '', directPdf: true },
      { title: 'C', url: 'https://a.com/landing', source: 'openalex' as const, snippet: '', directPdf: false },
    ];
    const plan = planPdfHarvest('flow', hits);
    expect(plan).toHaveLength(1);
    expect(plan[0]).toMatchObject({ name: 'flow.pdf', url: 'https://a.com/flow.pdf', query: 'flow', source: 'openalex', year: 2022 });
  });

  it('indexPdfEntry: entrada vault kind pdfs con meta url/query', () => {
    const e = indexPdfEntry({ name: 'flow.pdf', url: 'https://a.com/flow.pdf', query: 'flow', source: 'openalex', sizeBytes: 42, year: 2022 }, '2026-08-20T00:00:00.000Z');
    expect(e.kind).toBe('pdfs');
    expect(e.path).toBe('pdfs/flow.pdf');
    expect(e.source).toBe('pdf');
    expect(e.meta).toMatchObject({ url: 'https://a.com/flow.pdf', query: 'flow', year: '2022' });
  });
});

describe('pdfsearch: searchPdfs orquestado', () => {
  it('une OpenAlex + DDG, dedupe por URL, respeta maxResults', async () => {
    const fetchImpl = (async () => ({ ok: true, status: 200, text: async () => JSON.stringify(OA_SAMPLE) })) as FetchLike;
    const searchWebImpl = async () => {
      const result: ReachSearchResult = {
        query: 'flow',
        source: 'duckduckgo',
        results: [{ title: 'Dupe', url: 'https://arxiv.org/pdf/2210.02747.pdf', snippet: '', source: 'duckduckgo' }],
      };
      return result;
    };
    const r = await searchPdfs('flow', { maxResults: 10, fetchImpl, searchWebImpl });
    expect(r.total).toBe(2); // 2 OpenAlex + 1 DDG − 1 dupe
    expect(r.hits.map((h) => h.url)).toContain('https://arxiv.org/pdf/2210.02747.pdf');
  });

  it('includeWeb:false → solo OpenAlex', async () => {
    const fetchImpl = (async () => ({ ok: true, status: 200, text: async () => JSON.stringify(OA_SAMPLE) })) as FetchLike;
    const r = await searchPdfs('flow', { includeWeb: false, fetchImpl });
    expect(r.total).toBe(2);
  });
});

describe('pdfsearch: tool runPdfsearchTool', () => {
  it('accion search con deps inyectadas', async () => {
    const fetchImpl = (async () => ({ ok: true, status: 200, text: async () => JSON.stringify(OA_SAMPLE) })) as FetchLike;
    const r = await runPdfsearchTool({ accion: 'search', query: 'flow' }, { fetchImpl, searchWebImpl: async () => ({ query: '', source: 'none' as const, results: [] }) });
    expect((r as { ok: boolean }).ok).toBe(true);
    expect((r as { total: number }).total).toBeGreaterThan(0);
  });

  it('accion harvest → plan + entries', async () => {
    const hits = [{ title: 'A', url: 'https://a.com/p.pdf', source: 'openalex' as const, snippet: '', directPdf: true }];
    const r = await runPdfsearchTool({ accion: 'harvest', query: 'flow', hitsJson: JSON.stringify(hits) });
    expect((r as { ok: boolean }).ok).toBe(true);
    expect((r as { entries: unknown[] }).entries).toHaveLength(1);
  });
});