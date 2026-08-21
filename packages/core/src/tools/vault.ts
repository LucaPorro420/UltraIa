//! Capability `vault` — Repositorio propio de UltraIa (local + nube + export GitHub opcional).
// *
// * Dominio puro determinista (0 deps de red en el dominio; adapters con fetch/adapters
// * inyectables). Implementa el pedido del usuario (20/08/2026): "crear un repositorio
// * propio (en la nube o local) para almacenar datos, archivos, creaciones, pruebas,
// * prototipos, etc." integrado en los modos de operación P-P/P-B (ver docs/MODOS-OPERACION.md).
// *
// * Layout: .ultraia/vault/<kind>/<slug><ext> con índice manifest.json.
// *   data       → datos estructurados (json/csv/yaml/xml/sql/zip)
// *   files      → archivos sueltos y adjuntos
// *   creations  → creaciones: imágenes, vídeo, audio, renders, HTML/SVG
// *   tests      → pruebas, fixtures, evidencia de gates
// *   prototypes → prototipos y experimentos (spikes)
// *   pdfs       → documentos PDF descargados (harvest de búsquedas, ver pdfsearch.ts)
// *
// * Attribution: patrón inspirado en el diseño SACD/NASA (Fase 2 Memoria Universal +
// * bibliotecas de conocimiento) y en cloud.ts (adapters + CloudService) — implementación ORIGINAL.

import { extname } from 'node:path';
import { MIME_BY_EXT } from './cloud';
import type { CloudStorageAdapter, CloudFile } from './cloud';
import { z } from 'zod';

// ─────────────────────────────────────────────────────────────────────────────
// Tipos públicos
// ─────────────────────────────────────────────────────────────────────────────

/** Categorías del repositorio propio (layout .ultraia/vault/). */
export type VaultKind = 'data' | 'files' | 'creations' | 'tests' | 'prototypes' | 'pdfs';

/** Entrada del repositorio (una fila del índice). */
export interface VaultEntry {
  /** Slug único (derivado del nombre, sin extensión). */
  id: string;
  kind: VaultKind;
  /** Nombre original del archivo. */
  name: string;
  /** Ruta canónica relativa a la raíz del vault: `<kind>/<id><ext>`. */
  path: string;
  sizeBytes: number;
  mime: string;
  createdAt: string;
  /** Origen: research | upload | generation | test | prototype | import | pdf. */
  source?: string;
  /** Metadatos libres (p.ej. {query} para PDFs de búsqueda). */
  meta?: Record<string, string>;
}

/** Layout documentado del repositorio. */
export interface VaultLayoutEntry {
  kind: VaultKind;
  dir: string;
  descripcion: string;
}

/** Índice del repositorio (manifest.json). */
export interface VaultManifest {
  version: 1;
  root: string;
  updatedAt: string;
  count: number;
  totalBytes: number;
  byKind: Record<VaultKind, number>;
  entries: VaultEntry[];
}

/** Resumen agregado del repositorio. */
export interface VaultSummary {
  count: number;
  totalBytes: number;
  byKind: Record<VaultKind, { count: number; bytes: number }>;
  porFuente: Record<string, number>;
}

// ─────────────────────────────────────────────────────────────────────────────
// Constantes
// ─────────────────────────────────────────────────────────────────────────────

export const VAULT_ROOT = '.ultraia/vault';

export const VAULT_LAYOUT: readonly VaultLayoutEntry[] = Object.freeze([
  { kind: 'data', dir: 'data', descripcion: 'Datos estructurados (json/csv/yaml/xml/sql/zip) indexados' },
  { kind: 'files', dir: 'files', descripcion: 'Archivos sueltos y adjuntos' },
  { kind: 'creations', dir: 'creations', descripcion: 'Creaciones: imágenes, vídeo, audio, renders, HTML/SVG' },
  { kind: 'tests', dir: 'tests', descripcion: 'Pruebas, fixtures, evidencia de gates y casos de test' },
  { kind: 'prototypes', dir: 'prototypes', descripcion: 'Prototipos y experimentos (spikes, PoC)' },
  { kind: 'pdfs', dir: 'pdfs', descripcion: 'Documentos PDF descargados (harvest de búsquedas)' },
]);

export const VAULT_KINDS: readonly VaultKind[] = Object.freeze([
  'data',
  'files',
  'creations',
  'tests',
  'prototypes',
  'pdfs',
]);

/** Extensiones que mapean a cada categoría (para classifyVaultKind). */
const KIND_BY_EXT: Readonly<Record<string, VaultKind>> = Object.freeze({
  pdf: 'pdfs',
  png: 'creations', jpg: 'creations', jpeg: 'creations', webp: 'creations', gif: 'creations',
  svg: 'creations', avif: 'creations', mp4: 'creations', mov: 'creations', webm: 'creations',
  mkv: 'creations', mp3: 'creations', wav: 'creations', ogg: 'creations', m4a: 'creations',
  flac: 'creations', html: 'creations', htm: 'creations',
  json: 'data', csv: 'data', yaml: 'data', yml: 'data', xml: 'data', sql: 'data', zip: 'data', tar: 'data', gz: 'data',
});

// ─────────────────────────────────────────────────────────────────────────────
// Helpers deterministas
// ─────────────────────────────────────────────────────────────────────────────

/** Slug canónico: minúsculas, no-alfanuméricos → '-', colapsa, recorta. */
export function slugifyEntry(input: string): string {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 120) || 'item';
}

/** Clasifica la categoría del vault: patrones de propósito primero, luego extensión. */
export function classifyVaultKind(name: string, source?: string): VaultKind {
  if (source === 'pdf' || source === 'research-pdf') return 'pdfs';
  const lower = name.toLowerCase();
  if (/(test|fixture|spec|gate|evidencia)/.test(lower)) return 'tests';
  if (/(prototype|prototipo|spike|poc|experiment)/.test(lower)) return 'prototypes';
  const ext = extname(name).replace('.', '').toLowerCase();
  const byExt = KIND_BY_EXT[ext];
  if (byExt) return byExt;
  return 'files';
}

export interface VaultEntryInput {
  name: string;
  sizeBytes: number;
  source?: string;
  createdAt?: string;
  kind?: VaultKind;
  meta?: Record<string, string>;
}

/**
 * Planifica una entrada del repositorio: id slug, categoría (por kind explícito o
 * clasificación automática), ruta canónica `<kind>/<id><ext>` y mime por extensión.
 * Determinista.
 */
export function planVaultEntry(input: VaultEntryInput): VaultEntry {
  const ext = extname(input.name).toLowerCase();
  const base = input.name.slice(0, input.name.length - ext.length) || 'item';
  const kind = input.kind ?? classifyVaultKind(input.name, input.source);
  const id = slugifyEntry(base);
  const mime = MIME_BY_EXT[ext.replace('.', '')] ?? 'application/octet-stream';
  return {
    id,
    kind,
    name: input.name,
    path: `${kind}/${id}${ext}`,
    sizeBytes: Math.max(0, Math.round(input.sizeBytes)),
    mime,
    createdAt: input.createdAt ?? new Date().toISOString(),
    source: input.source,
    meta: input.meta,
  };
}

/** Construye el índice del repositorio (manifest). Determinista salvo timestamp. */
export function buildVaultManifest(entries: VaultEntry[], now?: () => string): VaultManifest {
  const byKind: Record<VaultKind, number> = { data: 0, files: 0, creations: 0, tests: 0, prototypes: 0, pdfs: 0 };
  let totalBytes = 0;
  for (const e of entries) {
    byKind[e.kind] = (byKind[e.kind] ?? 0) + 1;
    totalBytes += e.sizeBytes;
  }
  return {
    version: 1,
    root: VAULT_ROOT,
    updatedAt: (now ?? (() => new Date().toISOString()))(),
    count: entries.length,
    totalBytes,
    byKind,
    entries: [...entries],
  };
}

/** Búsqueda por id/name/kind/source/path/meta. Determinista: score desc, id asc. */
export function vaultSearch(entries: VaultEntry[], query: string): VaultEntry[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  const scored: Array<{ e: VaultEntry; s: number }> = [];
  for (const e of entries) {
    let s = 0;
    if (e.id.toLowerCase().includes(q)) s += 3;
    if (e.name.toLowerCase().includes(q)) s += 2;
    if (e.kind.toLowerCase().includes(q)) s += 2;
    if (e.source?.toLowerCase().includes(q)) s += 1;
    if (e.path.toLowerCase().includes(q)) s += 1;
    for (const v of Object.values(e.meta ?? {})) if (v.toLowerCase().includes(q)) s += 1;
    if (s > 0) scored.push({ e, s });
  }
  return scored
    .sort((a, b) => b.s - a.s || (a.e.id < b.e.id ? -1 : 1))
    .map((x) => x.e);
}

/** Resumen agregado del repositorio (conteos y bytes por categoría/fuente). */
export function summarizeVault(entries: VaultEntry[]): VaultSummary {
  const byKind: VaultSummary['byKind'] = {
    data: { count: 0, bytes: 0 }, files: { count: 0, bytes: 0 }, creations: { count: 0, bytes: 0 },
    tests: { count: 0, bytes: 0 }, prototypes: { count: 0, bytes: 0 }, pdfs: { count: 0, bytes: 0 },
  };
  const porFuente: Record<string, number> = {};
  let totalBytes = 0;
  for (const e of entries) {
    byKind[e.kind].count += 1;
    byKind[e.kind].bytes += e.sizeBytes;
    totalBytes += e.sizeBytes;
    const f = e.source ?? 'sin_fuente';
    porFuente[f] = (porFuente[f] ?? 0) + 1;
  }
  return { count: entries.length, totalBytes, byKind, porFuente };
}

// ─────────────────────────────────────────────────────────────────────────────
// Puente con el cloud (cloud.ts): vault → adaptador (R2 si env, si no local)
// ─────────────────────────────────────────────────────────────────────────────

export interface VaultToCloudResult {
  ok: boolean;
  uploaded: number;
  skipped: number;
  errors: string[];
}

/**
 * Sube entradas del vault a un adaptador de cloud bajo el prefijo `vault/`.
 * Fail-soft: una entrada sin contenido se salta (skipped), un error de escritura
 * se registra y continúa. Determinista en orden de entrada.
 */
export async function vaultToCloud(
  entries: VaultEntry[],
  adapter: CloudStorageAdapter,
  opts: { contents?: Record<string, Uint8Array>; now?: () => string } = {},
): Promise<VaultToCloudResult> {
  const result: VaultToCloudResult = { ok: true, uploaded: 0, skipped: 0, errors: [] };
  for (const e of entries) {
    const data = opts.contents?.[e.path];
    if (!data) {
      result.skipped += 1;
      continue;
    }
    try {
      await adapter.write(`vault/${e.path}`, data, e.mime);
      result.uploaded += 1;
    } catch (err) {
      result.errors.push(`vault/${e.path}: ${err instanceof Error ? err.message : String(err)}`);
    }
  }
  if (result.errors.length > 0) result.ok = false;
  return result;
}

export interface VaultSyncPlan {
  /** Entradas locales sin contraparte en el cloud → subir. */
  toUpload: VaultEntry[];
  /** Paths cloud bajo `vault/` sin contraparte local → candidatos a borrar. */
  toRemove: string[];
  /** Entradas locales que el cloud ya tiene (mismo path). */
  alreadySynced: number;
  ok: boolean;
}

/** Diff determinista local vs cloud por path (prefijo `vault/`). */
export function planVaultSync(local: VaultEntry[], cloud: CloudFile[]): VaultSyncPlan {
  const cloudSet = new Set(cloud.map((c) => c.path));
  const localSet = new Set(local.map((e) => `vault/${e.path}`));
  const toUpload = local.filter((e) => !cloudSet.has(`vault/${e.path}`));
  const toRemove = cloud.filter((c) => c.path.startsWith('vault/') && !localSet.has(c.path)).map((c) => c.path);
  return { toUpload, toRemove, alreadySynced: local.length - toUpload.length, ok: toUpload.length === 0 };
}

// ─────────────────────────────────────────────────────────────────────────────
// Export GitHub opcional (fail-soft, fetch inyectable)
// ─────────────────────────────────────────────────────────────────────────────

/** Fetch mínimo para el exportador de GitHub (inyectable en tests). */
export type VaultFetch = (
  url: string,
  init?: { method?: string; headers?: Record<string, string>; body?: string },
) => Promise<{ ok: boolean; status: number; text(): Promise<string> }>;

export interface GitHubExportOptions {
  /** Token de GitHub (GH_TOKEN / GITHUB_TOKEN). Sin token → fail-soft. */
  token?: string;
  /** Repo destino: `owner/repo`. */
  repo: string;
  branch?: string;
  commitMessage?: string;
  fetchImpl?: VaultFetch;
}

export interface GitHubExportResult {
  ok: boolean;
  reason?: string;
  /** Cantidad de archivos subidos (creados/actualizados). */
  pushed?: number;
}

const GH_API = 'https://api.github.com';

/**
 * Exporta el vault a un repositorio GitHub propio vía Contents API (crea/actualiza
 * archivos uno a uno: PUT /repos/{owner}/{repo}/contents/{path} con content base64).
 * Fail-soft: sin token → { ok:false, reason:'sin token' }; cualquier error HTTP se
 * registra y se corta (los archivos ya subidos quedan). El orden es determinista
 * (entries ordenadas por path asc).
 */
export async function exportVaultToGitHub(
  entries: VaultEntry[],
  contents: Record<string, Uint8Array>,
  opts: GitHubExportOptions,
): Promise<GitHubExportResult> {
  if (!opts.token) return { ok: false, reason: 'sin token (GitHub export requiere GH_TOKEN/GITHUB_TOKEN)' };
  if (!/^[\w.-]+\/[\w.-]+$/.test(opts.repo)) return { ok: false, reason: `repo inválido: ${opts.repo}` };
  const fetchImpl = opts.fetchImpl ?? (globalThis.fetch as unknown as VaultFetch);
  if (!fetchImpl) return { ok: false, reason: 'sin fetch disponible' };

  const branch = opts.branch ?? 'main';
  const message = opts.commitMessage ?? 'vault: sync entradas del repositorio propio';
  let pushed = 0;

  const sorted = [...entries].sort((a, b) => (a.path < b.path ? -1 : 1));
  for (const e of sorted) {
    const data = contents[e.path];
    if (!data) continue;
    const ghPath = `vault/${e.path}`;
    const base64 = Buffer.from(data).toString('base64');
    const res = await fetchImpl(`${GH_API}/repos/${opts.repo}/contents/${ghPath}`, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${opts.token}`,
        Accept: 'application/vnd.github+json',
        'Content-Type': 'application/json',
        'X-GitHub-Api-Version': '2022-11-28',
      },
      body: JSON.stringify({ message, content: base64, branch }),
    });
    if (!res.ok) {
      const body = await res.text().catch(() => '');
      return { ok: false, reason: `GitHub ${res.status} en ${ghPath}: ${body.slice(0, 200)}`, pushed };
    }
    pushed += 1;
  }
  return { ok: true, pushed };
}

// ─────────────────────────────────────────────────────────────────────────────
// Tool (schema zod + descriptor) — wiring en llm.ts
// ─────────────────────────────────────────────────────────────────────────────

export const vaultInputSchema = z.object({
  accion: z.enum(['plan', 'manifest', 'search', 'summary', 'sync', 'export_github']),
  name: z.string().optional(), // plan: nombre del archivo a planificar
  sizeBytes: z.number().int().min(0).optional(), // plan
  source: z.string().optional(), // plan: origen
  kind: z.enum(['data', 'files', 'creations', 'tests', 'prototypes', 'pdfs']).optional(), // plan: categoría forzada
  entriesJson: z.string().optional(), // manifest/search/summary/sync/export: entradas [{id,kind,name,path,sizeBytes,mime,createdAt,source?,meta?}]
  query: z.string().optional(), // search
  cloudJson: z.string().optional(), // sync: archivos del cloud [{path,name,type,sizeBytes,mime,updatedAt}]
  contentsJson: z.string().optional(), // export_github: {"vault/<path>": "base64 o texto"} — contenido por path
  repo: z.string().optional(), // export_github: owner/repo
  token: z.string().optional(), // export_github: token (o env GH_TOKEN/GITHUB_TOKEN)
  branch: z.string().optional(), // export_github
});

export type VaultToolInput = z.infer<typeof vaultInputSchema>;

/** Handler puro de la tool `vault_manage` (dominio determinista + adapters inyectables). */
export async function runVaultTool(input: VaultToolInput, deps: { contents?: Record<string, Uint8Array> } = {}) {
  const parse = <T>(s?: string): T[] => (s ? (JSON.parse(s) as T[]) : []);
  const entries = parse<VaultEntry>(input.entriesJson);
  switch (input.accion) {
    case 'plan': {
      if (!input.name) return { accion: input.accion, ok: false, error: 'plan requiere name' };
      const entry = planVaultEntry({
        name: input.name,
        sizeBytes: input.sizeBytes ?? 0,
        source: input.source,
        kind: input.kind,
      });
      return { accion: input.accion, ok: true, entry, root: VAULT_ROOT };
    }
    case 'manifest':
      return { accion: input.accion, ok: true, manifest: buildVaultManifest(entries) };
    case 'search': {
      const hits = vaultSearch(entries, input.query ?? '');
      return { accion: input.accion, ok: true, query: input.query ?? '', hits, total: hits.length };
    }
    case 'summary':
      return { accion: input.accion, ok: true, summary: summarizeVault(entries) };
    case 'sync': {
      const cloud = parse<CloudFile>(input.cloudJson);
      const plan = planVaultSync(entries, cloud);
      return { accion: input.accion, ...plan };
    }
    case 'export_github': {
      if (!input.repo) return { accion: input.accion, ok: false, error: 'export_github requiere repo (owner/repo)' };
      const contents: Record<string, Uint8Array> = {};
      if (input.contentsJson) {
        const raw = JSON.parse(input.contentsJson) as Record<string, string>;
        for (const [k, v] of Object.entries(raw)) {
          contents[k] = /^[A-Za-z0-9+/=\r\n]+$/.test(v) && v.length % 4 === 0 && !v.includes('\n')
            ? Buffer.from(v, 'base64')
            : Buffer.from(v, 'utf-8');
        }
      }
      const token = input.token ?? process.env.GH_TOKEN ?? process.env.GITHUB_TOKEN;
      const result = await exportVaultToGitHub(entries, { ...deps.contents, ...contents }, {
        token,
        repo: input.repo,
        branch: input.branch,
      });
      return { accion: input.accion, ...result };
    }
    default:
      return { accion: input.accion, ok: false, error: 'accion desconocida' };
  }
}

export const vaultTools = { vault_manage: runVaultTool } as const;

// Re-export de tipos útiles para el wiring.
export type { CloudStorageAdapter, CloudFile } from './cloud';