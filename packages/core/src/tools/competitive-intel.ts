//! Capability `competitive-intel` — competitive intelligence and market analysis.
// Pure, deterministic, keyless. Analyzes competitor data, feature matrices,
// pricing comparison, market positioning, technology trend tracking.
import { z } from 'zod';

// ── Types ────────────────────────────────────────────────────────────────────

export type CompetitorTier = 'direct' | 'indirect' | 'aspirational' | 'emerging';

export interface Competitor {
  name: string;
  tier: CompetitorTier;
  url?: string;
  description: string;
  features: string[];
  pricing: string;
  strengths: string[];
  weaknesses: string[];
  techStack: string[];
  lastUpdated: string;
}

export interface FeatureMatrix {
  features: string[];
  competitors: Record<string, Record<string, 'yes' | 'no' | 'partial' | 'unknown'>>;
}

export interface MarketPosition {
  name: string;
  differentiation: string[];
  targetAudience: string;
  valueProposition: string;
  moat: string[];
}

export interface TechTrend {
  name: string;
  category: string;
  maturity: 'emerging' | 'growing' | 'mature' | 'declining';
  relevance: 'high' | 'medium' | 'low';
  description: string;
  sources: string[];
}

export interface IntelReport {
  competitors: Competitor[];
  featureMatrix: FeatureMatrix;
  position: MarketPosition;
  trends: TechTrend[];
  swot: SWOT;
  summary: string;
}

export interface SWOT {
  strengths: string[];
  weaknesses: string[];
  opportunities: string[];
  threats: string[];
}

// ── Analysis Engine ──────────────────────────────────────────────────────────

let _idCounter = 0;

export function addCompetitor(data: Omit<Competitor, 'lastUpdated'>): Competitor {
  return { ...data, lastUpdated: new Date().toISOString() };
}

export function buildFeatureMatrix(competitors: Competitor[]): FeatureMatrix {
  const allFeatures = new Set<string>();
  for (const c of competitors) for (const f of c.features) allFeatures.add(f);
  const features = [...allFeatures].sort();
  const matrix: Record<string, Record<string, 'yes' | 'no' | 'partial' | 'unknown'>> = {};
  for (const c of competitors) {
    matrix[c.name] = {};
    for (const f of features) {
      if (c.features.includes(f)) matrix[c.name][f] = 'yes';
      else matrix[c.name][f] = 'no';
    }
  }
  return { features, competitors: matrix };
}

export function computeSWOT(competitors: Competitor[], position: MarketPosition): SWOT {
  const strengths = [...position.differentiation];
  const weaknesses: string[] = [];
  const opportunities: string[] = [];
  const threats: string[] = [];

  // Analyze competitor weaknesses as our opportunities
  for (const c of competitors) {
    for (const w of c.weaknesses) {
      opportunities.push(`Capitalize on ${c.name}'s weakness: ${w}`);
    }
    for (const s of c.strengths) {
      threats.push(`${c.name} strength: ${s}`);
    }
  }

  // Our potential weaknesses (features competitors have we don't)
  const ourFeatures = new Set(position.differentiation.map(d => d.toLowerCase()));
  for (const c of competitors) {
    for (const f of c.features) {
      if (!ourFeatures.has(f.toLowerCase())) {
        weaknesses.push(`Missing feature vs ${c.name}: ${f}`);
      }
    }
  }

  return {
    strengths: strengths.slice(0, 10),
    weaknesses: weaknesses.slice(0, 10),
    opportunities: opportunities.slice(0, 10),
    threats: threats.slice(0, 10),
  };
}

export function generateIntelReport(
  competitors: Competitor[],
  position: MarketPosition,
  trends: TechTrend[],
): IntelReport {
  const featureMatrix = buildFeatureMatrix(competitors);
  const swot = computeSWOT(competitors, position);

  const summary = [
    `Competitive Intelligence Report`,
    `Competitors: ${competitors.length} (${competitors.filter(c => c.tier === 'direct').length} direct)`,
    `Features tracked: ${featureMatrix.features.length}`,
    `SWOT: ${swot.strengths.length}S/${swot.weaknesses.length}W/${swot.opportunities.length}O/${swot.threats.length}T`,
    `Trends: ${trends.length} (${trends.filter(t => t.relevance === 'high').length} high relevance)`,
  ].join(' | ');

  return { competitors, featureMatrix, position, trends, swot, summary };
}

// ── Tool Schema ──────────────────────────────────────────────────────────────

export const competitiveIntelSchema = z.object({
  action: z.enum(['add-competitor', 'matrix', 'swot', 'report', 'compare', 'trends']),
  competitor: z.object({
    name: z.string(),
    tier: z.enum(['direct', 'indirect', 'aspirational', 'emerging']),
    url: z.string().optional(),
    description: z.string(),
    features: z.array(z.string()),
    pricing: z.string().default('unknown'),
    strengths: z.array(z.string()),
    weaknesses: z.array(z.string()),
    techStack: z.array(z.string()).default([]),
  }).optional(),
  competitors: z.array(z.object({
    name: z.string(),
    tier: z.enum(['direct', 'indirect', 'aspirational', 'emerging']),
    url: z.string().optional(),
    description: z.string(),
    features: z.array(z.string()),
    pricing: z.string().default('unknown'),
    strengths: z.array(z.string()),
    weaknesses: z.array(z.string()),
    techStack: z.array(z.string()).default([]),
  })).optional(),
  position: z.object({
    name: z.string(),
    differentiation: z.array(z.string()),
    targetAudience: z.string(),
    valueProposition: z.string(),
    moat: z.array(z.string()),
  }).optional(),
  trends: z.array(z.object({
    name: z.string(),
    category: z.string(),
    maturity: z.enum(['emerging', 'growing', 'mature', 'declining']),
    relevance: z.enum(['high', 'medium', 'low']),
    description: z.string(),
    sources: z.array(z.string()).default([]),
  })).optional(),
  featureA: z.string().optional().describe('Feature to compare (compare action)'),
  featureB: z.string().optional(),
});

export type CompetitiveIntelInput = z.infer<typeof competitiveIntelSchema>;

// ── In-Memory Store ──────────────────────────────────────────────────────────

const _competitors: Competitor[] = [];
let _position: MarketPosition | null = null;
const _trends: TechTrend[] = [];

export async function competitiveIntelTool(input: CompetitiveIntelInput): Promise<unknown> {
  switch (input.action) {
    case 'add-competitor': {
      if (!input.competitor) return { error: 'competitor data required' };
      const c = addCompetitor(input.competitor);
      _competitors.push(c);
      return c;
    }
    case 'matrix': {
      const comps: Competitor[] = (input.competitors || _competitors).map(c => ({ ...c, lastUpdated: ('lastUpdated' in c ? (c as any).lastUpdated : undefined) || new Date().toISOString() }));
      if (comps.length === 0) return { error: 'no competitors to analyze' };
      return buildFeatureMatrix(comps);
    }
    case 'swot': {
      const comps: Competitor[] = (input.competitors || _competitors).map(c => ({ ...c, lastUpdated: ('lastUpdated' in c ? (c as any).lastUpdated : undefined) || new Date().toISOString() }));
      const pos = input.position || _position;
      if (!pos) return { error: 'position required for SWOT' };
      return computeSWOT(comps, pos);
    }
    case 'report': {
      const comps: Competitor[] = (input.competitors || _competitors).map(c => ({ ...c, lastUpdated: ('lastUpdated' in c ? (c as any).lastUpdated : undefined) || new Date().toISOString() }));
      const pos = input.position || _position;
      const trends = input.trends || _trends;
      if (!pos) return { error: 'position required for report' };
      if (input.position) _position = input.position;
      if (input.trends) { _trends.length = 0; _trends.push(...input.trends); }
      return generateIntelReport(comps, pos, trends);
    }
    case 'compare': {
      if (!input.featureA || !input.featureB) return { error: 'two features required for compare' };
      const comps: Competitor[] = (input.competitors || _competitors).map(c => ({ ...c, lastUpdated: ('lastUpdated' in c ? (c as any).lastUpdated : undefined) || new Date().toISOString() }));
      const matrix = buildFeatureMatrix(comps);
      const comparison: Record<string, { a: string; b: string }> = {};
      for (const [name, features] of Object.entries(matrix.competitors)) {
        comparison[name] = { a: features[input.featureA] || 'unknown', b: features[input.featureB] || 'unknown' };
      }
      return { featureA: input.featureA, featureB: input.featureB, comparison };
    }
    case 'trends': {
      if (input.trends) { _trends.length = 0; _trends.push(...input.trends); }
      return { trends: _trends, count: _trends.length };
    }
  }
}
