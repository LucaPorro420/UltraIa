//! Capability `complexity-router` — meta-cognitive router (cerebellum/cerebro pattern).
// Pure, deterministic, keyless. Classifies query complexity to route between
// fast-path (cached/tool-dispatch) and slow-path (full LLM reasoning).
// Based on SOFAI (Nature 2025) and CODA (arxiv 2025) dual-process architecture.
import { z } from 'zod';

// ── Types ────────────────────────────────────────────────────────────────────

export type ComplexityTier = 'reflex' | 'deliberate' | 'meta';

export interface ComplexitySignal {
  /** Number of distinct concepts/entities in the query. */
  entityCount: number;
  /** Estimated reasoning depth (steps needed). */
  reasoningDepth: number;
  /** Whether the query requires multi-file or cross-module context. */
  crossModule: boolean;
  /** Whether the query involves creative/generative work. */
  creative: boolean;
  /** Whether the query requires real-time data or external APIs. */
  externalData: boolean;
  /** Whether the query touches security-sensitive areas. */
  securitySensitive: boolean;
  /** Total estimated tokens for full processing. */
  estimatedTokens: number;
}

export interface ComplexityResult {
  tier: ComplexityTier;
  confidence: number;
  signals: ComplexitySignal;
  recommendation: string;
  estimatedLatencyMs: number;
  estimatedCost: 'none' | 'low' | 'medium' | 'high';
  suggestedAgents: string[];
}

// ── Heuristics ───────────────────────────────────────────────────────────────

const SECURITY_KEYWORDS = new Set([
  'auth', 'password', 'token', 'secret', 'encrypt', 'decrypt', 'hash',
  'session', 'cookie', 'jwt', 'oauth', 'csrf', 'xss', 'injection',
  'vulnerability', 'cve', 'exploit', 'pentest', 'owasp', 'firewall',
]);

const CREATIVE_KEYWORDS = new Set([
  'create', 'design', 'generate', 'imagine', 'art', 'visual', 'animation',
  'video', 'music', 'story', 'write', 'compose', 'illustration', 'brand',
]);

const EXTERNAL_KEYWORDS = new Set([
  'search', 'find', 'fetch', 'download', 'api', 'web', 'scrape',
  'rss', 'github', 'arxiv', 'news', 'real-time', 'live', 'current',
]);

const CROSS_MODULE_PATTERNS = [
  /\b(across|between|from|to|and)\b.*\b(modules?|packages?|files?|services?)\b/i,
  /\b(migrate|refactor|move|extract|split|merge)\b/i,
  /\b(deploy|ci|cd|pipeline|workflow)\b/i,
];

function countEntities(query: string): number {
  // Heuristic: count capitalized words, proper nouns, and technical terms
  const words = query.split(/\s+/);
  let count = 0;
  for (const w of words) {
    if (/^[A-Z]/.test(w) || /[_-]/.test(w) || /\.(ts|js|py|go|rs)$/.test(w)) count++;
  }
  return Math.max(1, count);
}

function estimateReasoningDepth(query: string): number {
  let depth = 1;
  // Multi-step indicators
  if (/\b(first|then|next|after|before|finally)\b/i.test(query)) depth += 2;
  if (/\b(because|why|explain|reason)\b/i.test(query)) depth += 1;
  if (/\b(compare|versus|difference|trade-?off)\b/i.test(query)) depth += 2;
  if (/\b(optimize|improve|performance|faster)\b/i.test(query)) depth += 1;
  if (/\b(test|verify|validate|check)\b/i.test(query)) depth += 1;
  if (/\b(orchestrat|coordinat|parallel|batch)\b/i.test(query)) depth += 2;
  return depth;
}

function hasCrossModule(query: string): boolean {
  return CROSS_MODULE_PATTERNS.some(p => p.test(query));
}

function hasKeywords(query: string, keywords: Set<string>): boolean {
  const lower = query.toLowerCase();
  for (const kw of keywords) {
    if (lower.includes(kw)) return true;
  }
  return false;
}

function estimateTokens(query: string): number {
  // Rough: 1 token per 4 chars + overhead for tools/context
  return Math.ceil(query.length / 4) + 500;
}

// ── Core ─────────────────────────────────────────────────────────────────────

export function classifyComplexity(query: string): ComplexityResult {
  const signals: ComplexitySignal = {
    entityCount: countEntities(query),
    reasoningDepth: estimateReasoningDepth(query),
    crossModule: hasCrossModule(query),
    creative: hasKeywords(query, CREATIVE_KEYWORDS),
    externalData: hasKeywords(query, EXTERNAL_KEYWORDS),
    securitySensitive: hasKeywords(query, SECURITY_KEYWORDS),
    estimatedTokens: estimateTokens(query),
  };

  // Score: weighted sum
  let score = 0;
  score += Math.min(signals.entityCount, 10) * 2;         // max 20
  score += Math.min(signals.reasoningDepth, 10) * 3;      // max 30
  score += signals.crossModule ? 15 : 0;
  score += signals.creative ? 10 : 0;
  score += signals.externalData ? 5 : 0;
  score += signals.securitySensitive ? 10 : 0;
  score += Math.min(signals.estimatedTokens / 200, 15);   // max 15

  // Tier classification
  let tier: ComplexityTier;
  let confidence: number;
  let recommendation: string;
  let estimatedLatencyMs: number;
  let estimatedCost: 'none' | 'low' | 'medium' | 'high';
  let suggestedAgents: string[];

  if (score <= 20) {
    tier = 'reflex';
    confidence = Math.min(0.95, 0.7 + score * 0.0125);
    recommendation = 'Fast path: use cached response, tool dispatch, or pattern match. No full LLM reasoning needed.';
    estimatedLatencyMs = 16;
    estimatedCost = 'none';
    suggestedAgents = ['bp-gestor'];
  } else if (score <= 50) {
    tier = 'deliberate';
    confidence = Math.min(0.9, 0.6 + (score - 20) * 0.01);
    recommendation = 'Standard path: single-agent reasoning with relevant tools. Moderate context needed.';
    estimatedLatencyMs = 800;
    estimatedCost = 'low';
    suggestedAgents = ['bp-investigador', 'bp-analista'];
  } else {
    tier = 'meta';
    confidence = Math.min(0.85, 0.5 + (score - 50) * 0.005);
    recommendation = 'Deep path: multi-agent orchestration, planning, cross-module reasoning. Full context window.';
    estimatedLatencyMs = 2500;
    estimatedCost = 'medium';
    suggestedAgents = ['bp-orquestador', 'bp-investigador', 'bp-analista'];
  }

  if (signals.securitySensitive) {
    suggestedAgents = ['bp-orquestador', ...suggestedAgents];
    estimatedCost = estimatedCost === 'none' ? 'low' : estimatedCost;
  }

  return { tier, confidence, signals, recommendation, estimatedLatencyMs, estimatedCost, suggestedAgents };
}

// ── Tool Schema ──────────────────────────────────────────────────────────────

export const complexityRouterSchema = z.object({
  action: z.enum(['classify', 'batch', 'stats']),
  query: z.string().optional().describe('Query to classify (for classify action)'),
  queries: z.array(z.string()).optional().describe('Multiple queries to classify (for batch action)'),
});

export type ComplexityRouterInput = z.infer<typeof complexityRouterSchema>;

// ── Batch Statistics ─────────────────────────────────────────────────────────

export interface BatchStats {
  total: number;
  reflex: number;
  deliberate: number;
  meta: number;
  avgScore: number;
  avgLatencyMs: number;
  totalEstimatedCost: string;
}

export function computeBatchStats(results: ComplexityResult[]): BatchStats {
  let reflex = 0, deliberate = 0, meta = 0;
  let totalScore = 0, totalLatency = 0;

  for (const r of results) {
    if (r.tier === 'reflex') reflex++;
    else if (r.tier === 'deliberate') deliberate++;
    else meta++;
    totalScore += r.signals.estimatedTokens;
    totalLatency += r.estimatedLatencyMs;
  }

  return {
    total: results.length,
    reflex,
    deliberate,
    meta,
    avgScore: results.length ? Math.round(totalScore / results.length) : 0,
    avgLatencyMs: results.length ? Math.round(totalLatency / results.length) : 0,
    totalEstimatedCost: results.reduce((acc, r) => {
      if (r.estimatedCost === 'high') return 'high';
      if (r.estimatedCost === 'medium' && acc !== 'high') return 'medium';
      if (r.estimatedCost === 'low' && acc === 'none') return 'low';
      return acc;
    }, 'none' as string),
  };
}

// ── Tool Handler ─────────────────────────────────────────────────────────────

export async function complexityRouterTool(input: ComplexityRouterInput): Promise<unknown> {
  switch (input.action) {
    case 'classify': {
      if (!input.query) return { error: 'query required for classify action' };
      return classifyComplexity(input.query);
    }
    case 'batch': {
      if (!input.queries?.length) return { error: 'queries required for batch action' };
      const results = input.queries.map(q => classifyComplexity(q));
      const stats = computeBatchStats(results);
      return { results, stats };
    }
    case 'stats': {
      return {
        tiers: ['reflex', 'deliberate', 'meta'],
        latencyBenchmarks: { reflex: 16, deliberate: 800, meta: 2500 },
        costTiers: ['none', 'low', 'medium', 'high'],
        description: 'Complexity router metadata for meta-cognitive routing.',
      };
    }
  }
}
