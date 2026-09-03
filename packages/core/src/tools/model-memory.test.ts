import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { mkdirSync, rmSync, existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  TurnSchema,
  SessionSchema,
  createSession,
  loadSession,
  saveSession,
  buildContextSummary,
  extractKeyFacts,
  prepareForSwitch,
  addTurn,
  resumePrompt,
  getSessionStats,
  exportSessionMarkdown,
  type Session,
} from './model-memory';

const TEST_DIR = '.ultraia/memory';

beforeEach(() => {
  mkdirSync(TEST_DIR, { recursive: true });
});

afterEach(() => {
  // Clean up test files
  try {
    const fs = require('node:fs');
    if (existsSync(TEST_DIR)) {
      const files = fs.readdirSync(TEST_DIR);
      for (const f of files) {
        if (f.startsWith('test-')) {
          rmSync(join(TEST_DIR, f));
        }
      }
    }
  } catch { /* noop */ }
});

describe('model-memory', () => {
  /* ── Schemas ── */
  describe('TurnSchema', () => {
    it('validates a complete turn', () => {
      const turn = {
        id: 't1',
        role: 'user',
        content: 'hello',
        model: 'gpt-4',
        task: 'chat',
        timestamp: Date.now(),
      };
      expect(TurnSchema.parse(turn)).toEqual(turn);
    });

    it('validates turn with optional fields', () => {
      const turn = {
        id: 't2',
        role: 'assistant',
        content: 'response',
        model: 'claude',
        task: 'build',
        timestamp: Date.now(),
        tokens: 100,
        summary: 'test summary',
        keyFacts: ['fact1'],
        decisions: ['dec1'],
        filesChanged: ['file.ts'],
      };
      expect(TurnSchema.parse(turn)).toEqual(turn);
    });
  });

  describe('SessionSchema', () => {
    it('validates a complete session', () => {
      const session = {
        sessionId: 's1',
        createdAt: Date.now(),
        updatedAt: Date.now(),
        turns: [],
        contextBridge: {
          accumulatedFacts: [],
          accumulatedDecisions: [],
          currentModel: 'gpt-4',
          switchCount: 0,
        },
        metadata: {
          totalTokens: 0,
          modelsUsed: ['gpt-4'],
          tasksEncountered: [],
        },
      };
      expect(SessionSchema.parse(session)).toEqual(session);
    });
  });

  /* ── createSession ── */
  describe('createSession', () => {
    it('creates session with correct defaults', () => {
      const s = createSession('test-1', 'gpt-4');
      expect(s.sessionId).toBe('test-1');
      expect(s.turns).toEqual([]);
      expect(s.contextBridge.currentModel).toBe('gpt-4');
      expect(s.contextBridge.switchCount).toBe(0);
      expect(s.contextBridge.accumulatedFacts).toEqual([]);
      expect(s.contextBridge.accumulatedDecisions).toEqual([]);
      expect(s.metadata.totalTokens).toBe(0);
      expect(s.metadata.modelsUsed).toEqual(['gpt-4']);
    });
  });

  /* ── saveSession / loadSession ── */
  describe('saveSession / loadSession', () => {
    it('round-trips session to disk', async () => {
      const s = createSession('test-roundtrip', 'gpt-4');
      addTurn(s, { role: 'user', content: 'hello', model: 'gpt-4', task: 'chat', tokens: 10 });
      await saveSession(s);
      const loaded = await loadSession('test-roundtrip');
      expect(loaded).not.toBeNull();
      expect(loaded!.sessionId).toBe('test-roundtrip');
      expect(loaded!.turns).toHaveLength(1);
      expect(loaded!.turns[0].content).toBe('hello');
    });

    it('returns null for non-existent session', async () => {
      const loaded = await loadSession('test-nonexistent');
      expect(loaded).toBeNull();
    });
  });

  /* ── addTurn ── */
  describe('addTurn', () => {
    it('adds a user turn', () => {
      const s = createSession('test-add', 'gpt-4');
      const turn = addTurn(s, { role: 'user', content: 'hello', model: 'gpt-4', task: 'chat' });
      expect(s.turns).toHaveLength(1);
      expect(turn.role).toBe('user');
      expect(turn.content).toBe('hello');
      expect(turn.id).toContain('test-add');
    });

    it('adds an assistant turn and accumulates facts', () => {
      const s = createSession('test-facts', 'gpt-4');
      addTurn(s, {
        role: 'assistant',
        content: 'We decided to use packages/core/src/tools/web.ts for the implementation',
        model: 'gpt-4',
        task: 'build',
      });
      expect(s.contextBridge.accumulatedFacts.length).toBeGreaterThan(0);
    });

    it('accumulates decisions from assistant turns', () => {
      const s = createSession('test-dec', 'gpt-4');
      addTurn(s, {
        role: 'assistant',
        content: 'I decided to use Prisma for the database layer',
        model: 'gpt-4',
        task: 'build',
      });
      expect(s.contextBridge.accumulatedDecisions.length).toBeGreaterThan(0);
    });

    it('tracks tokens', () => {
      const s = createSession('test-tokens', 'gpt-4');
      addTurn(s, { role: 'user', content: 'a', model: 'gpt-4', task: 'chat', tokens: 100 });
      addTurn(s, { role: 'assistant', content: 'b', model: 'gpt-4', task: 'chat', tokens: 200 });
      expect(s.metadata.totalTokens).toBe(300);
    });

    it('deduplicates accumulated facts', () => {
      const s = createSession('test-dedup', 'gpt-4');
      // Same content twice should not duplicate facts
      addTurn(s, { role: 'assistant', content: 'fixed packages/core/src/tools/web.ts', model: 'gpt-4', task: 'fix' });
      addTurn(s, { role: 'assistant', content: 'fixed packages/core/src/tools/web.ts', model: 'gpt-4', task: 'fix' });
      // Facts should be deduplicated
      const uniqueFacts = [...new Set(s.contextBridge.accumulatedFacts)];
      expect(s.contextBridge.accumulatedFacts.length).toBe(uniqueFacts.length);
    });
  });

  /* ── buildContextSummary ── */
  describe('buildContextSummary', () => {
    it('returns message for empty session', () => {
      const s = createSession('test-empty', 'gpt-4');
      const summary = buildContextSummary(s);
      expect(summary).toBe('No prior conversation.');
    });

    it('builds summary with turns', () => {
      const s = createSession('test-summary', 'gpt-4');
      addTurn(s, { role: 'user', content: 'hello world', model: 'gpt-4', task: 'chat' });
      addTurn(s, { role: 'assistant', content: 'hi there', model: 'gpt-4', task: 'chat' });
      const summary = buildContextSummary(s);
      expect(summary).toContain('test-summary');
      expect(summary).toContain('Turns: 2');
      expect(summary).toContain('hello world');
    });

    it('includes accumulated facts', () => {
      const s = createSession('test-facts2', 'gpt-4');
      addTurn(s, {
        role: 'assistant',
        content: 'We decided to use React for the frontend',
        model: 'gpt-4',
        task: 'build',
      });
      const summary = buildContextSummary(s);
      expect(summary).toContain('Key Facts');
    });
  });

  /* ── extractKeyFacts ── */
  describe('extractKeyFacts', () => {
    it('extracts file paths', () => {
      const facts = extractKeyFacts('Modified packages/core/src/tools/web.ts today');
      expect(facts.some(f => f.includes('web.ts'))).toBe(true);
    });

    it('extracts decisions', () => {
      const facts = extractKeyFacts('We decided to use SQLite for storage');
      expect(facts.some(f => f.startsWith('Decision:'))).toBe(true);
    });

    it('extracts commit hashes', () => {
      const facts = extractKeyFacts('Committed abc1234 to fix the bug');
      expect(facts.some(f => f.startsWith('Commit:'))).toBe(true);
    });

    it('extracts fixes', () => {
      const facts = extractKeyFacts('Fixed the race condition in session.ts');
      expect(facts.some(f => f.startsWith('Fix:'))).toBe(true);
    });

    it('returns empty for irrelevant content', () => {
      const facts = extractKeyFacts('just some random text');
      expect(facts).toEqual([]);
    });
  });

  /* ── prepareForSwitch ── */
  describe('prepareForSwitch', () => {
    it('prepares context for model switch', () => {
      const s = createSession('test-switch', 'gpt-4');
      addTurn(s, { role: 'user', content: 'hello', model: 'gpt-4', task: 'chat' });
      const { contextSummary, enrichedPrompt } = prepareForSwitch(s, 'claude-3', 'build');
      expect(contextSummary).toBeDefined();
      expect(enrichedPrompt).toContain('claude-3');
      expect(enrichedPrompt).toContain('gpt-4');
      expect(s.contextBridge.switchCount).toBe(1);
      expect(s.contextBridge.currentModel).toBe('claude-3');
    });

    it('tracks model in metadata', () => {
      const s = createSession('test-models', 'gpt-4');
      prepareForSwitch(s, 'claude-3', 'chat');
      expect(s.metadata.modelsUsed).toContain('claude-3');
    });

    it('tracks task in metadata', () => {
      const s = createSession('test-tasks', 'gpt-4');
      prepareForSwitch(s, 'claude-3', 'build');
      expect(s.metadata.tasksEncountered).toContain('build');
    });
  });

  /* ── resumePrompt ── */
  describe('resumePrompt', () => {
    it('generates prompt with context bridge markers', () => {
      const s = createSession('test-resume', 'gpt-4');
      addTurn(s, { role: 'user', content: 'hello', model: 'gpt-4', task: 'chat' });
      const prompt = resumePrompt(s);
      expect(prompt).toContain('CONTEXT BRIDGE');
      expect(prompt).toContain('---');
    });
  });

  /* ── getSessionStats ── */
  describe('getSessionStats', () => {
    it('returns correct stats', () => {
      const s = createSession('test-stats', 'gpt-4');
      addTurn(s, { role: 'user', content: 'a', model: 'gpt-4', task: 'chat', tokens: 50 });
      addTurn(s, { role: 'assistant', content: 'b', model: 'gpt-4', task: 'chat', tokens: 100 });
      const stats = getSessionStats(s);
      expect(stats.turns).toBe(2);
      expect(stats.totalTokens).toBe(150);
      expect(stats.modelsUsed).toEqual(['gpt-4']);
    });
  });

  /* ── exportSessionMarkdown ── */
  describe('exportSessionMarkdown', () => {
    it('exports session as markdown', () => {
      const s = createSession('test-md', 'gpt-4');
      addTurn(s, { role: 'user', content: 'hello', model: 'gpt-4', task: 'chat' });
      addTurn(s, { role: 'assistant', content: 'hi there', model: 'gpt-4', task: 'chat' });
      const md = exportSessionMarkdown(s);
      expect(md).toContain('# Session Report: test-md');
      expect(md).toContain('Turns');
      expect(md).toContain('hello');
      expect(md).toContain('hi there');
    });

    it('includes accumulated facts', () => {
      const s = createSession('test-md2', 'gpt-4');
      addTurn(s, {
        role: 'assistant',
        content: 'We decided to use TypeScript for the project',
        model: 'gpt-4',
        task: 'build',
      });
      const md = exportSessionMarkdown(s);
      expect(md).toContain('Accumulated Facts');
    });
  });
});
