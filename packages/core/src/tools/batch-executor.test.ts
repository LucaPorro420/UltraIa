import { describe, it, expect } from 'vitest';
import {
  planBatch,
  markTaskComplete,
  markTaskFailed,
  markTaskSkipped,
  getReadyTasks,
  getBatchStats,
  exportPlan,
  importPlan,
  batchExecutorTool,
} from './batch-executor';

describe('batch-executor', () => {
  describe('planBatch', () => {
    it('creates a plan with waves', () => {
      const plan = planBatch('test-batch', [
        { name: 'task-a', description: '', estimatedMs: 1000, dependsOn: [] },
        { name: 'task-b', description: '', estimatedMs: 2000, dependsOn: ['task-0'] },
        { name: 'task-c', description: '', estimatedMs: 500, dependsOn: ['task-0', 'task-1'] },
      ]);
      expect(plan.id).toMatch(/^batch-\d+$/);
      expect(plan.tasks.length).toBe(3);
      expect(plan.waves.length).toBeGreaterThanOrEqual(2);
      expect(plan.totalEstimatedMs).toBe(3500);
    });

    it('handles independent tasks in single wave', () => {
      const plan = planBatch('parallel', [
        { name: 'a', description: '', estimatedMs: 1000, dependsOn: [] },
        { name: 'b', description: '', estimatedMs: 1000, dependsOn: [] },
        { name: 'c', description: '', estimatedMs: 1000, dependsOn: [] },
      ]);
      expect(plan.waves.length).toBe(1);
      expect(plan.waves[0].length).toBe(3);
    });

    it('computes critical path', () => {
      const plan = planBatch('chain', [
        { name: 'a', description: '', estimatedMs: 1000, dependsOn: [] },
        { name: 'b', description: '', estimatedMs: 2000, dependsOn: ['task-0'] },
        { name: 'c', description: '', estimatedMs: 500, dependsOn: ['task-1'] },
      ]);
      expect(plan.criticalPathMs).toBe(3500); // 1000 + 2000 + 500
    });

    it('supports custom task IDs', () => {
      const plan = planBatch('custom-ids', [
        { id: 'alpha', name: 'a', description: '', estimatedMs: 1000, dependsOn: [] },
        { id: 'beta', name: 'b', description: '', estimatedMs: 1000, dependsOn: ['alpha'] },
      ]);
      expect(plan.tasks[0].id).toBe('alpha');
      expect(plan.tasks[1].id).toBe('beta');
      expect(plan.waves[0]).toContain('alpha');
      expect(plan.waves[1]).toContain('beta');
    });

    it('sorts wave by priority', () => {
      const plan = planBatch('priority', [
        { name: 'low', description: '', estimatedMs: 1000, dependsOn: [] },
        { name: 'high', description: '', estimatedMs: 1000, dependsOn: [] },
      ]);
      // Both are in same wave, higher priority first
      plan.tasks[0].priority = 1;
      plan.tasks[1].priority = 10;
      const waves = (plan as any).waves;
      // After re-sorting, high should come first in wave 0
    });
  });

  describe('getReadyTasks', () => {
    it('returns tasks with no pending dependencies', () => {
      const plan = planBatch('test', [
        { name: 'a', description: '', estimatedMs: 1000, dependsOn: [] },
        { name: 'b', description: '', estimatedMs: 1000, dependsOn: ['task-0'] },
      ]);
      const ready = getReadyTasks(plan);
      expect(ready.length).toBe(1);
      expect(ready[0].name).toBe('a');
    });

    it('returns next wave after completing first', () => {
      const plan = planBatch('test', [
        { name: 'a', description: '', estimatedMs: 1000, dependsOn: [] },
        { name: 'b', description: '', estimatedMs: 1000, dependsOn: ['task-0'] },
      ]);
      markTaskComplete(plan, 'task-0', 'done');
      const ready = getReadyTasks(plan);
      expect(ready.length).toBe(1);
      expect(ready[0].name).toBe('b');
    });

    it('includes retrying tasks as ready', () => {
      const plan = planBatch('test', [
        { name: 'a', description: '', estimatedMs: 1000, dependsOn: [] },
      ]);
      plan.tasks[0].maxRetries = 2;
      plan.tasks[0].status = 'retrying';
      const ready = getReadyTasks(plan);
      expect(ready.length).toBe(1);
    });
  });

  describe('markTaskComplete', () => {
    it('marks task as completed with result', () => {
      const plan = planBatch('test', [
        { name: 'a', description: '', estimatedMs: 1000, dependsOn: [] },
      ]);
      markTaskComplete(plan, 'task-0', 'output data', 800);
      expect(plan.tasks[0].status).toBe('completed');
      expect(plan.tasks[0].result).toBe('output data');
      expect(plan.tasks[0].actualMs).toBe(800);
    });
  });

  describe('markTaskFailed', () => {
    it('marks task as failed with error', () => {
      const plan = planBatch('test', [
        { name: 'a', description: '', estimatedMs: 1000, dependsOn: [] },
      ]);
      markTaskFailed(plan, 'task-0', 'timeout exceeded');
      expect(plan.tasks[0].status).toBe('failed');
      expect(plan.tasks[0].error).toBe('timeout exceeded');
    });

    it('retries task when maxRetries > 0', () => {
      const plan = planBatch('test', [
        { name: 'a', description: '', estimatedMs: 1000, dependsOn: [] },
      ]);
      plan.tasks[0].maxRetries = 2;
      markTaskFailed(plan, 'task-0', 'error 1');
      expect(plan.tasks[0].status).toBe('retrying');
      expect(plan.tasks[0].retryCount).toBe(1);
      expect(plan.tasks[0].error).toContain('retry 1/2');
    });

    it('fails permanently after exhausting retries', () => {
      const plan = planBatch('test', [
        { name: 'a', description: '', estimatedMs: 1000, dependsOn: [] },
      ]);
      plan.tasks[0].maxRetries = 1;
      markTaskFailed(plan, 'task-0', 'error 1');
      expect(plan.tasks[0].status).toBe('retrying');
      markTaskFailed(plan, 'task-0', 'error 2');
      expect(plan.tasks[0].status).toBe('failed');
      expect(plan.tasks[0].retryCount).toBe(1);
    });
  });

  describe('getBatchStats', () => {
    it('computes stats for mixed status', () => {
      const plan = planBatch('test', [
        { name: 'a', description: '', estimatedMs: 1000, dependsOn: [] },
        { name: 'b', description: '', estimatedMs: 1000, dependsOn: [] },
        { name: 'c', description: '', estimatedMs: 1000, dependsOn: [] },
      ]);
      markTaskComplete(plan, 'task-0', 'ok', 900);
      markTaskFailed(plan, 'task-1', 'error');
      markTaskSkipped(plan, 'task-2');

      const stats = getBatchStats(plan);
      expect(stats.totalTasks).toBe(3);
      expect(stats.completed).toBe(1);
      expect(stats.failed).toBe(1);
      expect(stats.skipped).toBe(1);
      expect(stats.pending).toBe(0);
    });
  });

  describe('markTaskSkipped', () => {
    it('marks task as skipped', () => {
      const plan = planBatch('test', [
        { name: 'a', description: '', estimatedMs: 1000, dependsOn: [] },
      ]);
      markTaskSkipped(plan, 'task-0');
      expect(plan.tasks[0].status).toBe('skipped');
    });
  });

  describe('export/import', () => {
    it('roundtrips plan through export/import', () => {
      const plan = planBatch('export-test', [
        { name: 'a', description: 'desc', estimatedMs: 500, dependsOn: [] },
      ]);
      markTaskComplete(plan, 'task-0', 'result');
      const json = exportPlan(plan);
      const imported = importPlan(json);
      expect(imported).not.toBeNull();
      expect(imported!.id).toBe(plan.id);
      expect(imported!.tasks[0].status).toBe('completed');
      expect(imported!.tasks[0].result).toBe('result');
    });

    it('returns null for invalid JSON', () => {
      expect(importPlan('not json')).toBeNull();
      expect(importPlan('{"no":"tasks"}')).toBeNull();
    });
  });

  describe('tool handler', () => {
    it('creates plan via tool', async () => {
      const result = await batchExecutorTool({
        action: 'plan',
        planName: 'tool-test',
        tasks: [{ name: 't1', description: '', estimatedMs: 100, dependsOn: [] }],
      }) as any;
      expect(result.id).toMatch(/^batch-/);
      expect(result.tasks.length).toBe(1);
    });

    it('returns error for missing params', async () => {
      const result = await batchExecutorTool({ action: 'plan' }) as any;
      expect(result.error).toBeDefined();
    });

    it('resets all plans', async () => {
      await batchExecutorTool({
        action: 'plan',
        planName: 'to-clear',
        tasks: [{ name: 't1', description: '', estimatedMs: 100, dependsOn: [] }],
      });
      const result = await batchExecutorTool({ action: 'reset' }) as any;
      expect(result.ok).toBe(true);
    });

    it('exports and imports plan', async () => {
      const plan = await batchExecutorTool({
        action: 'plan',
        planName: 'roundtrip',
        tasks: [{ name: 't1', description: '', estimatedMs: 100, dependsOn: [] }],
      }) as any;
      const exported = await batchExecutorTool({ action: 'export', planId: plan.id }) as any;
      expect(exported.json).toBeDefined();
      const imported = await batchExecutorTool({ action: 'import', planJson: exported.json }) as any;
      expect(imported.id).toBe(plan.id);
    });
  });
});
