// kgraph.ts - capability `kgraph` (graphify port, principios originales)
//
// Knowledge-graph builder puro/determinista, cero deps, keyless-first.
// Port ORIGINAL de los PRINCIPIOS de graphify (safishamsi/graphify, MIT): parser de corpus
// mixto, nodos/edges con tags de provenance (EXTRACTED/INFERRED/AMBIGUOUS), análisis de
// god nodes / surprising connections / suggested questions, y salida graph.json +
// GRAPH_REPORT.md + SVG. NO copia codigo de graphify; attribution en
// docs/RAZONAMIENTO-KGRAPH.md.

export type EdgeKind = 'EXTRACTED' | 'INFERRED' | 'AMBIGUOUS';

export interface KNode {
  id: string;
  label: string;
  type: 'symbol' | 'file' | 'doc' | 'concept';
  source: string;
  degree?: number;
}

export interface KEdge {
  source: string;
  target: string;
  kind: EdgeKind;
  label: string;
  weight: number;
}

export interface KnowledgeGraph {
  nodes: KNode[];
  edges: KEdge[];
}

export interface GraphInputFile {
  path: string;
  content: string;
  kind?: 'code' | 'doc';
}

export interface GodNode {
  id: string;
  label: string;
  degree: number;
}

export interface SurprisingConnection {
  source: string;
  target: string;
  kind: EdgeKind;
  score: number;
  why: string;
}

export interface GraphAnalysis {
  godNodes: GodNode[];
  surprisingConnections: SurprisingConnection[];
  suggestedQuestions: string[];
}

const CODE_EXT = new Set([
  '.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs', '.py', '.go', '.rs', '.java',
  '.c', '.cpp', '.h', '.rb', '.cs', '.kt', '.scala', '.php', '.swift', '.lua',
]);

const STOP = new Set([
  'this', 'that', 'with', 'from', 'have', 'been', 'were', 'they', 'their', 'what',
  'when', 'then', 'than', 'them', 'into', 'about', 'which', 'would', 'could', 'should',
  'there', 'here', 'some', 'such', 'only', 'also', 'para', 'pero', 'una', 'los', 'las',
  'por', 'con', 'sus', 'que', 'mas', 'esto', 'esta', 'como', 'cada', 'sobre', 'entre',
]);

export function slug(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function fileKind(path: string): 'code' | 'doc' {
  const dot = path.lastIndexOf('.');
  const ext = dot >= 0 ? path.slice(dot).toLowerCase() : '';
  return CODE_EXT.has(ext) ? 'code' : 'doc';
}

function escapeRe(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function baseName(path: string): string {
  const i = Math.max(path.lastIndexOf('/'), path.lastIndexOf('\\'));
  return i >= 0 ? path.slice(i + 1) : path;
}

function parseCode(path: string, content: string): { nodes: KNode[]; edges: KEdge[] } {
  const nodes: KNode[] = [];
  const edges: KEdge[] = [];
  const fileId = `file:${slug(path)}`;
  nodes.push({ id: fileId, label: baseName(path), type: 'file', source: path });

  const symRe =
    /(?:function\s+([A-Za-z_$][\w$]*)|class\s+([A-Za-z_$][\w$]*)|(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=|def\s+([A-Za-z_$][\w$]*)|func\s+([A-Za-z_$][\w$]*))/g;
  const syms: Array<{ name: string; start: number }> = [];
  let m: RegExpExecArray | null;
  while ((m = symRe.exec(content)) !== null) {
    const name = (m[1] || m[2] || m[3] || m[4] || m[5]) as string;
    syms.push({ name, start: m.index });
  }
  syms.sort((a, b) => a.start - b.start);

  for (const s of syms) {
    const id = `sym:${slug(s.name)}`;
    if (!nodes.some((n) => n.id === id)) {
      nodes.push({ id, label: s.name, type: 'symbol', source: path });
    }
  }

  const importRe =
    /import\s+(?:[^'"]*?\s+from\s+)?['"]([^'"]+)['"]|require\(['"]([^'"]+)['"]\)|from\s+['"]([^'"]+)['"]\s+import/g;
  let im: RegExpExecArray | null;
  while ((im = importRe.exec(content)) !== null) {
    const spec = im[1] || im[2] || im[3];
    if (!spec) continue;
    const targetId = `file:${slug(spec)}`;
    if (!nodes.some((n) => n.id === targetId)) {
      nodes.push({ id: targetId, label: spec, type: 'file', source: spec });
    }
    edges.push({ source: edgeFileId(fileId), target: targetId, kind: 'EXTRACTED', label: 'imports', weight: 1 });
  }

  // call edges (region-based, lightweight)
  for (let i = 0; i < syms.length; i++) {
    const start = syms[i].start;
    const end = i + 1 < syms.length ? syms[i + 1].start : content.length;
    const body = content.slice(start, end);
    for (let j = 0; j < syms.length; j++) {
      if (syms[j].name === syms[i].name) continue;
      const re = new RegExp(`(?:\\b${escapeRe(syms[j].name)}\\s*\\()`, 'g');
      if (re.test(body)) {
        edges.push({
          source: `sym:${slug(syms[i].name)}`,
          target: `sym:${slug(syms[j].name)}`,
          kind: 'EXTRACTED',
          label: 'calls',
          weight: 1,
        });
      }
    }
  }

  return { nodes, edges };
}

function edgeFileId(fileId: string): string {
  return fileId;
}

function parseDoc(path: string, content: string): { nodes: KNode[]; edges: KEdge[] } {
  const nodes: KNode[] = [];
  const edges: KEdge[] = [];
  const fileId = `file:${slug(path)}`;
  nodes.push({ id: fileId, label: baseName(path), type: 'file', source: path });

  const lines = content.split(/\n/);
  const headingIds: string[] = [];
  for (const line of lines) {
    const h = line.match(/^#{1,6}\s+(.*)$/);
    if (h) {
      const id = `heading:${slug(h[1])}`;
      if (!nodes.some((n) => n.id === id)) {
        nodes.push({ id, label: h[1].trim(), type: 'doc', source: path });
      }
      headingIds.push(id);
    }
  }

  const words = content.toLowerCase().match(/[a-záéíóúñ]{4,}/g) ?? [];
  const W = 8;
  const seenPairs = new Set<string>();
  for (let i = 0; i < words.length; i++) {
    const w = words[i];
    if (STOP.has(w)) continue;
    const id = `concept:${slug(w)}`;
    if (!nodes.some((n) => n.id === id)) {
      nodes.push({ id, label: w, type: 'concept', source: path });
    }
    const start = Math.max(0, i - W);
    for (let j = start; j < i; j++) {
      const w2 = words[j];
      if (STOP.has(w2)) continue;
      const id2 = `concept:${slug(w2)}`;
      if (id2 === id) continue;
      const pairKey = id < id2 ? `${id}|${id2}` : `${id2}|${id}`;
      if (seenPairs.has(pairKey)) continue;
      seenPairs.add(pairKey);
      edges.push({ source: id, target: id2, kind: 'INFERRED', label: 'co-occurs', weight: 0.5 });
    }
  }

  for (const hid of headingIds) {
    const label = (nodes.find((n) => n.id === hid) as KNode).label.toLowerCase();
    const hw = label.match(/[a-záéíóúñ]{4,}/g) ?? [];
    for (const w of hw) {
      if (STOP.has(w)) continue;
      const cid = `concept:${slug(w)}`;
      if (nodes.some((n) => n.id === cid)) {
        edges.push({ source: hid, target: cid, kind: 'INFERRED', label: 'mentions', weight: 0.5 });
      }
    }
  }

  return { nodes, edges };
}

export function buildGraph(input: { files: GraphInputFile[] }): KnowledgeGraph {
  const nodes: KNode[] = [];
  const edges: KEdge[] = [];
  const nodeIndex = new Map<string, KNode>();
  const addNode = (n: KNode): void => {
    if (!nodeIndex.has(n.id)) {
      nodeIndex.set(n.id, n);
      nodes.push(n);
    }
  };
  for (const f of input.files) {
    const kind = f.kind ?? fileKind(f.path);
    const parsed = kind === 'code' ? parseCode(f.path, f.content) : parseDoc(f.path, f.content);
    parsed.nodes.forEach(addNode);
    edges.push(...parsed.edges);
  }
  const edgeSeen = new Set<string>();
  const dedupEdges: KEdge[] = [];
  for (const e of edges) {
    const key = `${e.source}->${e.target}:${e.kind}:${e.label}`;
    if (edgeSeen.has(key)) continue;
    edgeSeen.add(key);
    dedupEdges.push(e);
  }
  return { nodes, edges: dedupEdges };
}

export function analyzeGraph(g: KnowledgeGraph): GraphAnalysis {
  const degree = new Map<string, number>();
  for (const e of g.edges) {
    degree.set(e.source, (degree.get(e.source) ?? 0) + 1);
    degree.set(e.target, (degree.get(e.target) ?? 0) + 1);
  }
  for (const n of g.nodes) n.degree = degree.get(n.id) ?? 0;

  const godNodes: GodNode[] = [...degree.entries()]
    .map(([id, d]) => ({ id, label: g.nodes.find((n) => n.id === id)?.label ?? id, degree: d }))
    .sort((a, b) => b.degree - a.degree)
    .slice(0, 5);

  const typeOf = (id: string): string => g.nodes.find((n) => n.id === id)?.type ?? 'concept';
  const surprises: SurprisingConnection[] = [];
  for (const e of g.edges) {
    const ts = typeOf(e.source);
    const tt = typeOf(e.target);
    if (ts !== tt) {
      surprises.push({
        source: e.source,
        target: e.target,
        kind: e.kind,
        score: e.weight + 0.5,
        why: `cross-type ${ts}->${tt} (${e.label})`,
      });
    }
  }
  surprises.sort((a, b) => b.score - a.score);

  const suggestedQuestions = godNodes
    .slice(0, 3)
    .map((g2) => `What connects "${g2.label}" to the rest of the graph?`);

  return { godNodes, surprisingConnections: surprises.slice(0, 8), suggestedQuestions };
}

export function buildGraphJson(g: KnowledgeGraph, analysis?: GraphAnalysis): string {
  return JSON.stringify({ graph: g, analysis: analysis ?? analyzeGraph(g) }, null, 2);
}

function kindCount(g: KnowledgeGraph, kind: EdgeKind): number {
  return g.edges.filter((e) => e.kind === kind).length;
}

export function buildGraphReport(g: KnowledgeGraph, analysis?: GraphAnalysis): string {
  const a = analysis ?? analyzeGraph(g);
  const L: string[] = [];
  L.push('# GRAPH_REPORT');
  L.push('');
  L.push(`- Nodes: ${g.nodes.length}`);
  L.push(
    `- Edges: ${g.edges.length} (EXTRACTED ${kindCount(g, 'EXTRACTED')}, INFERRED ${kindCount(
      g,
      'INFERRED',
    )}, AMBIGUOUS ${kindCount(g, 'AMBIGUOUS')})`,
  );
  L.push('');
  L.push('## God nodes (highest degree)');
  if (a.godNodes.length === 0) L.push('_none_');
  for (const gn of a.godNodes) L.push(`- **${gn.label}** (${gn.id}) — degree ${gn.degree}`);
  L.push('');
  L.push('## Surprising connections');
  if (a.surprisingConnections.length === 0) L.push('_none_');
  for (const sc of a.surprisingConnections) {
    L.push(`- ${sc.source} → ${sc.target} [${sc.kind}] score ${sc.score.toFixed(2)} — ${sc.why}`);
  }
  L.push('');
  L.push('## Suggested questions');
  if (a.suggestedQuestions.length === 0) L.push('_none_');
  for (const q of a.suggestedQuestions) L.push(`- ${q}`);
  return L.join('\n') + '\n';
}

function escSvg(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

export function buildGraphSvg(g: KnowledgeGraph, _analysis?: GraphAnalysis): string {
  const W = 800;
  const H = 600;
  const n = g.nodes.length;
  const pos = new Map<string, { x: number; y: number }>();
  g.nodes.forEach((node, i) => {
    const angle = (2 * Math.PI * i) / Math.max(1, n);
    const r = Math.min(W, H) / 2 - 60;
    pos.set(node.id, { x: W / 2 + r * Math.cos(angle), y: H / 2 + r * Math.sin(angle) });
  });

  const lines: string[] = [];
  lines.push(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" role="img" aria-labelledby="kg-title">`,
  );
  lines.push(`<title id="kg-title">Knowledge graph (${n} nodes, ${g.edges.length} edges)</title>`);
  for (const e of g.edges) {
    const p1 = pos.get(e.source);
    const p2 = pos.get(e.target);
    if (!p1 || !p2) continue;
    const color = e.kind === 'EXTRACTED' ? '#8b5cf6' : e.kind === 'INFERRED' ? '#22d3ee' : '#f59e0b';
    lines.push(
      `<line x1="${p1.x.toFixed(1)}" y1="${p1.y.toFixed(1)}" x2="${p2.x.toFixed(1)}" y2="${p2.y.toFixed(
        1,
      )}" stroke="${color}" stroke-width="1" opacity="0.5"/>`,
    );
  }
  for (const node of g.nodes) {
    const p = pos.get(node.id);
    if (!p) continue;
    const fill =
      node.type === 'symbol'
        ? '#8b5cf6'
        : node.type === 'file'
        ? '#1f1f2a'
        : node.type === 'concept'
        ? '#22d3ee'
        : '#a3a3a3';
    const r = node.degree && node.degree > 3 ? 7 : 4;
    lines.push(
      `<circle cx="${p.x.toFixed(1)}" cy="${p.y.toFixed(1)}" r="${r}" fill="${fill}" stroke="#0b0b10" stroke-width="0.5"/>`,
    );
    lines.push(
      `<text x="${(p.x + 8).toFixed(1)}" y="${(p.y + 3).toFixed(1)}" fill="#cbd5e1" font-size="9" font-family="monospace">${escSvg(
        node.label.slice(0, 16),
      )}</text>`,
    );
  }
  lines.push('</svg>');
  return lines.join('\n');
}
