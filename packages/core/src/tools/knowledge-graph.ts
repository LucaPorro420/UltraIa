// -----------------------------------------------------------------------------
// knowledge-graph.ts - capability `knowledge_graph`
// -----------------------------------------------------------------------------
// Patron graphify (fuente: learning/sources/graphify.md + websearch 20/08/2026,
// repo safishamsi/graphify, MIT). Port ORIGINAL de los PRINCIPIOS (nada de
// codigo copiado, attribution header) en el estilo del dominio puro de
// UltraIa (determinista, sin red, sin deps nuevas, sin LLM en el camino).
//
// Principios portados:
// - Cualquier carpeta (codigo, docs, papers, imagenes) -> un grafo de
//   conocimiento consultable que persiste (graph.json) y evita releer crudo.
// - Todo edge lleva tag: EXTRACTED (encontrado en la fuente), INFERRED
//   (deducido por co-ocurrencia) o AMBIGUOUS (dudoso) - "honesto sobre lo que
//   encontro vs lo que adivino".
// - God nodes: conceptos de mayor grado (por donde pasa todo).
// - Comunidades: agrupacion por modularidad (Leiden-like; aqui greedy
//   determinista sin deps).
// - Surprising connections: edges entre dominios distintos rankeados por
//   score compuesto (code-paper > code-code).
// - Cache SHA256: re-ejecuciones solo procesan archivos cambiados.
// - Salidas: GRAPH_REPORT.md, graph.json, cypher.txt (Neo4j), wiki/ (index).
// -----------------------------------------------------------------------------

/** Tipos de nodo (dominio de la fuente). */
export type GraphNodeKind = 'code' | 'doc' | 'paper' | 'image' | 'note' | 'concept';

/** Nodo del grafo. */
export type GraphNode = {
  id: string;
  label: string;
  kind: GraphNodeKind;
};

/** Tag de edge: encontrado vs deducido vs ambiguo. */
export type EdgeTag = 'EXTRACTED' | 'INFERRED' | 'AMBIGUOUS';

/** Edge del grafo con su tag y peso. */
export type GraphEdge = {
  source: string;
  target: string;
  tag: EdgeTag;
  weight: number;
};

/** Grafo de conocimiento (persistible como graph.json). */
export type KnowledgeGraph = {
  nodes: GraphNode[];
  edges: GraphEdge[];
};

/** Extraccion de UNA fuente (input del builder). */
export type FileExtract = {
  path: string;
  kind: GraphNodeKind;
  /** Conceptos encontrados en la fuente. */
  concepts: string[];
  /** Relaciones explicitas (EXTRACTED). */
  relations: Array<{ a: string; b: string }>;
};

/** Hash por archivo (cache SHA256 para --update). */
export type FileCache = Record<string, string>;

/** Comunidad detectada (id de nodos). */
export type GraphCommunity = { id: string; nodes: string[]; labels: string[] };

function normLabel(s: string): string {
  return s.trim().replace(/\s+/g, ' ').slice(0, 80);
}

function nodeId(label: string): string {
  return label.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'concepto';
}

/** Normaliza un edge (source/target por id de nodo, orden canonico). */
function canonEdge(a: string, b: string): { a: string; b: string } {
  return a < b ? { a, b } : { a: b, b: a };
}

/**
 * Construye el grafo desde extracciones.
 * - Nodos: dedupe por id (primera aparicion gana su label/kind).
 * - Edges EXTRACTED: de relations explicitas.
 * - Edges INFERRED: co-ocurrencia de conceptos en la misma fuente (tag claro).
 * - Edges AMBIGUOUS: relations cuyo par incluye un concepto de UNA sola
 *   fuente sin corroboracion (honesto: "no estoy seguro").
 * Determinista: nodos por id asc, edges por (source, target, tag).
 */
export function buildKnowledgeGraph(extracts: FileExtract[]): KnowledgeGraph {
  const nodeMap = new Map<string, GraphNode>();
  const edgeMap = new Map<string, GraphEdge>();
  const conceptSources = new Map<string, Set<string>>();

  // PASO 1: registrar TODOS los nodos y fuentes por concepto (panorama completo).
  for (const ex of extracts) {
    for (const c of ex.concepts) {
      const id = nodeId(c);
      if (!nodeMap.has(id)) nodeMap.set(id, { id, label: normLabel(c), kind: ex.kind });
      if (!conceptSources.has(id)) conceptSources.set(id, new Set());
      conceptSources.get(id)!.add(ex.path);
    }
  }

  // PASO 2: edges EXTRACTED/AMBIGUOUS desde relations (con el panorama completo).
  for (const ex of extracts) {
    for (const r of ex.relations) {
      const idA = nodeId(r.a);
      const idB = nodeId(r.b);
      if (!nodeMap.has(idA)) nodeMap.set(idA, { id: idA, label: normLabel(r.a), kind: 'concept' });
      if (!nodeMap.has(idB)) nodeMap.set(idB, { id: idB, label: normLabel(r.b), kind: 'concept' });
      const { a, b } = canonEdge(idA, idB);
      if (a === b) continue;
      const key = `${a}|${b}`;
      const prev = edgeMap.get(key);
      // AMBIGUOUS: el concepto solo aparece en UNA fuente (sin corroboracion).
      const soloA = (conceptSources.get(a)?.size ?? 0) <= 1;
      const soloB = (conceptSources.get(b)?.size ?? 0) <= 1;
      const tag: EdgeTag = soloA || soloB ? 'AMBIGUOUS' : 'EXTRACTED';
      if (prev) {
        if (prev.tag === tag) edgeMap.set(key, { ...prev, weight: prev.weight + 1 });
        else if (tag === 'EXTRACTED') edgeMap.set(key, { ...prev, tag, weight: prev.weight + 1 });
        else edgeMap.set(key, { ...prev, weight: prev.weight + 1 });
      } else {
        edgeMap.set(key, { source: a, target: b, tag, weight: 1 });
      }
    }
  }

  // PASO 3: co-ocurrencia -> INFERRED (o suma peso sin degradar el tag).
  for (const ex of extracts) {
    const ids = [...new Set(ex.concepts.map(nodeId))].filter((i) => nodeMap.has(i));
    for (let i = 0; i < ids.length; i++) {
      for (let j = i + 1; j < ids.length; j++) {
        const { a, b } = canonEdge(ids[i], ids[j]);
        if (a === b) continue;
        const key = `${a}|${b}`;
        const prev = edgeMap.get(key);
        if (prev) {
          // Si ya es EXTRACTED, la co-ocurrencia solo corrobora: suma peso.
          edgeMap.set(key, { ...prev, weight: prev.weight + 1 });
        } else {
          edgeMap.set(key, { source: a, target: b, tag: 'INFERRED', weight: 1 });
        }
      }
    }
  }

  const nodes = [...nodeMap.values()].sort((x, y) => (x.id < y.id ? -1 : 1));
  const edges = [...edgeMap.values()].sort(
    (x, y) => x.source.localeCompare(y.source) || x.target.localeCompare(y.target) || x.tag.localeCompare(y.tag),
  );
  return { nodes, edges };
}

/** Grado total de un nodo (in+out). */
function degree(g: KnowledgeGraph, id: string): number {
  let d = 0;
  for (const e of g.edges) if (e.source === id || e.target === id) d += e.weight;
  return d;
}

/**
 * God nodes: conceptos de mayor grado (por donde pasa todo).
 * Determinista: grado desc, empates por id asc. k <= 0 -> todos.
 */
export function godNodes(g: KnowledgeGraph, k = 10): Array<{ id: string; label: string; degree: number }> {
  const scored = g.nodes
    .map((n) => ({ id: n.id, label: n.label, degree: degree(g, n.id) }))
    .sort((a, b) => b.degree - a.degree || (a.id < b.id ? -1 : 1));
  return k > 0 ? scored.slice(0, k) : scored;
}

/**
 * Comunidades por modularidad greedy (determinista, sin deps).
 * Version simple: agrupa por vecinos compartidos ponderados + asignacion
 * iterativa hasta convergencia (max 20 iteraciones).
 */
export function findCommunities(g: KnowledgeGraph): GraphCommunity[] {
  const labels = new Map<string, string>();
  for (const n of g.nodes) labels.set(n.id, n.id);

  const neighbors = new Map<string, Map<string, number>>();
  for (const e of g.edges) {
    if (!neighbors.has(e.source)) neighbors.set(e.source, new Map());
    if (!neighbors.has(e.target)) neighbors.set(e.target, new Map());
    neighbors.get(e.source)!.set(e.target, (neighbors.get(e.source)!.get(e.target) ?? 0) + e.weight);
    neighbors.get(e.target)!.set(e.source, (neighbors.get(e.target)!.get(e.source) ?? 0) + e.weight);
  }

  for (let iter = 0; iter < 20; iter++) {
    let changed = false;
    for (const n of g.nodes) {
      const nb = neighbors.get(n.id);
      if (!nb || nb.size === 0) continue;
      const counts = new Map<string, number>();
      for (const [other, w] of nb) {
        const l = labels.get(other) ?? other;
        counts.set(l, (counts.get(l) ?? 0) + w);
      }
      let best = labels.get(n.id)!;
      let bestScore = counts.get(best) ?? 0;
      for (const [l, score] of counts) {
        if (score > bestScore || (score === bestScore && l < best)) {
          best = l;
          bestScore = score;
        }
      }
      if (best !== labels.get(n.id)) {
        labels.set(n.id, best);
        changed = true;
      }
    }
    if (!changed) break;
  }

  const groups = new Map<string, string[]>();
  for (const n of g.nodes) {
    const l = labels.get(n.id)!;
    if (!groups.has(l)) groups.set(l, []);
    groups.get(l)!.push(n.id);
  }
  const communities: GraphCommunity[] = [];
  for (const [l, ids] of groups) {
    ids.sort();
    const labelSet = new Map<string, string>();
    for (const id of ids) {
      const node = g.nodes.find((n) => n.id === id);
      if (node) labelSet.set(node.id, node.label);
    }
    communities.push({ id: l, nodes: ids, labels: ids.map((i) => labelSet.get(i) ?? i) });
  }
  communities.sort((a, b) => b.nodes.length - a.nodes.length || (a.id < b.id ? -1 : 1));
  return communities;
}

/**
 * Surprising connections: edges que conectan dominios distintos (code-paper,
 * doc-code...) rankeados por score compuesto: cross-kind x2, peso, rareza
 * (menos aristas entre los dos dominios = mas sorprendente). Con "porque"
 * en ingles plano (determinista).
 */
export function surprisingConnections(
  g: KnowledgeGraph,
  k = 5,
): Array<{ source: string; target: string; tag: EdgeTag; score: number; why: string }> {
  const kindOf = new Map(g.nodes.map((n) => [n.id, n.kind]));
  const pairCount = new Map<string, number>();
  for (const e of g.edges) {
    const ka = kindOf.get(e.source) ?? 'concept';
    const kb = kindOf.get(e.target) ?? 'concept';
    const key = ka < kb ? `${ka}|${kb}` : `${kb}|${ka}`;
    pairCount.set(key, (pairCount.get(key) ?? 0) + 1);
  }
  const scored = g.edges
    .map((e) => {
      const ka = kindOf.get(e.source) ?? 'concept';
      const kb = kindOf.get(e.target) ?? 'concept';
      const crossKind = ka !== kb ? 2 : 1;
      const key = ka < kb ? `${ka}|${kb}` : `${kb}|${ka}`;
      const rarity = 1 / (pairCount.get(key) ?? 1);
      const score = Math.round(crossKind * e.weight * rarity * 100) / 100;
      const why =
        ka !== kb
          ? `Conecta ${ka} con ${kb} (distintos dominios) con peso ${e.weight}`
          : `Edge ${e.tag.toLowerCase()} dentro de ${ka}, peso ${e.weight}`;
      return { source: e.source, target: e.target, tag: e.tag, score, why };
    })
    .sort((a, b) => b.score - a.score || a.source.localeCompare(b.source) || a.target.localeCompare(b.target));
  return scored.slice(0, k);
}

/** Preguntas de relleno (deterministas) cuando faltan fuentes ricas. */
const FALLBACK_QUESTIONS: ReadonlyArray<string> = [
  'Cuales son los edges INFERRED con mayor peso (candidatos a verificar como EXTRACTED)?',
  'Que nodo conecta mas comunidades entre si?',
  'Que cluster podria consolidarse en una pagina wiki propia?',
  'Cual es el edge con mayor peso del grafo y que significa?',
  'Que conceptos aparecen en un solo archivo (AMBIGUOUS) y merecen corroboracion?',
];

/**
 * Preguntas sugeridas (deterministas): hasta k preguntas que el grafo esta en
 * posicion unica de responder, desde god nodes y comunidades; rellena con
 * preguntas genericas si el grafo es pobre.
 */
export function suggestedQuestions(g: KnowledgeGraph, k = 4): string[] {
  const gods = godNodes(g, 3).map((x) => x.label);
  const comms = findCommunities(g);
  const questions: string[] = [];
  if (gods.length >= 2) {
    questions.push(`Que conecta "${gods[0]}" con "${gods[1]}" en el grafo?`);
  }
  if (gods.length >= 3) {
    questions.push(`Por que "${gods[2]}" es un nodo central? Que dependencias lo alimentan?`);
  }
  const big = comms.filter((c) => c.nodes.length > 1);
  if (big.length >= 2) {
    questions.push(`Como se relaciona la comunidad "${big[0].labels[0] ?? big[0].id}" con "${big[1].labels[0] ?? big[1].id}"?`);
  }
  for (const f of FALLBACK_QUESTIONS) {
    if (questions.length >= k) break;
    questions.push(f);
  }
  return questions.slice(0, k);
}

/** Estadisticas del grafo (deterministas). */
export function graphStats(g: KnowledgeGraph): {
  nodes: number;
  edges: number;
  porTag: Record<string, number>;
  porKind: Record<string, number>;
  comunidades: number;
  godNodes: number;
} {
  const porTag: Record<string, number> = {};
  for (const e of g.edges) porTag[e.tag] = (porTag[e.tag] ?? 0) + 1;
  const porKind: Record<string, number> = {};
  for (const n of g.nodes) porKind[n.kind] = (porKind[n.kind] ?? 0) + 1;
  return {
    nodes: g.nodes.length,
    edges: g.edges.length,
    porTag,
    porKind,
    comunidades: findCommunities(g).length,
    godNodes: godNodes(g).length,
  };
}

/**
 * Plan de actualizacion incremental (cache SHA256): solo procesa archivos
 * cambiados/nuevos y detecta removidos. Determinista.
 */
export function planGraphUpdate(
  cache: FileCache,
  files: Array<{ path: string; sha256: string }>,
): { changed: string[]; removed: string[]; unchanged: number } {
  const current = new Map(files.map((f) => [f.path, f.sha256]));
  const changed = files.filter((f) => cache[f.path] !== f.sha256).map((f) => f.path);
  changed.sort();
  const removed = Object.keys(cache).filter((p) => !current.has(p)).sort();
  const unchanged = files.length - changed.length;
  return { changed, removed, unchanged };
}

/** Genera GRAPH_REPORT.md (god nodes, comunidades, sorpresas, preguntas). */
export function graphReportMarkdown(g: KnowledgeGraph): string {
  const stats = graphStats(g);
  const gods = godNodes(g, 8);
  const comms = findCommunities(g);
  const surp = surprisingConnections(g, 5);
  const q = suggestedQuestions(g);
  const lines: string[] = [
    '# GRAPH_REPORT.md - grafo de conocimiento',
    '',
    `- Nodos: ${stats.nodes} (${Object.entries(stats.porKind).map(([k, v]) => `${k}: ${v}`).join(', ')})`,
    `- Edges: ${stats.edges} (${Object.entries(stats.porTag).map(([k, v]) => `${k}: ${v}`).join(', ')})`,
    `- Comunidades: ${stats.comunidades}`,
    '',
    '## God nodes (mayor grado)',
    '',
    ...gods.map((x, i) => `${i + 1}. **${x.label}** (grado ${x.degree})`),
    '',
    '## Comunidades',
    '',
    ...comms.map((c, i) => `${i + 1}. **${c.id}** (${c.nodes.length} nodos): ${c.labels.slice(0, 6).join(', ')}${c.labels.length > 6 ? ', ...' : ''}`),
    '',
    '## Conexiones sorprendentes',
    '',
    ...surp.map((s) => `- \`${s.source}\` <-> \`${s.target}\` [${s.tag}] (score ${s.score}) - ${s.why}`),
    '',
    '## Preguntas sugeridas',
    '',
    ...q.map((x, i) => `${i + 1}. ${x}`),
    '',
  ];
  return lines.join('\n');
}

/** Genera cypher.txt para Neo4j (solo generacion, nunca ejecuta). */
export function buildNeo4jCypher(g: KnowledgeGraph): string {
  const lines: string[] = ['// Grafo de conocimiento (generado) - importar en Neo4j Browser', ''];
  for (const n of g.nodes) {
    const label = n.label.replace(/["\\]/g, '');
    lines.push(`CREATE (n:${n.kind} {id: "${n.id}", label: "${label}"});`);
  }
  for (const e of g.edges) {
    lines.push(
      `MATCH (a {id: "${e.source}"}), (b {id: "${e.target}"}) CREATE (a)-[:${e.tag} {weight: ${e.weight}}]->(b);`,
    );
  }
  return lines.join('\n');
}

/** Genera wiki/index.md (punto de entrada navegable, 1 articulo por comunidad). */
export function buildWikiMarkdown(g: KnowledgeGraph): string {
  const comms = findCommunities(g);
  const lines: string[] = [
    '# Wiki del grafo de conocimiento',
    '',
    '> Navegacion para agentes: leer este indice y luego los articulos por comunidad.',
    '',
    '## Indice',
    '',
  ];
  comms.forEach((c, i) => {
    lines.push(`${i + 1}. [${c.id}](#${c.id}) (${c.nodes.length} nodos)`);
  });
  lines.push('', '---', '');
  comms.forEach((c, i) => {
    lines.push(`## ${c.id}`, '');
    lines.push(`Comunidad ${i + 1}: ${c.labels.join(', ')}`, '');
  });
  return lines.join('\n');
}

export const knowledgeGraph = {
  buildKnowledgeGraph,
  godNodes,
  findCommunities,
  surprisingConnections,
  suggestedQuestions,
  graphStats,
  planGraphUpdate,
  graphReportMarkdown,
  buildNeo4jCypher,
  buildWikiMarkdown,
};