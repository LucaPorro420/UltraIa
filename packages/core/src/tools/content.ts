/**
 * ContentLab — royalty-free content asset layer for UltraIa agents.
 *
 * Sources (verified live 2026-08-14):
 *  - Tunetank MCP (music + SFX): free, keyless, JSON-RPC over Streamable HTTP.
 *    Requires header `Accept: application/json, text/event-stream` (else 406);
 *    response is SSE (`event: message\ndata: {...}`), not plain JSON.
 *    IMPORTANT lesson (verified live 2026-08-14): Tunetank only matches SINGLE-WORD
 *    queries. A multi-word query ("cinematic epic") returns [] while any single token
 *    ("cinematic" / "epic") hits. searchMusic/searchSfx therefore fall back to the
 *    first token when the full query yields no results.
 *  - Mixkit: free stock video/music/SFX/templates/illustrations, no signup, no
 *    attribution (commercial OK). No public API (api.mixkit.co does not resolve);
 *    discover via readWeb over mixkit.co pages.
 *
 * Capabilities:
 *  - searchMusic: find royalty-free music by query/mood/genre/duration (Tunetank)
 *  - searchSfx: find royalty-free sound effects by query/category (Tunetank)
 *  - mixkit: read a Mixkit category/search page via Jina and list downloadable assets
 */

import { readWeb } from './reach';

export interface ContentMusicInput {
  query: string;
  /** Target track length in seconds (optional). */
  duration?: number;
  /** Tolerancia ± segundos alrededor de `duration`. */
  tolerance?: number;
  maxResults?: number;
}

export interface ContentMusicItem {
  id: number;
  name: string;
  artist: string | null;
  duration: number;
  bpm: number | null;
  preview: string;
  url: string;
  genres: string[];
  moods: string[];
  themes: string[];
}

export interface ContentMusicResult {
  query: string;
  tracks: ContentMusicItem[];
}

export interface ContentSfxInput {
  query: string;
  category?: string;
  maxResults?: number;
}

export interface ContentSfxItem {
  id: number;
  name: string;
  duration: number;
  preview: string;
  waveform: string;
}

export interface ContentSfxResult {
  query: string;
  sfx: ContentSfxItem[];
}

export interface ContentMixkitInput {
  /** e.g. 'free-music', 'free-sound-effects', 'free-stock-video', or a search term. */
  type: string;
  maxLength?: number;
}

export interface ContentMixkitResult {
  url: string;
  text: string;
  note: string;
}

const MCP_URL = 'https://mcp.tunetank.com';
const MCP_TIMEOUT_MS = 15_000;

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

/**
 * Call the Tunetank MCP tools/call endpoint.
 * Response is SSE: strips the `event: message\n` prefix and parses the `data:` JSON.
 */
async function callMcp<T>(name: string, args: Record<string, unknown>): Promise<T> {
  const body = JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'tools/call', params: { name, arguments: args } });
  const res = await withTimeout(
    fetch(MCP_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json, text/event-stream' },
      body,
    }),
    MCP_TIMEOUT_MS,
    'Tunetank MCP',
  );
  if (!res.ok) throw new Error(`Tunetank MCP ${name} failed: HTTP ${res.status}`);
  const raw = await res.text();
  const dataLine = raw
    .split('\n')
    .find((l) => l.startsWith('data:'))
    ?.slice(5)
    .trim();
  if (!dataLine) throw new Error(`Tunetank MCP ${name}: no data frame in response`);
  const parsed = JSON.parse(dataLine) as { result?: { content?: { type?: string; text?: string }[] } };
  const content = parsed.result?.content ?? [];
  const text = content.map((c) => c.text ?? '').join('\n').trim();
  if (!text) throw new Error(`Tunetank MCP ${name}: empty result`);
  return JSON.parse(text) as T;
}

/** Search royalty-free music (Tunetank MCP, keyless). */
export async function searchMusic(input: ContentMusicInput): Promise<ContentMusicResult> {
  const query = input.query.trim();
  if (!query) throw new Error('Query is required');
  const maxResults = Math.min(input.maxResults ?? 6, 20);
  const tracks = await tunetankSearch<ContentMusicItem>('search_music', query, maxResults, (args) => {
    if (input.duration && input.duration > 0) args.duration = input.duration;
    if (input.tolerance && input.tolerance > 0) args.tolerance = input.tolerance;
  });
  return { query, tracks: tracks.slice(0, maxResults) };
}

/** Search royalty-free sound effects (Tunetank MCP, keyless). */
export async function searchSfx(input: ContentSfxInput): Promise<ContentSfxResult> {
  const query = input.query.trim();
  if (!query) throw new Error('Query is required');
const maxResults = Math.min(input.maxResults ?? 8, 30);
  const sfx = await tunetankSearch<ContentSfxItem>('search_sfx', query, maxResults, (args) => {
    if (input.category && input.category.trim()) args.category = input.category.trim();
  });
  return { query, sfx: sfx.slice(0, maxResults) };
}

/**
 * Shared Tunetank search with the single-word fallback:
 * if the full (possibly multi-word) query returns no results, retry with the
 * first token — verified live that Tunetank only matches single words.
 */
async function tunetankSearch<T>(
  method: 'search_music' | 'search_sfx',
  query: string,
  maxResults: number,
  addArgs: (args: Record<string, unknown>) => void,
): Promise<T[]> {
  const attempt = async (q: string): Promise<T[]> => {
    const args: Record<string, unknown> = { query: q, limit: maxResults };
    addArgs(args);
    return callMcp<T[]>(method, args);
  };
  const first = await attempt(query);
  if (first.length > 0 || !/\s/.test(query)) return first ?? [];
  const singleWord = query.split(/\s+/)[0];
  if (!singleWord) return first ?? [];
  const retried = await attempt(singleWord);
  return (retried ?? []).length > 0 ? retried : (first ?? []);
}

/** Read a Mixkit category/search page via Jina and list downloadable assets (keyless). */
export async function mixkit(input: ContentMixkitInput): Promise<ContentMixkitResult> {
  const type = input.type.trim().toLowerCase();
  if (!type) throw new Error('Type is required (e.g. free-music, free-sound-effects, free-stock-video)');
  const url = /^https?:\/\//i.test(type)
    ? type
    : `https://mixkit.co/${type.replace(/[^a-z0-9-]+/gi, '-')}/`;
  const result = await readWeb({ url, maxLength: input.maxLength ?? 8000 });
  return {
    url: result.url,
    text: result.text,
    note: 'Mixkit assets are free, no signup, no attribution (commercial OK). Download links are on the page — ask the model to extract the exact asset URLs from the text.',
  };
}

export const content = { searchMusic, searchSfx, mixkit };