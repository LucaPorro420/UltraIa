//! Capability `pdfsearch` — Búsqueda de PDFs para el repositorio propio (vault).
// *
// * Dominio puro determinista + adapters con fetch inyectable. Implementa el pedido
// * del usuario (20/08/2026): "búsquedas de PDFs / webs / repositorios". Estrategia
// * keyless:
// *   1. OpenAlex API (api.openalex.org/works) — papers con PDF open access, SIN clave.
// *   2. DuckDuckGo (vía reach.searchWeb) con `filetype:pdf` — PDFs de la web.
// *   3. Harvest → vault/pdfs via planVaultEntry (kind pdfs).
// * La búsqueda de repositorios y webs ya existe en research.ts (github/web/arxiv);
// * aquí se añade la fuente 'pdf' y se integra con el vault.
// *
// * Attribution: patrón OpenAlex API → parser determinista; integración con reach.ts
// * (searchWeb) y vault.ts (planVaultEntry). Implementación ORIGINAL.

import { z } from 'zod';
import { planVaultEntry } from './vault';
import type { VaultEntry } from './vault';
import { searchWeb } from './reach';
import type { FetchLike } from './research';

// ─────────────────────────────────────────────────────────────────────────────
// Tipos
// ─────────────────────────────────────────────────────────────────────────────

/** Resultado de búsqueda de PDF (fuente unificada). */
export interface PdfHit {
  title: string;
  url: string;
  source: 'openalex' | 'ddg';
  snippet: string;
  year?: number;
  /** True si la URL termina en .pdf (candidato directo a harvest). */
  directPdf: boolean;
}

export interface PdfSearchResult {
  query: string;
  hits: PdfHit[];
  total: number;
}

export interface OpenAlexWork {
  id: string;
  display_name?: string | null;
  publication_year?: number | null;
  doi?: string | null;
  best_oa_location?: { pdf_url?: string | null; landing_page_url?: string | null } | null;
}

// ─────────────────────────────────────────────────────────────────────────────
// OpenAlex (keyless)
// ─────────────────────────────────────────────────────────────────────────────

export const OPENALEX_API = 'https://api.openalex.org';

/** Parser determinista del JSON de /works (filtra trabajos con PDF accesible). */
export function parseOpenAlex(raw: unknown): PdfHit[] {
  const works = Array.isArray((raw as { results?: unknown })?.results) ? (raw as { results: OpenAlexWork[] }).results : [];
  const hits: PdfHit[] = [];
  for (const w of works) {
    const title = w.display_name?.trim();
    if (!title) continue;
    const pdfUrl = w.best_oa_location?.pdf_url;
    const url = pdfUrl ?? w.best_oa_location?.landing_page_url ?? (w.doi ? `https://doi.org/${w.doi}` : w.id);
    if (!url) continue;
    hits.push({
      title,
      url,
      source: 'openalex',
      snippet: w.doi ? `DOI: ${w.doi}` : 'OpenAlex (open access)',
      year: w.publication_year ?? undefined,
      directPdf: url.toLowerCase().endsWith('.pdf'),
    });
  }
  return hits;
}

export interface OpenAlexOptions {
  maxResults?: number;
  fetchImpl?: FetchLike;
}

/** Búsqueda de papers con PDF en OpenAlex (keyless, /works?search=). */
export async function searchOpenAlex(query: string, opts: OpenAlexOptions = {}): Promise<PdfSearchResult> {
  const q = query.trim();
  if (!q) throw new Error('Query is required');
  const maxResults = Math.min(25, Math.max(1, opts.maxResults ?? 5));
  const fetchImpl = opts.fetchImpl ?? (globalThis.fetch as unknown as FetchLike);
  if (!fetchImpl) return { query: q, hits: [], total: 0 };
  const url = `${OPENALEX_API}/works?search=${encodeURIComponent(q)}&per-page=${maxResults}&filter=has_oa_location:true&mailto=ultraia@localhost`;
  const res = await fetchImpl(url);
  if (!res.ok) return { query: q, hits: [], total: 0 };
  const json = await res.text().then((t) => {
    try {
      return JSON.parse(t);
    } catch {
      return null;
    }
  });
  const hits = parseOpenAlex(json).slice(0, maxResults);
  return { query: q, hits, total: hits.length };
}

// ─────────────────────────────────────────────────────────────────────────────
// DuckDuckGo + filetype:pdf
// ─────────────────────────────────────────────────────────────────────────────

/** Filtra URLs que terminan en .pdf (case-insensitive, quita fragmentos/query). */
export function filterPdfUrls(urls: string[]): string[] {
  const out: string[] = [];
  for (const u of urls) {
    const clean = u.split('#')[0].split('?')[0].trim();
    if (clean.toLowerCase().endsWith('.pdf')) out.push(clean);
  }
  return [...new Set(out)];
}

/** Búsqueda web de PDFs vía DuckDuckGo (delegada a reach.searchWeb). */
export async function searchPdfWeb(query: string, opts: { maxResults?: number; searchWebImpl?: typeof searchWeb } = {}): Promise<PdfSearchResult> {
  const q = query.trim();
  if (!q) throw new Error('Query is required');
  const maxResults = Math.min(15, Math.max(1, opts.maxResults ?? 5));
  const impl = opts.searchWebImpl ?? searchWeb;
  let result;
  try {
    result = await impl({ query: `${q} filetype:pdf`, maxResults });
  } catch {
    return { query: q, hits: [], total: 0 };
  }
  const hits: PdfHit[] = result.results.map((r) => ({
    title: r.title,
    url: r.url,
    source: 'ddg' as const,
    snippet: r.snippet,
    directPdf: r.url.toLowerCase().endsWith('.pdf'),
  }));
  return { query: q, hits: hits.slice(0, maxResults), total: hits.length };
}

// ─────────────────────────────────────────────────────────────────────────────
// Harvest → vault/pdfs
// ─────────────────────────────────────────────────────────────────────────────

export interface HarvestEntry {
  /** Nombre de archivo propuesto (sluggable + .pdf). */
  name: string;
  url: string;
  query: string;
  source: string;
  sizeBytes: number;
  year?: number;
}

/**
 * Planifica entradas de harvest para el vault: cada hit directPdf se convierte en
 * una entrada kind 'pdfs' con meta {url, query, source}. Determinista (orden de hits).
 */
export function planPdfHarvest(query: string, hits: PdfHit[]): HarvestEntry[] {
  const out: HarvestEntry[] = [];
  const seen = new Set<string>();
  for (const h of hits) {
    if (!h.directPdf) continue;
    const url = h.url;
    if (seen.has(url)) continue;
    seen.add(url);
    const base = url.split('/').pop()?.split('#')[0].split('?')[0] ?? 'paper.pdf';
    const name = base.toLowerCase().endsWith('.pdf') ? base : `${base.replace(/[^a-zA-Z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 80) || 'paper'}.pdf`;
    out.push({ name, url, query, source: h.source, sizeBytes: 0, year: h.year });
  }
  return out;
}

/** Convierte un plan de harvest en entradas VaultEntry (kind pdfs, meta con url/query). */
export function indexPdfEntry(h: HarvestEntry, createdAt?: string): VaultEntry {
  return planVaultEntry({
    name: h.name,
    sizeBytes: h.sizeBytes,
    source: 'pdf',
    kind: 'pdfs',
    createdAt,
    meta: { url: h.url, query: h.query, source: h.source, ...(h.year ? { year: String(h.year) } : {}) },
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Búsqueda unificada
// ─────────────────────────────────────────────────────────────────────────────

export interface PdfSearchAllOptions {
  maxResults?: number;
  fetchImpl?: FetchLike;
  searchWebImpl?: typeof searchWeb;
  includeWeb?: boolean;
}

/** Orquesta OpenAlex + (opcional) DDG, dedupe por URL, determinista. */
export async function searchPdfs(query: string, opts: PdfSearchAllOptions = {}): Promise<PdfSearchResult> {
  const q = query.trim();
  if (!q) throw new Error('Query is required');
  const maxResults = Math.min(20, Math.max(1, opts.maxResults ?? 8));
  const [oa, web] = await Promise.all([
    searchOpenAlex(q, { maxResults, fetchImpl: opts.fetchImpl }),
    opts.includeWeb === false ? Promise.resolve({ query: q, hits: [] as PdfHit[], total: 0 }) : searchPdfWeb(q, { maxResults, searchWebImpl: opts.searchWebImpl }),
  ]);
  const seen = new Set<string>();
  const hits: PdfHit[] = [];
  for (const h of [...oa.hits, ...web.hits]) {
    const key = h.url.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    hits.push(h);
  }
  return { query: q, hits: hits.slice(0, maxResults), total: hits.length };
}

// ─────────────────────────────────────────────────────────────────────────────
// Tool (schema zod + handler) — wiring en llm.ts
// ─────────────────────────────────────────────────────────────────────────────

export const pdfsearchInputSchema = z.object({
  accion: z.enum(['search', 'harvest']),
  query: z.string().min(1),
  maxResults: z.number().int().min(1).max(20).optional(),
  includeWeb: z.boolean().optional(),
  hitsJson: z.string().optional(), // harvest: [{title,url,source,snippet,directPdf,year?}]
});

export type PdfsearchToolInput = z.infer<typeof pdfsearchInputSchema>;

/** Handler puro de la tool `pdfsearch_search` (dominio + adapters inyectables). */
export async function runPdfsearchTool(input: PdfsearchToolInput, deps: { fetchImpl?: FetchLike; searchWebImpl?: typeof searchWeb } = {}) {
  if (input.accion === 'search') {
    const r = await searchPdfs(input.query, {
      maxResults: input.maxResults,
      fetchImpl: deps.fetchImpl,
      searchWebImpl: deps.searchWebImpl,
      includeWeb: input.includeWeb,
    });
    return { accion: input.accion, ok: true, query: r.query, hits: r.hits, total: r.total };
  }
  // harvest
  const hits = input.hitsJson ? (JSON.parse(input.hitsJson) as PdfHit[]) : [];
  const plan = planPdfHarvest(input.query, hits);
  const entries = plan.map((h) => indexPdfEntry(h));
  return { accion: input.accion, ok: true, query: input.query, plan, entries };
}

export const pdfsearchTools = { pdfsearch_search: runPdfsearchTool } as const;