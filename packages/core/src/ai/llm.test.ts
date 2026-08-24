import { afterAll, describe, expect, it } from 'vitest';
import { resolveModel } from './llm';
import { AiUnavailableError } from './gateway';

const prevKey = process.env.OPENAI_API_KEY;
const prevProvider = process.env.ULTRAIA_PROVIDER;

describe('resolveModel', () => {
  it('falls back to a local provider when OPENAI_API_KEY is missing (contrato local-first 3da0905)', () => {
    // Con el fallback local-first, resolveModel ya NO lanza cuando el provider
    // primario no tiene key: cae a ollama -> lmstudio. Los constructores de
    // providers locales NO hacen ping de red, por lo que este test es hermético
    // (pasa igual con Ollama/LM Studio vivos o muertos).
    process.env.ULTRAIA_PROVIDER = 'openai';
    delete process.env.OPENAI_API_KEY;
    const model = resolveModel('gpt-4o-mini');
    expect(model).toBeDefined();
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
