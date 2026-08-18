/**
 * AgentReach — real-time internet access layer for UltraIa agents.
 * TS port of the Agent-Reach capability layer (https://github.com/Panniantong/Agent-Reach).
 *
 * Capabilities:
 *  - readWeb: read any public URL as clean text (Jina Reader, keyless)
 *  - search: real-time web search (DuckDuckGo Instant Answer keyless; Exa when EXA_API_KEY set)
 *  - searchGitHub: public GitHub search API (keyless, rate-limited)
 *  - parseRss: fetch + parse any RSS/Atom feed
 *  - videoInfo: YouTube metadata via oEmbed (keyless)
 */

import { XMLParser } from 'fast-xml-parser';

export interface ReachReadInput {
  url: string;
  /** Max chars of returned text (default 12000). */
  maxLength?: number;
}

export interface ReachReadResult {
  url: string;
  title: string | null;
  description: string | null;
  text: string;
  provider: 'jina-reader' | 'direct';
}

export interface ReachSearchInput {
  query: string;
  maxResults?: number;
}

export interface ReachSearchResultItem {
  title: string;
  url: string;
  snippet: string;
  source: 'duckduckgo' | 'exa';
}

export interface ReachSearchResult {
  query: string;
  results: ReachSearchResultItem[];
  source: 'duckduckgo' | 'exa' | 'none';
}

export interface ReachGithubInput {
  query: string;
  maxResults?: number;
}

export interface ReachGithubResultItem {
  name: string;
  fullName: string;
  url: string;
  description: string | null;
  stars: number;
  language: string | null;
  updatedAt: string;
}

export interface ReachGithubResult {
  query: string;
  items: ReachGithubResultItem[];
}

export interface ReachRssInput {
  url: string;
  maxItems?: number;
}

export interface ReachRssItem {
  title: string;
  link: string;
  description: string;
  pubDate: string | null;
}

export interface ReachRssResult {
  url: string;
  feedTitle: string | null;
  items: ReachRssItem[];
}

export interface ReachVideoInfoInput {
  url: string;
}

export interface ReachVideoInfoResult {
  title: string | null;
  author: string | null;
  thumbnailUrl: string | null;
  url: string;
}

const READ_TIMEOUT_MS = 20_000;
const SEARCH_TIMEOUT_MS = 12_000;

/** In-memory cache for readWeb results (key: url + maxLength). TTL default 5 min. */
const READ_CACHE = new Map<string, { value: ReachReadResult; expires: number }>();
const DEFAULT_CACHE_TTL_MS = 5 * 60 * 1000;

function cacheKey(url: string, maxLength: number): string {
  return `${url}::${maxLength}`;
}

function cacheGet(key: string): ReachReadResult | null {
  const entry = READ_CACHE.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expires) {
    READ_CACHE.delete(key);
    return null;
  }
  return entry.value;
}

function cacheSet(key: string, value: ReachReadResult, ttlMs = DEFAULT_CACHE_TTL_MS): void {
  READ_CACHE.set(key, { value, expires: Date.now() + ttlMs });
}

export function clearReadCache(): void {
  READ_CACHE.clear();
}

function withTimeout<T>(p: Promise<T>, ms: number, label: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error(`${label} timed out after ${ms / 1000}s`)), ms);
    p.then((v) => {
      clearTimeout(t);
      resolve(v);
    }).catch((e) => {
      clearTimeout(t);
      reject(e);
    });
  });
}

function truncate(s: string, max: number): string {
  return s.length <= max ? s : `${s.slice(0, max)}…`;
}

/** Read any public web page as clean markdown-ish text. Jina Reader is keyless; falls back to direct fetch+extract. */
export async function readWeb(input: ReachReadInput): Promise<ReachReadResult> {
  const url = input.url.trim();
  if (!/^https?:\/\//i.test(url)) throw new Error('Invalid URL — must start with http(s)://');
  const maxLength = input.maxLength ?? 12_000;

  // Check cache first
  const key = cacheKey(url, maxLength);
  const cached = cacheGet(key);
  if (cached) return { ...cached, provider: `${cached.provider} (cached)` };

  try {
    const res = await withTimeout(
      fetch(`https://r.jina.ai/${url}`, {
        headers: { 'x-respond-with': 'markdown', 'user-agent': 'UltraIaBot/1.0' },
        redirect: 'follow',
      }),
      READ_TIMEOUT_MS,
      'Jina Reader',
    );
    if (res.ok) {
      const text = await res.text();
      if (text.length > 200) {
        const title = text.split('\n').find((l) => l.startsWith('Title: '))?.slice(7) || null;
        const description = text.split('\n').find((l) => l.startsWith('Description: '))?.slice(13) || null;
        const body = text
          .split('\n')
          .filter((l) => !l.startsWith('Title: ') && !l.startsWith('Description: '))
          .join('\n')
          .trim();
        const result = { url, title, description, text: truncate(body, maxLength), provider: 'jina-reader' };
        cacheSet(key, result);
        return result;
      }
    }
  } catch {
    // fall through to direct fetch
  }

  const res = await withTimeout(fetch(url, { headers: { 'user-agent': 'UltraIaBot/1.0' }, redirect: 'follow' }), READ_TIMEOUT_MS, 'fetch');
  if (!res.ok) throw new Error(`Failed to read ${url}: HTTP ${res.status}`);
  const html = await res.text();
  const text = html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/\s+/g, ' ')
    .trim();
  const titleMatch = html.match(/<title[^>]*>([^<]*)<\/title>/i);
  const result = {
    url,
    title: titleMatch ? titleMatch[1].trim() : null,
    description: null,
    text: truncate(text, maxLength),
    provider: 'direct',
  };
  cacheSet(key, result);
  return result;
}

/** Real-time web search. DuckDuckGo Instant Answer (keyless); Exa when EXA_API_KEY is set. */
export async function searchWeb(input: ReachSearchInput): Promise<ReachSearchResult> {
  const query = input.query.trim();
  if (!query) throw new Error('Query is required');
  const maxResults = input.maxResults ?? 6;

  if (process.env.EXA_API_KEY) {
    try {
      const res = await withTimeout(
        fetch('https://api.exa.ai/search', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'x-api-key': process.env.EXA_API_KEY },
          body: JSON.stringify({ query, numResults: maxResults, type: 'auto' }),
        }),
        SEARCH_TIMEOUT_MS,
        'Exa search',
      );
      if (res.ok) {
        const data = (await res.json()) as { results?: { title?: string; url?: string; text?: string }[] };
        return {
          query,
          source: 'exa',
          results: (data.results || []).slice(0, maxResults).map((r) => ({
            title: r.title || r.url || '',
            url: r.url || '',
            snippet: truncate((r.text || '').replace(/\s+/g, ' ').trim(), 300),
            source: 'exa' as const,
          })),
        };
      }
    } catch {
      // fall back to DuckDuckGo
    }
  }

  try {
    const res = await withTimeout(
      fetch(`https://api.duckduckgo.com/?q=${encodeURIComponent(query)}&format=json&no_html=1&skip_disambig=1`, {
        headers: { 'user-agent': 'UltraIaBot/1.0' },
      }),
      SEARCH_TIMEOUT_MS,
      'DuckDuckGo',
    );
    if (res.ok) {
      const data = (await res.json()) as {
        AbstractText?: string;
        AbstractURL?: string;
        Heading?: string;
        RelatedTopics?: unknown[];
      };
      const items: ReachSearchResultItem[] = [];
      if (data.AbstractText && data.AbstractURL) {
        items.push({
          title: data.Heading || data.AbstractURL,
          url: data.AbstractURL,
          snippet: truncate(data.AbstractText, 300),
          source: 'duckduckgo',
        });
      }
      const topics = Array.isArray(data.RelatedTopics) ? data.RelatedTopics : [];
      for (const t of topics) {
        if (items.length >= maxResults) break;
        const topic = t as { Text?: string; FirstURL?: string; Topics?: unknown[] };
        if (topic.Topics) {
          for (const sub of topic.Topics) {
            if (items.length >= maxResults) break;
            const s = sub as { Text?: string; FirstURL?: string };
            if (s.Text && s.FirstURL) {
              items.push({ title: s.Text.split(' - ')[0], url: s.FirstURL, snippet: truncate(s.Text, 300), source: 'duckduckgo' });
            }
          }
        } else if (topic.Text && topic.FirstURL) {
          items.push({ title: topic.Text.split(' - ')[0], url: topic.FirstURL, snippet: truncate(topic.Text, 300), source: 'duckduckgo' });
        }
      }
      if (items.length) return { query, source: 'duckduckgo', results: items };
    }
  } catch {
    // no results path below
  }
  return { query, source: 'none', results: [] };
}

/** Search public GitHub repositories (keyless, unauth rate limit ~10/min). */
export async function searchGitHub(input: ReachGithubInput): Promise<ReachGithubResult> {
  const query = input.query.trim();
  if (!query) throw new Error('Query is required');
  const maxResults = input.maxResults ?? 5;
  const res = await withTimeout(
    fetch(`https://api.github.com/search/repositories?q=${encodeURIComponent(query)}&sort=stars&order=desc&per_page=${maxResults}`, {
      headers: {
        accept: 'application/vnd.github+json',
        'user-agent': 'UltraIaBot/1.0',
        ...(process.env.GITHUB_TOKEN ? { authorization: `Bearer ${process.env.GITHUB_TOKEN}` } : {}),
      },
    }),
    SEARCH_TIMEOUT_MS,
    'GitHub search',
  );
  if (!res.ok) throw new Error(`GitHub search failed: HTTP ${res.status}`);
  const data = (await res.json()) as {
    items?: { name: string; full_name: string; html_url: string; description: string | null; stargazers_count: number; language: string | null; updated_at: string }[];
  };
  return {
    query,
    items: (data.items || []).map((r) => ({
      name: r.name,
      fullName: r.full_name,
      url: r.html_url,
      description: r.description,
      stars: r.stargazers_count,
      language: r.language,
      updatedAt: r.updated_at,
    })),
  };
}

/** Fetch and parse an RSS/Atom feed. */
export async function parseRss(input: ReachRssInput): Promise<ReachRssResult> {
  const url = input.url.trim();
  if (!/^https?:\/\//i.test(url)) throw new Error('Invalid URL — must start with http(s)://');
  const maxItems = input.maxItems ?? 10;

  const res = await withTimeout(fetch(url, { headers: { 'user-agent': 'UltraIaBot/1.0' }, redirect: 'follow' }), READ_TIMEOUT_MS, 'RSS fetch');
  if (!res.ok) throw new Error(`RSS fetch failed: HTTP ${res.status}`);
  const xml = await res.text();

  const parser = new XMLParser({ ignoreAttributes: false });
  const doc = parser.parse(xml) as Record<string, unknown>;
  const root = (doc.rss as Record<string, unknown> | undefined)?.channel ?? doc.feed ?? {};
  const channel = root as Record<string, unknown>;
  const rawItems = Array.isArray(channel.item)
    ? (channel.item as unknown[])
    : channel.item
      ? [channel.item]
      : Array.isArray(channel.entry)
        ? (channel.entry as unknown[])
        : channel.entry
          ? [channel.entry]
          : [];
  const rawTitle = channel.title;
  const feedTitle = typeof rawTitle === 'string' ? rawTitle : ((rawTitle as { '#text'?: string }) || {})['#text'] || null;

  const items: ReachRssItem[] = rawItems.slice(0, maxItems).map((raw) => {
    const it = raw as Record<string, unknown>;
    const str = (v: unknown): string => (typeof v === 'string' ? v : ((v as { '#text'?: string }) || {})['#text'] || '');
    const title = str(it.title);
    const link =
      typeof it.link === 'string'
        ? it.link
        : str(it.link) || ((it.link as { '@_href'?: string }) || {})['@_href'] || '';
    const descRaw = str(it.description) || str(it.content);
    const pubDate = str(it.pubDate) || str(it.published) || null;
    return {
      title,
      link,
      description: truncate(descRaw.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim(), 400),
      pubDate,
    };
  });

  return { url, feedTitle, items };
}

/** YouTube metadata via oEmbed (keyless). */
export async function videoInfo(input: ReachVideoInfoInput): Promise<ReachVideoInfoResult> {
  const url = input.url.trim();
  if (!/^https?:\/\//i.test(url)) throw new Error('Invalid URL');
  const res = await withTimeout(
    fetch(`https://www.youtube.com/oembed?url=${encodeURIComponent(url)}&format=json`, { headers: { 'user-agent': 'UltraIaBot/1.0' } }),
    SEARCH_TIMEOUT_MS,
    'oEmbed',
  );
  if (!res.ok) throw new Error(`oEmbed failed: HTTP ${res.status}`);
  const data = (await res.json()) as { title?: string; author_name?: string; thumbnail_url?: string };
  return { title: data.title ?? null, author: data.author_name ?? null, thumbnailUrl: data.thumbnail_url ?? null, url };
}

export const reach = { readWeb, searchWeb, searchGitHub, parseRss, videoInfo };