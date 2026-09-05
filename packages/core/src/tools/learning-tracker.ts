//! Learning Tracker — connects the unified orchestrator to the existing
// learning/ system (truth, memory, verifications). Tracks improvements
// across all apps and provides verified insights for the AI agents.
//
// Architecture:
//   learning/truth/    → verified facts (JSON)
//   learning/memory/   → compressed memory (zip)
//   learning/responses/ → raw model responses
//   learning/scripts/  → verification tools
//
// This module bridges the orchestrator's LearningEvents to the truth system.

import { z } from 'zod';

// ─── Types ──────────────────────────────────────────────────────────────────

/** A verified truth entry from the learning system. */
export interface TruthEntry {
  id: string;
  category: string;
  claim: string;
  evidence: string;
  source: string;
  verified: boolean;
  confidence: number; // 0-1
  lastVerified: number;
}

/** A learning insight derived from orchestration events. */
export interface LearningInsight {
  id: string;
  pattern: string;
  frequency: number;
  apps: string[];
  recommendation: string;
  autoApply: boolean;
}

/** Cross-app learning summary. */
export interface LearningSummary {
  totalEvents: number;
  verifiedTruths: number;
  unverifiedClaims: number;
  insights: LearningInsight[];
  topPatterns: Array<{ pattern: string; count: number }>;
  appContributions: Record<string, number>;
}

// ─── Schemas ────────────────────────────────────────────────────────────────

export const TruthEntrySchema = z.object({
  id: z.string(),
  category: z.string(),
  claim: z.string(),
  evidence: z.string(),
  source: z.string(),
  verified: z.boolean(),
  confidence: z.number().min(0).max(1),
  lastVerified: z.number(),
});

export const LearningInsightSchema = z.object({
  id: z.string(),
  pattern: z.string(),
  frequency: z.number(),
  apps: z.array(z.string()),
  recommendation: z.string(),
  autoApply: z.boolean(),
});

// ─── Learning Tracker ───────────────────────────────────────────────────────

export class LearningTracker {
  private truths: TruthEntry[] = [];
  private insights: LearningInsight[] = [];
  private eventBuffer: Array<{ app: string; category: string; description: string; timestamp: number }> = [];

  /** Load truths from the learning/truth/ directory. */
  loadTruths(truths: TruthEntry[]): void {
    this.truths = truths;
  }

  /** Record an orchestration event for pattern analysis. */
  recordEvent(event: { app: string; category: string; description: string; timestamp: number }): void {
    this.eventBuffer.push(event);
    // Keep buffer manageable
    if (this.eventBuffer.length > 500) {
      this.eventBuffer = this.eventBuffer.slice(-500);
    }
  }

  /** Analyze patterns across all recorded events. */
  analyzePatterns(): LearningInsight[] {
    const patternMap = new Map<string, { count: number; apps: Set<string>; descriptions: string[] }>();

    for (const event of this.eventBuffer) {
      const key = `${event.category}:${event.description.slice(0, 50)}`;
      const existing = patternMap.get(key) || { count: 0, apps: new Set(), descriptions: [] };
      existing.count++;
      existing.apps.add(event.app);
      existing.descriptions.push(event.description);
      patternMap.set(key, existing);
    }

    const insights: LearningInsight[] = [];
    let id = 0;

    for (const [pattern, data] of Array.from(patternMap.entries())) {
      if (data.count >= 2) { // Pattern appeared at least twice
        insights.push({
          id: `insight-${id++}`,
          pattern,
          frequency: data.count,
          apps: Array.from(data.apps),
          recommendation: this.generateRecommendation(pattern, data),
          autoApply: data.count >= 5 && data.apps.size >= 2, // Auto-apply if frequent + cross-app
        });
      }
    }

    this.insights = insights;
    return insights;
  }

  /** Generate a recommendation based on pattern analysis. */
  private generateRecommendation(
    pattern: string,
    data: { count: number; apps: Set<string>; descriptions: string[] }
  ): string {
    const [category] = pattern.split(':');

    if (data.count >= 5 && data.apps.size >= 2) {
      return `Frequent ${category} pattern across ${data.apps.size} apps. Consider standardizing approach.`;
    }
    if (data.count >= 3) {
      return `Recurring ${category} event. Review for potential automation.`;
    }
    return `Pattern observed ${data.count} times. Monitor for trend.`;
  }

  /** Get verified truths by category. */
  getTruthsByCategory(category: string): TruthEntry[] {
    return this.truths.filter(t => t.category === category && t.verified);
  }

  /** Get high-confidence unverified claims (priority for verification). */
  getUnverifiedClaims(minConfidence = 0.7): TruthEntry[] {
    return this.truths.filter(t => !t.verified && t.confidence >= minConfidence);
  }

  /** Get learning summary. */
  getSummary(): LearningSummary {
    const appContributions: Record<string, number> = {};
    for (const event of this.eventBuffer) {
      appContributions[event.app] = (appContributions[event.app] || 0) + 1;
    }

    const patternCounts = new Map<string, number>();
    for (const insight of this.insights) {
      const base = insight.pattern.split(':')[0];
      patternCounts.set(base, (patternCounts.get(base) || 0) + insight.frequency);
    }

    const topPatterns = Array.from(patternCounts.entries())
      .map(([pattern, count]) => ({ pattern, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    return {
      totalEvents: this.eventBuffer.length,
      verifiedTruths: this.truths.filter(t => t.verified).length,
      unverifiedClaims: this.truths.filter(t => !t.verified).length,
      insights: this.insights,
      topPatterns,
      appContributions,
    };
  }

  /** Export for persistence. */
  export(): { truths: TruthEntry[]; insights: LearningInsight[]; events: Array<{ app: string; category: string; description: string; timestamp: number }> } {
    return {
      truths: [...this.truths],
      insights: [...this.insights],
      events: [...this.eventBuffer],
    };
  }

  /** Import from persistence. */
  import(data: { truths: TruthEntry[]; insights: LearningInsight[]; events: Array<{ app: string; category: string; description: string; timestamp: number }> }): void {
    this.truths = data.truths;
    this.insights = data.insights;
    this.eventBuffer = data.events;
  }
}

// ─── Singleton (globalThis survives across Next.js dev mode requests) ───────

const GLOBAL_KEY = '__ultraia_learning_tracker__';

/** Get or create the singleton learning tracker (persists via globalThis). */
export function getLearningTracker(): LearningTracker {
  const g = globalThis as Record<string, unknown>;
  if (!g[GLOBAL_KEY]) {
    g[GLOBAL_KEY] = new LearningTracker();
  }
  return g[GLOBAL_KEY] as LearningTracker;
}

// ─── Tool Definition ────────────────────────────────────────────────────────

export const LEARNING_TRACKER_DESCRIPTION = `Learning Tracker — bridges orchestration events to verified truths.
Actions:
  load_truths       — Load verified truths from learning system
  record_event      — Record an orchestration event for pattern analysis
  analyze_patterns  — Analyze patterns across all recorded events
  get_truths        — Get verified truths by category
  get_unverified    — Get high-confidence unverified claims
  summary           — Get learning summary
  export            — Export for persistence
  import            — Import from persistence`;
