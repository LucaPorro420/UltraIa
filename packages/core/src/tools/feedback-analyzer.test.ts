import { describe, it, expect } from 'vitest';
import { analyzeFeedback, feedbackAnalyzerTool } from './feedback-analyzer';

describe('feedback-analyzer', () => {
  const sampleFeedback = [
    { text: 'I love this app! It is amazing and fast.', source: 'twitter', author: 'user1' },
    { text: 'The login is broken, I keep getting 500 errors.', source: 'github', author: 'user2' },
    { text: 'Would be nice to have dark mode support.', source: 'email', author: 'user3' },
    { text: 'How do I connect to the API?', source: 'discord', author: 'user4' },
    { text: 'Terrible performance, the app is so slow and laggy.', source: 'twitter', author: 'user5' },
    { text: 'Please add export to PDF feature.', source: 'github', author: 'user6' },
    { text: 'Security vulnerability: hardcoded API key in config.', source: 'security-scan', author: 'agent' },
    { text: 'The UI design is beautiful and clean.', source: 'review', author: 'user7' },
  ];

  describe('analyzeFeedback', () => {
    it('analyzes sentiment correctly', () => {
      const report = analyzeFeedback(sampleFeedback);
      expect(report.items.length).toBe(8);
      expect(report.summary.total).toBe(8);
      expect(report.summary.sentiment.positive).toBeGreaterThan(0);
      expect(report.summary.sentiment.negative).toBeGreaterThan(0);
    });

    it('classifies types', () => {
      const report = analyzeFeedback(sampleFeedback);
      expect(report.summary.type.bug).toBeGreaterThan(0);
      expect(report.summary.type.feature).toBeGreaterThan(0);
      expect(report.summary.type.praise).toBeGreaterThan(0);
    });

    it('clusters by topic', () => {
      const report = analyzeFeedback(sampleFeedback);
      expect(report.clusters.length).toBeGreaterThan(0);
    });

    it('computes actionable rate', () => {
      const report = analyzeFeedback(sampleFeedback);
      expect(report.summary.actionableRate).toBeGreaterThan(0);
      expect(report.summary.actionableRate).toBeLessThanOrEqual(100);
    });
  });

  describe('feedbackAnalyzerTool', () => {
    it('analyzes feedback array', async () => {
      const result = await feedbackAnalyzerTool({
        action: 'analyze',
        feedback: sampleFeedback,
      }) as any;
      expect(result.items).toBeDefined();
      expect(result.clusters).toBeDefined();
      expect(result.summary).toBeDefined();
    });

    it('prioritizes feedback', async () => {
      const report = analyzeFeedback(sampleFeedback);
      const result = await feedbackAnalyzerTool({
        action: 'prioritize',
        report,
      }) as any;
      expect(result.critical).toBeDefined();
      expect(result.recommendation).toContain('critical');
    });

    it('shows trends', async () => {
      const report = analyzeFeedback(sampleFeedback);
      const result = await feedbackAnalyzerTool({
        action: 'trends',
        report,
      }) as any;
      expect(result.sentimentDistribution).toBeDefined();
      expect(result.topBugs).toBeDefined();
      expect(result.topFeatures).toBeDefined();
    });

    it('requires feedback for analyze', async () => {
      const result = await feedbackAnalyzerTool({ action: 'analyze' });
      expect(result).toHaveProperty('error');
    });
  });
});
