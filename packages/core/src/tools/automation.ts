/**
 * automation.ts — Media Automation: ciclo de producción en 10 fases.
 *
 * Port ORIGINAL de los PRINCIPIOS de media automation (fuente: enlaces.txt →
 * learning/sources/media-automation.md, docs/RAZONAMIENTO-MEDIA-AUTOMATION.md).
 * Nada de código copiado; solo el patrón: fábrica de contenido con pipeline
 * PLAN → VALIDATE → AUTOMATE → RECORD → ANALYZE → EDIT → AUDIO → RENDER →
 * VERIFY → ARCHIVE, con reintentos fail-soft, recuperación con hint ambiental,
 * resume idempotente y manifest JSON.
 *
 * Keyless-first y determinista: este módulo solo decide estados y produce
 * comandos/argv; la ejecución real (ffmpeg, OBS, providers) vive en el runner.
 */

/** Fases del ciclo de producción (orden canónico). */
export const PHASES = [
  'PLAN',
  'VALIDATE',
  'AUTOMATE',
  'RECORD',
  'ANALYZE',
  'EDIT',
  'AUDIO',
  'RENDER',
  'VERIFY',
  'ARCHIVE',
] as const;
export type Phase = (typeof PHASES)[number];

/** Reintentos máximos por fase antes de escalar a recover/give-up. */
export const MAX_ATTEMPTS = 3;

/** Duración máxima del ciclo completo (min) — anti-runaway. */
export const MAX_CYCLE_MIN = 90;

export interface AutomationOptions {
  /** Clave única del proyecto. */
  id: string;
  /** Nombre legible (opcional). */
  name?: string;
}

export interface AutomationState {
  projectId: string;
  currentPhase: Phase;
  attempts: Record<Phase, number>;
  lastOkPhase: Phase | null;
  status: 'idle' | 'running' | 'failed' | 'done';
  startedAt: string;
  updatedAt: string;
  error?: string;
}

export type PhaseStatus = 'ok' | 'failed' | 'skipped';

export interface NextAction {
  kind: 'run' | 'retry' | 'recover' | 'resume' | 'give-up';
  phase: Phase;
  attempt: number;
  reason: string;
  hint?: string;
}

export interface AutomationManifest {
  projectId: string;
  name: string;
  createdAt: string;
  phases: Phase[];
  maxAttempts: number;
}

export interface PhaseNote {
  phase: Phase;
  note: string;
}

/** Estado inicial del ciclo (idempotente). */
export function createAutomationState(projectId: string, now: string): AutomationState {
  const attempts = {} as Record<Phase, number>;
  for (const p of PHASES) attempts[p] = 0;
  return {
    projectId,
    currentPhase: PHASES[0],
    attempts,
    lastOkPhase: null,
    status: 'idle',
    startedAt: now,
    updatedAt: now,
  };
}

/** Hint ambiental según el error (determinista, keyless). */
function envHint(error?: string): string | undefined {
  if (!error) return undefined;
  const e = error.toLowerCase();
  if (e.includes('ffmpeg')) return 'Instalar ffmpeg (winget install Gyan.FFmpeg) y añadirlo al PATH.';
  if (e.includes('obs')) return 'Abrir OBS Studio y el plugin obs-websocket (Tools > WebSocket Server Settings).';
  if (e.includes('websocket') || e.includes('ws://')) return 'Verificar que obs-websocket escucha en 127.0.0.1:4455.';
  if (e.includes('yt-dlp')) return 'Instalar yt-dlp (winget install yt-dlp.yt-dlp).';
  if (e.includes('edge') || e.includes('tts')) return 'edge-tts requiere red; verificar conectividad.';
  if (e.includes('pollinations')) return 'Pollinations requiere red; verificar conectividad.';
  if (e.includes('timeout')) return 'El recurso tardó demasiado; reintentar con mayor timeout.';
  return undefined;
}

/**
 * Decide la siguiente acción según el estado y el resultado de la fase actual.
 * Reglas: ok → siguiente fase; failed → retry (máx MAX_ATTEMPTS) o recover con
 * hint; recover → retry con la MISMA fase desde el intento siguiente; si se
 * agotan los intentos en la primera fase → give-up.
 */
export function nextAction(state: AutomationState, result: { status: PhaseStatus; error?: string }): NextAction {
  const idx = PHASES.indexOf(state.currentPhase);
  const attempts = (state.attempts[state.currentPhase] ?? 0) + 1;
  state.attempts[state.currentPhase] = attempts;

  if (result.status === 'ok') {
    const nextPhase: Phase = idx < PHASES.length - 1 ? PHASES[idx + 1] : PHASES[PHASES.length - 1];
    state.lastOkPhase = state.currentPhase;
    state.currentPhase = nextPhase;
    state.status = nextPhase === PHASES[PHASES.length - 1] && result.status === 'ok' ? 'done' : 'running';
    return {
      kind: 'run',
      phase: state.currentPhase,
      attempt: 1,
      reason: 'fase completada',
    };
  }

  if (result.status === 'skipped') {
    const nextPhase: Phase = idx < PHASES.length - 1 ? PHASES[idx + 1] : PHASES[PHASES.length - 1];
    state.lastOkPhase = state.currentPhase;
    state.currentPhase = nextPhase;
    return { kind: 'run', phase: state.currentPhase, attempt: 1, reason: 'fase omitida' };
  }

  // failed
  const hint = envHint(result.error);
  if (attempts >= MAX_ATTEMPTS) {
    if (idx === 0) {
      state.status = 'failed';
      state.error = result.error ?? 'intentos agotados en la fase inicial';
      return { kind: 'give-up', phase: state.currentPhase, attempt: attempts, reason: 'intentos agotados en la fase inicial', hint };
    }
    // retroceder a la última fase OK (resume) para reintentar el ciclo
    state.currentPhase = state.lastOkPhase ?? PHASES[0];
    state.status = 'running';
    return { kind: 'resume', phase: state.currentPhase, attempt: 1, reason: 'reintento desde última fase OK', hint };
  }
  return { kind: 'retry', phase: state.currentPhase, attempt: attempts, reason: 'fallo recuperable', hint };
}

/** Aplica la acción al estado (mutación acotada, determinista). */
export function advanceState(state: AutomationState, action: NextAction): AutomationState {
  state.currentPhase = action.phase;
  state.attempts[action.phase] = action.attempt;
  if (action.kind === 'give-up') state.status = 'failed';
  if (action.kind === 'resume' || action.kind === 'run') state.status = 'running';
  state.updatedAt = new Date().toISOString();
  return state;
}

/** Manifest JSON del ciclo (determinista). */
export function buildManifest(options: AutomationOptions): AutomationManifest {
  return {
    projectId: options.id,
    name: options.name ?? options.id,
    createdAt: new Date().toISOString(),
    phases: [...PHASES],
    maxAttempts: MAX_ATTEMPTS,
  };
}

/** Comando de verificación de duración con ffprobe (determinista). */
export function verifyDurationCommand(mediaFile: string, expectedSec: number): string[] {
  return [
    'ffprobe',
    '-v', 'error',
    '-show_entries', 'format=duration',
    '-of', 'default=noprint_wrappers=1:nokey=1',
    mediaFile,
    '--expect-duration-sec', String(expectedSec),
  ];
}

/** Resumen humano del ciclo (para agentes/logs). */
export function describeRun(state: AutomationState, manifest: AutomationManifest): string {
  const lines = [
    `Ciclo ${manifest.projectId} (${manifest.name})`,
    `  fase: ${state.currentPhase} (${PHASES.indexOf(state.currentPhase) + 1}/${PHASES.length})`,
    `  status: ${state.status}`,
    `  attempts: ${PHASES.map((p) => `${p}=${state.attempts[p]}`).join(' ')}`,
    `  lastOk: ${state.lastOkPhase ?? '-'}`,
  ];
  if (state.error) lines.push(`  error: ${state.error}`);
  return lines.join('\n');
}

/** Nota de fase (para logs de iteración). */
export function phaseNote(state: AutomationState, note: string): PhaseNote {
  return { phase: state.currentPhase, note };
}