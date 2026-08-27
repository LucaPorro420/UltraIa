#!/usr/bin/env node
// Iniciador de agente autónomo para UltraIa.
//
// Uso:
//   node scripts/goal-runner.mjs --goal "Crea una landing" \
//     --tasks "disena el hero" "escribe el copy" "genera el codigo"
//   node scripts/goal-runner.mjs --file tareas.txt
//     (primera linea = "/goal <objetivo>", resto = tareas, una por linea)
//
// El agente ejecuta las tareas UNA POR UNA hasta terminar, encadenando el
// contexto de las tareas ya completadas para mantener coherencia. Sirve para
// programacion, arte, cuentos o respuestas: el prompt le pide el formato segun
// el tipo de tarea.
//
// Compatible con cualquier endpoint OpenAI-like (OpenAI, Groq, Mistral,
// OpenRouter, o el mismo proveedor que usa `resolveModel` en UltraIa).
// Config via env:
//   OPENAI_API_KEY   (requerido)
//   OPENAI_BASE_URL  (opcional, default https://api.openai.com/v1)
//   OPENAI_MODEL      (opcional, default gpt-4o-mini)

import { readFileSync } from 'node:fs';

const BASE = process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1';
const KEY = process.env.OPENAI_API_KEY;
const MODEL = process.env.OPENAI_MODEL || 'gpt-4o-mini';

function parseArgs(argv) {
  const out = { goal: '', tasks: [], file: null };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--goal') out.goal = argv[++i] || '';
    else if (a === '--tasks') {
      while (argv[i + 1] && !argv[i + 1].startsWith('--')) out.tasks.push(argv[++i]);
    } else if (a === '--file') out.file = argv[++i];
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
      goal = line; // primera linea como objetivo si no hay /goal
      continue;
    }
    tasks.push(line.replace(/^[-*]\s*/, ''));
  }
  return { goal, tasks };
}

async function chat(messages) {
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
  const { goal, tasks } = args.file ? loadFromFile(args.file) : args;

  if (!goal || tasks.length === 0) {
    console.error('Uso:\n  --goal "..." --tasks "t1" "t2"\n  --file tareas.txt');
    process.exit(1);
  }
  if (!KEY) {
    console.error('Falta OPENAI_API_KEY en el entorno.');
    process.exit(1);
  }

  console.log(`\nOBJETIVO: ${goal}\nTAREAS: ${tasks.length}\n${'='.repeat(40)}`);
  const results = [];
  for (let i = 0; i < tasks.length; i++) {
    const task = tasks[i];
    const context = results
      .map((r, idx) => `Tarea ${idx + 1} (${r.task}):\n${r.output}`)
      .join('\n\n');

    const sys =
      `Eres un agente autónomo. Objetivo global: ${goal}. ` +
      `Realizas UNA tarea a la vez. Si es programación, entrega código completo y funcional; ` +
      `si es arte, define la pieza (estilo, composición, paleta); si es un cuento, escribe narrativa; ` +
      `si es una respuesta, responde con precisión. Usa el contexto de tareas anteriores para ` +
      `mantener coherencia. Sé concreto y termina la tarea.`;
    const user =
      `Tarea ${i + 1}/${tasks.length}: ${task}` +
      (context ? `\n\nContexto de tareas ya completadas:\n${context}` : '');

    process.stdout.write(`\n▶ Tarea ${i + 1}: ${task}\n${'-'.repeat(30)}\n`);
    const output = await chat([
      { role: 'system', content: sys },
      { role: 'user', content: user },
    ]);
    results.push({ task, output });
    console.log(output + '\n');
  }

  console.log(`${'='.repeat(40)}\n✅ OBJETIVO COMPLETADO. Resumen:`);
  for (const r of results) console.log(`  • ${r.task}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
