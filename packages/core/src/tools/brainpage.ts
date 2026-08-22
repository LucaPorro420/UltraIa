// brainpage.ts - capability `brainpage` (brain.md port, principios originales)
//
// Persistent Markdown memory layer (port de los PRINCIPIOS de MindMux brain.md, Apache-2.0):
// un directorio de paginas Markdown, cada una con `compiled_truth` (entendimiento actual,
// reescribible) + `timeline` (append-only, cadena de evidencia). Garantia central:
// `updateTruth` reescribe la verdad y registra el porque en UNA escritura atomica (temp + rename)
// -> la verdad no puede cambiar sin dejar rastro. "Correct by construction, no validator":
// el modulo es el unico escritor. Deterministico, keyless, cero deps.
//
// NOTA: NO toca brain.ts/brain.test.ts de la sesion concurrente #25 (feature distinto). El
// directorio por defecto es `.ultraia/brainpage/` para no colisionar con un `brain/` real.

import { promises as fs } from 'node:fs';
import path from 'node:path';

export type BrainCategory =
  | 'decision'
  | 'architecture'
  | 'constraint'
  | 'learning'
  | 'fact';

export interface TimelineEntry {
  kind: string;
  summary: string;
  at: string;
}

export interface BrainPage {
  id: string;
  category: BrainCategory;
  title: string;
  createdAt: string;
  updatedAt: string;
  truth: string;
  timeline: TimelineEntry[];
}

export const BRAIN_DEFAULT_ROOT = '.ultraia/brainpage';

export function resolveBrainRoot(root?: string): string {
  return root && root.trim().length > 0 ? root : BRAIN_DEFAULT_ROOT;
}

export function normalizeId(id: string): string | null {
  const s = id.trim().toLowerCase();
  if (s.length === 0) return null;
  // anti path-traversal: rechaza '..', separadores y espacios no colapsados
  if (s.includes('..') || s.includes('/') || s.includes('\\') || s.includes(' ')) return null;
  const out = s.replace(/[^a-z0-9_-]+/g, '-').replace(/^-+|-+$/g, '');
  return out.length > 0 ? out : null;
}

function pagesDir(root: string): string {
  return path.join(root, 'pages');
}

function pagePath(root: string, id: string): string {
  return path.join(pagesDir(root), `${id}.md`);
}

const BRAIN_MD_PROTOCOL = `# BRAIN.md (brainpage)

Persistent Markdown memory for this project. Each page in \`pages/\` carries a rewritable
\`## compiled_truth\` (current best understanding) plus an append-only \`## timeline\` (chain
of evidence). \`updateTruth\` rewrites the truth AND appends its rationale in one atomic write,
so the understanding can never change without a trace.

Pages are plain Markdown + frontmatter. Read them directly; write only through the
\`brainpage\` tool so the invariants hold.

- decision: why a choice was made and trade-offs weighed.
- architecture: durable structure and boundaries.
- constraint: agreements and limits that outlive the session.
- learning: verified lessons (mirror learning/LEARNINGS.md).
- fact: durable, hard-to-reconstruct project facts.
`;

export function serializePage(p: BrainPage): string {
  const lines: string[] = [];
  lines.push('---');
  lines.push(`id: ${p.id}`);
  lines.push(`category: ${p.category}`);
  lines.push(`title: ${p.title}`);
  lines.push(`createdAt: ${p.createdAt}`);
  lines.push(`updatedAt: ${p.updatedAt}`);
  lines.push('---');
  lines.push(`# ${p.title}`);
  lines.push('');
  lines.push('## compiled_truth');
  lines.push(p.truth.trim());
  lines.push('');
  lines.push('## timeline');
  for (const e of p.timeline) {
    lines.push(`- [${e.at}] (${e.kind}) ${e.summary}`);
  }
  lines.push('');
  return lines.join('\n');
}

export function parsePage(content: string, id: string): BrainPage | null {
  const fmEnd = content.indexOf('\n---', 3);
  if (!content.startsWith('---') || fmEnd < 0) return null;
  const fm = content.slice(3, fmEnd).trim();
  const meta: Record<string, string> = {};
  for (const line of fm.split('\n')) {
    const i = line.indexOf(':');
    if (i > 0) meta[line.slice(0, i).trim()] = line.slice(i + 1).trim();
  }
  if (!meta.id || meta.id !== id) return null;
  const category = (meta.category as BrainCategory) || 'fact';
  const title = meta.title || id;
  const createdAt = meta.createdAt || '';
  const updatedAt = meta.updatedAt || createdAt || '';

  const truthIdx = content.indexOf('## compiled_truth');
  const tlIdx = content.indexOf('## timeline');
  let truth = '';
  if (truthIdx >= 0) {
    const start = content.indexOf('\n', truthIdx) + 1;
    const end = tlIdx >= 0 ? tlIdx : content.length;
    truth = content.slice(start, end).trim();
  }
  const timeline: TimelineEntry[] = [];
  if (tlIdx >= 0) {
    const body = content.slice(content.indexOf('\n', tlIdx) + 1);
    const re = /^\s*-\s*\[([^\]]+)\]\s*\(([^)]+)\)\s*(.*)$/;
    for (const l of body.split('\n')) {
      const m = l.match(re);
      if (m) timeline.push({ at: m[1], kind: m[2], summary: m[3].trim() });
    }
  }
  return { id, category, title, createdAt, updatedAt, truth, timeline };
}

async function atomicWrite(filePath: string, content: string): Promise<void> {
  const tmp = `${filePath}.${process.pid}.tmp`;
  await fs.writeFile(tmp, content, 'utf8');
  await fs.rename(tmp, filePath);
}

export async function initBrain(root?: string): Promise<{ ok: boolean; root: string; created: boolean }> {
  const r = resolveBrainRoot(root);
  const pd = pagesDir(r);
  let created = false;
  if (!(await fsSafeExists(pd))) {
    await fs.mkdir(pd, { recursive: true });
    created = true;
  }
  const brainMd = path.join(r, 'BRAIN.md');
  if (!(await fsSafeExists(brainMd))) {
    await fs.writeFile(brainMd, BRAIN_MD_PROTOCOL, 'utf8');
  }
  return { ok: true, root: r, created };
}

// helper sincrono-de-intencion: existsSync evitaria await en hot path de tests; usamos stat async.
async function fsSafeExists(p: string): Promise<boolean> {
  try {
    await fs.stat(p);
    return true;
  } catch {
    return false;
  }
}

export interface CreatePageInput {
  id: string;
  category: BrainCategory;
  title: string;
  summary: string;
  now?: string;
}

export async function createPage(root: string, input: CreatePageInput): Promise<{ ok: boolean; error?: string; page?: BrainPage }> {
  const id = normalizeId(input.id);
  if (!id) return { ok: false, error: 'id invalido (usa solo [a-z0-9_-], sin .. ni separadores)' };
  const pp = pagePath(root, id);
  if (await fsSafeExists(pp)) return { ok: false, error: 'pagina ya existe' };
  const now = input.now ?? new Date().toISOString();
  const page: BrainPage = {
    id,
    category: input.category,
    title: input.title,
    createdAt: now,
    updatedAt: now,
    truth: input.summary,
    timeline: [{ kind: 'create', summary: input.summary, at: now }],
  };
  await atomicWrite(pp, serializePage(page));
  return { ok: true, page };
}

export async function readPage(root: string, id: string): Promise<{ ok: boolean; error?: string; page?: BrainPage }> {
  const nid = normalizeId(id);
  if (!nid) return { ok: false, error: 'id invalido' };
  const pp = pagePath(root, nid);
  if (!(await fsSafeExists(pp))) return { ok: false, error: 'pagina no existe' };
  const content = await fs.readFile(pp, 'utf8');
  const page = parsePage(content, nid);
  return page ? { ok: true, page } : { ok: false, error: 'pagina corrupta' };
}

export async function updateTruth(
  root: string,
  id: string,
  summary: string,
  opts?: { kind?: string; now?: string },
): Promise<{ ok: boolean; error?: string; page?: BrainPage }> {
  const read = await readPage(root, id);
  if (!read.ok || !read.page) return { ok: false, error: read.error };
  const page = read.page;
  const now = opts?.now ?? new Date().toISOString();
  const entry: TimelineEntry = { kind: opts?.kind ?? 'truth', summary, at: now };
  page.timeline = [...page.timeline, entry];
  page.truth = summary;
  page.updatedAt = now;
  await atomicWrite(pagePath(root, id), serializePage(page));
  return { ok: true, page };
}

export async function appendTimeline(
  root: string,
  id: string,
  kind: string,
  summary: string,
  now?: string,
): Promise<{ ok: boolean; error?: string; page?: BrainPage }> {
  const read = await readPage(root, id);
  if (!read.ok || !read.page) return { ok: false, error: read.error };
  const page = read.page;
  const at = now ?? new Date().toISOString();
  page.timeline = [...page.timeline, { kind, summary, at }];
  page.updatedAt = at;
  await atomicWrite(pagePath(root, id), serializePage(page));
  return { ok: true, page };
}

export async function listPages(root: string): Promise<{ ok: boolean; ids: string[] }> {
  const pd = pagesDir(root);
  if (!(await fsSafeExists(pd))) return { ok: true, ids: [] };
  const entries = await fs.readdir(pd);
  const ids = entries
    .filter((f) => f.endsWith('.md'))
    .map((f) => f.slice(0, -3))
    .sort();
  return { ok: true, ids };
}

export async function reindex(root: string): Promise<{ ok: boolean; count: number; path: string }> {
  const r = resolveBrainRoot(root);
  const { ids } = await listPages(r);
  const metas: Array<{ id: string; category: string; title: string; updatedAt: string }> = [];
  for (const id of ids) {
    const read = await readPage(r, id);
    if (read.ok && read.page) {
      metas.push({ id, category: read.page.category, title: read.page.title, updatedAt: read.page.updatedAt });
    }
  }
  const indexPath = path.join(r, 'index.json');
  await atomicWrite(indexPath, JSON.stringify({ root: r, pages: metas }, null, 2));
  return { ok: true, count: metas.length, path: indexPath };
}

const LINK_RE = /\[\[([a-z0-9_-]+)\]\]|ref:([a-z0-9_-]+)/g;

export async function lintLinks(root: string): Promise<{ ok: boolean; broken: string[] }> {
  const r = resolveBrainRoot(root);
  const { ids } = await listPages(r);
  const idSet = new Set(ids);
  const broken: string[] = [];
  for (const id of ids) {
    const read = await readPage(r, id);
    if (!read.ok || !read.page) continue;
    const text = `${read.page.truth}\n${read.page.timeline.map((t) => t.summary).join('\n')}`;
    let m: RegExpExecArray | null;
    LINK_RE.lastIndex = 0;
    while ((m = LINK_RE.exec(text)) !== null) {
      const target = m[1] || m[2];
      if (!idSet.has(target)) broken.push(`${id} -> ${target}`);
    }
  }
  return { ok: true, broken };
}
