import { describe, it, expect } from 'vitest';
import {
  VAULT_ROOT,
  VAULT_LAYOUT,
  VAULT_KINDS,
  slugifyEntry,
  classifyVaultKind,
  planVaultEntry,
  buildVaultManifest,
  vaultSearch,
  summarizeVault,
  vaultToCloud,
  planVaultSync,
  exportVaultToGitHub,
  runVaultTool,
} from './vault';
import { InMemoryCloudAdapter } from './cloud';

const FIXED_NOW = '2026-08-20T12:00:00.000Z';

function entry(name: string, sizeBytes = 100, source?: string, kind?: 'data' | 'files' | 'creations' | 'tests' | 'prototypes' | 'pdfs') {
  return planVaultEntry({ name, sizeBytes, source, kind, createdAt: FIXED_NOW });
}

describe('vault: layout y helpers', () => {
  it('VAULT_LAYOUT documenta las 6 categorías con carpetas estables', () => {
    expect(VAULT_LAYOUT).toHaveLength(6);
    expect(VAULT_LAYOUT.map((l) => l.kind)).toEqual(VAULT_KINDS);
    expect(VAULT_LAYOUT.map((l) => l.dir)).toEqual(['data', 'files', 'creations', 'tests', 'prototypes', 'pdfs']);
    expect(VAULT_ROOT).toBe('.ultraia/vault');
  });

  it('slugifyEntry: minúsculas, no-alfanuméricos a guiones, colapsa y recorta', () => {
    expect(slugifyEntry('  Mi Archivo V1.0!! ')).toBe('mi-archivo-v1-0');
    expect(slugifyEntry('ya-esta---bien')).toBe('ya-esta-bien');
    expect(slugifyEntry('!!!')).toBe('item');
    expect(slugifyEntry('a'.repeat(300)).length).toBeLessThanOrEqual(120);
  });

  it('classifyVaultKind: pdf → pdfs, media → creations, datos → data', () => {
    expect(classifyVaultKind('paper.pdf')).toBe('pdfs');
    expect(classifyVaultKind('paper.pdf', 'research-pdf')).toBe('pdfs');
    expect(classifyVaultKind('render.mp4')).toBe('creations');
    expect(classifyVaultKind('foto.png')).toBe('creations');
    expect(classifyVaultKind('index.json')).toBe('data');
    expect(classifyVaultKind('dataset.csv')).toBe('data');
  });

  it('classifyVaultKind: patrones test/prototype y resto → files', () => {
    expect(classifyVaultKind('vault.test.ts')).toBe('tests');
    expect(classifyVaultKind('fixture-1.json')).toBe('tests');
    expect(classifyVaultKind('spike-idea.md')).toBe('prototypes');
    expect(classifyVaultKind('notas.txt')).toBe('files');
  });
});

describe('vault: planVaultEntry', () => {
  it('planifica ruta canónica <kind>/<id><ext> y mime por extensión', () => {
    const e = entry('Mi Idea v2.PNG', 2048, 'upload');
    expect(e.id).toBe('mi-idea-v2');
    expect(e.path).toBe('creations/mi-idea-v2.png');
    expect(e.mime).toBe('image/png');
    expect(e.sizeBytes).toBe(2048);
    expect(e.createdAt).toBe(FIXED_NOW);
    expect(e.source).toBe('upload');
  });

  it('respeta kind explícito y source pdf', () => {
    const e = entry('data.bin', 10, undefined, 'data');
    expect(e.kind).toBe('data');
    const p = entry('informe.pdf', 500, 'pdf');
    expect(p.kind).toBe('pdfs');
    expect(p.path).toBe('pdfs/informe.pdf');
  });

  it('sizeBytes negativo → 0; extensión sin mime → octet-stream', () => {
    const e = planVaultEntry({ name: 'x.bin', sizeBytes: -5, createdAt: FIXED_NOW });
    expect(e.sizeBytes).toBe(0);
    expect(e.mime).toBe('application/octet-stream');
    expect(e.path).toBe('files/x.bin');
  });
});

describe('vault: manifest y resúmenes', () => {
  it('buildVaultManifest: conteos por kind + totalBytes + root', () => {
    const entries = [entry('a.png', 10), entry('b.pdf', 30, 'pdf'), entry('c.json', 60)];
    const m = buildVaultManifest(entries, () => FIXED_NOW);
    expect(m.version).toBe(1);
    expect(m.root).toBe(VAULT_ROOT);
    expect(m.updatedAt).toBe(FIXED_NOW);
    expect(m.count).toBe(3);
    expect(m.totalBytes).toBe(100);
    expect(m.byKind).toMatchObject({ creations: 1, pdfs: 1, data: 1 });
    expect(m.entries).toHaveLength(3);
  });

  it('buildVaultManifest no muta las entradas de entrada', () => {
    const entries = [entry('a.png', 10)];
    const m = buildVaultManifest(entries, () => FIXED_NOW);
    entries.push(entry('b.png', 5));
    expect(m.count).toBe(1);
  });

  it('vaultSearch: orden por score desc, empates por id asc', () => {
    const entries = [
      entry('report-final.pdf', 10, 'pdf'),
      entry('report-v2.pdf', 20, 'pdf'),
      entry('notes.txt', 5),
    ];
    const hits = vaultSearch(entries, 'report');
    expect(hits.map((h) => h.id)).toEqual(['report-final', 'report-v2']);
    const byKind = vaultSearch(entries, 'pdf');
    expect(byKind.map((h) => h.id)).toEqual(['report-final', 'report-v2']);
  });

  it('vaultSearch: query vacía → [] y busca en source/meta', () => {
    const entries = [entry('a.pdf', 10, 'research'), planVaultEntry({ name: 'b.md', sizeBytes: 1, createdAt: FIXED_NOW, meta: { tema: 'shaders' } })];
    expect(vaultSearch(entries, '')).toEqual([]);
    expect(vaultSearch(entries, 'research').map((h) => h.id)).toEqual(['a']);
    expect(vaultSearch(entries, 'shaders').map((h) => h.id)).toEqual(['b']);
  });

  it('summarizeVault: conteos y bytes por kind + por fuente', () => {
    const entries = [
      entry('a.png', 10, 'generation'),
      entry('b.pdf', 30, 'pdf'),
      entry('c.pdf', 20, 'pdf'),
      entry('d.txt', 5),
    ];
    const s = summarizeVault(entries);
    expect(s.count).toBe(4);
    expect(s.totalBytes).toBe(65);
    expect(s.byKind.creations).toEqual({ count: 1, bytes: 10 });
    expect(s.byKind.pdfs).toEqual({ count: 2, bytes: 50 });
    expect(s.porFuente).toEqual({ generation: 1, pdf: 2, sin_fuente: 1 });
  });
});

describe('vault: puente cloud', () => {
  it('vaultToCloud sube con prefijo vault/ y mime correcto', async () => {
    const adapter = new InMemoryCloudAdapter({ now: () => FIXED_NOW });
    const e = entry('foto.png', 4);
    const r = await vaultToCloud([e], adapter, { contents: { [e.path]: new Uint8Array([1, 2, 3, 4]) } });
    expect(r).toEqual({ ok: true, uploaded: 1, skipped: 0, errors: [] });
    const file = await adapter.stat('vault/creations/foto.png');
    expect(file?.mime).toBe('image/png');
    expect(file?.sizeBytes).toBe(4);
  });

  it('vaultToCloud: sin contenido → skipped; error de escritura → fail-soft', async () => {
    const adapter = new InMemoryCloudAdapter();
    const a = entry('a.png', 1);
    const b = entry('b.png', 1);
    const failing = {
      kind: 'memory' as const,
      list: adapter.list.bind(adapter),
      read: adapter.read.bind(adapter),
      remove: adapter.remove.bind(adapter),
      stat: adapter.stat.bind(adapter),
      write: async () => {
        throw new Error('boom');
      },
    };
    const r = await vaultToCloud([a, b], failing, { contents: { [a.path]: new Uint8Array([1]), [b.path]: new Uint8Array([2]) } });
    expect(r.ok).toBe(false);
    expect(r.uploaded).toBe(0);
    expect(r.errors).toHaveLength(2);
    const r2 = await vaultToCloud([a], adapter, { contents: {} });
    expect(r2.skipped).toBe(1);
  });

  it('planVaultSync: diff determinista local vs cloud', () => {
    const local = [entry('a.png', 1), entry('b.pdf', 2, 'pdf')];
    const cloud = [
      { path: 'vault/creations/a.png', name: 'a.png', type: 'image' as const, sizeBytes: 1, mime: 'image/png', updatedAt: FIXED_NOW },
      { path: 'vault/pdfs/b.pdf', name: 'b.pdf', type: 'document' as const, sizeBytes: 2, mime: 'application/pdf', updatedAt: FIXED_NOW },
      { path: 'vault/data/old.json', name: 'old.json', type: 'data' as const, sizeBytes: 3, mime: 'application/json', updatedAt: FIXED_NOW },
      { path: 'publications/otro.mp4', name: 'otro.mp4', type: 'video' as const, sizeBytes: 4, mime: 'video/mp4', updatedAt: FIXED_NOW },
    ];
    const plan = planVaultSync(local, cloud);
    expect(plan.toUpload).toEqual([]);
    expect(plan.toRemove).toEqual(['vault/data/old.json']);
    expect(plan.alreadySynced).toBe(2);
    expect(plan.ok).toBe(true);
  });

  it('planVaultSync: local sin cloud → toUpload; ok=false', () => {
    const local = [entry('nuevo.md', 1)];
    const plan = planVaultSync(local, []);
    expect(plan.toUpload.map((e) => e.path)).toEqual(['files/nuevo.md']);
    expect(plan.ok).toBe(false);
  });
});

describe('vault: export GitHub (fail-soft)', () => {
  it('sin token → fail-soft con razón', async () => {
    const r = await exportVaultToGitHub([], {}, { repo: 'x/y' });
    expect(r.ok).toBe(false);
    expect(r.reason).toContain('sin token');
  });

  it('repo inválido → fail-soft', async () => {
    const r = await exportVaultToGitHub([], {}, { token: 't', repo: 'mal' });
    expect(r.ok).toBe(false);
    expect(r.reason).toContain('repo inválido');
  });

  it('sube archivos ordenados por path con base64 y Bearer token', async () => {
    const calls: Array<{ url: string; method?: string; body?: string }> = [];
    const fetchImpl = async (url: string, init?: { method?: string; headers?: Record<string, string>; body?: string }) => {
      calls.push({ url, method: init?.method, body: init?.body });
      return { ok: true, status: 201, text: async () => '{}' };
    };
    const e1 = entry('b.pdf', 3, 'pdf');
    const e2 = entry('a.png', 2);
    const contents = { [e1.path]: new Uint8Array([1, 2, 3]), [e2.path]: new Uint8Array([4, 5]) };
    const r = await exportVaultToGitHub([e1, e2], contents, { token: 'tok', repo: 'me/repo', fetchImpl });
    expect(r.ok).toBe(true);
    expect(r.pushed).toBe(2);
    expect(calls[0].url).toBe('https://api.github.com/repos/me/repo/contents/vault/creations/a.png');
    expect(calls[0].method).toBe('PUT');
    expect(calls[0].body).toContain('"branch":"main"');
    expect(calls[0].body).toContain('"content":"BAU="');
  });

  it('error HTTP → corta y devuelve pushed parcial', async () => {
    let n = 0;
    const fetchImpl = async () => {
      n += 1;
      if (n === 2) return { ok: false, status: 422, text: async () => '{"message":"conflict"}' };
      return { ok: true, status: 201, text: async () => '{}' };
    };
    const e1 = entry('a.png', 1);
    const e2 = entry('b.pdf', 1, 'pdf');
    const contents = { [e1.path]: new Uint8Array([1]), [e2.path]: new Uint8Array([2]) };
    const r = await exportVaultToGitHub([e1, e2], contents, { token: 'tok', repo: 'me/repo', fetchImpl });
    expect(r.ok).toBe(false);
    expect(r.reason).toContain('422');
    expect(r.pushed).toBe(1);
  });
});

describe('vault: tool runVaultTool', () => {
  it('accion plan devuelve entry + root', async () => {
    const r = await runVaultTool({ accion: 'plan', name: 'demo.mp4', sizeBytes: 10, source: 'generation' });
    expect(r.ok).toBe(true);
    expect((r as { entry: { path: string } }).entry.path).toBe('creations/demo.mp4');
    expect((r as { root: string }).root).toBe(VAULT_ROOT);
  });

  it('accion manifest/search/summary con entriesJson', async () => {
    const entries = [entry('a.png', 10), entry('b.pdf', 20, 'pdf')];
    const m = await runVaultTool({ accion: 'manifest', entriesJson: JSON.stringify(entries) });
    expect((m as { manifest: { count: number } }).manifest.count).toBe(2);
    const s = await runVaultTool({ accion: 'search', entriesJson: JSON.stringify(entries), query: 'b' });
    expect((s as { total: number }).total).toBe(1);
    const sum = await runVaultTool({ accion: 'summary', entriesJson: JSON.stringify(entries) });
    expect((sum as { summary: { count: number } }).summary.count).toBe(2);
  });

  it('accion sync con cloudJson', async () => {
    const entries = [entry('a.png', 1)];
    const cloud = [
      { path: 'vault/creations/a.png', name: 'a.png', type: 'image' as const, sizeBytes: 1, mime: 'image/png', updatedAt: FIXED_NOW },
    ];
    const r = await runVaultTool({ accion: 'sync', entriesJson: JSON.stringify(entries), cloudJson: JSON.stringify(cloud) });
    expect((r as { ok: boolean }).ok).toBe(true);
  });

  it('accion export_github sin repo → error claro', async () => {
    const r = await runVaultTool({ accion: 'export_github' });
    expect((r as { ok: boolean }).ok).toBe(false);
  });

  it('accion desconocida → error', async () => {
    const r = await runVaultTool({ accion: 'plan' });
    expect((r as { ok: boolean }).ok).toBe(false);
  });
});