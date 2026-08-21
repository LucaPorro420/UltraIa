// knowledge-graph.test.ts - capability `knowledge_graph` (dominio puro determinista)
import { describe, expect, it } from 'vitest';
import {
  buildKnowledgeGraph,
  buildNeo4jCypher,
  buildWikiMarkdown,
  findCommunities,
  godNodes,
  graphReportMarkdown,
  graphStats,
  planGraphUpdate,
  suggestedQuestions,
  surprisingConnections,
  type FileExtract,
} from './knowledge-graph';

const EXTRACTS: FileExtract[] = [
  {
    path: 'docs/razonamiento-a.md',
    kind: 'doc',
    concepts: ['qdrant', 'memoria', 'vectores'],
    relations: [{ a: 'qdrant', b: 'vectores' }],
  },
  {
    path: 'packages/core/src/tools/qdrant-memory.ts',
    kind: 'code',
    concepts: ['qdrant', 'vectores', 'djb2'],
    relations: [{ a: 'qdrant', b: 'djb2' }],
  },
  {
    path: 'learning/truth/truth-qdrant.json',
    kind: 'paper',
    concepts: ['qdrant', 'memoria'],
    relations: [{ a: 'qdrant', b: 'memoria' }],
  },
];

describe('knowledge-graph: buildKnowledgeGraph', () => {
  it('dedupe nodos por id y ordena determinista', () => {
    const g = buildKnowledgeGraph(EXTRACTS);
    const ids = g.nodes.map((n) => n.id);
    expect(ids).toEqual([...ids].sort());
    expect(g.nodes).toHaveLength(4); // qdrant, memoria, vectores, djb2
    const qdrant = g.nodes.find((n) => n.id === 'qdrant')!;
    expect(qdrant.kind).toBe('doc'); // primera aparición gana
  });

  it('relations explicitas -> EXTRACTED (con peso corroborado)', () => {
    const g = buildKnowledgeGraph(EXTRACTS);
    const e = g.edges.find((x) => x.source === 'qdrant' && x.target === 'vectores')!;
    expect(e.tag).toBe('EXTRACTED');
    expect(e.weight).toBe(3); // relation doc + co-ocurrencia doc + co-ocurrencia code
  });

  it('co-ocurrencia sin relation -> INFERRED', () => {
    const g = buildKnowledgeGraph(EXTRACTS);
    const e = g.edges.find((x) => x.source === 'djb2' && x.target === 'memoria');
    // djb2 y memoria nunca co-ocurren en la misma fuente -> sin edge
    expect(e).toBeUndefined();
    const m = g.edges.find((x) => x.source === 'memoria' && x.target === 'vectores')!;
    expect(m.tag).toBe('INFERRED'); // co-ocurren en docs/razonamiento-a.md
  });

  it('concepto de una sola fuente -> AMBIGUOUS', () => {
    const g = buildKnowledgeGraph([
      {
        path: 'a.md',
        kind: 'doc',
        concepts: ['x', 'y'],
        relations: [{ a: 'x', b: 'y' }],
      },
    ]);
    const e = g.edges.find((x) => x.source === 'x' && x.target === 'y')!;
    expect(e.tag).toBe('AMBIGUOUS');
  });

  it('edge auto (a===b) se descarta', () => {
    const g = buildKnowledgeGraph([{ path: 'a.md', kind: 'doc', concepts: ['x'], relations: [{ a: 'x', b: 'x' }] }]);
    expect(g.edges).toHaveLength(0);
  });
});

describe('knowledge-graph: godNodes', () => {
  it('rankea por grado desc, empates por id asc', () => {
    const g = buildKnowledgeGraph(EXTRACTS);
    const gods = godNodes(g, 3);
    expect(gods[0].id).toBe('qdrant');
    expect(gods[0].degree).toBeGreaterThan(gods[1].degree);
    expect(gods).toHaveLength(3);
  });

  it('k<=0 devuelve todos', () => {
    const g = buildKnowledgeGraph(EXTRACTS);
    expect(godNodes(g, 0)).toHaveLength(g.nodes.length);
  });
});

describe('knowledge-graph: findCommunities', () => {
  it('agrupa nodos conectados y ordena por tamaño desc', () => {
    const g = buildKnowledgeGraph(EXTRACTS);
    const comms = findCommunities(g);
    const sizes = comms.map((c) => c.nodes.length);
    expect(sizes).toEqual([...sizes].sort((a, b) => b - a));
    const big = comms[0];
    expect(big.nodes).toContain('qdrant');
    expect(big.nodes.length).toBeGreaterThanOrEqual(3);
  });

  it('nodos aislados son comunidades de 1', () => {
    const g = buildKnowledgeGraph([{ path: 'a.md', kind: 'doc', concepts: ['solo'], relations: [] }]);
    expect(findCommunities(g)).toHaveLength(1);
    expect(findCommunities(g)[0].nodes).toEqual(['solo']);
  });

  it('determinista: dos corridas iguales', () => {
    const g = buildKnowledgeGraph(EXTRACTS);
    expect(findCommunities(g)).toEqual(findCommunities(g));
  });
});

describe('knowledge-graph: surprisingConnections', () => {
  it('edges cross-kind rankean sobre same-kind', () => {
    const g = buildKnowledgeGraph([
      {
        path: 'code-a.ts',
        kind: 'code',
        concepts: ['alfa', 'beta'],
        relations: [{ a: 'alfa', b: 'beta' }],
      },
      {
        path: 'paper-a.pdf',
        kind: 'paper',
        concepts: ['alfa', 'gamma'],
        relations: [{ a: 'alfa', b: 'gamma' }],
      },
    ]);
    const s = surprisingConnections(g, 5);
    expect(s[0].source === 'alfa' && (s[0].target === 'gamma' || s[0].target === 'beta')).toBe(true);
    // code-paper (cross-kind) debe estar antes que code-code
    const cross = s.findIndex((x) => x.why.includes('code con paper') || x.why.includes('paper con code'));
    const same = s.findIndex((x) => x.why.includes('dentro de code'));
    expect(cross).toBeLessThan(same);
  });
});

describe('knowledge-graph: suggestedQuestions', () => {
  it('genera preguntas desde god nodes y comunidades (deterministas)', () => {
    const g = buildKnowledgeGraph(EXTRACTS);
    const q = suggestedQuestions(g, 4);
    expect(q).toHaveLength(4);
    expect(q.join(' ')).toContain('qdrant');
    // determinista
    expect(suggestedQuestions(g, 4)).toEqual(q);
  });
});

describe('knowledge-graph: graphStats', () => {
  it('cuenta nodos/edges/tags/kinds/comunidades', () => {
    const g = buildKnowledgeGraph(EXTRACTS);
    const s = graphStats(g);
    expect(s.nodes).toBe(4);
    expect(s.edges).toBeGreaterThanOrEqual(3);
    expect(s.porTag.EXTRACTED).toBeGreaterThan(0);
    expect(s.porTag.INFERRED).toBeGreaterThan(0);
    expect(s.porKind.doc).toBe(3); // qdrant, memoria, vectores heredan kind doc (primera fuente)
    expect(s.comunidades).toBeGreaterThanOrEqual(1);
  });
});

describe('knowledge-graph: planGraphUpdate (cache SHA256)', () => {
  it('detecta changed/removed/unchanged', () => {
    const cache = { 'a.md': 'aaa', 'b.md': 'bbb' };
    const plan = planGraphUpdate(cache, [
      { path: 'a.md', sha256: 'aaa' },
      { path: 'c.md', sha256: 'ccc' },
    ]);
    expect(plan.changed).toEqual(['c.md']);
    expect(plan.removed).toEqual(['b.md']);
    expect(plan.unchanged).toBe(1);
  });

  it('todo nuevo cuando cache vacío', () => {
    const plan = planGraphUpdate({}, [{ path: 'a.md', sha256: 'x' }]);
    expect(plan.changed).toEqual(['a.md']);
    expect(plan.removed).toEqual([]);
    expect(plan.unchanged).toBe(0);
  });
});

describe('knowledge-graph: salidas (report/cypher/wiki)', () => {
  it('graphReportMarkdown incluye secciones y stats', () => {
    const g = buildKnowledgeGraph(EXTRACTS);
    const md = graphReportMarkdown(g);
    expect(md).toContain('# GRAPH_REPORT.md');
    expect(md).toContain('## God nodes');
    expect(md).toContain('## Comunidades');
    expect(md).toContain('## Conexiones sorprendentes');
    expect(md).toContain('## Preguntas sugeridas');
    expect(md).toContain('qdrant');
  });

  it('buildNeo4jCypher genera CREATE por nodo y MATCH+CREATE por edge', () => {
    const g = buildKnowledgeGraph(EXTRACTS);
    const cypher = buildNeo4jCypher(g);
    expect(cypher).toContain('CREATE (n:doc {id: "qdrant"');
    expect(cypher).toContain('MATCH (a {id: "qdrant"}), (b {id: "vectores"}) CREATE (a)-[:EXTRACTED {weight:');
    expect(cypher.split('\n').filter((l) => l.startsWith('CREATE'))).toHaveLength(g.nodes.length);
  });

  it('buildWikiMarkdown genera índice por comunidad', () => {
    const g = buildKnowledgeGraph(EXTRACTS);
    const wiki = buildWikiMarkdown(g);
    expect(wiki).toContain('# Wiki del grafo de conocimiento');
    expect(wiki).toContain('## Indice');
  });
});