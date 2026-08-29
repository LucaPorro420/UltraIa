// -----------------------------------------------------------------------------
// agentic.ts — capability `agentic` (puente infraestructura agéntica)
// -----------------------------------------------------------------------------
// Port ORIGINAL de los PRINCIPIOS de las 6 capas pedidas en infraestructura
// agéntica (sin código copiado, sin deps Python):
//  1. Orquestación: LangGraph (grafo + estado cíclico), CrewAI (roles+tareas),
//     Microsoft Agent Framework / AutoGen (orquestador), LlamaIndex (RAG pipeline)
//  2. Cerebro: Ollama/OpenAI/Anthropic/Groq (ya en ai/llm.ts; aquí solo routing)
//  3. Enrutamiento: Semantic Kernel (intención→skill) + LCEL (cadena declarativa)
//  4. Sandbox: E2B Code Interpreter (ejecución aislada)
//  5. Memoria/Chat: Chainlit/Streamlit (UI) + Mem0 (memoria persistente)
//  6. Observabilidad: Langfuse/LiteralAI (traces) — implementación en observability.ts
//
// Este módulo es el PUENTE determinista que demuestra cada capa como PLAN
// serializable (no ejecuta red ni Python). La ejecución real vive en los
// runners/tools ya existentes (harness, llm, qdrant-memory, etc.).
// -----------------------------------------------------------------------------

import { z } from 'zod';

// ---------------------------------------------------------------------------
// 1) Grafo agéntico (LangGraph-style)
// ---------------------------------------------------------------------------

export const agenticNodeSchema = z.object({
  id: z.string().min(1).max(50).regex(/^[a-z0-9][a-z0-9-_]*$/i),
  kind: z.enum(['agent', 'tool', 'router', 'memory', 'human']),
  agent: z.string().min(1).max(50).optional(),
  tool: z.string().min(1).max(50).optional(),
  description: z.string().max(200).optional(),
});

export const agenticEdgeSchema = z.object({
  from: z.string().min(1).max(50),
  to: z.string().min(1).max(50),
  condition: z.string().max(200).optional(),
  label: z.string().max(50).optional(),
});

export const agenticGraphSchema = z.object({
  id: z.string().min(1).max(50).regex(/^[a-z0-9][a-z0-9-_]*$/i),
  entry: z.string().min(1).max(50),
  nodes: z.array(agenticNodeSchema).min(1).max(30),
  edges: z.array(agenticEdgeSchema).max(50),
  maxCycles: z.number().int().min(1).max(100).optional(),
  description: z.string().max(500).optional(),
});

export type AgenticNode = z.infer<typeof agenticNodeSchema>;
export type AgenticEdge = z.infer<typeof agenticEdgeSchema>;
export type AgenticGraph = z.infer<typeof agenticGraphSchema>;

/** Valida DAG y que entry exista; retorna orden topológico o error. */
export function validateAgenticGraph(graph: AgenticGraph): { ok: true; order: string[] } | { ok: false; reason: string } {
  const parsed = agenticGraphSchema.parse(graph);
  const nodeIds = new Set(parsed.nodes.map((n) => n.id));
  if (!nodeIds.has(parsed.entry)) return { ok: false, reason: `entry '${parsed.entry}' no existe entre nodes` };
  for (const e of parsed.edges) {
    if (!nodeIds.has(e.from)) return { ok: false, reason: `edge from '${e.from}' no existe` };
    if (!nodeIds.has(e.to)) return { ok: false, reason: `edge to '${e.to}' no existe` };
  }
  // Kahn para detectar ciclo
  const indeg = new Map<string, number>();
  for (const id of nodeIds) indeg.set(id, 0);
  for (const e of parsed.edges) indeg.set(e.to, (indeg.get(e.to) ?? 0) + 1);
  const q: string[] = [...nodeIds].filter((id) => (indeg.get(id) ?? 0) === 0);
  const order: string[] = [];
  const adj = new Map<string, string[]>();
  for (const e of parsed.edges) {
    if (!adj.has(e.from)) adj.set(e.from, []);
    adj.get(e.from)!.push(e.to);
  }
  while (q.length) {
    const cur = q.shift()!;
    order.push(cur);
    for (const nb of adj.get(cur) ?? []) {
      indeg.set(nb, (indeg.get(nb) ?? 1) - 1);
      if ((indeg.get(nb) ?? 0) === 0) q.push(nb);
    }
  }
  // Si hay ciclo, algunos nodos no fueron visitados; pero permitimos ciclos si maxCycles está definido (LangGraph cíclico)
  if (order.length !== nodeIds.size) {
    if (parsed.maxCycles !== undefined) {
      // ciclo permitido — retornar orden parcial + resto
      const remaining = [...nodeIds].filter((id) => !order.includes(id));
      return { ok: true, order: [...order, ...remaining] };
    }
    return { ok: false, reason: 'grafo contiene ciclo sin maxCycles (LangGraph requiere límite)' };
  }
  return { ok: true, order };
}

export function planAgenticGraph(input: Omit<AgenticGraph, 'id'> & { id?: string }): AgenticGraph & { validation: ReturnType<typeof validateAgenticGraph> } {
  const id = input.id ?? `graph-${Date.now().toString(36)}`;
  const graph = agenticGraphSchema.parse({ ...input, id });
  const validation = validateAgenticGraph(graph);
  return { ...graph, validation };
}

// ---------------------------------------------------------------------------
// 2) Crew (CrewAI-style: roles + tasks)
// ---------------------------------------------------------------------------

export const crewRoleSchema = z.object({
  name: z.string().min(1).max(50).regex(/^[a-z0-9][a-z0-9-_]*$/i),
  goal: z.string().min(1).max(300),
  backstory: z.string().max(500).optional(),
  tools: z.array(z.string().min(1).max(50)).max(10).optional(),
  model: z.string().max(50).optional(),
});

export const crewTaskSchema = z.object({
  id: z.string().min(1).max(50).regex(/^[a-z0-9][a-z0-9-_]*$/i),
  role: z.string().min(1).max(50),
  objective: z.string().min(1).max(500),
  dependsOn: z.array(z.string().min(1).max(50)).max(10).optional(),
  expectedOutput: z.string().max(300).optional(),
});

export const crewPlanSchema = z.object({
  id: z.string().min(1).max(50).regex(/^[a-z0-9][a-z0-9-_]*$/i),
  roles: z.array(crewRoleSchema).min(1).max(12),
  tasks: z.array(crewTaskSchema).min(1).max(20),
  verbose: z.boolean().optional(),
});

export type CrewRole = z.infer<typeof crewRoleSchema>;
export type CrewTask = z.infer<typeof crewTaskSchema>;
export type CrewPlan = z.infer<typeof crewPlanSchema>;

export function planCrew(input: Omit<CrewPlan, 'id'> & { id?: string }): CrewPlan & { validation: { ok: boolean; reason?: string } } {
  const id = input.id ?? `crew-${Date.now().toString(36)}`;
  const parsed = crewPlanSchema.parse({ ...input, id });
  const roleNames = new Set(parsed.roles.map((r) => r.name));
  for (const t of parsed.tasks) {
    if (!roleNames.has(t.role)) return { ...parsed, validation: { ok: false, reason: `task '${t.id}' role '${t.role}' no existe` } };
  }
  const taskIds = new Set(parsed.tasks.map((t) => t.id));
  for (const t of parsed.tasks) {
    for (const dep of t.dependsOn ?? []) {
      if (!taskIds.has(dep)) return { ...parsed, validation: { ok: false, reason: `task '${t.id}' dependsOn '${dep}' no existe` } };
    }
  }
  return { ...parsed, validation: { ok: true } };
}

// ---------------------------------------------------------------------------
// 3) RAG pipeline (LlamaIndex-style)
// ---------------------------------------------------------------------------

export const ragPipelineSchema = z.object({
  id: z.string().min(1).max(50).regex(/^[a-z0-9][a-z0-9-_]*$/i),
  loaders: z.array(z.enum(['pdf', 'web', 'markdown', 'text', 'csv'])).min(1).max(5),
  chunk: z.object({ size: z.number().int().min(100).max(4000), overlap: z.number().int().min(0).max(500) }),
  embed: z.enum(['openai', 'local', 'qdrant', 'ollama']),
  store: z.enum(['qdrant', 'memory', 'chroma']),
  topK: z.number().int().min(1).max(20).optional(),
});

export type RagPipeline = z.infer<typeof ragPipelineSchema>;

export function planRagPipeline(input: Omit<RagPipeline, 'id'> & { id?: string }): RagPipeline {
  const id = input.id ?? `rag-${Date.now().toString(36)}`;
  return ragPipelineSchema.parse({ topK: 5, ...input, id });
}

// ---------------------------------------------------------------------------
// 4) Routing (Semantic Kernel + LCEL)
// ---------------------------------------------------------------------------

export const INTENT_TO_CAPABILITY: Record<string, string> = {
  // intenciones → capability de UltraIa (mapea SK "skills" a tools reales)
  'buscar info': 'research',
  'investigar': 'research',
  'generar imagen': 'image',
  'crear video': 'video',
  'musica': 'music',
  'publicar': 'publish',
  'memoria': 'semantic_memory',
  'diagrama': 'diagram',
  'codigo': 'sdf',
  'geometria': 'geometry',
  'analizar repo': 'kgraph',
};

export function routeIntent(intent: string): { capability: string; confidence: number; alternatives: string[] } {
  const lower = intent.toLowerCase().trim();
  // Prioridad alta: sandbox / observabilidad / pdf antes que el mapa genérico (evita que "codigo" capture "ejecutar codigo")
  if (lower.includes('sandbox') || lower.includes('ejecutar codigo')) return { capability: 'sandbox', confidence: 0.8, alternatives: ['harness', 'sdf', 'codevfx'] };
  if (lower.includes('trazar') || lower.includes('trace') || lower.includes('observ')) return { capability: 'observability', confidence: 0.8, alternatives: ['metrics', 'harness'] };
  if (lower.includes('pdf') || lower.includes('paper')) return { capability: 'pdfsearch', confidence: 0.7, alternatives: ['research', 'vault'] };
  for (const [k, cap] of Object.entries(INTENT_TO_CAPABILITY)) {
    if (lower.includes(k)) return { capability: cap, confidence: 0.9, alternatives: Object.values(INTENT_TO_CAPABILITY).filter((c) => c !== cap).slice(0, 3) };
  }
  return { capability: 'reach', confidence: 0.5, alternatives: ['research', 'semantic_memory', 'memory'] };
}

/** Construye una cadena LCEL declarativa (SK prompt→model→parser) como plan JSON. */
export function planLcelChain(steps: Array<{ kind: 'prompt' | 'model' | 'parser' | 'tool'; name: string; config?: Record<string, unknown> }>): { id: string; steps: typeof steps; runnable: boolean } {
  if (steps.length === 0) throw new Error('LCEL chain requiere al menos 1 step');
  return { id: `lcel-${Date.now().toString(36)}`, steps, runnable: steps.some((s) => s.kind === 'model') };
}

// ---------------------------------------------------------------------------
// 5) Sandbox (E2B-style)
// ---------------------------------------------------------------------------

export const sandboxPlanSchema = z.object({
  id: z.string().min(1).max(50).regex(/^[a-z0-9][a-z0-9-_]*$/i),
  lang: z.enum(['python', 'javascript', 'typescript', 'bash']),
  code: z.string().min(1).max(10000),
  timeoutMs: z.number().int().min(1000).max(60000).optional(),
  env: z.record(z.string()).optional(),
});

export type SandboxPlan = z.infer<typeof sandboxPlanSchema>;

export function planSandbox(input: Omit<SandboxPlan, 'id'> & { id?: string }): SandboxPlan & { provider: 'e2b' | 'local'; reason: string } {
  const id = input.id ?? `sbx-${Date.now().toString(36)}`;
  const parsed = sandboxPlanSchema.parse({ timeoutMs: 30000, ...input, id });
  const hasE2bKey = !!process.env.E2B_API_KEY;
  return { ...parsed, provider: hasE2bKey ? 'e2b' : 'local', reason: hasE2bKey ? 'E2B_API_KEY presente → nube aislada' : 'sin E2B_API_KEY → ejecución local (allowlist)' };
}

// ---------------------------------------------------------------------------
// 6) Memoria/Chat (Mem0 + Chainlit/Streamlit-style)
// ---------------------------------------------------------------------------

export const memoryPlanSchema = z.object({
  id: z.string().min(1).max(50).regex(/^[a-z0-9][a-z0-9-_]*$/i),
  kind: z.enum(['short', 'long', 'episodic', 'semantic']),
  query: z.string().min(1).max(500),
  topK: z.number().int().min(1).max(20).optional(),
  store: z.enum(['mem0', 'qdrant', 'memory-fs', 'brainpage']).optional(),
});

export type MemoryPlan = z.infer<typeof memoryPlanSchema>;

export function planMemory(input: Omit<MemoryPlan, 'id'> & { id?: string }): MemoryPlan & { provider: string; note: string } {
  const id = input.id ?? `mem-${Date.now().toString(36)}`;
  const parsed = memoryPlanSchema.parse({ topK: 5, store: 'qdrant', ...input, id });
  const hasMem0 = !!process.env.MEM0_API_KEY;
  const store = parsed.store ?? (hasMem0 ? 'mem0' : 'qdrant');
  return {
    ...parsed,
    store: store as MemoryPlan['store'],
    provider: store,
    note: store === 'mem0' && !hasMem0 ? 'MEM0_API_KEY faltante → fallback a qdrant (fail-soft)' : `store ${store} seleccionado`,
  };
}

// ---------------------------------------------------------------------------
// Surface agregada
// ---------------------------------------------------------------------------

export const agentic = {
  planAgenticGraph,
  validateAgenticGraph,
  planCrew,
  planRagPipeline,
  routeIntent,
  planLcelChain,
  planSandbox,
  planMemory,
  INTENT_TO_CAPABILITY,
  agenticGraphSchema,
  crewPlanSchema,
  ragPipelineSchema,
  sandboxPlanSchema,
  memoryPlanSchema,
};
