import { describe, it, expect } from 'vitest';
import {
  LearningTracker,
  getLearningTracker,
  type TruthEntry,
} from './learning-tracker';

describe('LearningTracker', () => {
  it('loads truths', () => {
    const t = new LearningTracker();
    const truths: TruthEntry[] = [
      { id: '1', category: 'api', claim: 'x', evidence: 'y', source: 'z', verified: true, confidence: 0.9, lastVerified: 1 },
    ];
    t.loadTruths(truths);
    expect(t.getTruthsByCategory('api')).toHaveLength(1);
    expect(t.getTruthsByCategory('other')).toHaveLength(0);
  });

  it('filters verified truths', () => {
    const t = new LearningTracker();
    t.loadTruths([
      { id: '1', category: 'api', claim: 'x', evidence: 'y', source: 'z', verified: true, confidence: 0.9, lastVerified: 1 },
      { id: '2', category: 'api', claim: 'a', evidence: 'b', source: 'c', verified: false, confidence: 0.8, lastVerified: 2 },
    ]);
    expect(t.getTruthsByCategory('api')).toHaveLength(1); // only verified
  });

  it('gets unverified claims above threshold', () => {
    const t = new LearningTracker();
    t.loadTruths([
      { id: '1', category: 'x', claim: 'a', evidence: 'b', source: 'c', verified: false, confidence: 0.9, lastVerified: 0 },
      { id: '2', category: 'x', claim: 'd', evidence: 'e', source: 'f', verified: false, confidence: 0.5, lastVerified: 0 },
    ]);
    expect(t.getUnverifiedClaims(0.7)).toHaveLength(1);
    expect(t.getUnverifiedClaims(0.3)).toHaveLength(2);
  });

  it('records events and analyzes patterns', () => {
    const t = new LearningTracker();
    t.recordEvent({ app: 'web', category: 'bug', description: 'Fix login error', timestamp: 1 });
    t.recordEvent({ app: 'mobile', category: 'bug', description: 'Fix login error', timestamp: 2 });
    t.recordEvent({ app: 'web', category: 'bug', description: 'Fix login error', timestamp: 3 });

    const insights = t.analyzePatterns();
    expect(insights.length).toBeGreaterThan(0);
    expect(insights[0].frequency).toBeGreaterThanOrEqual(2);
  });

  it('auto-applies frequent cross-app patterns', () => {
    const t = new LearningTracker();
    for (let i = 0; i < 5; i++) {
      t.recordEvent({ app: 'web', category: 'improvement', description: 'Standardize API', timestamp: i });
      t.recordEvent({ app: 'mobile', category: 'improvement', description: 'Standardize API', timestamp: i + 100 });
    }
    const insights = t.analyzePatterns();
    const autoApply = insights.filter(i => i.autoApply);
    expect(autoApply.length).toBeGreaterThan(0);
  });

  it('returns summary', () => {
    const t = new LearningTracker();
    t.loadTruths([
      { id: '1', category: 'x', claim: 'a', evidence: 'b', source: 'c', verified: true, confidence: 0.9, lastVerified: 1 },
      { id: '2', category: 'x', claim: 'd', evidence: 'e', source: 'f', verified: false, confidence: 0.5, lastVerified: 2 },
    ]);
    t.recordEvent({ app: 'web', category: 'bug', description: 'test', timestamp: 1 });

    const s = t.getSummary();
    expect(s.totalEvents).toBe(1);
    expect(s.verifiedTruths).toBe(1);
    expect(s.unverifiedClaims).toBe(1);
    expect(s.appContributions['web']).toBe(1);
  });

  it('exports and imports', () => {
    const t = new LearningTracker();
    t.loadTruths([{ id: '1', category: 'x', claim: 'a', evidence: 'b', source: 'c', verified: true, confidence: 0.9, lastVerified: 1 }]);
    t.recordEvent({ app: 'web', category: 'bug', description: 'test', timestamp: 1 });

    const data = t.export();
    const t2 = new LearningTracker();
    t2.import(data);
    expect(t2.getSummary().totalEvents).toBe(1);
    expect(t2.getSummary().verifiedTruths).toBe(1);
  });

  it('singleton getLearningTracker returns same instance', () => {
    const a = getLearningTracker();
    const b = getLearningTracker();
    expect(a).toBe(b);
  });
});
