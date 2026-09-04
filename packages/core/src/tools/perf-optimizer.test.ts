import { describe, it, expect } from 'vitest';
import {
  scanPerformance,
  WEB_VITALS_BUDGET,
  perfOptimizerTool,
} from './perf-optimizer';

describe('perf-optimizer', () => {
  describe('WEB_VITALS_BUDGET', () => {
    it('has standard web vitals', () => {
      expect(WEB_VITALS_BUDGET.length).toBeGreaterThanOrEqual(6);
      const metrics = WEB_VITALS_BUDGET.map((b: any) => b.metric);
      expect(metrics).toContain('LCP');
      expect(metrics).toContain('FID');
      expect(metrics).toContain('CLS');
      expect(metrics).toContain('INP');
    });
  });

  describe('scanPerformance', () => {
    it('scans a directory for perf issues', () => {
      const report = scanPerformance(process.cwd(), ['node_modules', '.git', '.next', 'dist', 'coverage', '.ultraia', 'resultTask'], 10);
      expect(report.findings).toBeDefined();
      expect(report.budget).toBe(WEB_VITALS_BUDGET);
      expect(report.score).toBeGreaterThanOrEqual(0);
      expect(report.score).toBeLessThanOrEqual(100);
      expect(report.summary).toContain('Found');
    });

    it('detects sync fs calls', () => {
      const result = perfOptimizerTool({
        action: 'suggest',
        fileContent: 'const data = readFileSync("file.txt");',
      });
      expect(result).resolves.toMatchObject({ findings: expect.arrayContaining([expect.objectContaining({ rule: 'sync_fs_in_handler' })]) });
    });

    it('detects serial awaits', () => {
      const result = perfOptimizerTool({
        action: 'suggest',
        fileContent: 'for (const item of items) { await fetch(item.url); }',
      });
      expect(result).resolves.toMatchObject({ findings: expect.arrayContaining([expect.objectContaining({ rule: 'serial_await' })]) });
    });
  });

  describe('perfOptimizerTool', () => {
    it('returns budget list', async () => {
      const result = await perfOptimizerTool({ action: 'budget' });
      expect(result).toHaveProperty('budgets');
    });

    it('returns all rules for suggest without fileContent', async () => {
      const result = await perfOptimizerTool({ action: 'suggest' }) as any;
      expect(result.rules).toBeDefined();
      expect(result.rules.length).toBeGreaterThan(0);
    });

    it('returns specific rule suggestion', async () => {
      const result = await perfOptimizerTool({ action: 'suggest', ruleId: 'sync_fs_in_handler' }) as any;
      expect(result.rule).toBe('sync_fs_in_handler');
      expect(result.fix).toContain('async');
    });
  });
});
