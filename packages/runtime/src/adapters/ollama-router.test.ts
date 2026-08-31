import { describe, it, expect, vi, beforeEach } from 'vitest';
import { OllamaRouter, createOllamaRouter, getDefaultRouter } from './ollama-router';
import type { TaskType } from './ollama-router';

describe('OllamaRouter', () => {
  let router: OllamaRouter;
  let mockFetch: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockFetch = vi.fn();
    router = new OllamaRouter({ fetch: mockFetch });
  });

  describe('route', () => {
    it('returns correct config for plan task', () => {
      const config = router.route('plan');
      expect(config.model).toBe('phi3');
      expect(config.temperature).toBe(0.3);
      expect(config.maxTokens).toBe(2048);
    });

    it('returns correct config for code task', () => {
      const config = router.route('code');
      expect(config.model).toBe('deepseek-coder');
      expect(config.temperature).toBe(0.1);
      expect(config.maxTokens).toBe(4096);
    });

    it('returns correct config for test task', () => {
      const config = router.route('test');
      expect(config.model).toBe('codellama');
      expect(config.temperature).toBe(0.2);
    });

    it('returns correct config for docs task', () => {
      const config = router.route('docs');
      expect(config.model).toBe('llama3');
      expect(config.temperature).toBe(0.5);
    });

    it('returns general config for unknown task', () => {
      const config = router.route('general' as TaskType);
      expect(config.model).toBe('llama3');
    });
  });

  describe('generate', () => {
    it('calls Ollama API correctly', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          response: 'Hello from Ollama',
          model: 'phi3',
          eval_count: 100,
          eval_duration: 1000,
        }),
      });

      const result = await router.generate('Test prompt', { task: 'plan' });

      expect(mockFetch).toHaveBeenCalledWith(
        'http://127.0.0.1:11434/api/generate',
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
        }),
      );

      expect(result.text).toBe('Hello from Ollama');
      expect(result.model).toBe('phi3');
      expect(result.evalCount).toBe(100);
    });

    it('throws on HTTP error', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
      });

      await expect(router.generate('Test')).rejects.toThrow('Ollama error: 500');
    });

    it('respects timeout', async () => {
      // Mock fetch that hangs forever but respects abort
      mockFetch.mockImplementationOnce((_url: string, opts: { signal?: AbortSignal }) => {
        return new Promise((_, reject) => {
          if (opts.signal) {
            opts.signal.addEventListener('abort', () => {
              reject(new DOMException('Aborted', 'AbortError'));
            });
          }
          // Never resolves
        });
      });

      const shortRouter = new OllamaRouter({
        fetch: mockFetch,
      });

      await expect(
        shortRouter.generate('Test', { timeout: 100 }),
      ).rejects.toThrow();
    }, 5000);
  });

  describe('health', () => {
    it('returns healthy when Ollama is running', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          models: [{ name: 'phi3' }, { name: 'deepseek-coder' }],
        }),
      });

      const health = await router.health();
      expect(health.healthy).toBe(true);
      expect(health.models).toEqual(['phi3', 'deepseek-coder']);
    });

    it('returns unhealthy when Ollama is down', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Connection refused'));

      const health = await router.health();
      expect(health.healthy).toBe(false);
      expect(health.error).toBe('Connection refused');
    });

    it('returns unhealthy on HTTP error', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 503,
      });

      const health = await router.health();
      expect(health.healthy).toBe(false);
    });
  });

  describe('hasModel', () => {
    it('returns true when model exists', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          models: [{ name: 'phi3:latest' }],
        }),
      });

      expect(await router.hasModel('phi3')).toBe(true);
    });

    it('returns false when model not found', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          models: [{ name: 'llama3' }],
        }),
      });

      expect(await router.hasModel('phi3')).toBe(false);
    });
  });
});

describe('Factory functions', () => {
  it('createOllamaRouter returns new instance', () => {
    const r1 = createOllamaRouter();
    const r2 = createOllamaRouter();
    expect(r1).not.toBe(r2);
  });

  it('getDefaultRouter returns singleton', () => {
    const r1 = getDefaultRouter();
    const r2 = getDefaultRouter();
    expect(r1).toBe(r2);
  });
});
