// brain.test.ts - capability `brain_memory` (dominio puro determinista)
import { describe, expect, it } from 'vitest';
import {
  appendBrainTimeline,
  brainStats,
  createBrainPage,
  emptyBrain,
  lintBrainLinks,
  listBrainPages,
  normalizeBrainId,
  readBrainPage,
  renderBrainMarkdown,
  renderBrainPageMarkdown,
  reverseBrainTruth,
  searchBrainPages,
  updateBrainTruth,
  upsertBrainPage,
  BRAIN_ROOT_PAGES,
} from './brain';

const AT = '2026-08-20T10:00:00Z';

describe('brain: createBrainPage', () => {
  it('normaliza el id a slug', () => {
    const p = createBrainPage('Decision  con  Ruta  //// del Área', {
      category: 'decision',
      title: 'Ruta del área',
      compiledTruth: 'Usar Qdrant en :6333.',
      at: AT,
    });
    expect(p.id).toBe('decision-con-ruta-del-area');
    expect(p.id).toBe(normalizeBrainId('Decision con Ruta del Área'));
  });

  it('id vacío cae a "pagina"', () => {
    expect(normalizeBrainId('   ')).toBe('pagina');
    expect(normalizeBrainId('!!!')).toBe('pagina');
  });

  it('arranca con timeline de creación', () => {
    const p = createBrainPage('stack', { category: 'stack', title: 'Stack', compiledTruth: 'Next.js + core', at: AT });
    expect(p.timeline).toHaveLength(1);
    expect(p.timeline[0]).toEqual({ at: AT, kind: 'note', summary: 'Pagina creada' });
  });
});

describe('brain: updateTruth (correct by construction)', () => {
  it('reescribe la verdad y anade la entrada de timeline en UNA operación', () => {
    const p0 = createBrainPage('stack', { category: 'stack', title: 'Stack', compiledTruth: 'v1', at: AT });
    const p1 = updateBrainTruth(p0, 'v2: core + runtime', 'Se sumó @ultraia/runtime', '2026-08-20T11:00:00Z');
    expect(p1.compiledTruth).toBe('v2: core + runtime');
    expect(p1.timeline).toHaveLength(2);
    expect(p1.timeline[1]).toEqual({ at: '2026-08-20T11:00:00Z', kind: 'update', summary: 'Se sumó @ultraia/runtime' });
    // pura: la original no muta
    expect(p0.compiledTruth).toBe('v1');
    expect(p0.timeline).toHaveLength(1);
  });

  it('idempotente cuando no hay cambio ni resumen', () => {
    const p = createBrainPage('stack', { category: 'stack', title: 'Stack', compiledTruth: 'v1', at: AT });
    const p2 = updateBrainTruth(p, 'v1', '', AT);
    expect(p2).toBe(p);
  });

  it('reversal es una entrada explícita en el timeline, no una edición silenciosa', () => {
    const p = createBrainPage('roadmap', { category: 'roadmap', title: 'Roadmap', compiledTruth: 'Primero E0', at: AT });
    const p2 = reverseBrainTruth(p, 'Primero E1', 'E0 quedó obsoleto por EDM', '2026-08-20T12:00:00Z');
    expect(p2.timeline[1].kind).toBe('reversal');
    expect(p2.timeline[1].summary).toBe('E0 quedó obsoleto por EDM');
    expect(p2.compiledTruth).toBe('Primero E1');
  });

  it('appendBrainTimeline añade evidencia sin tocar la verdad', () => {
    const p = createBrainPage('architecture', { category: 'architecture', title: 'Arq', compiledTruth: 'X', at: AT });
    const p2 = appendBrainTimeline(p, { at: AT, kind: 'evidence', summary: 'Medido: 1195 tests' });
    expect(p2.compiledTruth).toBe('X');
    expect(p2.timeline).toHaveLength(2);
  });
});

describe('brain: índice (empty/upsert/read/list/search)', () => {
  it('emptyBrain empieza sin páginas', () => {
    expect(emptyBrain().pages).toEqual([]);
  });

  it('upsert reemplaza por id y read devuelve la página', () => {
    const p = createBrainPage('stack', { category: 'stack', title: 'Stack', compiledTruth: 'v1', at: AT });
    let idx = upsertBrainPage(emptyBrain(), p);
    expect(readBrainPage(idx, 'STACK')?.compiledTruth).toBe('v1');
    const p2 = updateBrainTruth(p, 'v2', 'upgrade', AT);
    idx = upsertBrainPage(idx, p2);
    expect(idx.pages).toHaveLength(1);
    expect(readBrainPage(idx, 'stack')?.compiledTruth).toBe('v2');
  });

  it('list ordena root pages primero y luego por id', () => {
    const a = createBrainPage('decision-z', { category: 'decision', title: 'Z', compiledTruth: 'z', at: AT });
    const b = createBrainPage('architecture', { category: 'architecture', title: 'Arq', compiledTruth: 'a', at: AT });
    const idx = upsertBrainPage(upsertBrainPage(emptyBrain(), a), b);
    const ids = listBrainPages(idx).map((p) => p.id);
    expect(ids[0]).toBe('architecture'); // root primero
    expect(ids[1]).toBe('decision-z');
    expect(ids).toHaveLength(2);
  });

  it('search encuentra por título, verdad o timeline', () => {
    const p = createBrainPage('stack', { category: 'stack', title: 'Stack Next.js', compiledTruth: 'usa qdrant', at: AT });
    const idx = upsertBrainPage(emptyBrain(), p);
    expect(searchBrainPages(idx, 'QDRANT').map((x) => x.id)).toEqual(['stack']);
    expect(searchBrainPages(idx, 'next')).toHaveLength(1);
    expect(searchBrainPages(idx, '')).toEqual([]);
  });
});

describe('brain: lintBrainLinks', () => {
  it('detecta [[id]] rotos y los ordena', () => {
    const p1 = createBrainPage('a', { category: 'decision', title: 'A', compiledTruth: 'ver [[inexistente]] y [[a]]', at: AT });
    const idx = upsertBrainPage(emptyBrain(), p1);
    const broken = lintBrainLinks(idx);
    expect(broken).toEqual([{ from: 'a', to: 'inexistente' }]);
  });

  it('no marca enlaces válidos', () => {
    const p1 = createBrainPage('a', { category: 'decision', title: 'A', compiledTruth: 'ver [[b]]', at: AT });
    const p2 = createBrainPage('b', { category: 'lesson', title: 'B', compiledTruth: 'ok', at: AT });
    const idx = upsertBrainPage(upsertBrainPage(emptyBrain(), p1), p2);
    expect(lintBrainLinks(idx)).toEqual([]);
  });
});

describe('brain: renders y stats', () => {
  it('renderBrainMarkdown produce índice + páginas con frontmatter y timeline', () => {
    const p = createBrainPage('stack', { category: 'stack', title: 'Stack', compiledTruth: 'v1', at: AT });
    const md = renderBrainMarkdown(upsertBrainPage(emptyBrain(), p));
    expect(md).toContain('# BRAIN.md');
    expect(md).toContain('## Indice');
    expect(md).toContain('## stack');
    expect(md).toContain('### compiled_truth');
    expect(md).toContain('v1');
    expect(md).toContain('### timeline');
    expect(md).toContain(`[note] Pagina creada`);
  });

  it('renderBrainPageMarkdown produce un archivo por página', () => {
    const p = createBrainPage('stack', { category: 'stack', title: 'Stack', compiledTruth: 'v1', at: AT });
    const md = renderBrainPageMarkdown(p);
    expect(md).toContain('id: stack');
    expect(md).toContain('category: stack');
    expect(md).toContain('# Stack');
  });

  it('brainStats cuenta páginas, timeline y enlaces rotos', () => {
    const p1 = createBrainPage('a', { category: 'decision', title: 'A', compiledTruth: 'ver [[roto]]', at: AT });
    const p2 = createBrainPage('b', { category: 'lesson', title: 'B', compiledTruth: 'x', at: AT });
    const idx = upsertBrainPage(upsertBrainPage(emptyBrain(), p1), p2);
    const s = brainStats(idx);
    expect(s.total).toBe(2);
    expect(s.porCategoria).toEqual({ decision: 1, lesson: 1 });
    expect(s.entradasTimeline).toBe(2);
    expect(s.enlacesRotos).toBe(1);
  });

  it('BRAIN_ROOT_PAGES son las 6 root pages fijas', () => {
    expect(BRAIN_ROOT_PAGES.map((r) => r.id)).toEqual([
      'background', 'architecture', 'flow', 'mindmap', 'stack', 'roadmap',
    ]);
  });
});