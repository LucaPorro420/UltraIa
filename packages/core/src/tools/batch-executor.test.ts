import { describe, it, expect } from 'vitest';
import {
  planBatch,
  markTaskComplete,
  markTaskFailed,
  markTaskSkipped,
  getReadyTasks,
  getBatchStats,
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
});
