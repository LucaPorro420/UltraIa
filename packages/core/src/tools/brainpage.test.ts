import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {
  normalizeId,
  resolveBrainRoot,
  initBrain,
  createPage,
  readPage,
  updateTruth,
  appendTimeline,
  listPages,
  reindex,
  lintLinks,
  parsePage,
  serializePage,
  BRAIN_DEFAULT_ROOT,
  type BrainPage,
} from './brainpage';

function tmpRoot(): string {
  return path.join(os.tmpdir(), `brainpage-test-${Math.random().toString(36).slice(2)}`);
}

describe('brainpage.normalizeId', () => {
  it('acepta alfanumericos y guiones', () => {
    expect(normalizeId('Config-As-Markdown')).toBe('config-as-markdown');
  });
  it('rechaza path-traversal', () => {
    expect(normalizeId('../escape')).toBeNull();
    expect(normalizeId('a/b')).toBeNull();
    expect(normalizeId('a\\b')).toBeNull();
  });
  it('rechaza espacios y vacio', () => {
    expect(normalizeId('  ')).toBeNull();
    expect(normalizeId('with space')).toBeNull();
  });
});

describe('brainpage.resolveBrainRoot', () => {
  it('default es .ultraia/brainpage', () => {
    expect(resolveBrainRoot()).toBe(BRAIN_DEFAULT_ROOT);
  });
  it('respeta root explicito', () => {
    expect(resolveBrainRoot('/x/y')).toBe('/x/y');
  });
});

describe('brainpage.initBrain', () => {
  let root: string;
  beforeEach(() => (root = tmpRoot()));
  afterEach(() => fs.rm(root, { recursive: true, force: true }));

  it('crea pages/ y BRAIN.md (idempotente)', async () => {
    const r1 = await initBrain(root);
    expect(r1.ok).toBe(true);
    expect(r1.created).toBe(true);
    const r2 = await initBrain(root);
    expect(r2.created).toBe(false); // segunda vez no recrea
    const brainMd = await fs.readFile(path.join(root, 'BRAIN.md'), 'utf8');
    expect(brainMd).toContain('compiled_truth');
  });
});

describe('brainpage.createPage + readPage', () => {
  let root: string;
  beforeEach(async () => {
    root = tmpRoot();
    await initBrain(root);
  });
  afterEach(() => fs.rm(root, { recursive: true, force: true }));

  it('crea y lee una pagina', async () => {
    const now = '2026-08-21T00:00:00.000Z';
    const c = await createPage(root, {
      id: 'config-as-markdown',
      category: 'decision',
      title: 'Store config as Markdown',
      summary: 'Markdown over SQLite for diff-ability',
      now,
    });
    expect(c.ok).toBe(true);
    const r = await readPage(root, 'config-as-markdown');
    expect(r.ok).toBe(true);
    expect(r.page?.category).toBe('decision');
    expect(r.page?.truth).toBe('Markdown over SQLite for diff-ability');
    expect(r.page?.timeline).toHaveLength(1);
    expect(r.page?.timeline[0].kind).toBe('create');
  });

  it('rechaza id duplicado', async () => {
    await createPage(root, { id: 'dup', category: 'fact', title: 'D', summary: 's', now: '2026-01-01T00:00:00.000Z' });
    const c2 = await createPage(root, { id: 'dup', category: 'fact', title: 'D2', summary: 's2', now: '2026-01-01T00:00:00.000Z' });
    expect(c2.ok).toBe(false);
  });

  it('rechaza id invalido', async () => {
    const c = await createPage(root, { id: '../x', category: 'fact', title: 'X', summary: 's', now: '2026-01-01T00:00:00.000Z' });
    expect(c.ok).toBe(false);
  });

  it('readPage de inexistente retorna ok:false', async () => {
    const r = await readPage(root, 'nope');
    expect(r.ok).toBe(false);
  });
});

describe('brainpage.updateTruth (atómico: verdad + rastro)', () => {
  let root: string;
  beforeEach(async () => {
    root = tmpRoot();
    await initBrain(root);
    await createPage(root, { id: 'p', category: 'decision', title: 'P', summary: 'v1', now: '2026-01-01T00:00:00.000Z' });
  });
  afterEach(() => fs.rm(root, { recursive: true, force: true }));

  it('reescribe truth y APPENDS timeline (no pierde el historial)', async () => {
    const u = await updateTruth(root, 'p', 'v2 rationale', { kind: 'truth', now: '2026-02-01T00:00:00.000Z' });
    expect(u.ok).toBe(true);
    expect(u.page?.truth).toBe('v2 rationale');
    expect(u.page?.timeline).toHaveLength(2); // create + truth
    expect(u.page?.timeline[1].kind).toBe('truth');
    expect(u.page?.timeline[1].summary).toBe('v2 rationale');
  });

  it('es deterministico (serialize == re-read/serialize, mismo now)', async () => {
    const u = await updateTruth(root, 'p', 'same', { now: '2026-03-01T00:00:00.000Z' });
    const back = await readPage(root, 'p');
    expect(serializePage(u.page as BrainPage)).toBe(serializePage(back.page as BrainPage));
    expect(u.page?.timeline).toHaveLength(2);
  });

  it('falla si la pagina no existe', async () => {
    const u = await updateTruth(root, 'ghost', 'x', { now: '2026-01-01T00:00:00.000Z' });
    expect(u.ok).toBe(false);
  });
});

describe('brainpage.appendTimeline', () => {
  let root: string;
  beforeEach(async () => {
    root = tmpRoot();
    await initBrain(root);
    await createPage(root, { id: 'q', category: 'fact', title: 'Q', summary: 's', now: '2026-01-01T00:00:00.000Z' });
  });
  afterEach(() => fs.rm(root, { recursive: true, force: true }));

  it('agrega entrada al timeline', async () => {
    const a = await appendTimeline(root, 'q', 'evidence', 'benchmark confirmed', '2026-04-01T00:00:00.000Z');
    expect(a.ok).toBe(true);
    expect(a.page?.timeline).toHaveLength(2);
    expect(a.page?.timeline[1].kind).toBe('evidence');
  });
});

describe('brainpage.listPages / reindex / lintLinks', () => {
  let root: string;
  beforeEach(async () => {
    root = tmpRoot();
    await initBrain(root);
    await createPage(root, { id: 'a', category: 'decision', title: 'A', summary: 'see [[b]]', now: '2026-01-01T00:00:00.000Z' });
    await createPage(root, { id: 'b', category: 'fact', title: 'B', summary: 'ok', now: '2026-01-01T00:00:00.000Z' });
  });
  afterEach(() => fs.rm(root, { recursive: true, force: true }));

  it('listPages lista ids ordenados', async () => {
    const { ids } = await listPages(root);
    expect(ids).toEqual(['a', 'b']);
  });

  it('reindex produce index.json con metadata', async () => {
    const r = await reindex(root);
    expect(r.ok).toBe(true);
    const idx = JSON.parse(await fs.readFile(r.path, 'utf8'));
    expect(idx.pages).toHaveLength(2);
    expect(idx.pages.find((p: { id: string }) => p.id === 'a')?.category).toBe('decision');
  });

  it('lintLinks detecta enlaces rotos', async () => {
    const clean = await lintLinks(root);
    expect(clean.broken).not.toContain('a -> b'); // b existe -> NO roto
    expect(clean.broken).toHaveLength(0);
    // forzar un roto: crear pagina que linkee a inexistente
    await createPage(root, { id: 'c', category: 'fact', title: 'C', summary: 'link [[ghost]]', now: '2026-01-01T00:00:00.000Z' });
    const broken2 = await lintLinks(root);
    expect(broken2.broken).toContain('c -> ghost');
  });
});

describe('brainpage.parsePage/serializePage', () => {
  it('round-trips a page', () => {
    const p: BrainPage = {
      id: 'x',
      category: 'learning',
      title: 'X',
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-02T00:00:00.000Z',
      truth: 'body',
      timeline: [{ kind: 'create', summary: 's', at: '2026-01-01T00:00:00.000Z' }],
    };
    const parsed = parsePage(serializePage(p), 'x');
    expect(parsed?.truth).toBe('body');
    expect(parsed?.timeline).toHaveLength(1);
  });
  it('parsePage null si frontmatter corrupto', () => {
    expect(parsePage('no frontmatter', 'x')).toBeNull();
  });
});
