import { describe, it, expect, beforeEach } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import { SharedMemory, createSharedMemory, getDefaultMemory } from './memory';

describe('SharedMemory', () => {
  let memory: SharedMemory;

  beforeEach(() => {
    memory = new SharedMemory();
  });

  describe('save and query', () => {
    it('saves and retrieves an entry', () => {
      const entry = memory.save({
        type: 'plan',
        topic: 'test topic',
        content: 'test content',
        metadata: { key: 'value' },
        importance: 0.5,
      });

      expect(entry.id).toBe('mem-1');
      expect(entry.type).toBe('plan');
      expect(entry.topic).toBe('test topic');
      expect(entry.timestamp).toBeGreaterThan(0);
    });

    it('queries by topic', () => {
      memory.save({
        type: 'plan',
        topic: 'email validation',
        content: 'plan 1',
        metadata: {},
        importance: 0.5,
      });

      memory.save({
        type: 'plan',
        topic: 'password hashing',
        content: 'plan 2',
        metadata: {},
        importance: 0.5,
      });

      const results = memory.query({ topic: 'email' });
      expect(results).toHaveLength(1);
      expect(results[0].topic).toBe('email validation');
    });

    it('queries by type', () => {
      memory.save({
        type: 'plan',
        topic: 'test',
        content: 'plan',
        metadata: {},
        importance: 0.5,
      });

      memory.save({
        type: 'success',
        topic: 'test',
        content: 'success',
        metadata: {},
        importance: 0.7,
      });

      const plans = memory.query({ type: 'plan' });
      expect(plans).toHaveLength(1);

      const successes = memory.query({ type: 'success' });
      expect(successes).toHaveLength(1);
    });

    it('queries by min importance', () => {
      memory.save({
        type: 'lesson',
        topic: 'test',
        content: 'low importance',
        metadata: {},
        importance: 0.3,
      });

      memory.save({
        type: 'lesson',
        topic: 'test',
        content: 'high importance',
        metadata: {},
        importance: 0.9,
      });

      const results = memory.query({ minImportance: 0.5 });
      expect(results).toHaveLength(1);
      expect(results[0].content).toBe('high importance');
    });

    it('queries with limit', () => {
      for (let i = 0; i < 10; i++) {
        memory.save({
          type: 'plan',
          topic: `topic ${i}`,
          content: `content ${i}`,
          metadata: {},
          importance: 0.5,
        });
      }

      const results = memory.query({ limit: 3 });
      expect(results).toHaveLength(3);
    });

    it('returns newest first', () => {
      memory.save({
        type: 'plan',
        topic: 'old',
        content: 'old',
        metadata: {},
        importance: 0.5,
      });

      // Small delay to ensure different timestamps
      const start = Date.now();
      while (Date.now() === start) {
        // spin
      }

      memory.save({
        type: 'plan',
        topic: 'new',
        content: 'new',
        metadata: {},
        importance: 0.5,
      });

      const results = memory.query();
      expect(results[0].topic).toBe('new');
      expect(results[1].topic).toBe('old');
    });
  });

  describe('get and delete', () => {
    it('gets entry by ID', () => {
      const saved = memory.save({
        type: 'plan',
        topic: 'test',
        content: 'content',
        metadata: {},
        importance: 0.5,
      });

      const retrieved = memory.get(saved.id);
      expect(retrieved).toBeDefined();
      expect(retrieved?.id).toBe(saved.id);
    });

    it('deletes entry by ID', () => {
      const saved = memory.save({
        type: 'plan',
        topic: 'test',
        content: 'content',
        metadata: {},
        importance: 0.5,
      });

      expect(memory.delete(saved.id)).toBe(true);
      expect(memory.get(saved.id)).toBeUndefined();
    });

    it('returns false when deleting non-existent ID', () => {
      expect(memory.delete('non-existent')).toBe(false);
    });
  });

  describe('convenience methods', () => {
    it('recordSuccess creates success entry', () => {
      const entry = memory.recordSuccess('topic', 'success details');
      expect(entry.type).toBe('success');
      expect(entry.importance).toBe(0.7);
    });

    it('recordFailure creates failure entry', () => {
      const entry = memory.recordFailure('topic', 'failure details');
      expect(entry.type).toBe('failure');
      expect(entry.importance).toBe(0.8);
    });

    it('recordLesson creates lesson entry', () => {
      const entry = memory.recordLesson('topic', 'lesson learned');
      expect(entry.type).toBe('lesson');
      expect(entry.importance).toBe(0.9);
    });

    it('getLessons returns lesson contents', () => {
      memory.recordLesson('email', 'Use Zod for validation');
      memory.recordLesson('email', 'Always sanitize input');

      const lessons = memory.getLessons('email');
      expect(lessons).toHaveLength(2);
      expect(lessons).toContain('Use Zod for validation');
    });

    it('getSimilarPlans returns plans', () => {
      memory.save({
        type: 'plan',
        topic: 'email validation',
        content: JSON.stringify({ steps: [] }),
        metadata: {},
        importance: 0.6,
      });

      const plans = memory.getSimilarPlans('email');
      expect(plans).toHaveLength(1);
    });
  });

  describe('stats', () => {
    it('computes correct statistics', () => {
      memory.recordSuccess('test', 'success 1');
      memory.recordSuccess('test', 'success 2');
      memory.recordFailure('test', 'failure 1');
      memory.recordLesson('test', 'lesson 1');

      const stats = memory.stats();
      expect(stats.total).toBe(4);
      expect(stats.byType.success).toBe(2);
      expect(stats.byType.failure).toBe(1);
      expect(stats.byType.lesson).toBe(1);
      expect(stats.recentSuccess).toBe(2);
      expect(stats.recentFailure).toBe(1);
      expect(stats.successRate).toBeCloseTo(0.667, 2);
    });
  });

  describe('export and import', () => {
    it('exports and imports correctly', () => {
      memory.recordSuccess('test', 'success');
      memory.recordLesson('test', 'lesson');

      const json = memory.export();
      const newMemory = new SharedMemory();
      const imported = newMemory.import(json);

      expect(imported).toBe(2);
      expect(newMemory.stats().total).toBe(2);
    });

    it('handles invalid JSON gracefully', () => {
      const newMemory = new SharedMemory();
      const imported = newMemory.import('invalid json');
      expect(imported).toBe(0);
    });
  });

  describe('persistence', () => {
    it('persists to file when path provided', () => {
      const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'memory-test-'));
      const persistPath = path.join(tmpDir, 'memory.json');

      const mem = createSharedMemory({ persistPath });
      mem.recordSuccess('test', 'persisted');

      // Verify file was written
      expect(fs.existsSync(persistPath)).toBe(true);

      // Load from file
      const mem2 = createSharedMemory({ persistPath });
      expect(mem2.stats().total).toBe(1);

      // Cleanup
      fs.rmSync(tmpDir, { recursive: true });
    });
  });

  describe('clear', () => {
    it('removes all entries', () => {
      memory.recordSuccess('test', 's1');
      memory.recordFailure('test', 'f1');
      memory.recordLesson('test', 'l1');

      memory.clear();
      expect(memory.stats().total).toBe(0);
    });
  });
});

describe('Factory functions', () => {
  it('createSharedMemory returns new instance', () => {
    const m1 = createSharedMemory();
    const m2 = createSharedMemory();
    expect(m1).not.toBe(m2);
  });

  it('getDefaultMemory returns singleton', () => {
    const m1 = getDefaultMemory();
    const m2 = getDefaultMemory();
    expect(m1).toBe(m2);
  });
});
