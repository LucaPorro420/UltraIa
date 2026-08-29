import { describe, it, expect } from 'vitest';
import {
  planAgenticGraph,
  validateAgenticGraph,
  planCrew,
  planRagPipeline,
  routeIntent,
  planLcelChain,
  planSandbox,
  planMemory,
} from './agentic';

describe('agentic — puente 6 capas (LangGraph/CrewAI/LlamaIndex/SK/LCEL/E2B/Mem0)', () => {
  it('graph valido DAG', () => {
    const g = planAgenticGraph({
      entry: 'start',
      nodes: [
        { id: 'start', kind: 'router' },
        { id: 'agent1', kind: 'agent', agent: 'researcher' },
        { id: 'tool1', kind: 'tool', tool: 'research' },
      ],
      edges: [
        { from: 'start', to: 'agent1' },
        { from: 'agent1', to: 'tool1' },
      ],
    });
    expect(g.validation.ok).toBe(true);
    if (g.validation.ok) expect(g.validation.order).toContain('start');
  });

  it('graph detecta edge a nodo inexistente', () => {
    const g = planAgenticGraph({
      entry: 'start',
      nodes: [{ id: 'start', kind: 'router' }],
      edges: [{ from: 'start', to: 'missing' }],
    });
    expect(g.validation.ok).toBe(false);
  });

  it('graph ciclo sin maxCycles falla, con maxCycles pasa', () => {
    const a = validateAgenticGraph({
      id: 'g1',
      entry: 'a',
      nodes: [{ id: 'a', kind: 'agent' }, { id: 'b', kind: 'agent' }],
      edges: [{ from: 'a', to: 'b' }, { from: 'b', to: 'a' }],
    });
    expect(a.ok).toBe(false);
    const b = validateAgenticGraph({
      id: 'g2',
      entry: 'a',
      nodes: [{ id: 'a', kind: 'agent' }, { id: 'b', kind: 'agent' }],
      edges: [{ from: 'a', to: 'b' }, { from: 'b', to: 'a' }],
      maxCycles: 5,
    });
    expect(b.ok).toBe(true);
  });

  it('crew valido', () => {
    const c = planCrew({
      roles: [
        { name: 'researcher', goal: 'investigar mercado' },
        { name: 'writer', goal: 'redactar articulo', tools: ['research'] },
      ],
      tasks: [
        { id: 't1', role: 'researcher', objective: 'buscar datos' },
        { id: 't2', role: 'writer', objective: 'escribir', dependsOn: ['t1'] },
      ],
    });
    expect(c.validation.ok).toBe(true);
    expect(c.roles.length).toBe(2);
  });

  it('crew falla si role inexistente', () => {
    const c = planCrew({
      roles: [{ name: 'r1', goal: 'g1' }],
      tasks: [{ id: 't1', role: 'missing', objective: 'obj' }],
    });
    expect(c.validation.ok).toBe(false);
  });

  it('crew falla si dependsOn inexistente', () => {
    const c = planCrew({
      roles: [{ name: 'r1', goal: 'g1' }],
      tasks: [
        { id: 't1', role: 'r1', objective: 'a' },
        { id: 't2', role: 'r1', objective: 'b', dependsOn: ['nope'] },
      ],
    });
    expect(c.validation.ok).toBe(false);
  });

  it('rag pipeline', () => {
    const r = planRagPipeline({ loaders: ['pdf', 'web'], chunk: { size: 1000, overlap: 100 }, embed: 'local', store: 'qdrant' });
    expect(r.loaders).toContain('pdf');
    expect(r.topK).toBe(5);
  });

  it('routeIntent mapea intenciones', () => {
    expect(routeIntent('quiero buscar info sobre IA').capability).toBe('research');
    expect(routeIntent('generar imagen de un gato').capability).toBe('image');
    expect(routeIntent('trazar pasos del agente').capability).toBe('observability');
    expect(routeIntent('ejecutar codigo python').capability).toBe('sandbox');
    expect(routeIntent('hola que tal').capability).toBe('reach');
    expect(routeIntent('hola').confidence).toBe(0.5);
  });

  it('planLcelChain', () => {
    const chain = planLcelChain([
      { kind: 'prompt', name: 'template' },
      { kind: 'model', name: 'gpt-4o-mini' },
      { kind: 'parser', name: 'json' },
    ]);
    expect(chain.runnable).toBe(true);
    expect(chain.steps.length).toBe(3);
  });

  it('planLcelChain sin model no runnable', () => {
    const chain = planLcelChain([{ kind: 'prompt', name: 'p1' }]);
    expect(chain.runnable).toBe(false);
  });

  it('planLcelChain vacio lanza', () => {
    expect(() => planLcelChain([])).toThrow();
  });

  it('planSandbox local sin E2B_API_KEY', () => {
    const s = planSandbox({ lang: 'python', code: 'print("hi")' });
    expect(s.provider).toBe('local');
    expect(s.lang).toBe('python');
  });

  it('planSandbox e2b con key (mock env)', () => {
    const prev = process.env.E2B_API_KEY;
    process.env.E2B_API_KEY = 'e2b_test';
    const s = planSandbox({ lang: 'javascript', code: 'console.log(1)' });
    expect(s.provider).toBe('e2b');
    if (prev === undefined) delete process.env.E2B_API_KEY;
    else process.env.E2B_API_KEY = prev;
  });

  it('planMemory qdrant por defecto', () => {
    const m = planMemory({ kind: 'semantic', query: 'buscar memoria' });
    expect(m.store).toBe('qdrant');
    expect(m.provider).toBe('qdrant');
  });

  it('planMemory mem0 con key', () => {
    const prev = process.env.MEM0_API_KEY;
    process.env.MEM0_API_KEY = 'mem0_test';
    const m = planMemory({ kind: 'long', query: 'recordar', store: 'mem0' });
    expect(m.store).toBe('mem0');
    if (prev === undefined) delete process.env.MEM0_API_KEY;
    else process.env.MEM0_API_KEY = prev;
  });

  it('idempotencia: misma entrada produce misma shape (sin id)', () => {
    const g1 = planAgenticGraph({ entry: 'a', nodes: [{ id: 'a', kind: 'agent' }], edges: [] });
    const g2 = planAgenticGraph({ entry: 'a', nodes: [{ id: 'a', kind: 'agent' }], edges: [] });
    expect(g1.nodes).toEqual(g2.nodes);
    expect(g1.edges).toEqual(g2.edges);
  });
});
