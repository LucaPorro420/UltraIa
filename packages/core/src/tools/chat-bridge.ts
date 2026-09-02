/**
 * chat-bridge.ts — Chat-to-Code Bridge dominio puro.
 *
 * Recibe mensajes de chat (de cualquier fuente: VS Code, Discord, Telegram, web)
 * y los routea al agente correcto. El agente produce código y lo aplica como
 * edits de archivo. Ejecuta gates automáticamente y hace rollback si fallan.
 *
 * Patrón goal.ts + loop-trigger.ts: motor puro con inyección de dependencias.
 */

import { z } from 'zod';

/* ------------------------------------------------------------------ */
/* Types                                                               */
/* ------------------------------------------------------------------ */

export const BRIDGE_SOURCES = ['vscode', 'discord', 'telegram', 'web'] as const;
export type BridgeSource = (typeof BRIDGE_SOURCES)[number];

export const EDIT_ACTIONS = ['create', 'update', 'delete'] as const;
export type EditAction = (typeof EDIT_ACTIONS)[number];

export interface FileEdit {
  /** Ruta relativa al workspace root. */
  file: string;
  /** Acción a ejecutar. */
  action: EditAction;
  /** Contenido del archivo (para create/update). */
  content?: string;
  /** Línea de inicio para updates parciales (1-indexed). */
  startLine?: number;
  /** Línea de fin para updates parciales (1-indexed, inclusive). */
  endLine?: number;
}

export interface BridgeInput {
  /** Mensaje del usuario. */
  message: string;
  /** Fuente del mensaje. */
  source: BridgeSource;
  /** ID del agente a usar (opcional, auto-selecciona si no se provee). */
  agentId?: string;
  /** ID del usuario. */
  userId: string;
  /** Workspace root path (opcional, usa CWD por defecto). */
  workspaceRoot?: string;
}

export interface GateResults {
  typecheck: boolean;
  lint: boolean;
  test: boolean;
}

export interface BridgeResult {
  /** ID único de la operación. */
  requestId: string;
  /** Estado de la operación. */
  status: 'completed' | 'error' | 'rolled_back';
  /** Edits generados por el agente. */
  edits: FileEdit[];
  /** Resumen de lo ejecutado. */
  summary: string;
  /** Resultado de los gates. */
  gates: GateResults;
  /** Archivos modificados realmente. */
  filesChanged: string[];
  /** Error si status != completed. */
  error?: string;
  /** Duración en ms. */
  durationMs: number;
}

/** Función que genera edits dado un mensaje (inyectable). */
export type GenerateEdits = (
  message: string,
  opts: { agentId?: string; userId: string },
) => Promise<FileEdit[]>;

/** Función que aplica un edit al filesystem (inyectable). */
export type ApplyEdit = (edit: FileEdit, workspaceRoot: string) => Promise<void>;

/** Función que ejecuta los gates (inyectable). */
export type RunGates = (workspaceRoot: string) => Promise<GateResults>;

/** Función que crea un commit (inyectable). */
export type CreateCommit = (message: string, files: string[], workspaceRoot: string) => Promise<void>;

/** Función que revierte archivos (inyectable). */
export type RollbackFiles = (files: string[], workspaceRoot: string) => Promise<void>;

/** Función que emite eventos del bridge al EventBus (inyectable). */
export type EmitBridgeEvent = (event: BridgeEvent) => void;

/** Eventos que el bridge puede emitir para WS clients. */
export type BridgeEventType = 
  | 'bridge.started' 
  | 'bridge.edits_generated' 
  | 'bridge.edits_applied' 
  | 'bridge.gates_started' 
  | 'bridge.gates_completed' 
  | 'bridge.committed' 
  | 'bridge.rolled_back' 
  | 'bridge.failed'
  | 'bridge.completed';

export interface BridgeEvent {
  type: BridgeEventType;
  requestId: string;
  timestamp: number;
  payload: Record<string, unknown>;
}

/* ------------------------------------------------------------------ */
/* Validation                                                          */
/* ------------------------------------------------------------------ */

const bridgeInputSchema = z.object({
  message: z.string().min(5, 'Message too short').max(8000, 'Message too long'),
  source: z.enum(BRIDGE_SOURCES),
  agentId: z.string().optional(),
  userId: z.string().min(1, 'userId required'),
  workspaceRoot: z.string().optional(),
});

export function validateBridgeInput(raw: unknown): BridgeInput {
  return bridgeInputSchema.parse(raw);
}

/* ------------------------------------------------------------------ */
/* Agent routing                                                       */
/* ------------------------------------------------------------------ */

/** Palabras clave que mapean a agentes específicos. */
const AGENT_KEYWORDS: Record<string, string[]> = {
  'bp-guionista': ['guion', 'script', 'storyboard', 'narrativa', 'escena', 'hook'],
  'bp-analista': ['analizar', 'analiza', 'datos', 'metricas', 'estadistica', 'trend', 'investigar'],
  'bp-publicador': ['publicar', 'publish', 'social', 'youtube', 'tiktok', 'telegram'],
  'bp-orquestador': ['crear', 'generar', 'producir', 'completo', 'pipeline'],
};

/**
 * Selecciona el agente más adecuado por el contenido del mensaje.
 * Si hay agentId explícito, lo usa directamente.
 */
export function selectAgent(message: string, agentId?: string): string {
  if (agentId) return agentId;

  const lower = message.toLowerCase();
  let bestAgent = 'bp-orquestador'; // default
  let bestScore = 0;

  for (const [agent, keywords] of Object.entries(AGENT_KEYWORDS)) {
    const score = keywords.filter(k => lower.includes(k)).length;
    if (score > bestScore) {
      bestScore = score;
      bestAgent = agent;
    }
  }

  return bestAgent;
}

/* ------------------------------------------------------------------ */
/* Request ID generation                                               */
/* ------------------------------------------------------------------ */

let bridgeCounter = 0;

export function generateRequestId(): string {
  bridgeCounter++;
  const ts = Date.now().toString(36).slice(-4);
  const seq = bridgeCounter.toString(36).padStart(2, '0');
  return `bridge-${ts}-${seq}`;
}

/* ------------------------------------------------------------------ */
/* Main executor                                                       */
/* ------------------------------------------------------------------ */

/**
 * Ejecuta un bridge message. Función pura con dependencias inyectadas.
 * No toca filesystem ni red directamente.
 */
export async function executeBridge(
  input: BridgeInput,
  deps: {
    generateEdits: GenerateEdits;
    applyEdit: ApplyEdit;
    runGates: RunGates;
    createCommit: CreateCommit;
    rollbackFiles: RollbackFiles;
    emitBridgeEvent?: EmitBridgeEvent;
  },
  opts?: { workspaceRoot?: string },
): Promise<BridgeResult> {
  const start = Date.now();
  const requestId = generateRequestId();
  const workspaceRoot = opts?.workspaceRoot ?? input.workspaceRoot ?? process.cwd();

  const emit = deps.emitBridgeEvent ?? (() => {});

  try {
    // 1. Generate edits from the message
    emit({
      type: 'bridge.started',
      requestId,
      timestamp: Date.now(),
      payload: { message: input.message, source: input.source, agentId: input.agentId },
    });

    const edits = await deps.generateEdits(input.message, {
      agentId: input.agentId,
      userId: input.userId,
    });

    emit({
      type: 'bridge.edits_generated',
      requestId,
      timestamp: Date.now(),
      payload: { editsCount: edits.length, files: edits.map(e => e.file) },
    });

    if (edits.length === 0) {
      emit({
        type: 'bridge.completed',
        requestId,
        timestamp: Date.now(),
        payload: { summary: 'No code changes needed' },
      });
      return {
        requestId,
        status: 'completed',
        edits: [],
        summary: 'No code changes needed for this message.',
        gates: { typecheck: true, lint: true, test: true },
        filesChanged: [],
        durationMs: Date.now() - start,
      };
    }

    // 2. Apply edits
    const filesChanged: string[] = [];
    for (const edit of edits) {
      await deps.applyEdit(edit, workspaceRoot);
      filesChanged.push(edit.file);
    }

    emit({
      type: 'bridge.edits_applied',
      requestId,
      timestamp: Date.now(),
      payload: { filesChanged },
    });

    // 3. Run gates
    emit({
      type: 'bridge.gates_started',
      requestId,
      timestamp: Date.now(),
      payload: {},
    });

    const gates = await deps.runGates(workspaceRoot);

    emit({
      type: 'bridge.gates_completed',
      requestId,
      timestamp: Date.now(),
      payload: { gates },
    });

    const allGreen = gates.typecheck && gates.lint && gates.test;

    if (allGreen) {
      // 4a. Gates GREEN → commit
      const commitMsg = `feat(bridge): ${input.message.slice(0, 72)}`;
      await deps.createCommit(commitMsg, filesChanged, workspaceRoot);

      emit({
        type: 'bridge.committed',
        requestId,
        timestamp: Date.now(),
        payload: { commitMsg, filesChanged },
      });

      emit({
        type: 'bridge.completed',
        requestId,
        timestamp: Date.now(),
        payload: { summary: `Applied ${edits.length} edit(s)` },
      });

      return {
        requestId,
        status: 'completed',
        edits,
        summary: `Applied ${edits.length} edit(s) to ${filesChanged.length} file(s). All gates GREEN.`,
        gates,
        filesChanged,
        durationMs: Date.now() - start,
      };
    }

    // 4b. Gates RED → rollback
    await deps.rollbackFiles(filesChanged, workspaceRoot);

    emit({
      type: 'bridge.rolled_back',
      requestId,
      timestamp: Date.now(),
      payload: { gates },
    });

    const failedGates = Object.entries(gates)
      .filter(([, ok]) => !ok)
      .map(([name]) => name);

    emit({
      type: 'bridge.failed',
      requestId,
      timestamp: Date.now(),
      payload: { error: `Gates failed: ${failedGates.join(', ')}` },
    });

    return {
      requestId,
      status: 'rolled_back',
      edits,
      summary: `Rolled back: gates RED (${failedGates.join(', ')}).`,
      gates,
      filesChanged: [],
      error: `Gates failed: ${failedGates.join(', ')}`,
      durationMs: Date.now() - start,
    };
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    emit({
      type: 'bridge.failed',
      requestId,
      timestamp: Date.now(),
      payload: { error: errorMsg },
    });

    return {
      requestId,
      status: 'error',
      edits: [],
      summary: 'Bridge execution failed.',
      gates: { typecheck: false, lint: false, test: false },
      filesChanged: [],
      error: errorMsg,
      durationMs: Date.now() - start,
    };
  }
}
