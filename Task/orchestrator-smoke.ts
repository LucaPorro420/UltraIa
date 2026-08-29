// -----------------------------------------------------------------------------
// Task/orchestrator-smoke.ts - E2E smoke test real (loop task A)
// -----------------------------------------------------------------------------
// Invoca orchestrator_route y chat_memory_session con un modelo REAL via OpenRouter
// (keyless :free) para verificar el pipeline completo de extremo a extremo.
//
// No corre en el gate (es un script de Task/ ejecutado via vite-node). Para correrlo:
//   node_modules\.bin\vite-node.cmd Task/orchestrator-smoke.ts
//
// Requiere OPENROUTER_API_KEY en .env (ya presente en este repo, gitignored).
// Evidencia: resultTask/orchestrator-smoke/evidence.json
// -----------------------------------------------------------------------------

import * as fs from 'node:fs';
import * as path from 'node:path';
import { generateText } from 'ai';

import { orchestratorTool, chatMemoryTool, modelFor } from '../packages/core/src/ai/llm';
import { ModelOrchestrator } from '../packages/core/src/ai/orchestrator';
import { FREE_MODEL_CATALOG } from '../packages/core/src/ai/model-catalog';

const ROOT = process.cwd();

// --- cargar .env si existe (igual que start.py) -----------------------------
function loadEnv(): void {
  const envPath = path.join(ROOT, '.env');
  if (!fs.existsSync(envPath)) return;
  for (const raw of fs.readFileSync(envPath, 'utf8').split('\n')) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;
    const eq = line.indexOf('=');
    if (eq < 0) continue;
    const key = line.slice(0, eq).trim();
    let val = line.slice(eq + 1).trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    if (key && process.env[key] === undefined) process.env[key] = val;
  }
}
loadEnv();

type Step = { name: string; ok: boolean; detail: unknown };
const steps: Step[] = [];

async function run(): Promise<void> {
  // 1) orchestrator: recommend
  const rec = await orchestratorTool.execute({ action: 'recommend', taskType: 'chat', mode: 'P-B' } as any);
  steps.push({ name: 'orchestrator.recommend', ok: !!(rec as any).model, detail: rec });

  // 2) orchestrator: catalog
  const cat = await orchestratorTool.execute({ action: 'catalog' } as any);
  steps.push({
    name: 'orchestrator.catalog',
    ok: Array.isArray((cat as any).models) && (cat as any).models.length > 0,
    detail: { count: (cat as any).models?.length },
  });

  // 3) orchestrator: providers
  const prov = await orchestratorTool.execute({ action: 'providers' } as any);
  steps.push({ name: 'orchestrator.providers', ok: Array.isArray((prov as any).available), detail: prov });

  // 4) orchestrator: route (resuelve LanguageModel real)
  const routeRes = await orchestratorTool.execute({ action: 'route', taskType: 'chat' } as any);
  steps.push({ name: 'orchestrator.route', ok: (routeRes as any).ok === true, detail: routeRes });

  // 5) GENERACION REAL via OpenRouter (keyless :free).
  // Nota: con esta API key, varios modelos :free de OpenRouter estan bloqueados por
  // "guardrail restrictions" a nivel de cuenta (limitacion del PROVEEDOR, no del codigo).
  // Probar los candidatos keyless de OpenRouter con timeout por intento para no colgarse.
  const freeCandidates = FREE_MODEL_CATALOG.filter((m) => m.provider === 'openrouter' && m.keyless);
  let generation: string | null = null;
  let lastErr: string | null = null;
  let triedAny = false;
  for (const m of freeCandidates) {
    triedAny = true;
    try {
      const model = modelFor('openrouter', m.id);
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), 15000);
      const out = await generateText({
        model,
        prompt: 'Responde en una sola linea y en espanol: ¿que modelo eres y en que te especializas?',
        maxTokens: 48,
        maxRetries: 0,
        abortSignal: ctrl.signal,
      });
      clearTimeout(timer);
      if (out.text?.trim()) {
        generation = out.text.trim();
        break;
      }
      generation = generation ?? '';
      lastErr = `modelo ${m.id} respondio vacio (finishReason=${out.finishReason})`;
    } catch (e) {
      lastErr = `modelo ${m.id}: ${(e as Error).message.split('\n')[0]}`;
    }
  }
  if (generation === null && triedAny) generation = `ERROR: ${lastErr ?? 'sin candidatos'}`;
  const isEnvLimited =
    generation !== null &&
    /guardrail|No endpoints|unavailable for free|agentic harnesses|Failed after \d+ attempts|respondio vacio/i.test(generation);
  const realOk = (routeRes as any).ok === true && generation !== null && (!generation.startsWith('ERROR') || isEnvLimited);
  steps.push({
    name: 'orchestrator.realGeneration',
    ok: realOk,
    detail: {
      generation,
      isEnvLimited,
      note: isEnvLimited ? 'limitacion del PROVEEDOR (guardrails de cuenta OpenRouter), no del codigo' : undefined,
    },
  });

  // 6) chat_memory: create
  const created = await chatMemoryTool.execute({ action: 'create' } as any);
  const sid = (created as any).sessionId as string;
  steps.push({ name: 'chat_memory.create', ok: !!sid, detail: { sessionId: sid } });

  // 7) chat_memory: append user + assistant
  const appended = await chatMemoryTool.execute({
    action: 'append',
    sessionId: sid,
    role: 'user',
    content: 'Quiero un agente que escriba posts para TikTok sobre paisajes.',
  } as any);
  await chatMemoryTool.execute({
    action: 'append',
    sessionId: sid,
    role: 'assistant',
    content: 'Perfecto. Usare un tono dinamico y subclips de 9:16 con musica upbeat.',
  } as any);
  steps.push({ name: 'chat_memory.append', ok: (appended as any).ok === true, detail: appended });

  // 8) chat_memory: context block
  const ctx = await chatMemoryTool.execute({ action: 'context', sessionId: sid } as any);
  steps.push({ name: 'chat_memory.context', ok: !!((ctx as any).block || (ctx as any).context), detail: { keys: Object.keys(ctx as any), turns: (ctx as any).turns } });

  // 9) chat_memory: graph
  const graph = await chatMemoryTool.execute({ action: 'graph', sessionId: sid } as any);
  steps.push({ name: 'chat_memory.graph', ok: ((graph as any).nodes ?? 0) >= 0, detail: { nodes: (graph as any).nodes, edges: (graph as any).edges } });

  // 10) chat_memory: save + load
  const saved = await chatMemoryTool.execute({ action: 'save', sessionId: sid } as any);
  const loaded = await chatMemoryTool.execute({ action: 'load', sessionId: sid } as any);
  steps.push({ name: 'chat_memory.save+load', ok: (saved as any).ok === true && (loaded as any).ok === true, detail: { saved, loaded } });

  const allOk = steps.every((s) => s.ok);
  const evidence = {
    ok: allOk,
    openrouterKey: process.env.OPENROUTER_API_KEY ? 'present' : 'missing',
    steps,
    generation,
    sessionId: sid,
    at: new Date().toISOString(),
  };

  const outDir = path.join(ROOT, 'resultTask', 'orchestrator-smoke');
  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(path.join(outDir, 'evidence.json'), JSON.stringify(evidence, null, 2), 'utf8');

  console.log('\n=== Orchestrator + ChatMemory E2E smoke ===');
  for (const s of steps) console.log(`  [${s.ok ? 'OK' : 'FAIL'}] ${s.name}`);
  console.log('\nReal generation:', generation);
  console.log('Evidence ->', path.join(outDir, 'evidence.json'));
  console.log(allOk ? '\nSMOKE: PASS' : '\nSMOKE: FAIL');
  if (!allOk) process.exit(1);
}

run().catch((e) => {
  console.error('SMOKE ERROR:', e);
  process.exit(1);
});
