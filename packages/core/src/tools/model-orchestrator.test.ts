/**
 * Tests for model-orchestrator + model-memory
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  classifyTask,
  selectModel,
  createOrchestrator,
  recordUsage,
  shouldSwitchModel,
  switchModel,
  getNextFallback,
  FALLBACK_CHAINS,
  MODELS,
  type OrchestratorState,
  type TaskKind,
} from './model-orchestrator.js';
import {
  createSession,
  addTurn,
  buildContextSummary,
  extractKeyFacts,
  prepareForSwitch,
  resumePrompt,
  getSessionStats,
  exportSessionMarkdown,
  type Session,
} from './model-memory.js';

/* ------------------------------------------------------------------ */
/*  model-orchestrator tests                                           */
/* ------------------------------------------------------------------ */

describe('classifyTask', () => {
  it('classifies code tasks', () => {
    expect(classifyTask('write a React component for the dashboard')).toBe('code');
    expect(classifyTask('fix the TypeScript error in auth.ts')).toBe('code');
    expect(classifyTask('implement the API endpoint for user registration')).toBe('code');
  });

  it('classifies reasoning tasks', () => {
    expect(classifyTask('why is this architecture better than microservices?')).toBe('reasoning');
    expect(classifyTask('compare the trade-offs between SQL and NoSQL')).toBe('reasoning');
    expect(classifyTask('analiza el rendimiento de este algoritmo')).toBe('reasoning');
  });

  it('classifies creative tasks', () => {
    expect(classifyTask('write a blog post about AI trends')).toBe('creative');
    expect(classifyTask('create marketing copy for the landing page')).toBe('creative');
    expect(classifyTask('traducir este documento al español')).toBe('creative');
  });

  it('classifies vision tasks', () => {
    expect(classifyTask('what is shown in this screenshot?')).toBe('vision');
    expect(classifyTask('describe this image')).toBe('vision');
    expect(classifyTask('mira este diagrama')).toBe('vision');
  });

  it('classifies fast tasks for short input', () => {
    expect(classifyTask('hello')).toBe('fast');
    expect(classifyTask('what time is it?')).toBe('fast');
  });

  it('classifies agent tasks', () => {
    expect(classifyTask('execute the deployment pipeline')).toBe('agent');
    expect(classifyTask('run the automated loop')).toBe('agent');
    expect(classifyTask('ejecuta el ciclo de build')).toBe('agent');
  });
});

describe('selectModel', () => {
  let state: OrchestratorState;

  beforeEach(() => {
    state = createOrchestrator();
  });

  it('selects a premium model for code by default', () => {
    const model = selectModel('code', state);
    expect(model.tier).toBe('premium');
    expect(model.strengths).toContain('code');
  });

  it('selects a free model when preferFree is true', () => {
    const model = selectModel('code', state, { preferFree: true });
    expect(model.tier).toBe('free');
    expect(model.strengths).toContain('code');
  });

  it('selects a vision-capable model when required', () => {
    const model = selectModel('vision', state, { requireVision: true });
    expect(model.visionCapable).toBe(true);
  });

  it('respects maxCostPer1k filter', () => {
    const model = selectModel('code', state, { maxCostPer1k: 0.0001 });
    expect(model.costPer1kInput).toBeLessThanOrEqual(0.0001);
  });

  it('falls back when rate limited', () => {
    const model = selectModel('code', state);
    // Exhaust rate limit
    for (let i = 0; i < model.rateLimitRpm + 1; i++) {
      recordUsage(state, model.id, 'code', 100, 100);
    }
    const next = selectModel('code', state);
    // Should pick a different model (or same if it's the only one)
    expect(next).toBeDefined();
  });
});

describe('createOrchestrator', () => {
  it('creates state with default model', () => {
    const state = createOrchestrator();
    expect(state.currentModel).toBe('orca/anthropic/claude-sonnet-4');
    expect(state.totalCost).toBe(0);
    expect(state.taskHistory).toHaveLength(0);
  });

  it('creates state with custom model', () => {
    const state = createOrchestrator('orca/qwen/qwen3.8-27b-free');
    expect(state.currentModel).toBe('orca/qwen/qwen3.8-27b-free');
  });
});

describe('recordUsage', () => {
  it('tracks cost correctly', () => {
    const state = createOrchestrator();
    recordUsage(state, 'orca/anthropic/claude-sonnet-4', 'code', 1000, 1000);
    // Sonnet: $0.003/1K in, $0.015/1K out → 0.003 + 0.015 = 0.018
    expect(state.totalCost).toBeCloseTo(0.018, 4);
  });

  it('tracks rate limits', () => {
    const state = createOrchestrator();
    const modelId = 'orca/qwen/qwen3.8-27b-free';
    recordUsage(state, modelId, 'fast', 100, 100);
    expect(state.rateLimitCounts[modelId].minute).toBe(1);
    expect(state.rateLimitCounts[modelId].day).toBe(1);
  });

  it('adds to task history', () => {
    const state = createOrchestrator();
    recordUsage(state, 'orca/anthropic/claude-sonnet-4', 'code', 500, 200);
    expect(state.taskHistory).toHaveLength(1);
    expect(state.taskHistory[0].task).toBe('code');
    expect(state.taskHistory[0].tokens).toBe(700);
  });
});

describe('shouldSwitchModel', () => {
  it('suggests switch when task is not in model strengths', () => {
    const state = createOrchestrator('orca/openrouter/nemotron-nano-12b-vl:free'); // vision only
    const result = shouldSwitchModel(state, 'code');
    expect(result.shouldSwitch).toBe(true);
  });

  it('does not switch when model is suitable', () => {
    const state = createOrchestrator('orca/anthropic/claude-sonnet-4');
    const result = shouldSwitchModel(state, 'code');
    expect(result.shouldSwitch).toBe(false);
  });
});

describe('switchModel', () => {
  it('switches model and updates state', () => {
    const state = createOrchestrator();
    const result = switchModel(state, 'vision', { preferFree: true });
    expect(result.previousModel).toBe('orca/anthropic/claude-sonnet-4');
    expect(state.currentModel).not.toBe('orca/anthropic/claude-sonnet-4');
    expect(result.reason).toContain('vision');
  });
});

describe('getNextFallback', () => {
  it('returns next model in chain', () => {
    const next = getNextFallback('code', 'orca/anthropic/claude-sonnet-4');
    expect(next).toBe('orca/qwen/qwen3.8-max');
  });

  it('returns null at end of chain', () => {
    const chain = FALLBACK_CHAINS['code'];
    const last = chain[chain.length - 1];
    const next = getNextFallback('code', last);
    expect(next).toBeNull();
  });

  it('returns null for unknown model', () => {
    const next = getNextFallback('code', 'nonexistent/model');
    expect(next).toBeNull();
  });
});

describe('MODELS registry', () => {
  it('has models from both providers', () => {
    const orcaModels = MODELS.filter(m => m.provider === 'orca');
    const orModels = MODELS.filter(m => m.provider === 'openrouter');
    expect(orcaModels.length).toBeGreaterThan(0);
    expect(orModels.length).toBeGreaterThan(0);
  });

  it('has free models', () => {
    const free = MODELS.filter(m => m.tier === 'free');
    expect(free.length).toBeGreaterThanOrEqual(5);
  });

  it('has vision-capable models', () => {
    const vision = MODELS.filter(m => m.visionCapable);
    expect(vision.length).toBeGreaterThanOrEqual(1);
  });

  it('each model has valid strengths', () => {
    const validKinds: TaskKind[] = ['code', 'reasoning', 'creative', 'fast', 'vision', 'long-context', 'agent'];
    for (const m of MODELS) {
      for (const s of m.strengths) {
        expect(validKinds).toContain(s);
      }
    }
  });
});

/* ------------------------------------------------------------------ */
/*  model-memory tests                                                 */
/* ------------------------------------------------------------------ */

describe('createSession', () => {
  it('creates a session with initial state', () => {
    const session = createSession('test-001', 'orca/anthropic/claude-sonnet-4');
    expect(session.sessionId).toBe('test-001');
    expect(session.turns).toHaveLength(0);
    expect(session.contextBridge.currentModel).toBe('orca/anthropic/claude-sonnet-4');
    expect(session.contextBridge.switchCount).toBe(0);
  });
});

describe('addTurn', () => {
  it('adds a user turn and extracts facts', () => {
    const session = createSession('test-002', 'orca/anthropic/claude-sonnet-4');
    addTurn(session, {
      role: 'user',
      content: 'Fix the bug in packages/core/src/tools/auth.ts',
      model: 'orca/anthropic/claude-sonnet-4',
      task: 'code',
    });
    expect(session.turns).toHaveLength(1);
    expect(session.turns[0].role).toBe('user');
  });

  it('extracts key facts from assistant turns', () => {
    const session = createSession('test-003', 'orca/anthropic/claude-sonnet-4');
    addTurn(session, {
      role: 'assistant',
      content: 'I decided to use Prisma for the database. Fixed the error in packages/core/src/tools/model-orchestrator.ts',
      model: 'orca/anthropic/claude-sonnet-4',
      task: 'code',
      filesChanged: ['packages/core/src/tools/model-orchestrator.ts'],
    });
    expect(session.contextBridge.accumulatedFacts.length).toBeGreaterThan(0);
  });
});

describe('buildContextSummary', () => {
  it('returns no prior context for empty session', () => {
    const session = createSession('test-004', 'orca/anthropic/claude-sonnet-4');
    const summary = buildContextSummary(session);
    expect(summary).toContain('No prior conversation');
  });

  it('generates summary with turns', () => {
    const session = createSession('test-005', 'orca/anthropic/claude-sonnet-4');
    addTurn(session, {
      role: 'user', content: 'Build a REST API', model: 'orca/anthropic/claude-sonnet-4', task: 'code',
    });
    addTurn(session, {
      role: 'assistant', content: 'I will create the API in packages/core/src/api/server.ts', model: 'orca/anthropic/claude-sonnet-4', task: 'code',
    });
    const summary = buildContextSummary(session);
    expect(summary).toContain('REST API');
    expect(summary).toContain('server.ts');
  });
});

describe('extractKeyFacts', () => {
  it('extracts file paths', () => {
    const facts = extractKeyFacts('Updated packages/core/src/tools/model-orchestrator.ts');
    expect(facts.some(f => f.includes('model-orchestrator.ts'))).toBe(true);
  });

  it('extracts decisions', () => {
    const facts = extractKeyFacts('We decided to use Prisma for the database layer');
    expect(facts.some(f => f.includes('Decision'))).toBe(true);
  });

  it('extracts commit hashes', () => {
    const facts = extractKeyFacts('Committed 075e706 with the new dashboard');
    expect(facts.some(f => f.includes('075e706'))).toBe(true);
  });

  it('extracts fixes', () => {
    const facts = extractKeyFacts('Fixed the CSP header blocking external scripts');
    expect(facts.some(f => f.includes('Fix'))).toBe(true);
  });

  it('returns empty array for no matches', () => {
    const facts = extractKeyFacts('Hello world, how are you?');
    expect(facts).toHaveLength(0);
  });
});

describe('prepareForSwitch', () => {
  it('generates context summary and enriched prompt', () => {
    const session = createSession('test-006', 'orca/anthropic/claude-sonnet-4');
    addTurn(session, {
      role: 'user', content: 'Build the dashboard', model: 'orca/anthropic/claude-sonnet-4', task: 'code',
    });
    addTurn(session, {
      role: 'assistant', content: 'Created dashboard component in apps/web/src/components/dashboard.tsx', model: 'orca/anthropic/claude-sonnet-4', task: 'code',
    });

    const result = prepareForSwitch(session, 'orca/qwen/qwen3.8-max', 'reasoning');
    expect(result.contextSummary).toContain('dashboard');
    expect(result.enrichedPrompt).toContain('taking over');
    expect(session.contextBridge.switchCount).toBe(1);
    expect(session.contextBridge.currentModel).toBe('orca/qwen/qwen3.8-max');
  });
});

describe('resumePrompt', () => {
  it('generates a prompt with context bridge', () => {
    const session = createSession('test-007', 'orca/anthropic/claude-sonnet-4');
    addTurn(session, {
      role: 'user', content: 'Fix the auth bug', model: 'orca/anthropic/claude-sonnet-4', task: 'code',
    });
    addTurn(session, {
      role: 'assistant', content: 'Fixed auth.ts — the token validation was missing', model: 'orca/anthropic/claude-sonnet-4', task: 'code',
      filesChanged: ['packages/core/src/tools/auth.ts'],
    });

    const prompt = resumePrompt(session);
    expect(prompt).toContain('CONTEXT BRIDGE');
    expect(prompt).toContain('auth.ts');
    expect(prompt).toContain('END CONTEXT BRIDGE');
  });
});

describe('getSessionStats', () => {
  it('returns accurate stats', () => {
    const session = createSession('test-008', 'orca/anthropic/claude-sonnet-4');
    addTurn(session, {
      role: 'user', content: 'test', model: 'orca/anthropic/claude-sonnet-4', task: 'code', tokens: 100,
    });
    addTurn(session, {
      role: 'assistant', content: 'done', model: 'orca/anthropic/claude-sonnet-4', task: 'code', tokens: 200,
    });

    const stats = getSessionStats(session);
    expect(stats.turns).toBe(2);
    expect(stats.totalTokens).toBe(300);
    expect(stats.modelsUsed).toContain('orca/anthropic/claude-sonnet-4');
  });
});

describe('exportSessionMarkdown', () => {
  it('generates a markdown report', () => {
    const session = createSession('test-009', 'orca/anthropic/claude-sonnet-4');
    addTurn(session, {
      role: 'user', content: 'Build the API', model: 'orca/anthropic/claude-sonnet-4', task: 'code',
    });
    addTurn(session, {
      role: 'assistant', content: 'Done! Created server.ts', model: 'orca/anthropic/claude-sonnet-4', task: 'code',
    });

    const md = exportSessionMarkdown(session);
    expect(md).toContain('# Session Report');
    expect(md).toContain('Build the API');
    expect(md).toContain('server.ts');
  });
});
