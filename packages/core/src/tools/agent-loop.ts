/**
 * agent-loop.ts — Motor de loop de agente para UltraIa.
 *
 * Orquesta los subsistemas nombrados por el usuario en un ciclo iterativo:
 *   recall (memoria) -> plan (planificador) -> execute (orquestador/agentes)
 *   -> verify (verificador) -> test (tester) -> learn (memoria)
 *
 * Diseño puro y determinista: cada paso es inyectable. El único paso requerido
 * es `execute` (normalmente se conecta a `runGoal` con el modelo/dispatch del
 * caller). Los demás pasos tienen default no-op para poder testear el
 * encadenamiento sin dependencias externas (DB, vectores, redes).
 *
 * Esto es el "tejido" que conecta cerebro, memoria, orquestador, agentes,
 * planificador, verificador y tester en un bucle con condición de parada.
 */

import type { GoalResult } from './goal';

/** Resultado de una ejecución `execute` (normalmente el retorno de `runGoal`). */
export interface AgentGoalRun {
  goal: string;
  results: GoalResult[];
  done: boolean;
}

export interface AgentLoopStepContext {
  /** Índice de la iteración actual (0-based). */
  iteration: number;
  /** Objetivo actual (puede ser refinado por el paso `plan`). */
  objective: string;
  /** Tareas actuales (pueden ser refinadas por el paso `plan`). */
  tasks: string[];
  /** Memoria acumulada entre iteraciones (compartida por referencia). */
  memory: Record<string, unknown>;
  /** Resultado de la última ejecución de `execute`. */
  lastResult?: AgentGoalRun;
  /** El paso `verify` (o el caller vía `shouldStop`) lo pone en true para cortar. */
  shouldStop: boolean;
  /** Notas acumuladas (compartidas por referencia). */
  notes: string[];
}

/** Paso opcional que puede mutar/retornar campos del contexto. */
export type AgentLoopStep = (
  ctx: AgentLoopStepContext
) => Promise<void | Partial<AgentLoopStepContext>> | void | Partial<AgentLoopStepContext>;

/** Paso requerido: ejecuta el objetivo y devuelve un AgentGoalRun. */
export type AgentLoopExecute = (
  ctx: AgentLoopStepContext
) => Promise<AgentGoalRun> | AgentGoalRun;

export interface RunAgentLoopOpts {
  objective: string;
  tasks: string[];
  /** Máximo de iteraciones del bucle (default 5). */
  maxIterations?: number;
  /** memoria: recupera contexto previo y lo inyecta en `ctx.memory`. */
  recall?: AgentLoopStep;
  /** planificador: refina `objective`/`tasks` para la iteración. */
  plan?: AgentLoopStep;
  /** orquestador/agentes: EJECUTA el objetivo (requerido). */
  execute: AgentLoopExecute;
  /** verificador: inspecciona el resultado y puede marcar `shouldStop`. */
  verify?: AgentLoopStep;
  /** tester: corre checks y puede marcar `shouldStop` si fallan. */
  test?: AgentLoopStep;
  /** memoria: persiste aprendizajes en `ctx.memory`. */
  learn?: AgentLoopStep;
  /** Condición global de parada aportada por el caller. */
  shouldStop?: (ctx: AgentLoopStepContext) => boolean;
}

export interface AgentLoopResult {
  objective: string;
  iterations: number;
  stopped: boolean;
  finalTasks: string[];
  memory: Record<string, unknown>;
  results: AgentGoalRun[];
  notes: string[];
  errors: string[];
}

/**
 * Ejecuta el bucle de agente: por cada iteración corre
 * recall -> plan -> execute -> verify -> test -> learn, y se detiene cuando
 * `shouldStop` se cumple o se alcanza `maxIterations`.
 */
export async function runAgentLoop(opts: RunAgentLoopOpts): Promise<AgentLoopResult> {
  const { objective, tasks } = opts;
  const maxIterations = opts.maxIterations ?? 5;

  if (typeof opts.execute !== 'function') {
    throw new Error(
      'runAgentLoop requiere opts.execute (normalmente runGoal con tu modelo/dispatch)'
    );
  }

  const memory: Record<string, unknown> = {};
  const notes: string[] = [];
  const results: AgentGoalRun[] = [];
  const errors: string[] = [];

  let currentObjective = objective;
  let currentTasks = [...tasks];
  let stopped = false;

  for (let iteration = 0; iteration < maxIterations; iteration++) {
    const ctx: AgentLoopStepContext = {
      iteration,
      objective: currentObjective,
      tasks: currentTasks,
      memory,
      lastResult: results[results.length - 1],
      shouldStop: false,
      notes,
    };

    if (opts.recall) Object.assign(ctx, (await opts.recall(ctx)) ?? {});
    if (opts.plan) {
      const p = (await opts.plan(ctx)) ?? {};
      if (typeof p.objective === 'string') currentObjective = p.objective;
      if (Array.isArray(p.tasks)) currentTasks = p.tasks;
      Object.assign(ctx, p);
    }

    // orquestador/agentes: ejecuta el objetivo.
    try {
      const r = await opts.execute(ctx);
      results.push(r);
      ctx.lastResult = r;
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      errors.push(`iteration ${iteration} execute error: ${msg}`);
      ctx.shouldStop = true;
    }

    if (opts.verify) Object.assign(ctx, (await opts.verify(ctx)) ?? {});
    if (opts.test) Object.assign(ctx, (await opts.test(ctx)) ?? {});
    if (opts.learn) Object.assign(ctx, (await opts.learn(ctx)) ?? {});

    if (ctx.shouldStop || (opts.shouldStop && opts.shouldStop(ctx))) {
      stopped = true;
      break;
    }
  }

  return {
    objective: currentObjective,
    iterations: results.length,
    stopped,
    finalTasks: currentTasks,
    memory,
    results,
    notes,
    errors,
  };
}
