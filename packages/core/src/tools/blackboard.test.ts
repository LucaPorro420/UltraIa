import { describe, it, expect, beforeEach } from 'vitest';
import {
  resetBlackboard,
  writeEntry,
  supersedeEntry,
  resolveEntry,
  dismissEntry,
  queryEntries,
  compactBlackboard,
  getTopicGraph,
  getBlackboardState,
} from './blackboard';

describe('blackboard', () => {
  beforeEach(() => resetBlackboard());

  describe('writeEntry', () => {
    it('writes an entry with auto-generated ID', () => {
      const entry = writeEntry({
        type: 'finding',
        author: 'bp-seguridad',
        topic: 'security',
        content: 'Found hardcoded API key in config.ts',
        confidence: 0.9,
        tags: ['critical', 'auth'],
      });
      expect(entry.id).toMatch(/^bb-\d+$/);
      expect(entry.type).toBe('finding');
      expect(entry.status).toBe('active');
      expect(entry.author).toBe('bp-seguridad');
      expect(entry.confidence).toBe(0.9);
      expect(entry.tags).toContain('critical');
    });

    it('defaults confidence to 0.7', () => {
      const entry = writeEntry({ type: 'lesson', author: 'test', topic: 'testing', content: 'Always run tests' });
      expect(entry.confidence).toBe(0.7);
    });
  });

  describe('queryEntries', () => {
    it('filters by type', () => {
      writeEntry({ type: 'finding', author: 'a', topic: 't1', content: 'c1' });
      writeEntry({ type: 'hypothesis', author: 'b', topic: 't2', content: 'c2' });
      writeEntry({ type: 'finding', author: 'c', topic: 't3', content: 'c3' });

      const findings = queryEntries({ type: 'finding' });
      expect(findings.length).toBe(2);
      expect(findings.every((e: any) => e.type === 'finding')).toBe(true);
    });

    it('filters by author', () => {
      writeEntry({ type: 'finding', author: 'agent-a', topic: 't', content: 'c1' });
      writeEntry({ type: 'finding', author: 'agent-b', topic: 't', content: 'c2' });

      const fromA = queryEntries({ author: 'agent-a' });
      expect(fromA.length).toBe(1);
      expect(fromA[0].author).toBe('agent-a');
    });

    it('filters by topic (partial match)', () => {
      writeEntry({ type: 'finding', author: 'a', topic: 'security-audit', content: 'c1' });
      writeEntry({ type: 'finding', author: 'a', topic: 'performance', content: 'c2' });

      const security = queryEntries({ topic: 'security' });
      expect(security.length).toBe(1);
    });

    it('filters by tags', () => {
      writeEntry({ type: 'finding', author: 'a', topic: 't', content: 'c1', tags: ['critical', 'auth'] });
      writeEntry({ type: 'finding', author: 'a', topic: 't', content: 'c2', tags: ['low'] });

      const critical = queryEntries({ tags: ['critical'] });
      expect(critical.length).toBe(1);
    });

    it('respects limit', () => {
      for (let i = 0; i < 10; i++) {
        writeEntry({ type: 'finding', author: 'a', topic: 't', content: `c${i}` });
      }
      const limited = queryEntries({ limit: 3 });
      expect(limited.length).toBe(3);
    });

    it('sorts by confidence desc', () => {
      writeEntry({ type: 'finding', author: 'a', topic: 't', content: 'low', confidence: 0.3 });
      writeEntry({ type: 'finding', author: 'a', topic: 't', content: 'high', confidence: 0.95 });
      writeEntry({ type: 'finding', author: 'a', topic: 't', content: 'mid', confidence: 0.6 });

      const results = queryEntries({});
      expect(results[0].confidence).toBe(0.95);
      expect(results[2].confidence).toBe(0.3);
    });
  });

  describe('supersedeEntry', () => {
    it('supersedes an active entry', () => {
      const original = writeEntry({ type: 'hypothesis', author: 'a', topic: 't', content: 'old hypothesis' });
      const updated = writeEntry({ type: 'hypothesis', author: 'b', topic: 't', content: 'new hypothesis' });
      
      const result = supersedeEntry(original.id, updated.id);
      expect(result).not.toBeNull();
      expect(result!.status).toBe('superseded');
      expect(result!.supersededBy).toContain(updated.id);
    });

    it('returns null for non-active entry', () => {
      const entry = writeEntry({ type: 'finding', author: 'a', topic: 't', content: 'c' });
      resolveEntry(entry.id);
      const result = supersedeEntry(entry.id, 'other');
      expect(result).toBeNull();
    });
  });

  describe('resolveEntry', () => {
    it('resolves an active entry', () => {
      const entry = writeEntry({ type: 'task', author: 'a', topic: 't', content: 'fix bug' });
      const resolved = resolveEntry(entry.id);
      expect(resolved).not.toBeNull();
      expect(resolved!.status).toBe('resolved');
    });
  });

  describe('dismissEntry', () => {
    it('dismisses an active entry', () => {
      const entry = writeEntry({ type: 'hypothesis', author: 'a', topic: 't', content: 'wrong hypothesis' });
      const dismissed = dismissEntry(entry.id);
      expect(dismissed).not.toBeNull();
      expect(dismissed!.status).toBe('dismissed');
    });
  });

  describe('compactBlackboard', () => {
    it('removes dismissed entries', () => {
      const e1 = writeEntry({ type: 'finding', author: 'a', topic: 't', content: 'c1' });
      const e2 = writeEntry({ type: 'finding', author: 'a', topic: 't', content: 'c2' });
      dismissEntry(e1.id);

      const result = compactBlackboard();
      expect(result.remaining).toBe(1);
    });
  });

  describe('getTopicGraph', () => {
    it('builds topic graph from active entries', () => {
      writeEntry({ type: 'finding', author: 'a', topic: 'security', content: 'c1', confidence: 0.8 });
      writeEntry({ type: 'finding', author: 'b', topic: 'security', content: 'c2', confidence: 0.6 });
      writeEntry({ type: 'finding', author: 'a', topic: 'performance', content: 'c3', confidence: 0.9 });

      const graph = getTopicGraph();
      expect(graph.security).toBeDefined();
      expect(graph.security.count).toBe(2);
      expect(graph.security.authors.length).toBe(2);
      expect(graph.performance.count).toBe(1);
    });
  });
});
