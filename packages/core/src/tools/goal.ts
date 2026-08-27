/**
 * goal.ts — Meta-agente `/goal` de UltraIa.
 *
 * Motor PURO y determinista: no importa providers ni dependencias de red. Recibe
 * funciones inyectadas `complete` (llamada al modelo) y `dispatch` (ejecución de una
 * herramienta real). Esto lo hace 100% testeable con mocks y desacoplado de la sesión
 * concurrente #25 (que edita llm.ts). El objetivo es que el `/goal` actúe como conductor
 * autónomo de TODO el proyecto: dado un objetivo + tareas, ejecuta cada tarea encadenando
 * contexto (memoria) y despachando a las capabilities reales (memoria, mente, creadores,
 * mensajeros, planificador, investigación).
 */

export interface GoalTask {
  id: string;
  description: string;
}

export interface GoalResult {
  taskId: string;
  task: string;
  status: 'done' | 'error';
  output: string;
  tool?: string;
}

export interface GoalIntent {
  type: 'tool' | 'answer';
  tool?: string;
  args?: Record<string, unknown>;
  text?: string;
}

export interface RunGoalOpts {
  goal: string;
  tasks: string[];
  /** Llamada al modelo. Debe devolver el texto de la decisión del modelo. */
  complete: (system: string, user: string) => Promise<string>;
  /** Ejecuta una herramienta real por nombre + args. Devuelve el resultado crudo. */
  dispatch: (tool: string, args: Record<string, unknown>) => Promise<unknown>;
  /** Nombres de tools que el modelo tiene permitido invocar. */
  toolNames?: string[];
  /** Pasos máximos por tarea (encadenado de tool-calls). Default 5. */
  maxStepsPerTask?: number;
  onTaskStart?: (task: string) => void;
  onTaskEnd?: (result: GoalResult) => void;
}

const DEFAULT_MAX_STEPS = 5;

/** System prompt que enumera las capabilities disponibles para que el modelo elija. */
export function goalSystemPrompt(goal: string, toolNames: string[]): string {
  const tools = toolNames.length ? toolNames.join(', ') : '(ninguna registrada)';
  return [
    'Eres el ejecutor autonomo de UltraIa. Operas como el "cerebro" del proyecto:',
    'tienes acceso a sus subsystems (memoria, mente/LLM, creadores, mensajeros, planificador, investigacion).',
    `Objetivo global del usuario: ${goal}`,
    '',
    'Para cada tarea decides UNA de dos cosas:',
    '1) Responder directamente con texto (si es una pregunta/respuesta simple).',
    '2) Invocar una herramienta para ACTUAR (crear contenido, publicar, buscar, planificar, guardar en memoria, etc.).',
    '',
    'HERRAMIENTAS DISPONIBLES (usa SOLO estos nombres):',
    tools,
    '',
    'FORMATO de salida:',
    '- Si invocas tool, responde EXACTAMENTE con un bloque JSON:',
    '  ```json',
    '  {"tool": "<nombre>", "args": { ... }}',
    '  ```',
    '- Si respondes, escribe el texto directo (puede incluir markdown).',
    'No mezcles explicación con el JSON: o texto puro o el bloque JSON aislado.',
    'Después de un tool-call, recibes su resultado y puedes hacer otro tool-call o finalizar con texto.',
  ].join('\n');
}

/** Extrae el primer objeto JSON válido de un texto (soporta ```json ... ```). */
function extractJson(raw: string): Record<string, unknown> | null {
  const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fenced ? fenced[1] : raw;
  const start = candidate.indexOf('{');
  const end = candidate.lastIndexOf('}');
  if (start === -1 || end === -1 || end <= start) return null;
  const slice = candidate.slice(start, end + 1);
  try {
    const parsed = JSON.parse(slice);
    return typeof parsed === 'object' && parsed !== null ? (parsed as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}

/** Parsea la salida del modelo en una intención (tool o answer). */
export function parseIntent(raw: string): GoalIntent {
  const json = extractJson(raw);
  if (json && typeof json.tool === 'string' && json.tool.trim().length > 0) {
    const args = json.args;
    return {
      type: 'tool',
      tool: json.tool.trim(),
      args: typeof args === 'object' && args !== null ? (args as Record<string, unknown>) : {},
    };
  }
  // Limpia fences si el modelo devolvió texto envuelto en ```json sin tool.
  const cleaned = raw.replace(/```(?:json)?/gi, '').replace(/```/g, '').trim();
  return { type: 'answer', text: cleaned };
}

function summarize(value: unknown): string {
  if (value === null || value === undefined) return '(sin salida)';
  if (typeof value === 'string') return value.slice(0, 800);
  try {
    const s = JSON.stringify(value);
    return s.length > 800 ? s.slice(0, 800) + '…' : s;
  } catch {
    return String(value).slice(0, 800);
  }
}

/**
 * Ejecuta un goal: itera tareas, por cada una llama al modelo para decidir y
 * despacha tools, acumulando memoria entre pasos y entre tareas.
 */
export async function runGoal(opts: RunGoalOpts): Promise<{
  goal: string;
  results: GoalResult[];
  done: boolean;
}> {
  const {
    goal,
    tasks,
    complete,
    dispatch,
    toolNames = [],
    maxStepsPerTask = DEFAULT_MAX_STEPS,
    onTaskStart,
    onTaskEnd,
  } = opts;

  const results: GoalResult[] = [];
  const memory: string[] = [];

  for (let i = 0; i < tasks.length; i++) {
    const task = tasks[i];
    const taskId = `task-${i + 1}`;
    onTaskStart?.(task);

    let finalOutput = '';
    let finalStatus: GoalResult['status'] = 'done';
    let finalTool: string | undefined;
    let lastResult: string | undefined;

    const context = memory.length
      ? `\n\nCONTEXTO DE TAREAS ANTERIORES (memoria):\n${memory.join('\n')}`
      : '';

    let step = 0;
    while (step < maxStepsPerTask) {
      step++;
      const system = goalSystemPrompt(goal, toolNames);
      const toolContext = lastResult
        ? `\n\nRESULTADO DE LA HERRAMIENTA ANTERIOR:\n${lastResult}`
        : '';
      const user = `TAREA ACTUAL: ${task}${context}${toolContext}\n\nDecide: responde con texto o invoca una herramienta en JSON {"tool","args"}.`;

      let raw: string;
      try {
        raw = await complete(system, user);
      } catch (e) {
        finalStatus = 'error';
        finalOutput = `Error llamando al modelo: ${(e as Error).message}`;
        break;
      }

      const intent = parseIntent(raw);

      if (intent.type === 'answer') {
        finalOutput = intent.text ?? '';
        finalStatus = 'done';
        break;
      }

      // tool intent
      finalTool = intent.tool;
      try {
        const out = await dispatch(intent.tool as string, intent.args ?? {});
        lastResult = summarize(out);
        memory.push(`[${intent.tool}] ${task}: ${lastResult}`);
        // El bucle continúa: el resultado se inyecta en el siguiente paso para
        // permitir encadenar tools (ej. investigar -> crear -> publicar).
      } catch (e) {
        finalStatus = 'error';
        finalOutput = `Error en tool "${intent.tool}": ${(e as Error).message}`;
        memory.push(`[${intent.tool}] ${task}: ERROR ${(e as Error).message}`);
        break;
      }
    }

    // Si agotó los pasos tras tool-calls (sin respuesta textual), cerramos con el último resultado.
    if (finalStatus === 'done' && !finalOutput) {
      finalOutput = lastResult ?? '(sin salida)';
    }

    const result: GoalResult = {
      taskId,
      task,
      status: finalStatus,
      output: finalOutput || '(sin salida)',
      tool: finalTool,
    };
    results.push(result);
    onTaskEnd?.(result);
  }

  return { goal, results, done: results.every((r) => r.status === 'done') };
}
