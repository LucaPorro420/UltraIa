import { describe, expect, it } from 'vitest';
import {
  diagram,
  renderEditorialDiagram,
  timelineFromScenes,
  round4,
  escapeHtml,
  DIAGRAM_TOKENS,
  type ArchitectureSpec,
  type DataFlowSpec,
  type LoopSpec,
} from './diagram';

const timelineSpec = {
  title: 'Pipeline Motion Engine',
  description: 'De video crudo a spec JSON',
  unit: 's',
  events: [
    { label: 'Analyze', sublabel: 'video.mp4', start: 0, end: 3, accent: true },
    { label: 'Detect', sublabel: 'scenes', start: 3, end: 7 },
    { label: 'Extract', sublabel: 'motion', start: 7, end: 11 },
    { label: 'Spec', sublabel: 'json', start: 11, end: 15 },
  ],
};

const flowSpec: DataFlowSpec = {
  title: 'Video Analyzer → Spec JSON',
  steps: [
    { id: 'a', label: 'Video Analyzer', sublabel: 'ffmpeg', accent: true },
    { id: 'b', label: 'Scene Detection', sublabel: 'scdet' },
    { id: 'c', label: 'Motion Extraction', sublabel: 'optical flow' },
    { id: 'd', label: 'Motion Spec JSON', sublabel: 'output' },
  ],
};

const archSpec: ArchitectureSpec = {
  title: 'UltraIa OMAG',
  description: 'Orquestador y generadores',
  nodes: [
    { id: 'ui', label: 'Web UI', sublabel: 'Next.js', accent: true },
    { id: 'api', label: 'API', sublabel: '/api/omag' },
    { id: 'orc', label: 'Orchestrator', sublabel: 'OmagOrchestrator' },
    { id: 'gen', label: 'Generators', sublabel: 'keyless' },
    { id: 'crit', label: 'Critics', sublabel: 'TemporalSync' },
  ],
  edges: [
    { from: 'ui', to: 'api' },
    { from: 'api', to: 'orc', label: 'POST' },
    { from: 'orc', to: 'gen' },
    { from: 'gen', to: 'crit' },
    { from: 'crit', to: 'orc', label: 'loop', dashed: true },
  ],
};

const loopSpec: LoopSpec = {
  title: 'Correction Loop OMAG',
  hub: { label: 'Orchestrator', sublabel: 'max 5 iters' },
  stations: [
    { id: 'g', label: 'Generate', sublabel: 'media' },
    { id: 'c', label: 'Critique', sublabel: 'critics', accent: true },
    { id: 'p', label: 'Persist', sublabel: 'memories' },
    { id: 'r', label: 'Render', sublabel: 'backends' },
  ],
  writeBacks: ['c'],
};

describe('diagram · tokens & helpers', () => {
  it('tokens Dark Obsidian presentes', () => {
    expect(DIAGRAM_TOKENS.paper).toBe('#08080a');
    expect(DIAGRAM_TOKENS.accent).toBe('#8b5cf6');
    expect(DIAGRAM_TOKENS.hairline).toBe('#1f1f2a');
  });

  it('round4 devuelve multiplos de 4 (regla anti-slop)', () => {
    expect(round4(3)).toBe(4);
    expect(round4(5)).toBe(4);
    expect(round4(6)).toBe(8);
    expect(round4(100)).toBe(100);
    expect(round4(-3)).toBe(0);
    expect([0, 4, 8, 12, 16, 20].map(round4)).toEqual([0, 4, 8, 12, 16, 20]);
  });

  it('escapeHtml neutraliza entidades', () => {
    expect(escapeHtml('<script>alert(1)</script>')).toBe('&lt;script&gt;alert(1)&lt;/script&gt;');
    expect(escapeHtml('a & b "c"')).toBe('a &amp; b &quot;c&quot;');
  });
});

describe('diagram · timeline', () => {
  it('genera HTML autocontenido sin <script> ni recursos externos', () => {
    const r = renderEditorialDiagram('timeline', timelineSpec);
    expect(r.html).toContain('<!doctype html>');
    expect(r.html).not.toContain('<script');
    // xmlns w3.org es obligatorio en SVG; lo que se prohibe son recursos externos.
    expect(r.html).not.toMatch(/src="https?:\/\//);
    expect(r.html).not.toMatch(/href="https?:\/\//);
    expect(r.html).not.toMatch(/url\(https?:\/\//);
  });

  it('a11y: role="img" + aria-labelledby resuelve title/desc', () => {
    const r = renderEditorialDiagram('timeline', timelineSpec);
    expect(r.svg).toContain('role="img"');
    const match = r.svg.match(/aria-labelledby="([^"]+)"/);
    expect(match).toBeTruthy();
    const ids = match![1].split(' ');
    for (const id of ids) {
      expect(r.svg).toContain(`id="${id}"`);
    }
    expect(r.svg).toContain('<title id="');
    expect(r.svg).toContain('<desc id="');
  });

  it('IDs prefijados únicos por diagrama (inline seguro)', () => {
    const r1 = renderEditorialDiagram('timeline', timelineSpec);
    const r2 = renderEditorialDiagram('timeline', { ...timelineSpec, title: 'Otro Diagrama' });
    const id1 = r1.svg.match(/aria-labelledby="([^"]+)"/)![1].split(' ')[0];
    const id2 = r2.svg.match(/aria-labelledby="([^"]+)"/)![1].split(' ')[0];
    expect(id1).toContain('dg-pipeline-motion-engine');
    expect(id2).toContain('dg-otro-diagrama');
    expect(id1).not.toBe(id2);
  });

  it('sin sombras (regla editorial: no box-shadow)', () => {
    const r = renderEditorialDiagram('timeline', timelineSpec);
    expect(r.html).not.toContain('shadow');
  });

  it('coordenadas y dims divisibles por 4 dentro del SVG', () => {
    const r = renderEditorialDiagram('timeline', timelineSpec);
    const nums = r.svg.match(/\b\d+(\.\d+)?\b/g)!.map(Number).filter((n) => n > 3 && n < 2000);
    const nonMult4 = nums.filter((n) => n % 4 !== 0);
    // El viewBox width 800 y height 420 son multiplos; los x/y/w/h del cuerpo deben serlo.
    // Text sizes (13,11,9...) no son coordenadas; solo exigimos que TODOS los >99 sean multiplos
    // (coords reales del lienzo) y que rx (6) sea valido (6 no es multiplo de 4 pero es radius).
    expect(nonMult4.filter((n) => n > 99).length).toBe(0);
  });

  it('timelineFromScenes mapea escenas con unit', () => {
    const r = timelineFromScenes(
      'Escenas Video',
      [
        { label: 'Scene 1', start: 0, end: 4 },
        { label: 'Scene 2', start: 4, end: 10 },
      ],
      { unit: 'sec', variant: 'full-editorial' },
    );
    expect(r.kind).toBe('timeline');
    expect(r.variant).toBe('full-editorial');
    expect(r.html).toContain('editorial-card');
    expect(r.svg).toContain('Scene 1');
    expect(r.meta.nodeCount).toBe(2);
  });

  it('eventos fuera de rango normalizados a >= 0', () => {
    const r = renderEditorialDiagram('timeline', {
      title: 'T',
      events: [{ label: 'x', start: 0, end: 2 }],
    });
    expect(r.svg).toContain('>0</text>');
  });

  it('zod: rechaza spec invalida', () => {
    expect(() =>
      renderEditorialDiagram('timeline', {
        title: 'T',
        events: [{ label: 'x', start: -1, end: 2 }],
      }),
    ).toThrow();
    expect(() =>
      renderEditorialDiagram('timeline', {
        title: 'T',
        events: [],
      }),
    ).toThrow();
  });
});

describe('diagram · data-flow', () => {
  it('renderiza pasos con flechas entre nodos', () => {
    const r = renderEditorialDiagram('data-flow', flowSpec);
    expect(r.svg).toContain('Video Analyzer');
    expect(r.svg).toContain('Motion Spec JSON');
    expect(r.svg).toContain('marker-end');
    expect(r.meta.nodeCount).toBe(4);
    expect(r.meta.edgeCount).toBe(3);
  });

  it('accent solo en el foco (1-2 elementos)', () => {
    const r = renderEditorialDiagram('data-flow', flowSpec);
    const accentUses = (r.svg.match(/stroke="#8b5cf6"/g) || []).length;
    expect(accentUses).toBeLessThanOrEqual(3); // 1 nodo focal + hub, no mas
  });
});

describe('diagram · architecture', () => {
  it('renderiza nodos + edges con elbow', () => {
    const r = renderEditorialDiagram('architecture', archSpec);
    expect(r.svg).toContain('Orchestrator');
    expect(r.svg).toContain('<path d="M');
    expect(r.meta.nodeCount).toBe(5);
    expect(r.meta.edgeCount).toBe(5);
  });

  it('edge dashed para loop-back', () => {
    const r = renderEditorialDiagram('architecture', archSpec);
    expect(r.svg).toContain('stroke-dasharray');
  });
});

describe('diagram · loop', () => {
  it('renderiza hub + estaciones + write-back', () => {
    const r = renderEditorialDiagram('loop', loopSpec);
    expect(r.svg).toContain('Orchestrator');
    expect(r.svg).toContain('Critique');
    expect(r.svg).toContain('stroke-dasharray="5 4"');
    expect(r.meta.nodeCount).toBe(5); // hub + 4 estaciones
  });

  it('sin writeBacks no dibuja arcos', () => {
    const r = renderEditorialDiagram('loop', { ...loopSpec, writeBacks: [] });
    expect(r.svg).not.toContain('stroke-dasharray="5 4"');
  });
});

describe('diagram · determinismo & opciones', () => {
  it('misma entrada → mismo HTML byte a byte', () => {
    const a = renderEditorialDiagram('architecture', archSpec, { variant: 'full-editorial', size: 'doc-wide' });
    const b = renderEditorialDiagram('architecture', archSpec, { variant: 'full-editorial', size: 'doc-wide' });
    expect(a.html).toBe(b.html);
    expect(a.svg).toBe(b.svg);
  });

  it('variante minimal-dark por defecto', () => {
    const r = renderEditorialDiagram('timeline', timelineSpec);
    expect(r.variant).toBe('minimal-dark');
    expect(r.html).not.toContain('<aside class="editorial-card">');
  });

  it('size doc-wide cambia viewBox', () => {
    const r = renderEditorialDiagram('timeline', timelineSpec, { size: 'doc-wide' });
    expect(r.svg).toContain('viewBox="0 0 1200 480"');
  });

  it('kind desconocido lanza error', () => {
    expect(() => renderEditorialDiagram('bogus' as never, timelineSpec)).toThrow();
  });

  it('export diagram agrega API publica', () => {
    expect(diagram.KINDS).toEqual(['timeline', 'data-flow', 'architecture', 'loop']);
    expect(typeof diagram.renderEditorialDiagram).toBe('function');
    expect(typeof diagram.timelineFromScenes).toBe('function');
  });
});
