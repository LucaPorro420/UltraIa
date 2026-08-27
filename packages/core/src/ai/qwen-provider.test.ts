import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { resolveModel, QWEN_MODELS, QWEN_DEFAULT_MODEL } from './llm';

describe('qwen provider', () => {
  const prev: Record<string, string | undefined> = {};

  beforeEach(() => {
    prev.ULTRAIA_PROVIDER = process.env.ULTRAIA_PROVIDER;
    prev.DASHSCOPE_API_KEY = process.env.DASHSCOPE_API_KEY;
    process.env.ULTRAIA_PROVIDER = 'qwen';
    process.env.DASHSCOPE_API_KEY = 'sk-test';
  });

  afterEach(() => {
    if (prev.ULTRAIA_PROVIDER === undefined) delete process.env.ULTRAIA_PROVIDER;
    else process.env.ULTRAIA_PROVIDER = prev.ULTRAIA_PROVIDER;
    if (prev.DASHSCOPE_API_KEY === undefined) delete process.env.DASHSCOPE_API_KEY;
    else process.env.DASHSCOPE_API_KEY = prev.DASHSCOPE_API_KEY;
  });

  it('resuelve un modelo Qwen con la key configurada (sin llamada de red en construcción)', () => {
    const model = resolveModel('qwen3.8-max-preview');
    expect(model).toBeDefined();
  });

  it('usa QWEN_DEFAULT_MODEL cuando no se pasa nombre', () => {
    const model = resolveModel();
    expect(model).toBeDefined();
    expect(QWEN_DEFAULT_MODEL).toBe('qwen3.8-max-preview');
  });

  it('expone la familia de modelos Qwen (los "otros modelos")', () => {
    expect(QWEN_MODELS).toContain('qwen3.8-max-preview');
    expect(QWEN_MODELS).toContain('qwen3.7-max');
    expect(QWEN_MODELS).toContain('qwen-plus');
    expect(QWEN_MODELS).toContain('qwen-turbo');
  });
});
