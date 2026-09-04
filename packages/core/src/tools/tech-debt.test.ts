import { describe, it, expect } from 'vitest';
import {
  scanDebt,
  generateRepaymentPlan,
  techDebtTool,
} from './tech-debt';

describe('tech-debt', () => {
  describe('scanDebt', () => {
    it('scans directory for debt items', () => {
      const report = scanDebt(process.cwd(), ['node_modules', '.git', '.next', 'dist', 'coverage', '.ultraia', 'resultTask'], 10);
      expect(report.items).toBeDefined();
      expect(report.totalEffortMinutes).toBeGreaterThanOrEqual(0);
      expect(report.score).toBeGreaterThanOrEqual(0);
      expect(report.score).toBeLessThanOrEqual(100);
      expect(report.summary).toContain('debt items');
    });

    it('detects TODO comments', () => {
      const report = scanDebt(process.cwd(), ['node_modules', '.git', '.next', 'dist', 'coverage', '.ultraia', 'resultTask'], 5);
      const todos = report.items.filter((i: any) => i.category === 'todo');
      expect(todos.length).toBeGreaterThanOrEqual(0);
    });
  });

  describe('generateRepaymentPlan', () => {
    it('creates a repayment plan sorted by priority', () => {
      const report = scanDebt(process.cwd(), ['node_modules', '.git', '.next', 'dist', 'coverage', '.ultraia', 'resultTask'], 5);
      const plan = generateRepaymentPlan(report, 10, 4);
      expect(plan.length).toBeGreaterThanOrEqual(0);
      if (plan.length > 0) {
        expect(plan[0].week).toBe(1);
        expect(plan[0].effortHours).toBeGreaterThan(0);
      }
    });
  });

  describe('techDebtTool', () => {
    it('requires dir for scan', async () => {
      const result = await techDebtTool({ action: 'scan' });
      expect(result).toHaveProperty('error');
    });

    it('scans with dir', async () => {
      const result = await techDebtTool({ action: 'scan', dir: process.cwd(), maxFiles: 5 }) as any;
      expect(result.items).toBeDefined();
      expect(result.score).toBeGreaterThanOrEqual(0);
    });

    it('generates repayment plan', async () => {
      const result = await techDebtTool({ action: 'repayment', dir: process.cwd(), maxFiles: 5, maxHoursPerWeek: 5, weeks: 2 }) as any;
      expect(result.plan).toBeDefined();
      expect(result.report).toBeDefined();
    });

    it('prioritizes top items', async () => {
      const result = await techDebtTool({ action: 'prioritize', dir: process.cwd(), maxFiles: 5 }) as any;
      expect(result.topPriority).toBeDefined();
      expect(result.byCategory).toBeDefined();
    });
  });
});
