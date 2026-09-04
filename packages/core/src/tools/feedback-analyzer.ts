//! Capability `feedback-analyzer` — user feedback analysis and sentiment tracking.
// Pure, deterministic, keyless. Analyzes text feedback for sentiment, extracts
// feature requests, classifies bugs, clusters similar feedback, prioritizes
// by frequency and impact.
import { z } from 'zod';

// ── Types ────────────────────────────────────────────────────────────────────

export type Sentiment = 'positive' | 'negative' | 'neutral' | 'mixed';
export type FeedbackType = 'bug' | 'feature' | 'improvement' | 'praise' | 'question' | 'complaint';
export type Urgency = 'critical' | 'high' | 'medium' | 'low';

export interface FeedbackItem {
  id: string;
  text: string;
  source: string;
  author?: string;
  timestamp: string;
  sentiment: Sentiment;
  sentimentScore: number; // -1 to 1
  type: FeedbackType;
  urgency: Urgency;
  topics: string[];
  actionable: boolean;
}

export interface FeedbackCluster {
  id: string;
  topic: string;
  count: number;
  avgSentiment: number;
  items: string[]; // feedback IDs
  suggestion: string;
}

export interface FeedbackReport {
  items: FeedbackItem[];
  clusters: FeedbackCluster[];
  summary: {
    total: number;
    sentiment: Record<Sentiment, number>;
    type: Record<FeedbackType, number>;
    urgency: Record<Urgency, number>;
    topTopics: string[];
    actionableRate: number;
  };
}

// ── Keyword Banks ────────────────────────────────────────────────────────────

const POSITIVE_WORDS = new Set([
  'love', 'great', 'awesome', 'excellent', 'amazing', 'perfect', 'beautiful',
  'fantastic', 'brilliant', 'wonderful', 'incredible', 'outstanding', 'superb',
  'nice', 'good', 'like', 'enjoy', 'happy', 'pleased', 'impressed', 'thanks',
  'thank', 'appreciate', 'helpful', 'useful', 'easy', 'fast', 'smooth', 'clean',
]);

const NEGATIVE_WORDS = new Set([
  'hate', 'terrible', 'awful', 'horrible', 'broken', 'bug', 'error', 'crash',
  'fail', 'failed', 'failing', 'slow', 'ugly', 'annoying', 'frustrating',
  'confusing', 'complicated', 'difficult', 'impossible', 'worst', 'bad',
  'poor', 'disappointing', 'useless', 'waste', 'laggy', 'stuck', 'hang',
  'freeze', 'unresponsive', 'missing', 'wrong', 'incorrect', 'problem',
]);

const FEATURE_WORDS = new Set([
  'want', 'need', 'wish', 'should', 'would be nice', 'please add',
  'could you', 'feature', 'support', 'integrate', 'option', 'settings',
  'custom', 'configurable', 'export', 'import', 'api', 'webhook',
]);

const BUG_WORDS = new Set([
  'bug', 'error', 'crash', 'broken', 'doesn\'t work', 'not working',
  'fails', 'exception', 'stack trace', 'unexpected', 'incorrect',
  'wrong', 'undefined', 'null', 'NaN', '500', '404', 'timeout',
]);

const URGENCY_CRITICAL = new Set(['security', 'data loss', 'production', 'outage', 'down', 'critical', 'urgent']);
const URGENCY_HIGH = new Set(['blocking', 'stuck', 'cannot', 'impossible', 'broken', 'major']);

// ── Analysis ─────────────────────────────────────────────────────────────────

function analyzeSentiment(text: string): { sentiment: Sentiment; score: number } {
  const lower = text.toLowerCase();
  const words = lower.split(/\s+/);
  let pos = 0, neg = 0;
  for (const w of words) {
    if (POSITIVE_WORDS.has(w)) pos++;
    if (NEGATIVE_WORDS.has(w)) neg++;
  }
  const total = pos + neg || 1;
  const score = (pos - neg) / total;
  const sentiment: Sentiment = score > 0.2 ? 'positive' : score < -0.2 ? 'negative' : Math.abs(score) < 0.1 ? 'neutral' : 'mixed';
  return { sentiment, score: Math.round(score * 100) / 100 };
}

function classifyType(text: string): FeedbackType {
  const lower = text.toLowerCase();
  let bugScore = 0, featureScore = 0, praiseScore = 0, questionScore = 0;
  for (const w of BUG_WORDS) if (lower.includes(w)) bugScore++;
  for (const w of FEATURE_WORDS) if (lower.includes(w)) featureScore++;
  for (const w of POSITIVE_WORDS) if (lower.includes(w)) praiseScore++;
  if (/\?/.test(text)) questionScore += 2;

  const max = Math.max(bugScore, featureScore, praiseScore, questionScore);
  if (max === 0) return 'complaint';
  if (bugScore === max) return 'bug';
  if (featureScore === max) return 'feature';
  if (praiseScore === max) return 'praise';
  return 'question';
}

function classifyUrgency(text: string): Urgency {
  const lower = text.toLowerCase();
  for (const w of URGENCY_CRITICAL) if (lower.includes(w)) return 'critical';
  for (const w of URGENCY_HIGH) if (lower.includes(w)) return 'high';
  if (/\b(bug|error|broken|fail)\b/i.test(text)) return 'medium';
  return 'low';
}

function extractTopics(text: string): string[] {
  const topics: string[] = [];
  const patterns = [
    /\b(auth|login|register|password)\b/i, /\b(ui|ux|design|layout|color|theme)\b/i,
    /\b(api|endpoint|fetch|request|response)\b/i, /\b(test|testing|coverage|spec)\b/i,
    /\b(deploy|ci|cd|build|pipeline)\b/i, /\b(performance|speed|fast|slow|latency)\b/i,
    /\b(mobile|android|ios|responsive)\b/i, /\b(documentation|docs|readme)\b/i,
    /\b(video|image|audio|media)\b/i, /\b(agent|orchestrat|loop|brain)\b/i,
    /\b(security|auth|token|encrypt)\b/i, /\b(cloud|storage|upload|download)\b/i,
    /\b(publish|social|telegram|discord|youtube)\b/i, /\b(content|blog|post|article)\b/i,
  ];
  for (const p of patterns) {
    if (p.test(text)) {
      const match = text.match(p);
      if (match) topics.push(match[1].toLowerCase());
    }
  }
  return [...new Set(topics)];
}

// ── Clustering ───────────────────────────────────────────────────────────────

function clusterFeedback(items: FeedbackItem[]): FeedbackCluster[] {
  const topicMap = new Map<string, string[]>();
  const sentimentMap = new Map<string, number[]>();

  for (const item of items) {
    for (const topic of item.topics) {
      if (!topicMap.has(topic)) { topicMap.set(topic, []); sentimentMap.set(topic, []); }
      topicMap.get(topic)!.push(item.id);
      sentimentMap.get(topic)!.push(item.sentimentScore);
    }
  }

  const clusters: FeedbackCluster[] = [];
  for (const [topic, ids] of topicMap) {
    const sentiments = sentimentMap.get(topic) || [];
    const avgSentiment = sentiments.reduce((a, b) => a + b, 0) / (sentiments.length || 1);
    clusters.push({
      id: `cluster-${topic}`,
      topic,
      count: ids.length,
      avgSentiment: Math.round(avgSentiment * 100) / 100,
      items: ids,
      suggestion: avgSentiment < -0.3
        ? `Urgent: ${topic} has high negative sentiment (${ids.length} reports). Prioritize fixes.`
        : avgSentiment > 0.3
          ? `${topic} is well-received. Consider expanding related features.`
          : `${topic} has mixed feedback. Investigate specific pain points.`,
    });
  }
  return clusters.sort((a, b) => b.count - a.count);
}

// ── Main ─────────────────────────────────────────────────────────────────────

export function analyzeFeedback(feedbackArray: { text: string; source: string; author?: string; timestamp?: string }[]): FeedbackReport {
  const items: FeedbackItem[] = feedbackArray.map((f, i) => {
    const { sentiment, score } = analyzeSentiment(f.text);
    return {
      id: `fb-${i + 1}`,
      text: f.text,
      source: f.source,
      author: f.author,
      timestamp: f.timestamp || new Date().toISOString(),
      sentiment,
      sentimentScore: score,
      type: classifyType(f.text),
      urgency: classifyUrgency(f.text),
      topics: extractTopics(f.text),
      actionable: classifyType(f.text) !== 'praise',
    };
  });

  const clusters = clusterFeedback(items);

  const sentiment = { positive: 0, negative: 0, neutral: 0, mixed: 0 } as Record<Sentiment, number>;
  const type = { bug: 0, feature: 0, improvement: 0, praise: 0, question: 0, complaint: 0 } as Record<FeedbackType, number>;
  const urgency = { critical: 0, high: 0, medium: 0, low: 0 } as Record<Urgency, number>;
  const topicCount = new Map<string, number>();

  for (const item of items) {
    sentiment[item.sentiment]++;
    type[item.type]++;
    urgency[item.urgency]++;
    for (const t of item.topics) topicCount.set(t, (topicCount.get(t) || 0) + 1);
  }

  const topTopics = [...topicCount.entries()].sort((a, b) => b[1] - a[1]).slice(0, 10).map(([t]) => t);
  const actionable = items.filter(i => i.actionable).length;

  return {
    items,
    clusters,
    summary: {
      total: items.length,
      sentiment,
      type,
      urgency,
      topTopics,
      actionableRate: items.length ? Math.round(actionable / items.length * 100) : 0,
    },
  };
}

// ── Tool Schema ──────────────────────────────────────────────────────────────

export const feedbackAnalyzerSchema = z.object({
  action: z.enum(['analyze', 'prioritize', 'trends']),
  feedback: z.array(z.object({
    text: z.string(),
    source: z.string().default('manual'),
    author: z.string().optional(),
    timestamp: z.string().optional(),
  })).optional().describe('Feedback items to analyze'),
  report: z.object({
    items: z.array(z.object({
      id: z.string(),
      text: z.string(),
      source: z.string(),
      sentiment: z.enum(['positive', 'negative', 'neutral', 'mixed']),
      sentimentScore: z.number(),
      type: z.enum(['bug', 'feature', 'improvement', 'praise', 'question', 'complaint']),
      urgency: z.enum(['critical', 'high', 'medium', 'low']),
      topics: z.array(z.string()),
      actionable: z.boolean(),
    })),
    clusters: z.array(z.object({
      id: z.string(),
      topic: z.string(),
      count: z.number(),
      avgSentiment: z.number(),
      items: z.array(z.string()),
      suggestion: z.string(),
    })),
  }).optional().describe('Existing report for prioritize/trends actions'),
});

export type FeedbackAnalyzerInput = z.infer<typeof feedbackAnalyzerSchema>;

export async function feedbackAnalyzerTool(input: FeedbackAnalyzerInput): Promise<unknown> {
  switch (input.action) {
    case 'analyze': {
      if (!input.feedback?.length) return { error: 'feedback array required' };
      return analyzeFeedback(input.feedback);
    }
    case 'prioritize': {
      if (!input.report) return { error: 'report required for prioritize' };
      const critical = input.report.items.filter(i => i.urgency === 'critical' || i.urgency === 'high');
      const topClusters = input.report.clusters.filter(c => c.count >= 3 || c.avgSentiment < -0.3);
      return { critical, topClusters, recommendation: 'Focus on critical items first, then high-frequency clusters.' };
    }
    case 'trends': {
      if (!input.report) return { error: 'report required for trends' };
      return {
        sentimentDistribution: input.report.items.reduce((acc, i) => { acc[i.sentiment]++; return acc; }, {} as Record<string, number>),
        topBugs: input.report.items.filter(i => i.type === 'bug').slice(0, 5),
        topFeatures: input.report.items.filter(i => i.type === 'feature').slice(0, 5),
        actionItems: input.report.clusters.filter(c => c.avgSentiment < -0.2).map(c => c.suggestion),
      };
    }
  }
}
