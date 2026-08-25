import { describe, expect, it } from 'vitest';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  buildReportMarkdown,
  buildReviewManifest,
  buildTruthDocs,
  classifyContent,
  dedupeResults,
  extractInsights,
  planRepoReview,
  REVIEW_DIMENSIONS,
  REVIEW_SCOPES,
  type ReviewResult,
} from './reporeview';

const FIXTURE_DOC = `# Guía de decisión del motor

Elegimos ffmpeg porque el pipeline necesita argv determinista; por lo tanto el
render vive fuera de tests. La regla es simple: si hay GPU entonces ladder
generativo, si no, lanczos. Invariante: nunca inventar timestamps.

La fórmula del score es score = 0.6*a + 0.3*b con coseno normalizado y PSNR>40dB.
Suma de pesos = 1.

\`\`\`ts
export function buildEdl(takes: string[]): Edl {
  const out = takes.map((t) => parseTake(t));
  return { segments: out };
}
\`\`\`

Stack: qdrant para memoria, prisma para cola, edge-tts narración.
`;

const FIXTURE_CODE = `
import { z } from 'zod';

export const schema = z.object({ a: z.number() });

export function planProcVid(input) {
  const guardas = input.fps <= 60;
  if (!guardas) throw new Error('fps inválido');
  return ['ffmpeg', '-i', input.src];
}

describe('planProcVid', () => {
  it('rechaza fps altos', () => {});
});
`;

function mk(files: Record<string, string>): string {
  const dir = mkdtempSync(join(tmpdir(), 'reporeview-test-'));
  for (const [rel, content] of Object.entries(files)) {
    const abs = join(dir, rel);
    mkdirSync(abs.slice(0, abs.lastIndexOf('/')), { recursive: true });
    writeFileSync(abs, content, 'utf8');
  }
  return dir;
}

describe('reporeview — classifyContent', () => {
  it('clasifica por extensión', () => {
    expect(classifyContent('a/readme.md')).toBe('doc');
    expect(classifyContent('x/y.ts')).toBe('codigo-ts');
    expect(classifyContent('s.py')).toBe('codigo-py');
    expect(classifyContent('t/truth.json')).toBe('datos-json');
    expect(classifyContent('otro.log')).toBe('texto');
  });
});

describe('reporeview — planRepoReview', () => {
  it('selecciona revisables y salta node_modules/dist/.git', () => {
    const root = mk({
      'docs/guia.md': FIXTURE_DOC,
      'src/a.ts': FIXTURE_CODE,
      'node_modules/x/index.js': 'x',
      '.git/config': 'git',
      'dist/out.js': 'x',
      'bin/blob.bin': '\u0000\u0001',
    });
    try {
      const plan = planRepoReview(root, 'all', 50);
      const paths = plan.targets.map((t) => t.path);
      expect(paths).toContain('docs/guia.md');
      expect(paths).toContain('src/a.ts');
      expect(paths.some((p) => p.includes('node_modules'))).toBe(false);
      expect(paths.some((p) => p.startsWith('.git'))).toBe(false);
      expect(plan.truncated).toBe(false);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it('respeta maxFiles (truncated=true)', () => {
    const files: Record<string, string> = {};
    for (let i = 0; i < 5; i++) files[`d/f${i}.md`] = 'contenido';
    const root = mk(files);
    try {
      const plan = planRepoReview(root, 'all', 3);
      expect(plan.targets.length).toBe(3);
      expect(plan.truncated).toBe(true);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it('scope vendor apunta al subárbol correcto', () => {
    const root = mk({
      'vendor/repo-a/README.md': 'repo',
      'learning/sources/fuente.md': 'fuente',
    });
    try {
      const planVendor = planRepoReview(root, 'vendor', 20);
      expect(planVendor.targets.map((t) => t.path)).toEqual(['vendor/repo-a/README.md']);
      expect(REVIEW_SCOPES.sources).toBe('learning/sources');
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
});

describe('reporeview — extractInsights (dimensiones)', () => {
  const doc = extractInsights('docs/motor.md', FIXTURE_DOC);
  const code = extractInsights('src/x.ts', FIXTURE_CODE);

  it('detecta las 6 dimensiones como espacio de análisis', () => {
    expect(REVIEW_DIMENSIONS).toHaveLength(6);
    expect(REVIEW_DIMENSIONS).toContain('matematicas');
    expect(REVIEW_DIMENSIONS).toContain('razonamiento');
  });

  it('doc rico: razonamiento+matematicas+implementaciones con evidencias; techs por léxico', () => {
    const dims = doc.insights.map((i) => i.dimension);
    for (const d of ['razonamiento', 'matematicas', 'implementaciones'] as const) {
      expect(dims).toContain(d);
    }
    const mat = doc.insights.find((i) => i.dimension === 'matematicas');
    expect(mat?.evidencias.length).toBeGreaterThan(0);
    expect(doc.techs).toEqual(expect.arrayContaining(['qdrant', 'prisma', 'edge-tts']));
    expect(doc.primaryDimensions.length).toBeGreaterThan(0);
  });

  it('código: implementaciones y codigo puntuados; techs por léxico', () => {
    const dims = code.insights.map((i) => i.dimension);
    expect(dims).toContain('implementaciones');
    expect(dims).toContain('codigo');
    expect(code.techs).toContain('zod');
  });

  it('hash estable y sensible al contenido', () => {
    const again = extractInsights('docs/motor.md', FIXTURE_DOC);
    expect(again.hash).toBe(doc.hash);
    const other = extractInsights('docs/motor.md', `${FIXTURE_DOC}\nextra`);
    expect(other.hash).not.toBe(doc.hash);
  });

  it('score acotado 0..1 y evidencias ≤180 chars', () => {
    for (const i of [...doc.insights, ...code.insights]) {
      expect(i.score).toBeGreaterThanOrEqual(0);
      expect(i.score).toBeLessThanOrEqual(1);
      for (const e of i.evidencias) expect(e.length).toBeLessThanOrEqual(180);
    }
  });

  it('archivo sin señal → lineCount correcto (vacío permitido)', () => {
    const empty = extractInsights('x/notas.txt', '...');
    expect(empty.lineCount).toBe(1);
  });
});

describe('reporeview — dedupe / truth / manifest / report', () => {
  const base = extractInsights('a/doc.md', FIXTURE_DOC);
  const r1: ReviewResult = { path: 'a/doc.md', ...base };
  const dupSameContent = extractInsights('b/copia.md', FIXTURE_DOC); // mismo contenido → mismo hash

  it('dedupe elimina blobs repetidos aunque cambie la ruta', () => {
    const r2: ReviewResult = { path: 'b/copia.md', ...dupSameContent };
    const kept = dedupeResults([r1, r2]);
    expect(kept).toHaveLength(1);
    expect(kept[0].path).toBe('a/doc.md');
  });

  it('buildTruthDocs genera TruthDoc compatibles (id/texto/respuesta/tipo/fuente)', () => {
    const docs = buildTruthDocs([r1], 'reporeview');
    expect(docs.length).toBe(1);
    const d = docs[0];
    expect(d.id).toBe(`reporeview-${r1.hash}`);
    expect(d.texto).toContain('a/doc.md');
    // La evidencia excluye la lista sintética de tecnologías (van en texto).
    expect(d.respuesta).toContain('[razonamiento]');
    expect(d.respuesta).not.toContain('[tecnologias]');
    expect(d.tipo).toBe(r1.kind);
    expect(d.fuente).toBe('reporeview');
  });

  it('buildTruthDocs filtra señales débiles (TRUTH_MIN_SCORE)', () => {
    const weak = extractInsights('z/vacio.txt', 'una linea cualquiera sin patrones');
    const rw: ReviewResult = { path: 'z/vacio.txt', ...weak };
    expect(buildTruthDocs([rw], 'reporeview')).toHaveLength(0);
  });

  it('manifest determinista y agregado correcto', () => {
    const m1 = buildReviewManifest('run-1', '/tmp/root', 'docs', [r1]);
    const m2 = buildReviewManifest('run-1', '/tmp/root', 'docs', [r1]);
    expect(m1).toEqual(m2); // sin timestamps dentro
    expect(m1.totalFiles).toBe(1);
    expect(m1.truthDocs).toBe(1);
    expect(Object.keys(m1.byDimension).length).toBeGreaterThan(0);
  });

  it('report markdown contiene secciones clave', () => {
    const report = buildReportMarkdown(buildReviewManifest('run-1', '/root', 'docs', [r1]));
    expect(report).toContain('# Repo Review — run-1');
    expect(report).toContain('| Dimensión |');
    expect(report).toContain('Tecnologías detectadas');
    expect(report).toContain('| qdrant |');
    expect(report).toContain('a/doc.md');
  });
});
