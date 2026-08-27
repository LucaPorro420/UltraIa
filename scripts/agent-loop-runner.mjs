#!/usr/bin/env node
// Iniciador de bucle de agente para UltraIa (conecta cerebro/memoria/orquestador/
// agentes/planificador/verificador/tester vía runAgentLoop).
//
// Uso:
//   node scripts/agent-loop-runner.mjs --goal "..." \
//     --tasks "t1" "t2" --max-iterations 3
//   node scripts/agent-loop-runner.mjs --file tareas.txt
//
// Requiere el paquete @ultraia/core ya construido (npm run build en packages/core)
// o ejecutarse tras el build del workspace. El runner conecta `execute` al motor
// /goal (runGoal) usando un endpoint OpenAI-like para el modelo y un dispatch
// stubpeable para las herramientas.
//
// Config via env:
//   OPENAI_API_KEY    (requerido para un execute real)
//   OPENAI_BASE_URL   (opcional, default https://api.openai.com/v1)
//   OPENAI_MODEL      (opcional, default gpt-4o-mini)

import { readFileSync } from 'node:fs';
import { runAgentLoop, runGoal } from '@ultraia/core';

const BASE = process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1';
const KEY = process.env.OPENAI_API_KEY;
const MODEL = process.env.OPENAI_MODEL || 'gpt-4o-mini';

function parseArgs(argv) {
  const out = { goal: '', tasks: [], file: null, maxIterations: 3 };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--goal') out.goal = argv[++i] || '';
    else if (a === '--tasks') {
      while (argv[i + 1] && !argv[i + 1].startsWith('--')) out.tasks.push(argv[++i]);
    } else if (a === '--file') out.file = argv[++i];
    else if (a === '--max-iterations') out.maxIterations = Number(argv[++i]) || 3;
  }
  return out;
}

function loadFromFile(file) {
  const text = readFileSync(file, 'utf8').trim();
  const lines = text.split('\n').map((l) => l.trim()).filter(Boolean);
  let goal = '';
  const tasks = [];
  for (const line of lines) {
    if (line.startsWith('/goal')) {
      goal = line.replace('/goal', '').trim();
      continue;
    }
    if (!goal) {
      goal = line;
      continue;
    }
    tasks.push(line.replace(/^[-*]\s*/, ''));
  }
  return { goal, tasks };
}

async function chat(messages) {
  if (!KEY) throw new Error('Falta OPENAI_API_KEY para un execute real');
  const res = await fetch(`${BASE}/chat/completions`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${KEY}` },
    body: JSON.stringify({ model: MODEL, messages, temperature: 0.7 }),
  });
  if (!res.ok) throw new Error(`LLM ${res.status}: ${await res.text()}`);
  const data = await res.json();
  return data.choices?.[0]?.message?.content ?? '';
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const { goal, tasks, maxIterations } = args.file ? loadFromFile(args.file) : args;

  if (!goal || tasks.length === 0) {
    console.error('Uso:\n  --goal "..." --tasks "t1" "t2" --max-iterations 3\n  --file tareas.txt');
    process.exit(1);
  }

  // execute: delega al motor /goal (runGoal). Sin KEY, usa un dispatch/complete stub.
  const complete = KEY
    ? async (system, user) => chat([
        { role: 'system', content: system },
        { role: 'user', content: user },
      ])
    : async () => 'Respuesta stub (sin OPENAI_API_KEY).';
  const dispatch = async (tool, a) => `resultado(${tool}) :: ${JSON.stringify(a)}`;

  // verify: corta si la última ejecución no cumplió todas las tareas.
  const verify = async (ctx) => {
    if (ctx.lastResult && !ctx.lastResult.done) return { shouldStop: true };
  };

  console.log(`\nOBJETIVO: ${goal}\nBUCLE maxIter=${maxIterations}\n${'='.repeat(40)}`);
  const loop = await runAgentLoop({
    objective: goal,
    tasks,
    maxIterations,
    execute: (ctx) => runGoal({ goal: ctx.objective, tasks: ctx.tasks, complete, dispatch }),
    verify,
  });

  console.log(`${'='.repeat(40)}\n✅ BUCLE TERMINADO`);
  console.log(JSON.stringify({
    objective: loop.objective,
    iterations: loop.iterations,
    stopped: loop.stopped,
    errors: loop.errors,
    finalTasks: loop.finalTasks,
  }, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
