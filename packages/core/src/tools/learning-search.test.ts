import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { runLearningSearch, parseSearchOutput, parseStatsOutput, learningSearch, learningSearchToolDescriptor } from './learning-search';

describe('learning-search', () => {
  describe('parseSearchOutput', () => {
    it('parses SOURCE results with matches and contexts', () => {
      const output = `=== Offline Search: 'programacion' ===
Searching in: all

[1] SOURCE: sources\\libros-programacion-gratis.md
    Matches: 15
      1. # librosgratis.dev 115 libros gratuitos de programacion
      2. ... enlace ...

[2] SOURCE: sources\\fundamentos-programacion.md
    Matches: 1
      1. # FundamentosDeLaProgramacion fuente

[3] MEMORY: learning/LEARNINGS.md
`;

      const hits = parseSearchOutput(output, 'search');
      expect(hits).toHaveLength(3);
      expect(hits[0].type).toBe('source');
      expect(hits[0].file).toBe('sources\\libros-programacion-gratis.md');
      expect(hits[0].matches).toBe(15);
      expect(hits[0].contexts).toHaveLength(2);
      expect(hits[2].type).toBe('memory');
    });

    it('parses TRUTH results with cases', () => {
      const output = `=== Offline Search: 'SDF' ===
Searching in: all

[1] TRUTH: truth\\truth_ultraia_capabilities.json
    Cases: [{'id': 'ultraia_sdf', 'source': 'packages/core/src/tools/sdf.ts', 'verified': true, ...}]
`;

      const hits = parseSearchOutput(output, 'search');
      expect(hits).toHaveLength(1);
      expect(hits[0].type).toBe('truth');
      expect(hits[0].file).toBe('truth\\truth_ultraia_capabilities.json');
      expect(hits[0].cases).toBeDefined();
    });

    it('handles empty output', () => {
      const hits = parseSearchOutput('No matches found in the learning corpus.', 'search');
      expect(hits).toHaveLength(0);
    });
  });

  describe('parseStatsOutput', () => {
    it('parses corpus statistics', () => {
      const output = `=== Learning Corpus Statistics ===
Total source files: 30
Total lines: 11209

Files:
  - sources\\libros-programacion-gratis.md (414 lines)
  - sources\\fundamentos-programacion.md (124 lines)

Truth files: 9
Truth cases: 54
Memory bundle: ultraia_memory.zip
  Files in bundle: 71
`;

      const stats = parseStatsOutput(output);
      expect(stats).toBeDefined();
      expect(stats!.total_source_files).toBe(30);
      expect(stats!.total_lines).toBe(11209);
      expect(stats!.source_files).toHaveLength(2);
      expect(stats!.truth_files).toBe(9);
      expect(stats!.truth_cases).toBe(54);
      expect(stats!.memory_bundle).toBe('ultraia_memory.zip');
      expect(stats!.memory_files_in_bundle).toBe(71);
    });

    it('returns undefined for non-stats output', () => {
      const stats = parseStatsOutput('=== Offline Search: test ===\nNo matches');
      expect(stats).toBeUndefined();
    });
  });

  describe('learningSearch namespace', () => {
    it('exports all expected functions', () => {
      expect(learningSearch.runLearningSearch).toBeDefined();
      expect(learningSearch.parseSearchOutput).toBeDefined();
      expect(learningSearch.parseStatsOutput).toBeDefined();
      expect(learningSearch.learningSearchToolDescriptor).toBeDefined();
    });

    it('tool descriptor has correct structure', () => {
      const desc = learningSearchToolDescriptor;
      expect(desc.name).toBe('learning_search');
      expect(desc.parameters.properties.action.enum).toEqual(['search', 'stats', 'source']);
      expect(desc.parameters.properties.target.enum).toEqual(['all', 'sources', 'truth', 'responses', 'memory']);
    });
  });

  describe('runLearningSearch (integration)', () => {
    // These tests require Python and the search script to be available
    // They are marked as integration tests and may be skipped in CI

    it.skip('search action returns results for "programacion"', async () => {
      const result = await runLearningSearch({ action: 'search', query: 'programacion' });
      expect(result.ok).toBe(true);
      expect(result.action).toBe('search');
      expect(result.results).toBeDefined();
      expect(Array.isArray(result.results)).toBe(true);
      expect(result.results!.length).toBeGreaterThan(0);
    });

    it.skip('stats action returns corpus stats', async () => {
      const result = await runLearningSearch({ action: 'stats' });
      expect(result.ok).toBe(true);
      expect(result.action).toBe('stats');
      expect(result.stats).toBeDefined();
      expect(result.stats!.total_source_files).toBeGreaterThan(0);
    });

    it.skip('source action searches specific file', async () => {
      const result = await runLearningSearch({ action: 'source', source: 'fundamentos-programacion' });
      expect(result.ok).toBe(true);
      expect(result.action).toBe('source');
      expect(result.results).toBeDefined();
    });
  });
});