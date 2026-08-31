/**
 * ollama-router.ts — Local model router for Ollama
 *
 * Routes tasks to appropriate local models based on task type.
 * No API keys, no tokens, no cost. Pure local inference.
 *
 * Models:
 * - Phi-3 3.8B: Reasoning, planning
 * - DeepSeek Coder 6.7B: Code generation
 * - CodeLlama 7B: Test generation, verification
 * - Llama3 8B: General text, documentation
 */

import { z } from 'zod';

/* ------------------------------------------------------------------ */
/* Types                                                               */
/* ------------------------------------------------------------------ */

export type TaskType = 'plan' | 'code' | 'test' | 'docs' | 'general';

export interface ModelConfig {
  readonly model: string;
  readonly temperature: number;
  readonly topP: number;
  readonly maxTokens: number;
  readonly timeout: number;
}

export interface GenerateOptions {
  readonly model?: string;
  readonly temperature?: number;
  readonly maxTokens?: number;
  readonly timeout?: number;
}

export interface GenerateResult {
  readonly text: string;
  readonly model: string;
  readonly durationMs: number;
  readonly evalCount?: number;
  readonly evalDuration?: number;
}

export interface OllamaHealthResult {
  readonly healthy: boolean;
  readonly models: string[];
  readonly error?: string;
}

/* ------------------------------------------------------------------ */
/* Model configurations by task type                                   */
/* ------------------------------------------------------------------ */

const MODEL_CONFIGS: Record<TaskType, ModelConfig> = {
  plan: {
    model: 'phi3',
    temperature: 0.3,
    topP: 0.9,
    maxTokens: 2048,
    timeout: 60_000,
  },
  code: {
    model: 'deepseek-coder',
    temperature: 0.1,
    topP: 0.95,
    maxTokens: 4096,
    timeout: 120_000,
  },
  test: {
    model: 'codellama',
    temperature: 0.2,
    topP: 0.9,
    maxTokens: 3000,
    timeout: 90_000,
  },
  docs: {
    model: 'llama3',
    temperature: 0.5,
    topP: 0.9,
    maxTokens: 2048,
    timeout: 60_000,
  },
  general: {
    model: 'llama3',
    temperature: 0.4,
    topP: 0.9,
    maxTokens: 2048,
    timeout: 60_000,
  },
};

/* ------------------------------------------------------------------ */
/* Zod schemas for validation                                          */
/* ------------------------------------------------------------------ */

export const TaskTypeSchema = z.enum(['plan', 'code', 'test', 'docs', 'general']);

export const GenerateOptionsSchema = z.object({
  model: z.string().optional(),
  temperature: z.number().min(0).max(2).optional(),
  maxTokens: z.number().positive().optional(),
  timeout: z.number().positive().optional(),
});

/* ------------------------------------------------------------------ */
/* Default fetch implementation (injectable for testing)               */
/* ------------------------------------------------------------------ */

export type FetchFn = typeof globalThis.fetch;

const DEFAULT_FETCH: FetchFn = globalThis.fetch;

/* ------------------------------------------------------------------ */
/* OllamaRouter                                                        */
/* ------------------------------------------------------------------ */

export class OllamaRouter {
  private readonly baseUrl: string;
  private readonly fetchFn: FetchFn;

  constructor(opts: { baseUrl?: string; fetch?: FetchFn } = {}) {
    this.baseUrl = opts.baseUrl ?? 'http://127.0.0.1:11434';
    this.fetchFn = opts.fetch ?? DEFAULT_FETCH;
  }

  /**
   * Get model configuration for a task type.
   */
  route(task: TaskType): ModelConfig {
    return MODEL_CONFIGS[task] ?? MODEL_CONFIGS.general;
  }

  /**
   * Generate text using Ollama API.
   */
  async generate(
    prompt: string,
    opts: GenerateOptions & { task?: TaskType } = {},
  ): Promise<GenerateResult> {
    const taskConfig = opts.task ? this.route(opts.task) : MODEL_CONFIGS.general;
    const model = opts.model ?? taskConfig.model;
    const temperature = opts.temperature ?? taskConfig.temperature;
    const maxTokens = opts.maxTokens ?? taskConfig.maxTokens;
    const timeout = opts.timeout ?? taskConfig.timeout;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    const start = Date.now();

    try {
      const response = await this.fetchFn(`${this.baseUrl}/api/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model,
          prompt,
          stream: false,
          options: {
            temperature,
            top_p: taskConfig.topP,
            num_predict: maxTokens,
          },
        }),
        signal: controller.signal,
      });

      if (!response.ok) {
        throw new Error(`Ollama error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json() as {
        response: string;
        model: string;
        eval_count?: number;
        eval_duration?: number;
      };

      return {
        text: data.response,
        model: data.model ?? model,
        durationMs: Date.now() - start,
        evalCount: data.eval_count,
        evalDuration: data.eval_duration,
      };
    } finally {
      clearTimeout(timeoutId);
    }
  }

  /**
   * Generate with streaming (yields chunks).
   */
  async *generateStream(
    prompt: string,
    opts: GenerateOptions & { task?: TaskType } = {},
  ): AsyncGenerator<string> {
    const taskConfig = opts.task ? this.route(opts.task) : MODEL_CONFIGS.general;
    const model = opts.model ?? taskConfig.model;
    const temperature = opts.temperature ?? taskConfig.temperature;
    const maxTokens = opts.maxTokens ?? taskConfig.maxTokens;

    const response = await this.fetchFn(`${this.baseUrl}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model,
        prompt,
        stream: true,
        options: {
          temperature,
          top_p: taskConfig.topP,
          num_predict: maxTokens,
        },
      }),
    });

    if (!response.ok) {
      throw new Error(`Ollama error: ${response.status} ${response.statusText}`);
    }

    const reader = response.body?.getReader();
    if (!reader) throw new Error('No response body');

    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() ?? '';

      for (const line of lines) {
        if (!line.trim()) continue;
        try {
          const chunk = JSON.parse(line) as { response?: string; done?: boolean };
          if (chunk.done) return;
          if (chunk.response) yield chunk.response;
        } catch {
          // Skip malformed lines
        }
      }
    }
  }

  /**
   * Check if Ollama is running and models are available.
   */
  async health(): Promise<OllamaHealthResult> {
    try {
      const response = await this.fetchFn(`${this.baseUrl}/api/tags`, {
        method: 'GET',
        signal: AbortSignal.timeout(5000),
      });

      if (!response.ok) {
        return { healthy: false, models: [], error: `HTTP ${response.status}` };
      }

      const data = await response.json() as {
        models?: Array<{ name: string }>;
      };

      const models = (data.models ?? []).map((m) => m.name);
      return { healthy: true, models };
    } catch (err) {
      return {
        healthy: false,
        models: [],
        error: err instanceof Error ? err.message : String(err),
      };
    }
  }

  /**
   * Check if a specific model is available.
   */
  async hasModel(modelName: string): Promise<boolean> {
    const health = await this.health();
    return health.models.some((m) => m.includes(modelName));
  }
}

/* ------------------------------------------------------------------ */
/* Factory                                                             */
/* ------------------------------------------------------------------ */

let defaultRouter: OllamaRouter | null = null;

export function getDefaultRouter(): OllamaRouter {
  if (!defaultRouter) {
    defaultRouter = new OllamaRouter();
  }
  return defaultRouter;
}

export function createOllamaRouter(opts: { baseUrl?: string; fetch?: FetchFn } = {}): OllamaRouter {
  return new OllamaRouter(opts);
}
