import { describe, it, expect, beforeEach } from 'vitest';
import {
  classifyComplexity,
  computeBatchStats,
  type ComplexityResult,
} from './complexity-router';

describe('complexity-router', () => {
  describe('classifyComplexity', () => {
    it('classifies simple queries as reflex', () => {
      const result = classifyComplexity('what time is it');
      expect(result.tier).toBe('reflex');
      expect(result.confidence).toBeGreaterThan(0.5);
      expect(result.estimatedLatencyMs).toBe(16);
      expect(result.estimatedCost).toBe('none');
    });

    it('classifies multi-step queries as deliberate', () => {
      const result = classifyComplexity('compare React and Vue for a new project, then explain the trade-offs');
      expect(result.tier).toBe('deliberate');
      expect(result.estimatedLatencyMs).toBe(800);
    });

    it('classifies complex cross-module queries as meta', () => {
      const result = classifyComplexity('migrate the AuthModule across packages Core and Web, refactor the DatabaseLayer, and orchestrate parallel Testing across all Services with security audit');
      expect(result.tier).toBe('meta');
      expect(result.signals.crossModule).toBe(true);
      expect(result.estimatedLatencyMs).toBe(2500);
      expect(result.estimatedCost).toBe('medium');
    });

    it('detects security-sensitive queries', () => {
      const result = classifyComplexity('check for SQL injection vulnerabilities in the auth token handler');
      expect(result.signals.securitySensitive).toBe(true);
      expect(result.suggestedAgents).toContain('bp-orquestador');
    });

    it('detects creative queries', () => {
      const result = classifyComplexity('create a beautiful design for the landing page with animations');
      expect(result.signals.creative).toBe(true);
    });

    it('detects external data queries', () => {
      const result = classifyComplexity('search for the latest news about AI agents');
      expect(result.signals.externalData).toBe(true);
    });

    it('estimates tokens', () => {
      const result = classifyComplexity('hello');
      expect(result.signals.estimatedTokens).toBeGreaterThan(0);
    });

    it('suggests agents based on tier', () => {
      const reflex = classifyComplexity('list files');
      expect(reflex.suggestedAgents.length).toBeGreaterThan(0);
      
      const meta = classifyComplexity('orchestrate parallel security audit across all modules with cross-module analysis and complex reasoning');
      expect(meta.suggestedAgents.length).toBeGreaterThan(0);
    });
  });

  describe('computeBatchStats', () => {
    it('computes stats for mixed results', () => {
      const results: ComplexityResult[] = [
        classifyComplexity('simple query'),
        classifyComplexity('compare React and Vue for a new project with detailed trade-offs and examples'),
        classifyComplexity('migrate auth across packages, refactor db layer, orchestrate parallel testing, and deploy to production'),
      ];
      const stats = computeBatchStats(results);
      expect(stats.total).toBe(3);
      expect(stats.reflex + stats.deliberate + stats.meta).toBe(3);
      expect(stats.avgLatencyMs).toBeGreaterThan(0);
    });

    it('handles empty results', () => {
      const stats = computeBatchStats([]);
      expect(stats.total).toBe(0);
      expect(stats.avgLatencyMs).toBe(0);
    });
  });
});
