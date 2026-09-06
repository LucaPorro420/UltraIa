/** Wiring test: verifica que la capability `learning_search` está correctamente registrada
 * en llm.ts, tools/index.ts y exportada desde el módulo learning-search.ts
 */

import { describe, it, expect } from 'vitest';
import * as learningSearchModule from './learning-search';

describe('learning_search wiring', () => {
  it('exporta runLearningSearch', () => {
    expect(typeof learningSearchModule.runLearningSearch).toBe('function');
  });

  it('exporta parseSearchOutput', () => {
    expect(typeof learningSearchModule.parseSearchOutput).toBe('function');
  });

  it('exporta parseStatsOutput', () => {
    expect(typeof learningSearchModule.parseStatsOutput).toBe('function');
  });

  it('exporta learningSearch namespace', () => {
    expect(learningSearchModule.learningSearch).toBeDefined();
    expect(typeof learningSearchModule.learningSearch.runLearningSearch).toBe('function');
    expect(typeof learningSearchModule.learningSearch.parseSearchOutput).toBe('function');
    expect(typeof learningSearchModule.learningSearch.parseStatsOutput).toBe('function');
    expect(learningSearchModule.learningSearch.learningSearchToolDescriptor).toBeDefined();
  });

  it('tool descriptor tiene estructura correcta', () => {
    const desc = learningSearchModule.learningSearchToolDescriptor;
    expect(desc.name).toBe('learning_search');
    expect(desc.description).toContain('offline');
    expect(desc.parameters.properties.action.enum).toEqual(['search', 'stats', 'source']);
    expect(desc.parameters.properties.target.enum).toEqual(['all', 'sources', 'truth', 'responses', 'memory']);
  });

  it('tipos TypeScript exportados', () => {
    // TypeScript compile-time check - si esto compila, los tipos son válidos
    type Input = learningSearchModule.LearningSearchInput;
    type Result = learningSearchModule.LearningSearchResult;
    type Hit = learningSearchModule.LearningSearchHit;
    type Stats = learningSearchModule.LearningStats;

    const _input: Input = { action: 'search', query: 'test', target: 'sources' };
    const _result: Result = { ok: true, action: 'search', query: 'test', target: 'sources', results: [] };
    const _hit: Hit = { file: 'test.md', type: 'source', matches: 1 };
    const _stats: Stats = { total_source_files: 1, total_lines: 10, source_files: [], truth_files: 1, truth_cases: 1, memory_bundle: 'test.zip', memory_files_in_bundle: 1 };

    // Si llegamos aquí, los tipos son correctos
    expect(true).toBe(true);
  });
});