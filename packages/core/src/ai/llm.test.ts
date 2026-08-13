import { afterAll, describe, expect, it } from 'vitest';
import { resolveModel } from './llm';
import { AiUnavailableError } from './gateway';

const prevKey = process.env.OPENAI_API_KEY;
const prevProvider = process.env.ULTRAIA_PROVIDER;

describe('resolveModel', () => {
  it('throws AiUnavailableError when OPENAI_API_KEY is missing', () => {
    process.env.ULTRAIA_PROVIDER = 'openai';
    delete process.env.OPENAI_API_KEY;
    expect(() => resolveModel('gpt-4o-mini')).toThrow(AiUnavailableError);
  });

  it('resolves a model when the key is present', () => {
    process.env.ULTRAIA_PROVIDER = 'openai';
    process.env.OPENAI_API_KEY = 'test-key';
    expect(resolveModel('gpt-4o-mini')).toBeDefined();
  });

  afterAll(() => {
    if (prevKey === undefined) delete process.env.OPENAI_API_KEY;
    else process.env.OPENAI_API_KEY = prevKey;
    if (prevProvider === undefined) delete process.env.ULTRAIA_PROVIDER;
    else process.env.ULTRAIA_PROVIDER = prevProvider;
  });
});
