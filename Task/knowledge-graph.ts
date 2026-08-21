/**
 * knowledge-graph.ts — capability `knowledge_graph` (20/08/2026):
 * construye el grafo de conocimiento del proyecto desde las fuentes REALES
 * del repo (learning/sources/*.md, docs/RAZONAMIENTO-*.md, learning/truth/*.json)
 * y escribe las salidas del patron graphify: graph.json, GRAPH_REPORT.md,
 * wiki/index.md, cypher.txt + graph.svg (Dark Obsidian, sin JS).
 *
 * Keyless y determinista: extraccion por tokenizacion + enlaces [[...]]
 * (patron semantic-memory), sin LLM ni red.
 *
 * Uso:
 *   node_modules\.bin\vite-node.cmd Task/knowledge-graph.ts            # build completo
 *   node_modules\.bin\vite-node.cmd Task/knowledge-graph.ts --dry-run  # solo reporte
 *
 * Salida:
 *   resultTask/graph/graph.json        (grafo persistible, cache para --update)
 *   resultTask/graph/GRAPH_REPORT.md   (god nodes, comunidades, sorpresas, preguntas)
 *   resultTask/graph/wiki/index.md     (navegacion por comunidad)
 *   resultTask/graph/cypher.txt        (import Neo4j — solo generacion)
 *   resultTask/graph/graph.svg         (vista editorial Dark Obsidian)
 */
import { mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  buildKnowledgeGraph,
  buildNeo4jCypher,
  buildWikiMarkdown,
  findCommunities,
  godNodes,
  graphReportMarkdown,
  graphStats,
  surprisingConnections,
  type FileExtract,
} from '../packages/core/src/tools/knowledge-graph';
import { tokenize } from '../packages/core/src/tools/semantic-memory';

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const write = (rel: string, content: string) => {
  const abs = join(root, rel);
  mkdirSync(dirname(abs), { recursive: true });
  writeFileSync(abs, content, 'utf8');
  return rel;
};

const CONCEPT_MIN_LEN = 4; // tokens muy cortos = ruido
const CONCEPT_MAX = 14; // conceptos por fuente
const MIN_SOURCES = 2; // un concepto solo entra al grafo si aparece en >=2 fuentes

/** Tokens de plantilla/documento que nunca son conceptos (determinista). */
const STOP_CONCEPTS: ReadonlySet<string> = new Set([
  'https', 'http', 'www', 'com', 'org', 'html', 'filetype', 'pdf', 'enlaces',
  'fuente', 'fuentes', 'razonamiento', 'ultraia', 'desktop', 'plan', 'fase',
  'capability', 'tool', 'tests', 'test', 'docs', 'source', 'learning', 'truth',
  'cruda', 'crudo', 'usuario', 'descargado', 'fecha', 'iteración', 'iteracion',
  'análisis', 'analisis', 'verificado', 'verificada', 'respuesta', 'consulta',
  'archivo', 'carpeta', 'línea', 'linea', 'página', 'pagina', 'sección', 'seccion',
  'contenido', 'actual', 'siguiente', 'anterior', 'primera', 'primer', 'única',
  'ejemplo', 'ejemplos', 'clave', 'valor', 'nombre', 'comando', 'salida',
]);

/** Extrae conceptos: tokens >= 4 chars + bigramas, sin stopwords ni ruido. */
function extractConcepts(text: string): string[] {
  const toks = tokenize(text).filter(
    (t) => !STOP_CONCEPTS.has(t) && !t.includes('://') && !/^\d{4}$/.test(t),
  );
  const single = toks.filter((t) => t.length >= CONCEPT_MIN_LEN);
  const bigrams: string[] = [];
  for (let i = 0; i < single.length - 1; i++) {
    const bg = `${single[i]}_${single[i + 1]}`;
    if (bg.length >= CONCEPT_MIN_LEN) bigrams.push(bg);
  }
  const merged = [...single, ...bigrams];
  const uniq = [...new Set(merged)];
  return uniq.slice(0, CONCEPT_MAX);
}

/** Extrae relaciones explicitas [[id]] del texto (patron brain/graphify). */
function extractRelations(text: string): Array<{ a: string; b: string }> {
  const links = text.match(/\[\[([^\]]+)\]\]/g) ?? [];
  const rels: Array<{ a: string; b: string }> = [];
  for (let i = 0; i < links.length - 1; i++) {
    rels.push({ a: links[i].slice(2, -2), b: links[i + 1].slice(2, -2) });
  }
  return rels;
}

/** Lee una carpeta de fuentes markdown como extractos. */
function markdownExtracts(dir: string, kind: FileExtract['kind'], out: FileExtract[]) {
  let files: string[] = [];
  try {
    files = readdirSync(join(root, dir)).filter((f) => f.endsWith('.md'));
  } catch {
    return;
  }
  for (const f of files) {
    const text = readFileSync(join(root, dir, f), 'utf8');
    out.push({
      path: `${dir}/${f}`,
      kind,
      concepts: extractConcepts(text),
      relations: extractRelations(text),
    });
  }
}

/** Render SVG del grafo (Dark Obsidian, sin JS, a11y). */
function renderGraphSvg(edges: ReturnType<typeof buildKnowledgeGraph>['edges'], n: number): string {
  const W = 960;
  const H = 560;
  const cx = W / 2;
  const cy = H / 2;
  const pos = new Map<string, { x: number; y: number }>();
  // Anillo simple determinista (sin librerias): nodos repartidos en circulo.
  const labels = [...new Set(edges.flatMap((e) => [e.source, e.target]))].sort();
  labels.forEach((l, i) => {
    const angle = (2 * Math.PI * i) / Math.max(labels.length, 1) - Math.PI / 2;
    const r = Math.min(W, H) * 0.38;
    pos.set(l, { x: cx + r * Math.cos(angle), y: cy + r * Math.sin(angle) });
  });
  const colorOf = (tag: string) =>
    tag === 'EXTRACTED' ? '#8b5cf6' : tag === 'INFERRED' ? '#22d3ee' : '#f59e0b';
  const lines: string[] = [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" role="img" aria-labelledby="t d">`,
    `<title id="t">Grafo de conocimiento del proyecto</title>`,
    `<desc id="d">${edges.length} conexiones entre ${labels.length} conceptos; EXTRACTED violeta, INFERRED cyan, AMBIGUOUS ambar.</desc>`,
    `<rect width="${W}" height="${H}" fill="#08080a"/>`,
  ];
  for (const e of edges) {
    const a = pos.get(e.source);
    const b = pos.get(e.target);
    if (!a || !b) continue;
    lines.push(`<line x1="${a.x}" y1="${a.y}" x2="${b.x}" y2="${b.y}" stroke="${colorOf(e.tag)}" stroke-width="${Math.min(e.weight, 4)}" stroke-opacity="0.6"/>`);
  }
  for (const [l, p] of pos) {
    lines.push(`<circle cx="${p.x}" cy="${p.y}" r="6" fill="#111115" stroke="#8b5cf6" stroke-width="1.5"/>`);
    lines.push(`<text x="${p.x + 10}" y="${p.y + 4}" fill="#e5e7eb" font-size="11" font-family="JetBrains Mono, monospace">${l}</text>`);
  }
  lines.push('</svg>');
  return lines.join('\n');
}

async function main() {
  const dryRun = process.argv.includes('--dry-run');

  const extracts: FileExtract[] = [];
  markdownExtracts('learning/sources', 'paper', extracts);
  markdownExtracts('docs', 'doc', extracts);
  markdownExtracts('learning/truth', 'note', extracts);

  // Filtro de calidad: los conceptos de UNA sola fuente son ruido para el grafo
  // (el dominio ya los marca AMBIGUOUS en las relations; aqui reducimos INFERRED).
  const counts = new Map<string, number>();
  for (const ex of extracts) {
    for (const c of [...new Set(ex.concepts)]) counts.set(c, (counts.get(c) ?? 0) + 1);
  }
  for (const ex of extracts) {
    ex.concepts = [...new Set(ex.concepts)].filter((c) => (counts.get(c) ?? 0) >= MIN_SOURCES);
  }
  const real = extracts.filter((e) => e.concepts.length > 0 || e.relations.length > 0);

  const g = buildKnowledgeGraph(real);
  const stats = graphStats(g);
  const gods = godNodes(g, 6);
  const surp = surprisingConnections(g, 5);

  console.log(`Fuentes: ${extracts.length} (sources+docs+truth)`);
  console.log(`Nodos: ${stats.nodes} · Edges: ${stats.edges} (${Object.entries(stats.porTag).map(([k, v]) => `${k}:${v}`).join(' ')})`);
  console.log(`Comunidades: ${stats.comunidades}`);
  console.log('God nodes: ' + gods.map((x) => x.label).join(' | '));
  console.log('Sorpresas:');
  for (const s of surp) console.log(`  - ${s.source} <-> ${s.target} [${s.tag}] (${s.score})`);
  if (dryRun) {
    console.log('DRY-RUN: no se escribio nada.');
    return;
  }

  write('resultTask/graph/graph.json', JSON.stringify({ fecha: new Date().toISOString(), stats, graph: g }, null, 2));
  write('resultTask/graph/GRAPH_REPORT.md', graphReportMarkdown(g));
  write('resultTask/graph/wiki/index.md', buildWikiMarkdown(g));
  write('resultTask/graph/cypher.txt', buildNeo4jCypher(g));
  write('resultTask/graph/graph.svg', renderGraphSvg(g.edges, stats.nodes));
  write(
    'resultTask/graph/README.md',
    [
      '# Grafo de conocimiento — UltraIa',
      '',
      `Generado: ${new Date().toISOString().slice(0, 10)} · Nodos ${stats.nodes} · Edges ${stats.edges}`,
      `- Comunidades: ${stats.comunidades} · God nodes: ${gods.length} · Sorpresas: ${surp.length}`,
      '',
      'Archivos: graph.json (persistible), GRAPH_REPORT.md, wiki/index.md, cypher.txt, graph.svg.',
      'Regenerar: `node_modules\\.bin\\vite-node.cmd Task/knowledge-graph.ts`.',
      '',
    ].join('\n'),
  );
  console.log('Escrito: resultTask/graph/ (graph.json, GRAPH_REPORT.md, wiki/, cypher.txt, graph.svg, README.md)');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});