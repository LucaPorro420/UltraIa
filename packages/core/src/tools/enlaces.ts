/**
 * enlaces — Link curation & knowledge integration (capability `enlaces`)
 *
 * Protocolo del proyecto para las URLs que el usuario deja en `enlaces.txt`:
 * parsear la lista, clasificar cada enlace (pendiente vs ya procesado),
 * derivar un slug idempotente, y descargar la fuente cruda a
 * `learning/sources/<slug>.md` (el runner scripts/process-enlaces.ts hace la
 * descarga + reporte; aquí vive el dominio puro, 100% testeable y keyless).
 *
 * Determinista e idempotente: mismo contenido -> mismo resultado; un enlace
 * ya procesado se salta.
 */
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fnv1aStr } from './generative';

/* ------------------------------------------------------------------ */
/* Tipos                                                               */
/* ------------------------------------------------------------------ */

export interface EnlaceEntry {
  /** Número de línea 1-based en enlaces.txt. */
  line: number;
  url: string;
  /** Línea completa (para conservar anotaciones `##`). */
  raw: string;
  /** `## PROCESADO ...` en la misma línea o las 2 siguientes. */
  processed: boolean;
  /** Slug idempotente derivado de la URL. */
  slug: string;
}

export interface EnlacesClassifyResult {
  entries: EnlaceEntry[];
  pending: EnlaceEntry[];
  processed: EnlaceEntry[];
  /** URLs no-http descartadas (mención, email, path local). */
  skipped: Array<{ line: number; raw: string }>;
}

export interface EnlacesDownloadOptions {
  /** Directorio destino (learning/sources/ por defecto). */
  destDir?: string;
  /** fetch inyectable (tests); por defecto fetch global. */
  fetchImpl?: (url: string, init?: RequestInit) => Promise<{ ok: boolean; text(): Promise<string> }>;
}

/* ------------------------------------------------------------------ */
/* Parsing                                                             */
/* ------------------------------------------------------------------ */

const URL_RE = /https?:\/\/[^\s<>"']+/gi;

/** Extrae la primera URL http(s) de una línea. */
export function extractUrl(line: string): string | null {
  const m = line.match(URL_RE);
  return m ? m[0].replace(/[),;.]+$/, '') : null;
}

/** Slug idempotente: último segmento del path, saneado (patrón learning/sources). */
export function slugifyUrl(url: string): string {
  try {
    const u = new URL(url);
    let seg = u.pathname.split('/').filter(Boolean).pop() ?? '';
    if (!seg || seg === u.hostname) {
      seg = u.hostname.replace(/^www\./, '').split('.')[0];
    }
    seg = seg
      .toLowerCase()
      .replace(/\.(md|html?|txt|pdf)$/i, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
    return seg || 'enlace';
  } catch {
    const seg = url
      .toLowerCase()
      .replace(/^https?:\/\//, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
    return seg || 'enlace';
  }
}

/** Detecta la marca `## PROCESADO` en una línea. */
export function hasProcessedMark(line: string): boolean {
  return /##\s*PROCESADO/i.test(line);
}

/** Detecta si la fuente cruda ya existe en disco (idempotencia). */
export function isSourceDownloaded(slug: string, destDir = 'learning/sources'): boolean {
  return existsSync(join(destDir, `${slug}.md`));
}

/* ------------------------------------------------------------------ */
/* Clasificación                                                       */
/* ------------------------------------------------------------------ */

/**
 * Parsea enlaces.txt y clasifica cada entrada. Reglas:
 * - La marca `## PROCESADO` (misma línea o las 2 siguientes) => processed.
 * - La fuente cruda ya descargada (learning/sources/<slug>.md) => processed.
 * - Líneas sin URL http(s) => skipped (menciones, texto, etc.).
 */
export function classifyEnlaces(content: string, opts: { sourcesDir?: string; checkDisk?: boolean } = {}): EnlacesClassifyResult {
  const lines = content.split(/\r?\n/);
  const entries: EnlaceEntry[] = [];
  const skipped: Array<{ line: number; raw: string }> = [];
  const checkDisk = opts.checkDisk ?? true;
  const sourcesDir = opts.sourcesDir ?? 'learning/sources';

  for (let i = 0; i < lines.length; i++) {
    const raw = lines[i];
    const url = extractUrl(raw);
    if (!url) {
      if (raw.trim()) skipped.push({ line: i + 1, raw: raw.trim().slice(0, 120) });
      continue;
    }
    const window = lines.slice(i, Math.min(i + 3, lines.length)).join('\n');
    const slug = slugifyUrl(url);
    const processed = hasProcessedMark(window) || (checkDisk && isSourceDownloaded(slug, sourcesDir));
    entries.push({ line: i + 1, url, raw: raw.trim(), processed, slug });
  }
  return {
    entries,
    pending: entries.filter((e) => !e.processed),
    processed: entries.filter((e) => e.processed),
    skipped,
  };
}

/* ------------------------------------------------------------------ */
/* Descarga (runner)                                                   */
/* ------------------------------------------------------------------ */

export interface DownloadResult {
  url: string;
  slug: string;
  ok: boolean;
  chars: number;
  error?: string;
}

/** Descarga la fuente cruda a destDir/<slug>.md (idempotente, fail-soft). */
export async function downloadSource(url: string, slug: string, destDir: string, fetchImpl?: (url: string, init?: RequestInit) => Promise<{ ok: boolean; text(): Promise<string> }>): Promise<DownloadResult> {
  const f = fetchImpl ?? (globalThis.fetch as unknown as (url: string, init?: RequestInit) => Promise<{ ok: boolean; text(): Promise<string> }>);
  try {
    const res = await f(url, { headers: { 'user-agent': 'UltraIaBot/1.0' } });
    if (!res.ok) return { url, slug, ok: false, chars: 0, error: `HTTP ${res.ok ? 200 : 'error'}` };
    const text = await res.text();
    if (text.length < 20) return { url, slug, ok: false, chars: text.length, error: 'contenido vacío o bloqueado' };
    mkdirSync(destDir, { recursive: true });
    writeFileSync(join(destDir, `${slug}.md`), text, 'utf8');
    return { url, slug, ok: true, chars: text.length };
  } catch (e) {
    return { url, slug, ok: false, chars: 0, error: e instanceof Error ? e.message : 'fetch falló' };
  }
}

/** Checksum del contenido para reportes idempotentes. */
export function contentChecksum(content: string): string {
  return fnv1aStr(content);
}

export const enlaces = {
  extractUrl,
  slugifyUrl,
  hasProcessedMark,
  isSourceDownloaded,
  classifyEnlaces,
  downloadSource,
  contentChecksum,
};