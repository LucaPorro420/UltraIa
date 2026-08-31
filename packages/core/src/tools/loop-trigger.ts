/**
 * loop-trigger.ts — Trigger endpoint dominio puro para el Autonomous IDE.
 *
 * Patrón goal.ts: motor puro y determinista con inyección de dependencias.
 * Recibe funciones inyectadas `runPivCycle` y `runGoalCycle` que ejecutan
 * el trabajo real. Esto lo hace 100% testeable sin red ni filesystem.
 *
 * Flujo:
 *   1. Valida input (zod)
 *   2. Selecciona pipeline por mode
 *   3. Ejecuta pipeline inyectado
 *   4. Retorna resultado estructurado
 */

import { z } from 'zod';

/* ------------------------------------------------------------------ */
/* Types                                                               */
/* ------------------------------------------------------------------ */

export const TRIGGER_MODES = ['auto', 'p-p', 'p-b', 'goal'] as const;
export type TriggerMode = (typeof TRIGGER_MODES)[number];

export interface TriggerInput {
  /** Descripción de la tarea a ejecutar. */
  task: string;
  /** Modo de ejecución. default='auto' (selecciona por contenido). */
  mode?: TriggerMode;
  /** ID del agente a usar (opcional, auto-selecciona si no se provee). */
  agentId?: string;
  /** ID del usuario que dispara (requerido para auth). */
  userId: string;
}

export interface TriggerResult {
  /** ID de la tarea creada. */
  taskId: string;
  /** Estado final de la ejecución. */
  status: 'completed' | 'error' | 'queued';
  /** Pipeline ejecutado ('piv' o 'goal'). */
  pipeline: 'piv' | 'goal';
  /** Resumen de lo ejecutado. */
  summary: string;
  /** Output del pipeline (texto o JSON). */
  output: string;
  /** Modo que se ejecutó realmente. */
  modeUsed: TriggerMode;
  /** Duración en milisegundos. */
  durationMs: number;
  /** Error si status='error'. */
  error?: string;
  /** Archivos modificados (si aplica). */
  filesChanged?: string[];
}

export interface PipelineResult {
  status: 'completed' | 'error';
  output: string;
  filesChanged?: string[];
  error?: string;
}

/** Función que ejecuta un ciclo PIVR completo. */
export type RunPivCycle = (task: string, opts?: { mode?: 'p-p' | 'p-b' }) => Promise<PipelineResult>;

/** Función que ejecuta el goal runner. */
export type RunGoalCycle = (task: string, agentId?: string) => Promise<PipelineResult>;

/* ------------------------------------------------------------------ */
/* Validation                                                          */
/* ------------------------------------------------------------------ */

const triggerInputSchema = z.object({
  task: z.string().min(10, 'Task must be at least 10 characters').max(4000, 'Task too long').transform(t => t.trim()),
  mode: z.enum(TRIGGER_MODES).optional().default('auto'),
  agentId: z.string().optional(),
  userId: z.string().min(1, 'userId required'),
});

export function validateTriggerInput(raw: unknown): TriggerInput {
  return triggerInputSchema.parse(raw);
}

/* ------------------------------------------------------------------ */
/* Mode selection                                                      */
/* ------------------------------------------------------------------ */

/** Palabras clave que indican tarea de desarrollo (PIVR). */
const DEV_KEYWORDS = [
  'implement', 'fix', 'bug', 'feature', 'refactor', 'test', 'build',
  'deploy', 'add', 'create', 'modify', 'update', 'change', 'edit',
  'code', 'function', 'component', 'api', 'endpoint', 'route',
  'migration', 'schema', 'config', 'setup', 'install', 'upgrade',
  'typescript', 'javascript', 'react', 'next', 'prisma', 'css',
  'html', 'sql', 'docker', 'ci', 'cd', 'pipeline', 'lint', 'typecheck',
  'agrega', 'crea', 'modifica', 'actualiza', 'arregla', 'implementa',
  'desarrolla', 'construye', 'instala', 'configura', 'migra',
];

/** Palabras clave que indican tarea de contenido (goal runner). */
const CONTENT_KEYWORDS = [
  'write', 'article', 'blog', 'post', 'content', 'video', 'script',
  'story', 'copy', 'text', 'doc', 'documentation', 'tutorial',
  'guide', 'explain', 'describe', 'list', 'review', 'analyze',
  'research', 'search', 'find', 'compare', 'summarize', 'resumen',
  'articulo', 'contenido', 'guion', 'video', 'publica', 'publicar',
  'escribe', 'documenta', 'investiga', 'resume', 'analiza',
];

/**
 * Selecciona el pipeline más adecuado por el contenido del task.
 * Si hay agentId explícito, usa goal runner (el agente sabe qué hacer).
 */
export function selectMode(task: string, agentId?: string, explicitMode?: TriggerMode): TriggerMode {
  if (explicitMode && explicitMode !== 'auto') return explicitMode;
  if (agentId) return 'goal';

  const lower = task.toLowerCase();
  const devScore = DEV_KEYWORDS.filter(k => lower.includes(k)).length;
  const contentScore = CONTENT_KEYWORDS.filter(k => lower.includes(k)).length;

  if (devScore > contentScore) return 'p-p';
  if (contentScore > devScore) return 'goal';
  return 'p-p'; // default: plan first
}

/* ------------------------------------------------------------------ */
/* ID generation                                                       */
/* ------------------------------------------------------------------ */

let counter = 0;

/** Genera un ID de tarea legible y corto. */
export function generateTaskId(): string {
  counter++;
  const ts = Date.now().toString(36).slice(-4);
  const seq = counter.toString(36).padStart(2, '0');
  return `trigger-${ts}-${seq}`;
}

/* ------------------------------------------------------------------ */
/* Main executor                                                       */
/* ------------------------------------------------------------------ */

/**
 * Ejecuta un trigger. Función pura: recibe las funciones inyectadas
 * y retorna el resultado. No toca filesystem ni red.
 */
export async function executeTrigger(
  input: TriggerInput,
  deps: {
    runPivCycle: RunPivCycle;
    runGoalCycle: RunGoalCycle;
  },
): Promise<TriggerResult> {
  const start = Date.now();
  const taskId = generateTaskId();
  const mode = selectMode(input.task, input.agentId, input.mode);

  try {
    let result: PipelineResult;

    const pipeline = mode === 'goal' ? 'goal' : 'piv';

    if (mode === 'goal') {
      result = await deps.runGoalCycle(input.task, input.agentId);
    } else {
      // p-p o p-b
      result = await deps.runPivCycle(input.task, { mode: mode as 'p-p' | 'p-b' });
    }

    return {
      taskId,
      status: result.status,
      pipeline,
      summary: result.output.slice(0, 200),
      output: result.output,
      modeUsed: mode,
      durationMs: Date.now() - start,
      filesChanged: result.filesChanged,
      error: result.error,
    };
  } catch (err) {
    const pipeline = mode === 'goal' ? 'goal' : 'piv';
    return {
      taskId,
      status: 'error',
      pipeline,
      summary: 'Trigger failed',
      output: '',
      modeUsed: mode,
      durationMs: Date.now() - start,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}
