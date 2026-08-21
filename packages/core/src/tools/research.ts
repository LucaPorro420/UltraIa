/**
 * research — Knowledge search & integration (capability `research`)
 *
 * Searches verifiable knowledge sources and integrates results into the
 * project memory:
 *
 *   - `searchArxiv`   : arXiv API (Atom XML) — papers, deterministic parsing.
 *   - `researchWeb`   : live web search (delegates to reach.searchWeb:
 *                       Exa when EXA_API_KEY is set, DuckDuckGo keyless).
 *   - `researchGitHub`: GitHub repository search (delegates to reach).
 *   - `fetchAndExtract`: any URL -> clean text via r.jina.ai (keyless).
 *   - `createResearchCache`: in-memory (or file-backed) cache keyed by
 *                       sha256 of the request — no repeated network hits.
 *   - `researchSearch`: orchestrator over multiple sources with cross-source
 *                       URL dedupe (normalized: lowercase, no trailing
 *                       slash, no utm params).
 *
 * Keyless-first: every network call fails soft to an empty result; nothing
 * here ever throws for a network error. Tests inject `fetchImpl` stubs.
 */
import { searchWeb, searchGitHub } from './reach';

/* ------------------------------------------------------------------ */
/* Types                                                               */
/* ------------------------------------------------------------------ */

export type ResearchSource = 'arxiv' | 'web' | 'github' | 'pdf' | 'none';

export interface ResearchItem {
  title: string;
  url: string;
  snippet: string;
  source: ResearchSource;
  /** arXiv only: published date / authors excerpt. */
  meta?: { published?: string; authors?: string[] };
}

export interface ResearchResult {
  query: string;
  source: ResearchSource;
  items: ResearchItem[];
  /** true cuando la respuesta vino del cache. */
  cached: boolean;
}

export interface ExtractResult {
  url: string;
  title: string;
  text: string;
  chars: number;
  provider: 'r.jina.ai';
}

export interface ResearchReport {
  query: string;
  sources: ResearchSource[];
  items: ResearchItem[];
  /** URLs duplicadas entre fuentes (se mantuvo la primera). */
  deduped: number;
  fetchedAt: string;
}

export type FetchLike = (url: string, init?: RequestInit) => Promise<{ ok: boolean; status: number; text(): Promise<string> }>;

/* ------------------------------------------------------------------ */
/* Cache                                                               */
/* ------------------------------------------------------------------ */

export interface ResearchCache {
  get<T = unknown>(key: string): T | undefined;
  set(key: string, value: unknown): void;
  clear(): void;
  /** snapshot del contenido (para reportes). */
  entries(): Array<{ key: string }>;
}

/** Cache en memoria (default — determinista entre llamadas de sesión). */
export function createResearchCache(): ResearchCache {
  const store = new Map<string, unknown>();
  return {
    get: <T = unknown>(key: string) => store.get(key) as T | undefined,
    set: (key, value) => void store.set(key, value),
    clear: () => store.clear(),
    entries: () => Array.from(store.keys()).map((key) => ({ key })),
  };
}

async function sha256Hex(input: string): Promise<string> {
  const { createHash } = await import('node:crypto');
  return createHash('sha256').update(input).digest('hex');
}

/** Cache con persistencia en disco (JSON por clave) bajo un directorio. */
export async function createFileResearchCache(dir: string): Promise<ResearchCache> {
  const { mkdirSync, existsSync, readFileSync, writeFileSync } = await import('node:fs');
  const { join } = await import('node:path');
  mkdirSync(dir, { recursive: true });
  const memory = createResearchCache();
  return {
    get: <T = unknown>(key: string) => {
      const mem = memory.get<T>(key);
      if (mem !== undefined) return mem;
      const file = join(dir, `${key}.json`);
      if (existsSync(file)) {
        try {
          const parsed = JSON.parse(readFileSync(file, 'utf8')) as T;
          memory.set(key, parsed);
          return parsed;
        } catch {
          // corrupto -> se ignora
        }
      }
      return undefined;
    },
    set: (key, value) => {
      memory.set(key, value);
      const file = join(dir, `${key}.json`);
      try {
        writeFileSync(file, JSON.stringify(value), 'utf8');
      } catch {
        // fail-soft
      }
    },
    clear: () => memory.clear(),
    entries: () => memory.entries(),
  };
}

/* ------------------------------------------------------------------ */
/* Sources                                                             */
/* ------------------------------------------------------------------ */

export interface ArxivOptions {
  maxResults?: number;
  fetchImpl?: FetchLike;
}

/** arXiv API (Atom XML) — búsqueda de papers por query. */
export async function searchArxiv(query: string, opts: ArxivOptions = {}): Promise<ResearchResult> {
  const q = query.trim();
  if (!q) throw new Error('Query is required');
  const maxResults = Math.max(1, Math.min(20, opts.maxResults ?? 5));
  const fetchImpl = opts.fetchImpl ?? (fetch as unknown as FetchLike);
  const url = `https://export.arxiv.org/api/query?search_query=all:${encodeURIComponent(q)}&start=0&max_results=${maxResults}&sortBy=relevance`;
  try {
    const res = await fetchImpl(url, { headers: { 'user-agent': 'UltraIaBot/1.0' } });
    if (!res.ok) return { query: q, source: 'none', items: [], cached: false };
    const xml = await res.text();
    return { query: q, source: 'arxiv', items: parseArxivAtom(xml, maxResults), cached: false };
  } catch {
    return { query: q, source: 'none', items: [], cached: false };
  }
}

/** Parser determinista del Atom de arXiv (sin dependencias). */
export function parseArxivAtom(xml: string, maxResults: number): ResearchItem[] {
  const items: ResearchItem[] = [];
  let cursor = 0;
  while (items.length < maxResults) {
    const start = xml.indexOf('<entry>', cursor);
    if (start === -1) break;
    const end = xml.indexOf('</entry>', start);
    if (end === -1) break;
    const block = xml.slice(start + 7, end);
    cursor = end + 8;
    const title = cleanXml(block.match(/<title>(.*?)<\/title>/s)?.[1] ?? '') || 'Untitled';
    const url = cleanXml(block.match(/<id>(.*?)<\/id>/s)?.[1] ?? '');
    const summary = cleanXml(block.match(/<summary>(.*?)<\/summary>/s)?.[1] ?? '').slice(0, 300);
    const published = cleanXml(block.match(/<published>(.*?)<\/published>/s)?.[1] ?? '');
    const authors = Array.from(block.matchAll(/<name>(.*?)<\/name>/gs)).map((m) => cleanXml(m[1]));
    items.push({ title, url, snippet: summary, source: 'arxiv', meta: { published, authors: authors.slice(0, 3) } });
  }
  return items;
}

function cleanXml(s: string): string {
  return s
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

export interface WebOptions {
  maxResults?: number;
}

/** Búsqueda web live (Exa opcional / DuckDuckGo keyless). */
export async function researchWeb(query: string, opts: WebOptions = {}): Promise<ResearchResult> {
  const out = await searchWeb({ query, maxResults: opts.maxResults ?? 5 });
  return {
    query,
    source: out.source as ResearchSource,
    items: out.results.map((r) => ({ title: r.title, url: r.url, snippet: r.snippet, source: 'web' as const })),
    cached: false,
  };
}

export interface PdfOptions {
  maxResults?: number;
  fetchImpl?: FetchLike;
  searchWebImpl?: typeof searchWeb;
  includeWeb?: boolean;
}

/**
 * Búsqueda de PDFs (fuente 'pdf', iter-75): OpenAlex keyless + DuckDuckGo
 * `filetype:pdf` (ver pdfsearch.ts). Fail-soft: cualquier error → items vacíos.
 */
export async function researchPdf(query: string, opts: PdfOptions = {}): Promise<ResearchResult> {
  try {
    const { searchPdfs } = await import('./pdfsearch');
    const r = await searchPdfs(query, {
      maxResults: opts.maxResults ?? 5,
      fetchImpl: opts.fetchImpl,
      searchWebImpl: opts.searchWebImpl,
      includeWeb: opts.includeWeb,
    });
    return {
      query,
      source: 'pdf' as const,
      items: r.hits.map((h) => ({
        title: h.title,
        url: h.url,
        snippet: h.directPdf ? `[PDF] ${h.snippet}` : h.snippet,
        source: 'pdf' as const,
        meta: h.year ? { published: String(h.year) } : undefined,
      })),
      cached: false,
    };
  } catch {
    return { query, source: 'pdf', items: [], cached: false };
  }
}

export interface GithubOptions {
  maxResults?: number;
}

/** Búsqueda de repositorios públicos en GitHub (keyless, ~10 req/min). */
export async function researchGitHub(query: string, opts: GithubOptions = {}): Promise<ResearchResult> {
  const out = await searchGitHub({ query, maxResults: opts.maxResults ?? 5 });
  return {
    query,
    source: 'github',
    items: out.items.map((r) => ({
      title: r.fullName,
      url: r.url,
      snippet: `${r.description ?? ''} (${r.stars} stars, ${r.language ?? 'n/a'})`.slice(0, 300),
      source: 'github' as const,
    })),
    cached: false,
  };
}

/** Extrae cualquier URL como texto limpio vía r.jina.ai (keyless). */
export async function fetchAndExtract(url: string, fetchImpl?: FetchLike): Promise<ExtractResult> {
  const f = fetchImpl ?? (fetch as unknown as FetchLike);
  const target = `https://r.jina.ai/${url}`;
  try {
    const res = await f(target, { headers: { 'user-agent': 'UltraIaBot/1.0' } });
    if (!res.ok) return { url, title: '', text: '', chars: 0, provider: 'r.jina.ai' };
    const text = await res.text();
    return { url, title: firstLine(text), text, chars: text.length, provider: 'r.jina.ai' };
  } catch {
    return { url, title: '', text: '', chars: 0, provider: 'r.jina.ai' };
  }
}

function firstLine(text: string): string {
  const line = text.split('\n').map((l) => l.trim()).find((l) => l.length > 0);
  return (line ?? '').slice(0, 200);
}

/* ------------------------------------------------------------------ */
/* Orchestrator                                                        */
/* ------------------------------------------------------------------ */

export interface ResearchSearchOptions {
  sources?: ResearchSource[];
  maxResults?: number;
  cache?: ResearchCache;
  fetchImpl?: FetchLike;
  /** Inyectable para la fuente 'pdf' (default: reach.searchWeb). */
  searchWebImpl?: typeof searchWeb;
}

/** Normaliza una URL para dedupe (minúsculas, sin slash final, sin utm). */
export function normalizeUrl(url: string): string {
  let u = url.trim().toLowerCase();
  u = u.replace(/[?#&](utm_[a-z]+)=[^&#]*/g, '');
  while (u.endsWith('/')) u = u.slice(0, -1);
  return u;
}

/** Orquesta varias fuentes, dedupe por URL normalizada, cachea por fuente. */
export async function researchSearch(query: string, opts: ResearchSearchOptions = {}): Promise<ResearchReport> {
  const q = query.trim();
  if (!q) throw new Error('Query is required');
  const sources = (opts.sources ?? ['arxiv', 'web', 'github']).filter((s): s is ResearchSource => s !== 'none');
  const maxResults = opts.maxResults ?? 5;
  const cache = opts.cache ?? createResearchCache();
  const seen = new Set<string>();
  const items: ResearchItem[] = [];
  let deduped = 0;

  for (const source of sources) {
    const srcKey = await sha256Hex(`${source}:${q}:${maxResults}`);
    let result: ResearchResult | undefined = cache.get<ResearchResult>(srcKey);
    if (result) {
      result = { ...result, cached: true };
    } else {
      switch (source) {
        case 'arxiv':
          result = await searchArxiv(q, { maxResults, fetchImpl: opts.fetchImpl });
          break;
        case 'web':
          result = await researchWeb(q, { maxResults });
          break;
        case 'github':
          result = await researchGitHub(q, { maxResults });
          break;
        case 'pdf':
          result = await researchPdf(q, { maxResults, fetchImpl: opts.fetchImpl, searchWebImpl: opts.searchWebImpl });
          break;
        default:
          continue;
      }
      cache.set(srcKey, result);
    }
    for (const item of result.items) {
      const norm = normalizeUrl(item.url);
      if (norm && seen.has(norm)) {
        deduped++;
        continue;
      }
      if (norm) seen.add(norm);
      items.push(item);
    }
  }

  return { query: q, sources, items, deduped, fetchedAt: new Date().toISOString() };
}

export const research = {
  searchArxiv,
  parseArxivAtom,
  researchWeb,
  researchPdf,
  researchGitHub,
  fetchAndExtract,
  createResearchCache,
  createFileResearchCache,
  researchSearch,
  normalizeUrl,
};