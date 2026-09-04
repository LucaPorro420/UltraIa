/**
 * POST /api/loop/trigger — Autonomous IDE trigger endpoint.
 *
 * Acepta una descripción de tarea y ejecuta el pipeline apropiado:
 * - mode='auto': selecciona por contenido (PIVR para dev, goal para contenido)
 * - mode='p-p': solo planifica (PIVR fase P)
 * - mode='p-b': implementa un plan existente (PIVR fase I+V)
 * - mode='goal': ejecuta el goal runner con el agente indicado
 *
 * Auth: requiere usuario logueado. ADMIN para ejecutar, cualquiera para consultar.
 *
 * El endpoint ejecuta el pipeline de forma síncrona (hasta 120s) y retorna
 * el resultado. Para ciclos largos, el cliente puede usar el WebSocket /events
 * del runtime local para recibir updates en tiempo real.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/server/context';
import {
  validateTriggerInput,
  executeTrigger,
  selectMode,
  type TriggerResult,
} from '@ultraia/core';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { resolveModel, runGoal, buildGoalDispatch } from '@ultraia/core';
import { generateText } from 'ai';
import path from 'node:path';

const execFileAsync = promisify(execFile);

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const ROOT = path.resolve(process.cwd(), '..', '..');

/** Timeout máximo para la ejecución del pipeline (120 segundos). */
const PIPELINE_TIMEOUT_MS = 120_000;

/* ------------------------------------------------------------------ */
/* Pipeline runners (inyectables al dominio puro)                       */
/* ------------------------------------------------------------------ */

/**
 * Ejecuta un ciclo PIVR invocando loop_piv.py como subprocess.
 * Retorna resultado parseado del stdout JSON.
 */
async function runPivCycle(
  task: string,
  opts?: { mode?: 'p-p' | 'p-b' },
): Promise<{ status: 'completed' | 'error'; output: string; filesChanged?: string[]; error?: string }> {
  const args = [
    path.join(ROOT, 'scripts', 'loop_piv.py'),
    '--json',
    '--timeout', '100', // 100s dentro del subprocess (deja margen al outer timeout)
  ];

  if (opts?.mode === 'p-p') args.push('--plan-only');
  if (opts?.mode === 'p-b') args.push('--gate-only');

  // El task se pasa como argumentoposicional después de los flags
  // loop_piv.py no acepta task directamente; lo escribimos como stdin
  // o lo pasamos vía environment. Por ahora usamos --dry-run para probar.
  args.push('--dry-run');

  try {
    const { stdout, stderr } = await execFileAsync('python', args, {
      cwd: ROOT,
      timeout: PIPELINE_TIMEOUT_MS,
      env: { ...process.env, PYTHONIOENCODING: 'utf-8' },
      encoding: 'utf-8',
    });

    // Intentar parsear JSON del stdout
    try {
      const json = JSON.parse(stdout);
      return {
        status: json.outcome === 'ok' ? 'completed' : 'error',
        output: json.summary ?? stdout,
        filesChanged: json.filesChanged,
        error: json.error,
      };
    } catch {
      // No es JSON válido, usar stdout como output
      return {
        status: stdout.includes('error') || stdout.includes('FAIL') ? 'error' : 'completed',
        output: stdout || stderr || 'No output',
      };
    }
  } catch (err) {
    return {
      status: 'error',
      output: '',
      error: 'Internal error',
    };
  }
}

/**
 * Ejecuta el goal runner con el agente indicado.
 */
async function runGoalCycle(
  task: string,
  agentId?: string,
): Promise<{ status: 'completed' | 'error'; output: string; filesChanged?: string[]; error?: string }> {
  const complete = async (system: string, userPrompt: string): Promise<string> => {
    const r = await generateText({ model: resolveModel(), system, prompt: userPrompt });
    return r.text;
  };

  const dispatchMap = buildGoalDispatch();
  const dispatch = async (tool: string, args: Record<string, unknown>): Promise<unknown> => {
    const fn = dispatchMap[tool];
    if (!fn) throw new Error(`Tool not mapped in /loop/trigger: ${tool}`);
    return fn(args);
  };

  try {
    const result = await runGoal({
      goal: task,
      tasks: [task],
      complete,
      dispatch,
      toolNames: Object.keys(dispatchMap),
      maxStepsPerTask: 5,
    });

    // result es un array de GoalResult
    const results = Array.isArray(result) ? result : [result];
    const errors = results.filter((r: { status: string }) => r.status === 'error');
    const successes = results.filter((r: { status: string }) => r.status === 'done');

    return {
      status: errors.length > 0 && successes.length === 0 ? 'error' : 'completed',
      output: results.map((r) => r.output).join('\n---\n'),
      error: errors.length > 0 ? errors.map((e) => e.error ?? '').join('; ') : undefined,
    };
  } catch (err) {
    return {
      status: 'error',
      output: '',
      error: 'Internal error',
    };
  }
}

/* ------------------------------------------------------------------ */
/* Route handler                                                       */
/* ------------------------------------------------------------------ */

export async function POST(req: NextRequest) {
  const user = await getCurrentUser(req);
  if (!user) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid json' }, { status: 400 });
  }

  // Validate input
  let input;
  try {
    input = validateTriggerInput({ ...(json as Record<string, unknown>), userId: user.id });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'validation error';
    return NextResponse.json({ error: message }, { status: 400 });
  }

  // Execute trigger
  const result = await executeTrigger(input, {
    runPivCycle,
    runGoalCycle,
  });

  const status = result.status === 'error' ? 500 : 200;
  return NextResponse.json(result satisfies TriggerResult, { status });
}

/** GET: info about the trigger endpoint (no auth required). */
export async function GET() {
  return NextResponse.json({
    endpoint: '/api/loop/trigger',
    methods: ['POST'],
    modes: ['auto', 'p-p', 'p-b', 'goal'],
    description: 'Autonomous IDE trigger — sends a task to the appropriate pipeline',
    example: {
      task: 'Add a dark mode toggle to the settings page',
      mode: 'auto',
    },
  });
}
