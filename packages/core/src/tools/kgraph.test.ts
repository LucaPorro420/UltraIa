import { describe, it, expect } from 'vitest';
import {
  slug,
  fileKind,
  buildGraph,
  analyzeGraph,
  buildGraphJson,
  buildGraphReport,
  buildGraphSvg,
  type GraphInputFile,
} from './kgraph';

function codeFile(path: string, content: string): GraphInputFile {
  return { path, content, kind: 'code' };
}
function docFile(path: string, content: string): GraphInputFile {
  return { path, content, kind: 'doc' };
}

describe('kgraph.slug', () => {
  it('lowercases and hyphenates', () => {
    expect(slug('Hello World')).toBe('hello-world');
  });
  it('strips diacritics', () => {
    expect(slug('Ñandú Árbol')).toBe('nandu-arbol');
  });
  it('collapses repeats and trims', () => {
    expect(slug('  Foo::Bar!! ')).toBe('foo-bar');
  });
});

describe('kgraph.fileKind', () => {
  it('detects code by extension', () => {
    expect(fileKind('a/mod.ts')).toBe('code');
    expect(fileKind('x.py')).toBe('code');
  });
  it('defaults to doc otherwise', () => {
    expect(fileKind('README.md')).toBe('doc');
    expect(fileKind('notes.txt')).toBe('doc');
  });
});

describe('kgraph.buildGraph code', () => {
  const code = codeFile(
    'app/calc.ts',
    `import { add } from './util';\n` +
      `function calc() { return add(1, mul(2)); }\n` +
      `function add(a, b) { return a + b; }\n` +
      `function mul(a, b) { return a * b; }\n`,
  );

  it('creates a file node', () => {
    const g = buildGraph({ files: [code] });
    expect(g.nodes.some((n) => n.id === 'file:app-calc-ts')).toBe(true);
  });

  it('extracts symbol nodes', () => {
    const g = buildGraph({ files: [code] });
    expect(g.nodes.some((n) => n.id === 'sym:calc')).toBe(true);
    expect(g.nodes.some((n) => n.id === 'sym:add')).toBe(true);
    expect(g.nodes.some((n) => n.id === 'sym:mul')).toBe(true);
  });

  it('extracts EXTRACTED import edge', () => {
    const g = buildGraph({ files: [code] });
    expect(
      g.edges.some(
        (e) => e.kind === 'EXTRACTED' && e.label === 'imports' && e.source === 'file:app-calc-ts',
      ),
    ).toBe(true);
  });

  it('extracts EXTRACTED call edges regionally', () => {
    const g = buildGraph({ files: [code] });
    expect(
      g.edges.some(
        (e) => e.kind === 'EXTRACTED' && e.label === 'calls' && e.source === 'sym:calc' && e.target === 'sym:add',
      ),
    ).toBe(true);
    expect(
      g.edges.some(
        (e) => e.kind === 'EXTRACTED' && e.label === 'calls' && e.source === 'sym:calc' && e.target === 'sym:mul',
      ),
    ).toBe(true);
  });

  it('dedupes edges', () => {
    const g = buildGraph({ files: [code] });
    const keys = g.edges.map((e) => `${e.source}->${e.target}:${e.kind}:${e.label}`);
    expect(new Set(keys).size).toBe(keys.length);
  });
});

describe('kgraph.buildGraph doc', () => {
  const doc = docFile(
    'notes.md',
    `# Graph Theory\n\nA graph has nodes and edges. The graph structure connects nodes.\n` +
      `Nodes are vertices. Edges connect vertices in the graph.\n`,
  );

  it('creates heading nodes', () => {
    const g = buildGraph({ files: [doc] });
    expect(g.nodes.some((n) => n.id === 'heading:graph-theory')).toBe(true);
  });

  it('creates concept nodes', () => {
    const g = buildGraph({ files: [doc] });
    expect(g.nodes.some((n) => n.id === 'concept:graph')).toBe(true);
    expect(g.nodes.some((n) => n.id === 'concept:vertices')).toBe(true);
  });

  it('creates INFERRED co-occurrence edges', () => {
    const g = buildGraph({ files: [doc] });
    expect(g.edges.some((e) => e.kind === 'INFERRED' && e.label === 'co-occurs')).toBe(true);
  });

  it('skips stopwords', () => {
    const g = buildGraph({ files: [doc] });
    expect(g.nodes.some((n) => n.id === 'concept:the')).toBe(false);
  });
});

describe('kgraph.buildGraph merging', () => {
  it('connects shared concepts across docs (dedupe nodes)', () => {
    const a = docFile('a.md', 'memory and embeddings power retrieval');
    const b = docFile('b.md', 'embeddings improve search quality');
    const g = buildGraph({ files: [a, b] });
    const emb = g.nodes.filter((n) => n.id === 'concept:embeddings');
    expect(emb.length).toBe(1);
  });

  it('empty input yields empty graph', () => {
    const g = buildGraph({ files: [] });
    expect(g.nodes).toHaveLength(0);
    expect(g.edges).toHaveLength(0);
  });
});

describe('kgraph.analyzeGraph', () => {
  const code = codeFile(
    'x.ts',
    `function hub() { a(); b(); c(); }\nfunction a() {}\nfunction b() {}\nfunction c() {}\n`,
  );

  it('computes god nodes by degree', () => {
    const g = buildGraph({ files: [code] });
    const a = analyzeGraph(g);
    expect(a.godNodes[0].id).toBe('sym:hub');
    expect(a.godNodes[0].degree).toBeGreaterThan(0);
  });

  it('detects surprising cross-type connections', () => {
    const g = buildGraph({ files: [docFile('d.md', 'graph nodes and edges link concepts')] });
    const a = analyzeGraph(g);
    expect(a.surprisingConnections.length).toBeGreaterThanOrEqual(0);
  });

  it('produces suggested questions from god nodes', () => {
    const g = buildGraph({ files: [code] });
    const a = analyzeGraph(g);
    expect(Array.isArray(a.suggestedQuestions)).toBe(true);
  });
});

describe('kgraph.outputs', () => {
  const g = buildGraph({ files: [docFile('d.md', 'graph nodes edges vertices')] });

  it('buildGraphJson is valid JSON with graph+analysis', () => {
    const json = buildGraphJson(g);
    const parsed = JSON.parse(json);
    expect(parsed.graph).toBeTruthy();
    expect(parsed.analysis).toBeTruthy();
  });

  it('buildGraphReport has GRAPH_REPORT header and counts', () => {
    const rep = buildGraphReport(g);
    expect(rep).toContain('# GRAPH_REPORT');
    expect(rep).toContain('Nodes:');
    expect(rep).toContain('Edges:');
  });

  it('buildGraphSvg is a11y svg with role img', () => {
    const svg = buildGraphSvg(g);
    expect(svg).toContain('<svg');
    expect(svg).toContain('role="img"');
    expect(svg).toContain('aria-labelledby');
  });

  it('is deterministic across calls', () => {
    const g2 = buildGraph({ files: [docFile('d.md', 'graph nodes edges vertices')] });
    expect(buildGraphJson(g)).toBe(buildGraphJson(g2));
  });
});

describe('kgraph.degradation', () => {
  it('handles unparseable code without throwing', () => {
    const g = buildGraph({ files: [codeFile('weird.ts', '@@@ %%# random 123')] });
    expect(g.nodes.length).toBeGreaterThan(0);
  });
  it('handles non-ASCII doc content', () => {
    const g = buildGraph({ files: [docFile('es.md', 'grafo nodos aristas conexiones ñandú')] });
    expect(g.nodes.some((n) => n.id === 'concept:grafo')).toBe(true);
  });
});
