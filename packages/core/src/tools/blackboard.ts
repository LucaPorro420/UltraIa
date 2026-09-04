//! Capability `blackboard` — shared knowledge space for cross-agent coordination.
// Implements the Blackboard pattern: agents write findings, other agents read
// and build on them. Deterministic, keyless, offline. Based on production
// blackboard pattern (claudioed/agent-blackboard).
import { z } from 'zod';

// ── Types ────────────────────────────────────────────────────────────────────

export type EntryType = 'finding' | 'hypothesis' | 'solution' | 'metric' | 'lesson' | 'task';

export type EntryStatus = 'active' | 'resolved' | 'superseded' | 'dismissed';

export interface BlackboardEntry {
  id: string;
  type: EntryType;
  status: EntryStatus;
  author: string;
  topic: string;
  content: string;
  confidence: number; // 0-1
  tags: string[];
  createdAt: string;
  updatedAt: string;
  /** IDs of entries this builds upon. */
  dependsOn: string[];
  /** IDs of entries that supersede this one. */
  supersededBy: string[];
}

export interface BlackboardState {
  entries: BlackboardEntry[];
  lastCompacted: string;
  version: number;
}

export interface WriteInput {
  type: EntryType;
  author: string;
  topic: string;
  content: string;
  confidence?: number;
  tags?: string[];
  dependsOn?: string[];
}

export interface QueryInput {
  type?: EntryType;
  status?: EntryStatus;
  author?: string;
  topic?: string;
  tags?: string[];
  limit?: number;
}

export interface CompactResult {
  removed: number;
  merged: number;
  remaining: number;
}

// ── In-Memory Blackboard ─────────────────────────────────────────────────────

let _state: BlackboardState = {
  entries: [],
  lastCompacted: new Date().toISOString(),
  version: 1,
};

let _idCounter = 0;

export function resetBlackboard(): void {
  _state = { entries: [], lastCompacted: new Date().toISOString(), version: 1 };
  _idCounter = 0;
}

export function getBlackboardState(): BlackboardState {
  return structuredClone(_state);
}

export function writeEntry(input: WriteInput): BlackboardEntry {
  const id = `bb-${++_idCounter}`;
  const now = new Date().toISOString();
  const entry: BlackboardEntry = {
    id,
    type: input.type,
    status: 'active',
    author: input.author,
    topic: input.topic,
    content: input.content,
    confidence: input.confidence ?? 0.7,
    tags: input.tags ?? [],
    createdAt: now,
    updatedAt: now,
    dependsOn: input.dependsOn ?? [],
    supersededBy: [],
  };
  _state.entries.push(entry);
  _state.version++;
  return entry;
}

export function supersedeEntry(entryId: string, supersederId: string, newContent?: string): BlackboardEntry | null {
  const entry = _state.entries.find(e => e.id === entryId);
  if (!entry || entry.status !== 'active') return null;
  entry.status = 'superseded';
  entry.supersededBy.push(supersederId);
  entry.updatedAt = new Date().toISOString();
  if (newContent) entry.content = newContent;
  _state.version++;
  return entry;
}

export function resolveEntry(entryId: string): BlackboardEntry | null {
  const entry = _state.entries.find(e => e.id === entryId);
  if (!entry || entry.status !== 'active') return null;
  entry.status = 'resolved';
  entry.updatedAt = new Date().toISOString();
  _state.version++;
  return entry;
}

export function dismissEntry(entryId: string): BlackboardEntry | null {
  const entry = _state.entries.find(e => e.id === entryId);
  if (!entry || entry.status !== 'active') return null;
  entry.status = 'dismissed';
  entry.updatedAt = new Date().toISOString();
  _state.version++;
  return entry;
}

export function queryEntries(input: QueryInput): BlackboardEntry[] {
  let results = _state.entries;
  if (input.type) results = results.filter(e => e.type === input.type);
  if (input.status) results = results.filter(e => e.status === input.status);
  if (input.author) results = results.filter(e => e.author === input.author);
  if (input.topic) results = results.filter(e => e.topic.toLowerCase().includes(input.topic!.toLowerCase()));
  if (input.tags?.length) results = results.filter(e => input.tags!.some(t => e.tags.includes(t)));
  // Sort by confidence desc, then recency
  results.sort((a, b) => b.confidence - a.confidence || b.createdAt.localeCompare(a.createdAt));
  if (input.limit) results = results.slice(0, input.limit);
  return results;
}

export function compactBlackboard(): CompactResult {
  const before = _state.entries.length;
  // Remove dismissed entries
  _state.entries = _state.entries.filter(e => e.status !== 'dismissed');
  // Merge superseded entries (keep the superseder)
  const superseded = _state.entries.filter(e => e.status === 'superseded');
  const supersededIds = new Set(superseded.map(e => e.id));
  _state.entries = _state.entries.filter(e => {
    if (e.status === 'superseded' && !e.supersededBy.some(id => !supersededIds.has(id))) return false;
    return true;
  });
  const removed = before - _state.entries.length;
  _state.lastCompacted = new Date().toISOString();
  _state.version++;
  return { removed, merged: 0, remaining: _state.entries.length };
}

// ── Knowledge Graph (Topics) ─────────────────────────────────────────────────

export function getTopicGraph(): Record<string, { count: number; authors: string[]; avgConfidence: number }> {
  const topics: Record<string, { authors: Set<string>; confidences: number[] }> = {};
  for (const e of _state.entries.filter(e => e.status === 'active')) {
    if (!topics[e.topic]) topics[e.topic] = { authors: new Set(), confidences: [] };
    topics[e.topic].authors.add(e.author);
    topics[e.topic].confidences.push(e.confidence);
  }
  const graph: Record<string, { count: number; authors: string[]; avgConfidence: number }> = {};
  for (const [topic, data] of Object.entries(topics)) {
    graph[topic] = {
      count: data.confidences.length,
      authors: [...data.authors],
      avgConfidence: data.confidences.reduce((a, b) => a + b, 0) / data.confidences.length,
    };
  }
  return graph;
}

// ── Tool Schema ──────────────────────────────────────────────────────────────

export const blackboardSchema = z.object({
  action: z.enum(['write', 'read', 'query', 'supersede', 'resolve', 'dismiss', 'compact', 'graph', 'reset']),
  entryId: z.string().optional().describe('Entry ID for supersede/resolve/dismiss'),
  supersederId: z.string().optional().describe('ID of entry that supersedes'),
  newContent: z.string().optional().describe('Updated content for supersede'),
  write: z.object({
    type: z.enum(['finding', 'hypothesis', 'solution', 'metric', 'lesson', 'task']),
    author: z.string(),
    topic: z.string(),
    content: z.string(),
    confidence: z.number().min(0).max(1).optional(),
    tags: z.array(z.string()).optional(),
    dependsOn: z.array(z.string()).optional(),
  }).optional().describe('Write input'),
  query: z.object({
    type: z.enum(['finding', 'hypothesis', 'solution', 'metric', 'lesson', 'task']).optional(),
    status: z.enum(['active', 'resolved', 'superseded', 'dismissed']).optional(),
    author: z.string().optional(),
    topic: z.string().optional(),
    tags: z.array(z.string()).optional(),
    limit: z.number().optional(),
  }).optional().describe('Query filters'),
});

export type BlackboardInput = z.infer<typeof blackboardSchema>;

export async function blackboardTool(input: BlackboardInput): Promise<unknown> {
  switch (input.action) {
    case 'write': {
      if (!input.write) return { error: 'write input required' };
      return writeEntry(input.write);
    }
    case 'read': {
      return getBlackboardState();
    }
    case 'query': {
      if (!input.query) return { error: 'query input required' };
      return queryEntries(input.query);
    }
    case 'supersede': {
      if (!input.entryId || !input.supersederId) return { error: 'entryId and supersederId required' };
      return supersedeEntry(input.entryId, input.supersederId, input.newContent);
    }
    case 'resolve': {
      if (!input.entryId) return { error: 'entryId required' };
      return resolveEntry(input.entryId);
    }
    case 'dismiss': {
      if (!input.entryId) return { error: 'entryId required' };
      return dismissEntry(input.entryId);
    }
    case 'compact': {
      return compactBlackboard();
    }
    case 'graph': {
      return getTopicGraph();
    }
    case 'reset': {
      resetBlackboard();
      return { ok: true, message: 'Blackboard reset' };
    }
  }
}
