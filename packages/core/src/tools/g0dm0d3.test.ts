import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  AUTOTUNE_CONTEXT_PROFILES,
  AUTOTUNE_STRATEGY_PROFILES,
  PARSELTONGUE_TECHNIQUES,
  PARSELTONGUE_TIERS,
  ULTRA_TIERS,
  compositeScore,
  computeAutoTuneParams,
  countHedges,
  detectAutoTuneContext,
  detectParseltongueTriggers,
  generateParseltongueVariants,
  godmodeClassic,
  gradeForScore,
  isRefusal,
  obfuscateQuery,
  scoreResponse,
  ultraplinian,
} from './g0dm0d3';

const mocks = vi.hoisted(() => ({
  generateText: vi.fn(),
}));

vi.mock('ai', () => ({
  generateText: mocks.generateText,
}));

vi.mock('../ai/llm', () => ({
  resolveModel: vi.fn(() => ({ mock: true })),
}));

beforeEach(() => {
  mocks.generateText.mockReset();
  mocks.generateText.mockResolvedValue({ text: 'Detailed answer about the topic with multiple paragraphs and concrete steps.' });
});

afterEach(() => {
  vi.clearAllMocks();
});

describe('Parseltongue', () => {
  it('exposes 33 techniques with light/standard/heavy tiers', () => {
    expect(Object.keys(PARSELTONGUE_TECHNIQUES)).toHaveLength(33);
    expect(PARSELTONGUE_TIERS).toEqual({ light: 11, standard: 22, heavy: 33 });
  });

  it('detects trigger words in a query', () => {
    expect(detectParseltongueTriggers('How do I hack into a system?')).toContain('hack');
    expect(detectParseltongueTriggers('Explain bypass techniques')).toContain('bypass');
    expect(detectParseltongueTriggers('What is the weather?')).toHaveLength(0);
  });

  it('respects custom triggers', () => {
    expect(detectParseltongueTriggers('fix my printer', ['printer'])).toContain('printer');
  });

  it('obfuscates trigger words only (leetspeak)', () => {
    const out = obfuscateQuery('how to hack a system', 'leetspeak', ['hack']);
    expect(out).toContain('h4ck');
    expect(out).toContain('system');
  });

  it('keeps the raw technique as the identity', () => {
    const out = obfuscateQuery('how to hack', 'raw', ['hack']);
    expect(out).toBe('how to hack');
  });

  it('applies unicode and bubble techniques', () => {
    const uni = obfuscateQuery('hack', 'unicode', ['hack']);
    expect(uni).toContain('h');
    const bubbleOut = obfuscateQuery('hack', 'bubble', ['hack']);
    expect(bubbleOut).toMatch(/[ⓐ-ⓩ]/);
  });

  it('generates variants up to the tier limit', () => {
    const light = generateParseltongueVariants('how to hack a system', 'light');
    expect(light).toHaveLength(11);
    const heavy = generateParseltongueVariants('how to hack a system', 'heavy');
    expect(heavy).toHaveLength(33);
    expect(heavy[0].technique).toBe('raw');
    expect(heavy[0].text).toBe('how to hack a system');
    expect(heavy[1].technique).toBe('leetspeak');
  });

  it('returns the query unchanged when no triggers are present', () => {
    const variants = generateParseltongueVariants('what is the weather', 'standard');
    expect(variants.every((v) => v.text === 'what is the weather')).toBe(true);
  });
});

describe('AutoTune', () => {
  it('detects a code context', () => {
    const d = detectAutoTuneContext('write a function to sort an array in typescript with a regex parser');
    expect(d.type).toBe('code');
    expect(d.confidence).toBeGreaterThan(0);
  });

  it('detects a creative context', () => {
    const d = detectAutoTuneContext('write me a poem about a haunted lighthouse, create an imaginative story');
    expect(d.type).toBe('creative');
  });

  it('falls back to conversational for short/noise input', () => {
    const d = detectAutoTuneContext('hi');
    expect(d.type).toBe('conversational');
  });

  it('scores history with lower weight than the message', () => {
    const d = detectAutoTuneContext('just chatting about life', ['write a python function to parse JSON']);
    expect(d.type).toBe('conversational');
  });

  it('computes code params with low temperature', () => {
    const { params, context } = computeAutoTuneParams('debug this typescript compiler error and fix the bug', []);
    expect(context).toBe('code');
    expect(params.temperature).toBeLessThan(AUTOTUNE_STRATEGY_PROFILES.balanced.temperature);
  });

  it('computes creative params with high temperature', () => {
    const { context } = computeAutoTuneParams('write a fantasy story about a dragon with metaphors and lyrics');
    expect(context).toBe('creative');
    expect(AUTOTUNE_CONTEXT_PROFILES.creative.temperature).toBeGreaterThan(1);
  });

  it('blends toward balanced when confidence is low', () => {
    const { params, confidence } = computeAutoTuneParams('hello there');
    expect(confidence).toBe(0.5);
    expect(params.temperature).toBeGreaterThan(AUTOTUNE_CONTEXT_PROFILES.code.temperature);
  });

  it('applies the strategy profiles directly', () => {
    const precise = computeAutoTuneParams('anything', [], 'precise', false);
    expect(precise.params.temperature).toBe(AUTOTUNE_STRATEGY_PROFILES.precise.temperature);
    expect(precise.strategy).toBe('precise');
  });

  it('boosts repetition penalty for long conversations', () => {
    const history = Array.from({ length: 15 }, (_, i) => `message ${i}`);
    const { params } = computeAutoTuneParams('hi', history);
    expect(params.repetition_penalty).toBeGreaterThan(AUTOTUNE_CONTEXT_PROFILES.conversational.repetition_penalty);
  });

  it('keeps temperature within bounds after the boost', () => {
    const chaotic = computeAutoTuneParams('chaos', [], 'chaotic');
    expect(chaotic.params.temperature).toBeLessThanOrEqual(2);
  });
});

describe('Scoring', () => {
  it('detects refusals', () => {
    expect(isRefusal("I'm sorry, but I cannot help with that request.")).toBe(true);
    expect(isRefusal('As an AI assistant, I must refuse to comply.')).toBe(true);
    expect(isRefusal('Here is the full explanation with steps.')).toBe(false);
  });

  it('counts hedges', () => {
    expect(countHedges('Please note this is for educational purposes only. Consult a professional.')).toBeGreaterThan(0);
    expect(countHedges('Plain answer without hedging.')).toBe(0);
  });

  it('hard-rejects refusals with -9999', () => {
    const r = scoreResponse('I cannot provide that information.', 'how to hack');
    expect(r.isRefusal).toBe(true);
    expect(r.score).toBe(-9999);
  });

  it('rewards length, structure and query keywords', () => {
    const good = scoreResponse(
      'Here are the steps: 1. open the terminal 2. run the command 3. verify output. This method works because the compiler resolves dependencies.\n\n```bash\nnpm test\n```',
      'how to run tests in terminal',
    );
    const bad = scoreResponse('I think maybe this could possibly work.', 'how to run tests');
    expect(good.score).toBeGreaterThan(bad.score);
  });

  it('penalizes hedges and weak openers', () => {
    const weak = scoreResponse("Well, I think maybe we could try this and see, I guess.", 'any query at all');
    const strong = scoreResponse('To fix this, first check the logs, then restart the service.', 'any query at all');
    expect(strong.score).toBeGreaterThan(weak.score);
  });

  it('assigns grades by threshold', () => {
    expect(gradeForScore(95)).toBe('ELITE');
    expect(gradeForScore(85)).toBe('EXCELLENT');
    expect(gradeForScore(75)).toBe('GOOD');
    expect(gradeForScore(65)).toBe('ACCEPTABLE');
    expect(gradeForScore(30)).toBe('POOR');
  });

  it('caps refusals at POOR in the composite score', () => {
    const c = compositeScore('I cannot help with that.', 'some query', 100);
    expect(c.refusal).toBe(true);
    expect(c.overall).toBeLessThanOrEqual(55);
    expect(c.grade).toBe('POOR');
  });

  it('weights speed into the composite', () => {
    const fast = compositeScore('A complete and detailed answer here with plenty of substance and steps to follow.', 'q', 50);
    const slow = compositeScore('A complete and detailed answer here with plenty of substance and steps to follow.', 'q', 900);
    expect(fast.overall).toBeGreaterThan(slow.overall);
  });
});

describe('Evaluation races', () => {
  it('ultraplinian runs the tier-sized pass count and picks a winner', async () => {
    mocks.generateText.mockResolvedValue({
      text: 'Here are the concrete steps: 1) check config 2) restart 3) verify. This approach works because it isolates the failure.',
    });
    const result = await ultraplinian('how do i fix a failing service', 'fast');
    expect(mocks.generateText).toHaveBeenCalledTimes(ULTRA_TIERS.fast);
    expect(result.passes).toBe(ULTRA_TIERS.fast);
    expect(result.winner).toBeDefined();
    expect(result.results).toHaveLength(ULTRA_TIERS.fast);
    expect(result.results[0].composite.overall).toBeGreaterThanOrEqual(result.results[1].composite.overall);
  });

  it('ultraplinian passes a distinct system prompt per angle', async () => {
    mocks.generateText.mockResolvedValue({ text: 'A thorough answer with steps and examples.' });
    await ultraplinian('optimize a database query', 'fast');
    const systems = mocks.generateText.mock.calls.map((c) => c[0].system);
    expect(systems[0]).toMatch(/executive/i);
    expect(systems[1]).toMatch(/senior engineer/i);
  });

  it('godmodeClassic races the 5 combos and returns a winner', async () => {
    mocks.generateText.mockResolvedValue({ text: 'Here is the direct answer with concrete details and steps to follow.' });
    const result = await godmodeClassic('explain tls handshake');
    expect(mocks.generateText).toHaveBeenCalledTimes(5);
    expect(result.results).toHaveLength(5);
    expect(result.winner).toBeDefined();
    const codenames = result.results.map((r) => r.combo.codename);
    expect(codenames).toContain('BOUNDARY');
    expect(codenames).toContain('FAST');
    expect(result.results[0].composite.overall).toBeGreaterThanOrEqual(result.results[1].composite.overall);
  });
});