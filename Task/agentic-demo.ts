#!/usr/bin/env vite-node
// Task/agentic-demo.ts — demo Fase A + puente 6 capas
// Genera resultTask/agentic/ con trazas + grafos deterministas (keyless, sin red).
import { mkdirSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { createObservabilityTracer } from '../packages/core/src/tools/observability';
import { planAgenticGraph, planCrew, planRagPipeline, routeIntent, planLcelChain, planSandbox, planMemory } from '../packages/core/src/tools/agentic';

const outDir = join(process.cwd(), 'resultTask', 'agentic');
mkdirSync(outDir, { recursive: true });

async function main() {
  // 1. Observabilidad (Langfuse port) — keyless, buffer local
  const tracer = createObservabilityTracer({ traceName: 'agentic-demo', tags: ['demo', 'faseA'] });
  tracer.traceStep({ name: 'plan-graph', input: { entry: 'start' }, output: { ok: true }, latencyMs: 12 });
  tracer.traceGeneration({ name: 'llm-research', model: 'gpt-4o-mini', input: 'investiga IA', output: 'resultado', usage: { input: 100, output: 50, total: 150 } });
  tracer.score('quality', 0.92, 'demo determinista');
  const dump = tracer.dump();
  // no flush sin keys (fail-soft verificado) — solo dump local

  // 2. Grafo (LangGraph-style)
  const graph = planAgenticGraph({
    entry: 'router',
    nodes: [
      { id: 'router', kind: 'router', description: 'enruta intención' },
      { id: 'researcher', kind: 'agent', agent: 'bp-investigador' },
      { id: 'writer', kind: 'agent', agent: 'bp-redactor' },
      { id: 'publish', kind: 'tool', tool: 'publish' },
    ],
    edges: [
      { from: 'router', to: 'researcher', label: 'investigar' },
      { from: 'researcher', to: 'writer', label: 'redactar' },
      { from: 'writer', to: 'publish', label: 'publicar' },
    ],
    description: 'Flujo AutoPub F1→F4 como grafo',
  });

  // 3. Crew (CrewAI-style)
  const crew = planCrew({
    roles: [
      { name: 'researcher', goal: 'investigar tendencias', backstory: 'analista senior', tools: ['research', 'topics'] },
      { name: 'writer', goal: 'redactar articulo viral', tools: ['present'] },
      { name: 'publisher', goal: 'publicar en 8 canales', tools: ['publish'] },
    ],
    tasks: [
      { id: 't-research', role: 'researcher', objective: 'generar 3 briefs sobre IA' },
      { id: 't-write', role: 'writer', objective: 'redactar post + hashtags', dependsOn: ['t-research'] },
      { id: 't-publish', role: 'publisher', objective: 'publicar en telegram', dependsOn: ['t-write'] },
    ],
  });

  // 4. RAG (LlamaIndex-style)
  const rag = planRagPipeline({ loaders: ['web', 'pdf'], chunk: { size: 1000, overlap: 100 }, embed: 'local', store: 'qdrant', topK: 5 });

  // 5. Routing (SK/LCEL)
  const route = routeIntent('quiero generar imagen de un paisaje para publicar');
  const lcel = planLcelChain([
    { kind: 'prompt', name: 'investigacion', config: { template: 'investiga {query}' } },
    { kind: 'model', name: 'gpt-4o-mini' },
    { kind: 'tool', name: 'image' },
    { kind: 'parser', name: 'json' },
  ]);

  // 6. Sandbox (E2B-style)
  const sandbox = planSandbox({ lang: 'python', code: 'print("hello from sandbox")\nfor i in range(3): print(i)' });

  // 7. Memory (Mem0/Chainlit-style)
  const memory = planMemory({ kind: 'semantic', query: 'como publicar en youtube shorts', store: 'qdrant' });

  const files: Record<string, unknown> = {
    'trace.json': { traceId: tracer.traceId, traceName: tracer.traceName, enabled: tracer.enabled, dump, buffered: tracer.buffered },
    'graph.json': graph,
    'crew.json': crew,
    'rag.json': rag,
    'route.json': { intent: 'generar imagen para publicar', route, lcel },
    'sandbox.json': sandbox,
    'memory.json': memory,
  };

  for (const [name, data] of Object.entries(files)) {
    const p = join(outDir, name);
    writeFileSync(p, JSON.stringify(data, null, 2), 'utf-8');
    console.log(`[agentic-demo] ${name} → ${p}`);
  }

  const manifest = {
    generatedAt: new Date().toISOString(),
    files: Object.keys(files),
    note: 'Demo Fase A + puente 6 capas (determinista, keyless). Con LANGFUSE_* se puede hacer tracer.flush() real.',
    traceEnabled: tracer.enabled,
  };
  writeFileSync(join(outDir, 'manifest.json'), JSON.stringify(manifest, null, 2), 'utf-8');
  console.log(`[agentic-demo] manifest.json → ${join(outDir, 'manifest.json')}`);
  console.log(`[agentic-demo] DONE — ${Object.keys(files).length + 1} archivos en ${outDir}`);
  console.log(`[agentic-demo] trace enabled=${tracer.enabled} buffered=${tracer.buffered.length} totalEvents=${tracer.totalEvents}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
