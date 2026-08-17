/**
 * generate-diagrams.ts — aplica la capability `diagram` (WS-1) a los resultados
 * de Task1 y a los diagramas del repo.
 *
 * Genera (determinista, sin red):
 *  resultTask/diagrams/timeline-download-2.html        (timeline de escenas del motion-spec)
 *  resultTask/diagrams/timeline-download-5.html        (timeline de escenas del motion-spec)
 *  resultTask/diagrams/motion-engine-pipeline.html     (data-flow del pipeline de análisis)
 *  docs/diagrams/roadmap-2026.html                     (timeline de fases/hitos del roadmap)
 *  docs/diagrams/desktop-architecture.html             (architecture Fases A-E Desktop)
 *  docs/diagrams/gen-engine-pipeline.html              (loop del orquestador OMAG)
 *  resultTask/README.md y docs/diagrams/README.md      (índices con enlaces)
 *
 * Uso: node_modules\.bin\vite-node.cmd Task/generate-diagrams.ts
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { renderEditorialDiagram } from '../packages/core/src/tools/diagram';

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const write = (rel: string, content: string) => {
  const abs = join(root, rel);
  mkdirSync(dirname(abs), { recursive: true });
  writeFileSync(abs, content, 'utf8');
  return rel;
};

interface MotionSpec {
  video: string;
  metadata?: { durationSec?: number };
  scenes: Array<{ index: number; start: number; end: number; duration?: number; frame?: string }>;
  suggestedMotions?: string[];
  patterns?: string[];
}

const specFor = (rel: string): MotionSpec =>
  JSON.parse(readFileSync(join(root, rel), 'utf8')) as MotionSpec;

/* 1. Timelines de motion-specs ---------------------------------------- */
const spec2 = specFor('resultTask/video-analysis/download-2.motion-spec.json');
const spec5 = specFor('resultTask/video-analysis/download-5.motion-spec.json');

const timeline2 = renderEditorialDiagram(
  'timeline',
  {
    title: 'Download (2).mp4 — escenas',
    description: 'Motion spec extraído por el orquestador OMAG (scene detection ffmpeg).',
    unit: 's',
    events: spec2.scenes.map((s) => ({
      label: `Scene ${s.index}`,
      sublabel: `${s.start.toFixed(1)}–${s.end.toFixed(1)}s`,
      start: s.start,
      end: s.end,
    })),
  },
  { variant: 'full-editorial', size: 'doc-wide' },
);

const timeline5 = renderEditorialDiagram(
  'timeline',
  {
    title: 'Download (5).mp4 — escenas',
    description: 'Motion spec extraído por el orquestador OMAG (scene detection ffmpeg).',
    unit: 's',
    events: spec5.scenes.map((s) => ({
      label: `Scene ${s.index}`,
      sublabel: `${s.start.toFixed(1)}–${s.end.toFixed(1)}s`,
      start: s.start,
      end: s.end,
    })),
  },
  { variant: 'full-editorial', size: 'doc-wide' },
);

/* 2. Pipeline Motion Engine (data-flow) ------------------------------- */
const pipeline = renderEditorialDiagram(
  'data-flow',
  {
    title: 'Motion Engine — pipeline de análisis',
    description: 'De video crudo a Motion Spec JSON (Task1.md) — cada app se construye desde el spec.',
    steps: [
      { id: 'va', label: 'Video Analyzer', sublabel: 'ffmpeg · frames', accent: true },
      { id: 'sd', label: 'Scene Detection', sublabel: 'scdet · umbral' },
      { id: 'me', label: 'Motion Extraction', sublabel: 'optical flow' },
      { id: 'ms', label: 'Motion Spec JSON', sublabel: 'scenes + rhythm' },
      { id: 'ui', label: 'React UI', sublabel: 'app premium' },
    ],
  },
  { variant: 'full-editorial', size: 'doc-wide' },
);

/* 3. Roadmap 2026 (timeline) ------------------------------------------- */
const roadmap = renderEditorialDiagram(
  'timeline',
  {
    title: 'UltraIa — roadmap 2026',
    description: 'Hitos principales del proyecto (estado al 15-17/08/2026).',
    unit: '',
    events: [
      { label: 'Core + web', sublabel: 'monorepo vivo', start: 0, end: 2, accent: true },
      { label: 'OMAG v0.1', sublabel: 'orquestador', start: 2, end: 4 },
      { label: 'Gen-Engine', sublabel: 'TTS + audio', start: 4, end: 6 },
      { label: 'AutoPub F1-F5', sublabel: 'fábrica de contenido', start: 6, end: 8 },
      { label: 'Desktop A-D', sublabel: 'runtime + Local API', start: 8, end: 10 },
      { label: 'Task1 + diagramas', sublabel: 'motion specs', start: 10, end: 12 },
    ],
  },
  { variant: 'full-editorial', size: 'doc-wide' },
);

/* 4. Arquitectura Desktop Fases A-E (architecture) ---------------------- */
const desktop = renderEditorialDiagram(
  'architecture',
  {
    title: 'Desktop — fases A-E',
    description: 'Plan Desktop de UltraIa: del runtime local al shell de escritorio.',
    nodes: [
      { id: 'a', label: 'Fase A', sublabel: 'runtime local', accent: true },
      { id: 'b', label: 'Fase B', sublabel: 'Local API HTTP/WS' },
      { id: 'c', label: 'Fase C', sublabel: 'adapters core' },
      { id: 'd', label: 'Fase D', sublabel: 'Shell WebView2' },
      { id: 'e', label: 'Fase E', sublabel: 'distribución' },
    ],
    edges: [
      { from: 'a', to: 'b' },
      { from: 'b', to: 'c' },
      { from: 'c', to: 'd' },
      { from: 'd', to: 'e' },
    ],
  },
  { variant: 'full-editorial', size: 'doc-wide' },
);

/* 5. Orquestador OMAG (loop) -------------------------------------------- */
const omag = renderEditorialDiagram(
  'loop',
  {
    title: 'Gen-Engine — orquestador OMAG',
    description: 'IDEA → plan Director → MediaField → generadores → críticos → correction loop (max 5).',
    hub: { label: 'Orchestrator', sublabel: 'OMAG core' },
    stations: [
      { id: 'g', label: 'Generators', sublabel: 'keyless backends', accent: true },
      { id: 'c', label: 'Critics', sublabel: 'TemporalSync · Identity' },
      { id: 'm', label: 'Memories', sublabel: 'Working · Scene' },
      { id: 'r', label: 'Render', sublabel: 'TTS · video · audio' },
    ],
    writeBacks: ['c'],
  },
  { variant: 'full-editorial', size: 'doc-wide' },
);

/* Escribir archivos ----------------------------------------------------- */
const out = [
  ['resultTask/diagrams/timeline-download-2.html', timeline2.html],
  ['resultTask/diagrams/timeline-download-5.html', timeline5.html],
  ['resultTask/diagrams/motion-engine-pipeline.html', pipeline.html],
  ['docs/diagrams/roadmap-2026.html', roadmap.html],
  ['docs/diagrams/desktop-architecture.html', desktop.html],
  ['docs/diagrams/gen-engine-pipeline.html', omag.html],
].map(([rel, content]) => write(rel as string, content as string));

/* Índice docs/diagrams/README.md ---------------------------------------- */
const diagramsReadme = `# Diagramas editoriales (capability \\\`diagram\\\`)

Diagramas HTML autocontenidos (sin JS, sin deps, a11y, Dark Obsidian) generados por
\`Task/generate-diagrams.ts\` — patrón de [diagram-design](https://github.com/cathrynlavery/diagram-design)
(port original, ver \`docs/RAZONAMIENTO-DIAGRAM-DESIGN.md\`). Ábrelos con doble clic.

| Diagrama | Tipo | Qué muestra |
|---|---|---|
| [roadmap-2026.html](roadmap-2026.html) | timeline | Hitos del roadmap 2026 |
| [desktop-architecture.html](desktop-architecture.html) | architecture | Fases A-E del plan Desktop |
| [gen-engine-pipeline.html](gen-engine-pipeline.html) | loop | Orquestador OMAG (correction loop) |

Regenerar: \`node_modules\\.bin\\vite-node.cmd Task/generate-diagrams.ts\`
`;
write('docs/diagrams/README.md', diagramsReadme);

console.log('Diagramas generados:');
for (const rel of out) console.log(`  ${rel}`);
console.log(`Total: ${out.length} HTML (determinista, sin red)`);
