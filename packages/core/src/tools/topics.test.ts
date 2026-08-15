import { afterEach, describe, expect, it, vi } from 'vitest';
import { dedupeItems, generateTopicBriefs, normalizeTitle, noveltyScore, scoreBrief } from './topics';

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

function res(ok: boolean, status: number, body: string | object) {
  const text = typeof body === 'string' ? body : JSON.stringify(body);
  return { ok, status, text: vi.fn().mockResolvedValue(text), json: vi.fn().mockResolvedValue(body) };
}

const RSS_XML = `<?xml version="1.0"?>
<rss version="2.0"><channel>
  <title>Test Feed</title>
  <item><title>Como usar IA generativa para video</title><link>https://a.com/1</link>
    <description>Guia paso a paso con ejemplos</description><pubDate>Wed, 14 Aug 2026 10:00:00 GMT</pubDate></item>
  <item><title>Nueva herramienta de diseno lanzada</title><link>https://a.com/2</link>
    <description>Anuncio oficial del equipo</description><pubDate>Mon, 10 Aug 2026 10:00:00 GMT</pubDate></item>
  <item><title>Duplicado: Como usar IA generativa para video.</title><link>https://a.com/3</link>
    <description>Otro sitio con el mismo tutorial</description><pubDate>Tue, 12 Aug 2026 10:00:00 GMT</pubDate></item>
</channel></rss>`;

const DDG_JSON = {
  AbstractText: 'Tendencias de IA generativa en 2026: modelos de video y audio.',
  AbstractURL: 'https://ddg.example/ai-trends',
  Heading: 'IA generativa 2026',
  RelatedTopics: [],
};

describe('normalizeTitle', () => {
  it('lowercases and strips punctuation, collapsing whitespace', () => {
    expect(normalizeTitle('  COMO USAR IA!! (2026) — guía  ')).toBe('como usar ia 2026 guía');
  });

  it('keeps unicode letters (español/árabe), strips only punctuation', () => {
    expect(normalizeTitle('Guía de diseño: estética 2026!')).toBe('guía de diseño estética 2026');
    expect(normalizeTitle('ذكاء اصطناعي — 2026')).toBe('ذكاء اصطناعي 2026');
  });
});

describe('dedupeItems', () => {
  it('dedupes near-identical titles (bigram Jaccard > 0.6)', () => {
    const items = [
      { title: 'Como usar IA generativa para video' },
      { title: 'Como usar IA generativa para video.' },
      { title: 'Receta de pan casero' },
    ];
    const out = dedupeItems(items);
    expect(out).toHaveLength(2);
    expect(out[0].title).toBe('Como usar IA generativa para video');
    expect(out[1].title).toBe('Receta de pan casero');
  });

  it('skips empty titles', () => {
    expect(dedupeItems([{ title: '' }, { title: '   ' }, { title: 'Real' }])).toHaveLength(1);
  });
});

describe('noveltyScore', () => {
  const now = Date.parse('2026-08-15T00:00:00Z');

  it('returns 1 for items younger than 7 days', () => {
    expect(noveltyScore(new Date(now - 86_400_000 * 3).toISOString(), now)).toBe(1);
  });

  it('returns 0 for items older than 30 days', () => {
    expect(noveltyScore(new Date(now - 86_400_000 * 40).toISOString(), now)).toBe(0);
  });

  it('returns 0.5 when no pubDate', () => {
    expect(noveltyScore(null, now)).toBe(0.5);
  });

  it('interpolates between 7 and 30 days', () => {
    const s = noveltyScore(new Date(now - 86_400_000 * 18.5).toISOString(), now);
    expect(s).toBeGreaterThan(0);
    expect(s).toBeLessThan(1);
  });
});

describe('scoreBrief', () => {
  const now = Date.parse('2026-08-15T00:00:00Z');

  it('bonuses channel keyword matches (youtube tutorial)', () => {
    const brief = { pubDate: new Date(now - 86_400_000).toISOString(), tema: 'Como grabar video: 5 tips rapidos' };
    expect(scoreBrief(brief, 'youtube_shorts', now)).toBe(1);
  });

  it('scores lower without channel keywords', () => {
    const brief = { pubDate: new Date(now - 86_400_000).toISOString(), tema: 'El clima en Lima hoy' };
    expect(scoreBrief(brief, 'youtube_shorts', now)).toBe(0.5);
  });

  it('penalizes old items', () => {
    const brief = { pubDate: new Date(now - 86_400_000 * 40).toISOString(), tema: 'Como grabar video: 5 tips rapidos' };
    expect(scoreBrief(brief, 'youtube_shorts', now)).toBe(0);
  });
});

describe('generateTopicBriefs', () => {
  it('collects RSS + search, dedupes, scores and produces briefs per channel', async () => {
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValueOnce(res(true, 200, RSS_XML)) // feed RSS
        .mockResolvedValueOnce(res(true, 200, DDG_JSON)), // búsqueda DDG
    );
    const out = await generateTopicBriefs({
      fuentes: [{ rss: 'https://a.com/feed.xml' }, { search: 'IA generativa' }],
      canales: ['youtube_shorts', 'blog'],
      maxBriefs: 20,
    });
    // 3 RSS items (1 duplicado eliminado → 2 únicos) + 1 DDG = 3 únicos × 2 canales = 6 briefs
    expect(out.rawCount).toBe(4);
    expect(out.uniqueCount).toBe(3);
    expect(out.fuentesActivas).toContain('https://a.com/feed.xml');
    expect(out.fuentesActivas).toContain('search:IA generativa');
    expect(out.briefs).toHaveLength(6);
    // El brief de tutorial de YT debe puntuar más que el de blog
    const ytTutorial = out.briefs.find((b) => b.canal === 'youtube_shorts' && b.tema.includes('Como usar IA'));
    expect(ytTutorial).toBeTruthy();
    expect(ytTutorial!.formato).toBe('9:16 video');
    expect(ytTutorial!.tono).toBe('educativo');
    expect(ytTutorial!.score).toBe(1);
    const blogTutorial = out.briefs.find((b) => b.canal === 'blog' && b.tema.includes('Como usar IA'));
    expect(blogTutorial!.formato).toBe('16:9 articulo');
    expect(blogTutorial!.score).toBeLessThan(ytTutorial!.score);
  });

  it('respects maxBriefs (sorting by score desc)', async () => {
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValueOnce(res(true, 200, RSS_XML))
        .mockResolvedValueOnce(res(true, 200, DDG_JSON)),
    );
    const out = await generateTopicBriefs({
      fuentes: [{ rss: 'https://a.com/feed.xml' }, { search: 'IA generativa' }],
      canales: ['youtube_shorts'],
      maxBriefs: 2,
    });
    expect(out.briefs).toHaveLength(2);
    // ordenados por score desc
    const scores = out.briefs.map((b) => b.score);
    expect(scores[0]).toBeGreaterThanOrEqual(scores[1]);
  });

  it('degrades gracefully when all sources fail', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('network down')));
    const out = await generateTopicBriefs({ fuentes: [{ rss: 'https://a.com/x.xml' }, { search: 'x' }] });
    expect(out.rawCount).toBe(0);
    expect(out.uniqueCount).toBe(0);
    expect(out.briefs).toHaveLength(0);
    expect(out.fuentesActivas).toHaveLength(0);
  });
});