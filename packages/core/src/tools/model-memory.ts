/**
 * Model Memory — chat memory persistence with context bridging
 *
 * Stores conversation history per session, generates summaries on model
 * switches, and maintains a context bridge so the next model picks up
 * where the previous one left off. Compatible with Graphiti-style
 * knowledge graphs if connected later.
 *
 * Storage: .ultraia/memory/<sessionId>.json (deterministic, local)
 * Schema:  turn[] with model, task, summary, keyFacts, decisions
 */

import { z } from 'zod';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

/* ------------------------------------------------------------------ */
/*  Schemas                                                            */
/* ------------------------------------------------------------------ */

export const TurnSchema = z.object({
  id: z.string(),
  role: z.enum(['user', 'assistant', 'system']),
  content: z.string(),
  model: z.string(),              // provider/model-id
  task: z.string(),               // TaskKind from orchestrator
  timestamp: z.number(),
  tokens: z.number().optional(),
  summary: z.string().optional(), // generated on switch
  keyFacts: z.array(z.string()).optional(),
  decisions: z.array(z.string()).optional(),
  filesChanged: z.array(z.string()).optional(),
});

export const SessionSchema = z.object({
  sessionId: z.string(),
  createdAt: z.number(),
  updatedAt: z.number(),
  turns: z.array(TurnSchema),
  contextBridge: z.object({
    lastSummary: z.string().optional(),
    accumulatedFacts: z.array(z.string()),
    accumulatedDecisions: z.array(z.string()),
    projectState: z.string().optional(), // free-text snapshot
    currentModel: z.string(),
    switchCount: z.number(),
  }),
  metadata: z.object({
    totalTokens: z.number(),
    modelsUsed: z.array(z.string()),
    tasksEncountered: z.array(z.string()),
  }),
});

export type Turn = z.infer<typeof TurnSchema>;
export type Session = z.infer<typeof SessionSchema>;

/* ------------------------------------------------------------------ */
/*  Session Manager                                                    */
/* ------------------------------------------------------------------ */

const MEMORY_DIR = '.ultraia/memory';

function getMemoryPath(sessionId: string): string {
  return join(MEMORY_DIR, `${sessionId}.json`);
}

export async function loadSession(sessionId: string): Promise<Session | null> {
  try {
    const raw = await readFile(getMemoryPath(sessionId), 'utf-8');
    return SessionSchema.parse(JSON.parse(raw));
  } catch {
    return null;
  }
}

export async function saveSession(session: Session): Promise<void> {
  await mkdir(MEMORY_DIR, { recursive: true });
  const updated = { ...session, updatedAt: Date.now() };
  await writeFile(getMemoryPath(updated.sessionId), JSON.stringify(updated, null, 2), 'utf-8');
}

export function createSession(sessionId: string, initialModel: string): Session {
  return {
    sessionId,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    turns: [],
    contextBridge: {
      accumulatedFacts: [],
      accumulatedDecisions: [],
      currentModel: initialModel,
      switchCount: 0,
    },
    metadata: {
      totalTokens: 0,
      modelsUsed: [initialModel],
      tasksEncountered: [],
    },
  };
}

/* ------------------------------------------------------------------ */
/*  Context Bridge — continuity across model switches                  */
/* ------------------------------------------------------------------ */

/**
 * Summarize the conversation so far into a compact context packet
 * that the next model can use to pick up seamlessly.
 *
 * This is a DETERMINISTIC summarizer — no LLM call needed.
 * For richer summaries, call an LLM externally and pass the result
 * via updateContextBridge.
 */
export function buildContextSummary(session: Session): string {
  const { turns, contextBridge } = session;
  if (turns.length === 0) return 'No prior conversation.';

  const userTurns = turns.filter(t => t.role === 'user');
  const assistantTurns = turns.filter(t => t.role === 'assistant');

  const lines: string[] = [];

  // Header
  lines.push(`## Session Context (${session.sessionId})`);
  lines.push(`Turns: ${turns.length} | Models used: ${contextBridge.currentModel}`);
  lines.push('');

  // Last 5 user messages (most relevant)
  const recentUser = userTurns.slice(-5);
  if (recentUser.length > 0) {
    lines.push('### Recent User Requests');
    for (const t of recentUser) {
      const preview = t.content.slice(0, 200) + (t.content.length > 200 ? '...' : '');
      lines.push(`- [${t.model}] ${preview}`);
    }
    lines.push('');
  }

  // Key facts accumulated
  if (contextBridge.accumulatedFacts.length > 0) {
    lines.push('### Key Facts');
    for (const fact of contextBridge.accumulatedFacts.slice(-10)) {
      lines.push(`- ${fact}`);
    }
    lines.push('');
  }

  // Decisions made
  if (contextBridge.accumulatedDecisions.length > 0) {
    lines.push('### Decisions Made');
    for (const dec of contextBridge.accumulatedDecisions.slice(-5)) {
      lines.push(`- ${dec}`);
    }
    lines.push('');
  }

  // Files changed
  const allFiles = turns.flatMap(t => t.filesChanged ?? []);
  if (allFiles.length > 0) {
    const unique = [...new Set(allFiles)].slice(-15);
    lines.push('### Files Modified');
    for (const f of unique) lines.push(`- ${f}`);
    lines.push('');
  }

  // Last summary (if exists)
  if (contextBridge.lastSummary) {
    lines.push('### Previous Summary');
    lines.push(contextBridge.lastSummary);
    lines.push('');
  }

  return lines.join('\n');
}

/**
 * Extract key facts from a single turn (deterministic heuristics).
 */
export function extractKeyFacts(content: string): string[] {
  const facts: string[] = [];

  // File paths mentioned
  const fileMatches = content.match(/(?:packages|apps|src|lib|components|api)\/[\w\-./]+\.\w+/g);
  if (fileMatches) {
    for (const f of fileMatches.slice(0, 5)) facts.push(`File: ${f}`);
  }

  // Decisions (pattern: "decided", "chosen", "selected", "going with")
  const decisions = content.match(/(?:decided|chosen|selected|going with|usaremos?|elegimos?|decidimos?)\s+[^\n.]{10,80}/gi);
  if (decisions) {
    for (const d of decisions.slice(0, 3)) facts.push(`Decision: ${d.trim()}`);
  }

  // Commit hashes
  const commits = content.match(/\b[0-9a-f]{7,40}\b/g);
  if (commits) {
    for (const c of commits.slice(0, 3)) facts.push(`Commit: ${c}`);
  }

  // Error fixes
  const fixes = content.match(/(?:fixed|resolved|corregido|arreglado|solucionado)\s+[^\n.]{10,80}/gi);
  if (fixes) {
    for (const f of fixes.slice(0, 3)) facts.push(`Fix: ${f.trim()}`);
  }

  // Config changes
  const configs = content.match(/(?:updated|added|modified|changed)\s+(?:\.env|opencode\.json|tsconfig|package\.json|next\.config)/gi);
  if (configs) {
    for (const c of configs.slice(0, 3)) facts.push(`Config: ${c.trim()}`);
  }

  return facts;
}

/**
 * Detect if a model switch is appropriate and prepare the context bridge.
 */
export function prepareForSwitch(
  session: Session,
  newModel: string,
  newTask: string,
): { contextSummary: string; enrichedPrompt: string } {
  const summary = buildContextSummary(session);

  // Build an enriched system prompt that includes the bridge
  const enrichedParts: string[] = [
    `You are now ${newModel} taking over a session previously handled by ${session.contextBridge.currentModel}.`,
    '',
    '## Previous Context',
    summary || 'Start fresh — no prior context.',
    '',
    `## Current Task Type: ${newTask}`,
    '',
    'Continue from where the previous model left off. Reference prior decisions and files when relevant.',
  ];

  // Update session state
  session.contextBridge.lastSummary = summary;
  session.contextBridge.currentModel = newModel;
  session.contextBridge.switchCount += 1;

  if (!session.metadata.modelsUsed.includes(newModel)) {
    session.metadata.modelsUsed.push(newModel);
  }
  if (!session.metadata.tasksEncountered.includes(newTask)) {
    session.metadata.tasksEncountered.push(newTask);
  }

  return { contextSummary: summary, enrichedPrompt: enrichedParts.join('\n') };
}

/* ------------------------------------------------------------------ */
/*  Turn Management                                                    */
/* ------------------------------------------------------------------ */

let turnCounter = 0;

export function addTurn(
  session: Session,
  params: {
    role: 'user' | 'assistant' | 'system';
    content: string;
    model: string;
    task: string;
    tokens?: number;
    filesChanged?: string[];
  },
): Turn {
  turnCounter += 1;
  const turn: Turn = {
    id: `${session.sessionId}-t${turnCounter}`,
    role: params.role,
    content: params.content,
    model: params.model,
    task: params.task,
    timestamp: Date.now(),
    tokens: params.tokens,
    filesChanged: params.filesChanged,
  };

  session.turns.push(turn);
  session.metadata.totalTokens += params.tokens ?? 0;

  // Accumulate facts from assistant turns
  if (params.role === 'assistant') {
    const facts = extractKeyFacts(params.content);
    session.contextBridge.accumulatedFacts.push(...facts);
    // Dedupe and cap
    session.contextBridge.accumulatedFacts = [...new Set(session.contextBridge.accumulatedFacts)].slice(-50);

    // Extract decisions
    const decisions = params.content.match(/(?:decided|chosen|selected|going with)\s+[^\n.]{10,80}/gi);
    if (decisions) {
      session.contextBridge.accumulatedDecisions.push(...decisions.map(d => d.trim()));
      session.contextBridge.accumulatedDecisions = [...new Set(session.contextBridge.accumulatedDecisions)].slice(-20);
    }
  }

  // Track files from user turns
  if (params.role === 'user' && params.filesChanged) {
    // Intentionally not accumulated — files are tracked per turn
  }

  return turn;
}

/**
 * Generate a compact prompt suffix for resuming after context bridging.
 */
export function resumePrompt(session: Session): string {
  const summary = buildContextSummary(session);
  return [
    '\n\n--- CONTEXT BRIDGE (auto-generated) ---',
    summary,
    '--- END CONTEXT BRIDGE ---\n',
  ].join('\n');
}

/* ------------------------------------------------------------------ */
/*  Session Cleanup / Export                                           */
/* ------------------------------------------------------------------ */

export function getSessionStats(session: Session) {
  return {
    turns: session.turns.length,
    totalTokens: session.metadata.totalTokens,
    modelsUsed: session.metadata.modelsUsed,
    tasksEncountered: session.metadata.tasksEncountered,
    switchCount: session.contextBridge.switchCount,
    factsAccumulated: session.contextBridge.accumulatedFacts.length,
    decisionsAccumulated: session.contextBridge.accumulatedDecisions.length,
    durationMs: Date.now() - session.createdAt,
  };
}

/**
 * Export session as a markdown report (for learning/ or vault).
 */
export function exportSessionMarkdown(session: Session): string {
  const stats = getSessionStats(session);
  const lines: string[] = [];

  lines.push(`# Session Report: ${session.sessionId}`);
  lines.push('');
  lines.push(`- **Created**: ${new Date(session.createdAt).toISOString()}`);
  lines.push(`- **Turns**: ${stats.turns}`);
  lines.push(`- **Total tokens**: ${stats.totalTokens}`);
  lines.push(`- **Models used**: ${stats.modelsUsed.join(', ')}`);
  lines.push(`- **Tasks encountered**: ${stats.tasksEncountered.join(', ')}`);
  lines.push(`- **Model switches**: ${stats.switchCount}`);
  lines.push('');
  lines.push('## Conversation');
  lines.push('');

  for (const turn of session.turns) {
    const label = turn.role === 'user' ? '**User**' : turn.role === 'assistant' ? `**Assistant** (${turn.model})` : '**System**';
    const preview = turn.content.slice(0, 500);
    lines.push(`${label}:`);
    lines.push(preview + (turn.content.length > 500 ? '...' : ''));
    lines.push('');
  }

  if (session.contextBridge.accumulatedFacts.length > 0) {
    lines.push('## Accumulated Facts');
    for (const f of session.contextBridge.accumulatedFacts) lines.push(`- ${f}`);
    lines.push('');
  }

  if (session.contextBridge.accumulatedDecisions.length > 0) {
    lines.push('## Decisions');
    for (const d of session.contextBridge.accumulatedDecisions) lines.push(`- ${d}`);
    lines.push('');
  }

  return lines.join('\n');
}
