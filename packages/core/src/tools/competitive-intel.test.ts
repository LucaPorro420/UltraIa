import { describe, it, expect } from 'vitest';
import {
  addCompetitor,
  buildFeatureMatrix,
  computeSWOT,
  generateIntelReport,
  competitiveIntelTool,
} from './competitive-intel';

describe('competitive-intel', () => {
  const competitors = [
    addCompetitor({
      name: 'CompetitorA',
      tier: 'direct',
      description: 'Direct competitor with similar features',
      features: ['auth', 'dashboard', 'api', 'mobile'],
      pricing: '$29/mo',
      strengths: ['strong brand', 'large user base'],
      weaknesses: ['slow performance', 'poor docs'],
      techStack: ['React', 'Node.js'],
    }),
    addCompetitor({
      name: 'CompetitorB',
      tier: 'indirect',
      description: 'Indirect competitor in adjacent space',
      features: ['auth', 'dashboard', 'analytics'],
      pricing: '$19/mo',
      strengths: ['cheap pricing', 'good UX'],
      weaknesses: ['limited API', 'no mobile'],
      techStack: ['Vue', 'Python'],
    }),
  ];

  const position = {
    name: 'UltraIa',
    differentiation: ['AI-powered agents', 'multi-modal content', 'open-source core'],
    targetAudience: 'developers and creators',
    valueProposition: 'AI-native platform for autonomous content creation',
    moat: ['agent orchestration', 'procedural generation', 'community'],
  };

  describe('addCompetitor', () => {
    it('adds timestamp', () => {
      const c = addCompetitor({
        name: 'Test',
        tier: 'direct',
        description: 'test',
        features: [],
        pricing: 'free',
        strengths: [],
        weaknesses: [],
        techStack: [],
      });
      expect(c.lastUpdated).toBeDefined();
    });
  });

  describe('buildFeatureMatrix', () => {
    it('builds feature matrix', () => {
      const matrix = buildFeatureMatrix(competitors);
      expect(matrix.features.length).toBeGreaterThan(0);
      expect(matrix.competitors['CompetitorA']).toBeDefined();
      expect(matrix.competitors['CompetitorA']['auth']).toBe('yes');
      expect(matrix.competitors['CompetitorB']['mobile']).toBe('no');
    });
  });

  describe('computeSWOT', () => {
    it('computes SWOT from competitors and position', () => {
      const swot = computeSWOT(competitors, position);
      expect(swot.strengths.length).toBeGreaterThan(0);
      expect(swot.opportunities.length).toBeGreaterThan(0);
      expect(swot.threats.length).toBeGreaterThan(0);
    });
  });

  describe('generateIntelReport', () => {
    it('generates full report', () => {
      const report = generateIntelReport(competitors, position, []);
      expect(report.competitors.length).toBe(2);
      expect(report.featureMatrix.features.length).toBeGreaterThan(0);
      expect(report.swot.strengths.length).toBeGreaterThan(0);
      expect(report.summary).toContain('Competitors');
    });
  });

  describe('competitiveIntelTool', () => {
    it('adds competitor', async () => {
      const result = await competitiveIntelTool({
        action: 'add-competitor',
        competitor: {
          name: 'NewComp',
          tier: 'emerging',
          description: 'new competitor',
          features: ['ai', 'api'],
          pricing: 'free',
          strengths: ['innovative'],
          weaknesses: ['small team'],
          techStack: ['Python'],
        },
      }) as any;
      expect(result.name).toBe('NewComp');
    });

    it('builds matrix from provided competitors', async () => {
      const result = await competitiveIntelTool({
        action: 'matrix',
        competitors,
      }) as any;
      expect(result.features).toBeDefined();
      expect(result.competitors).toBeDefined();
    });

    it('computes SWOT', async () => {
      const result = await competitiveIntelTool({
        action: 'swot',
        competitors,
        position,
      }) as any;
      expect(result.strengths).toBeDefined();
      expect(result.weaknesses).toBeDefined();
    });

    it('generates report', async () => {
      const result = await competitiveIntelTool({
        action: 'report',
        competitors,
        position,
        trends: [{ name: 'AI Agents', category: 'tech', maturity: 'growing', relevance: 'high', description: 'AI agents are trending', sources: ['arxiv'] }],
      }) as any;
      expect(result.competitors).toBeDefined();
      expect(result.featureMatrix).toBeDefined();
      expect(result.swot).toBeDefined();
    });

    it('compares features', async () => {
      const result = await competitiveIntelTool({
        action: 'compare',
        competitors,
        featureA: 'auth',
        featureB: 'mobile',
      }) as any;
      expect(result.featureA).toBe('auth');
      expect(result.featureB).toBe('mobile');
      expect(result.comparison).toBeDefined();
    });

    it('computes SWOT from provided position', async () => {
      const result = await competitiveIntelTool({
        action: 'swot',
        competitors,
        position,
      }) as any;
      expect(result.strengths).toBeDefined();
      expect(result.weaknesses).toBeDefined();
    });
  });
});
