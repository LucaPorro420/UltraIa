/**
 * FreeLLMAPI Gateway Client for Plataforma Unificada
 * 
 * Provides a unified interface to 34+ free LLM providers through FreeLLMAPI
 * Replaces Ollama with cloud-based free tier aggregation
 */

import { 
  ChatRequest, 
  ChatResponse, 
  ChatMessage, 
  LLMModel, 
  LLMProvider,
  RateLimit,
  Tool 
} from '@plataforma-unificada/core/types';
import { getConfig, createLogger } from '@plataforma-unificada/core';

const logger = createLogger('Gateway');

export interface GatewayConfig {
  baseUrl: string;
  apiKey?: string;
  timeout: number;
  defaultModel: string;
  fallbackModels: string[];
  enableCache: boolean;
  cacheTTL: number;
}

export interface ModelInfo {
  id: string;
  name: string;
  provider: string;
  type: 'chat' | 'embedding' | 'image' | 'audio' | 'video';
  contextWindow: number;
  maxOutputTokens: number;
  capabilities: string[];
  freeTier?: {
    tokensPerMonth: number;
    requestsPerDay: number;
  };
  status: 'available' | 'limited' | 'exhausted' | 'error';
}

export interface ProviderStatus {
  provider: string;
  models: ModelInfo[];
  healthy: boolean;
  latency: number;
  lastChecked: Date;
}

export class FreeLLMAPIClient {
  private config: GatewayConfig;
  private cache: Map<string, { data: unknown; expires: number }> = new Map();
  private modelsCache: ModelInfo[] | null = null;
  private modelsCacheTime = 0;

  constructor(config?: Partial<GatewayConfig>) {
    const appConfig = getConfig();
    this.config = {
      baseUrl: config?.baseUrl || appConfig.gateway.url,
      apiKey: config?.apiKey || appConfig.gateway.apiKey,
      timeout: config?.timeout || appConfig.gateway.timeout,
      defaultModel: config?.defaultModel || appConfig.gateway.defaultModel,
      fallbackModels: config?.fallbackModels || appConfig.gateway.fallbackModels,
      enableCache: config?.enableCache ?? appConfig.gateway.enableCache,
      cacheTTL: config?.cacheTTL || appConfig.gateway.cacheTTL,
    };
  }

  private getHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (this.config.apiKey) {
      headers['Authorization'] = `Bearer ${this.config.apiKey}`;
    }
    return headers;
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.config.timeout);

    try {
      const response = await fetch(`${this.config.baseUrl}${endpoint}`, {
        ...options,
        headers: {
          ...this.getHeaders(),
          ...options.headers,
        },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Gateway error ${response.status}: ${error}`);
      }

      return await response.json();
    } catch (error) {
      clearTimeout(timeoutId);
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error('Gateway request timeout');
      }
      throw error;
    }
  }

  private getCacheKey(key: string): string {
    return `gateway:${key}`;
  }

  private getCached<T>(key: string): T | null {
    if (!this.config.enableCache) return null;
    const cached = this.cache.get(this.getCacheKey(key));
    if (cached && cached.expires > Date.now()) {
      return cached.data as T;
    }
    this.cache.delete(this.getCacheKey(key));
    return null;
  }

  private setCache(key: string, data: unknown): void {
    if (!this.config.enableCache) return;
    this.cache.set(this.getCacheKey(key), {
      data,
      expires: Date.now() + this.config.cacheTTL * 1000,
    });
  }

  /**
   * Chat completion - main interface for AI chat
   */
  async chat(request: ChatRequest): Promise<ChatResponse> {
    // Use default model if not specified
    const model = request.model || this.config.defaultModel;
    
    logger.info(`Chat request: model=${model}, messages=${request.messages.length}, stream=${request.stream}`);

    try {
      return await this.request<ChatResponse>('/v1/chat/completions', {
        method: 'POST',
        body: JSON.stringify({ ...request, model }),
      });
    } catch (error) {
      logger.error('Chat request failed', { model, error });
      
      // Try fallback models
      for (const fallbackModel of this.config.fallbackModels) {
        if (fallbackModel === model) continue;
        try {
          logger.info(`Trying fallback model: ${fallbackModel}`);
          return await this.request<ChatResponse>('/v1/chat/completions', {
            method: 'POST',
            body: JSON.stringify({ ...request, model: fallbackModel }),
          });
        } catch (fallbackError) {
          logger.warn('Fallback failed', { model: fallbackModel, error: fallbackError });
        }
      }
      
      throw error;
    }
  }

  /**
   * Streaming chat completion
   */
  async *chatStream(request: ChatRequest): AsyncGenerator<ChatResponse> {
    const model = request.model || this.config.defaultModel;
    
    logger.info(`Streaming chat: model=${model}`);

    const response = await fetch(`${this.config.baseUrl}/v1/chat/completions`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({ ...request, model, stream: true }),
    });

    if (!response.ok) {
      throw new Error(`Stream failed: ${response.statusText}`);
    }

    const reader = response.body?.getReader();
    if (!reader) throw new Error('No response body');

    const decoder = new TextDecoder();
    let buffer = '';

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6).trim();
            if (data === '[DONE]') return;
            try {
              yield JSON.parse(data);
            } catch {
              // Ignore parse errors for partial chunks
            }
          }
        }
      }
    } finally {
      reader.releaseLock();
    }
  }

  /**
   * Get available models from catalog
   */
  async getModels(forceRefresh = false): Promise<ModelInfo[]> {
    if (this.modelsCache && !forceRefresh && Date.now() - this.modelsCacheTime < 60000) {
      return this.modelsCache;
    }

    const cached = this.getCached<ModelInfo[]>('models');
    if (cached && !forceRefresh) {
      this.modelsCache = cached;
      this.modelsCacheTime = Date.now();
      return cached;
    }

    try {
      const response = await this.request<{ data: ModelInfo[] }>('/v1/models');
      const models = response.data || [];
      
      this.modelsCache = models;
      this.modelsCacheTime = Date.now();
      this.setCache('models', models);
      
      return models;
    } catch (error) {
      logger.error('Failed to fetch models', { error });
      if (this.modelsCache) return this.modelsCache;
      throw error;
    }
  }

  /**
   * Get models filtered by capability
   */
  async getModelsByCapability(capability: string): Promise<ModelInfo[]> {
    const models = await this.getModels();
    return models.filter(m => m.capabilities.includes(capability));
  }

  /**
   * Get best model for a task type
   */
  async getBestModelForTask(taskType: 'coding' | 'general' | 'reasoning' | 'vision' | 'embedding'): Promise<string> {
    const models = await this.getModels();
    
    const taskModels = models.filter(m => {
      switch (taskType) {
        case 'coding':
          return m.capabilities.includes('code');
        case 'reasoning':
          return m.capabilities.includes('reasoning');
        case 'vision':
          return m.capabilities.includes('vision');
        case 'embedding':
          return m.type === 'embedding';
        default:
          return true;
      }
    });

    if (taskModels.length === 0) return this.config.defaultModel;
    
    // Sort by context window and prefer free tier
    taskModels.sort((a, b) => {
      const aFree = a.freeTier ? 1 : 0;
      const bFree = b.freeTier ? 1 : 0;
      if (aFree !== bFree) return bFree - aFree;
      return b.contextWindow - a.contextWindow;
    });

    return taskModels[0].id;
  }

  /**
   * Get provider health status
   */
  async getProviderStatus(): Promise<ProviderStatus[]> {
    const cached = this.getCached<ProviderStatus[]>('provider-status');
    if (cached) return cached;

    try {
      const response = await this.request<{ data: ProviderStatus[] }>('/v1/admin/providers/status');
      const status = response.data || [];
      this.setCache('provider-status', status);
      return status;
    } catch (error) {
      logger.error('Failed to fetch provider status', { error });
      return [];
    }
  }

  /**
   * Embeddings
   */
  async embeddings(input: string | string[], model?: string): Promise<number[][]> {
    const response = await this.request<{ data: Array<{ embedding: number[] }> }>('/v1/embeddings', {
      method: 'POST',
      body: JSON.stringify({
        input: Array.isArray(input) ? input : [input],
        model: model || 'auto',
      }),
    });
    return response.data.map(d => d.embedding);
  }

  /**
   * Image generation
   */
  async generateImage(prompt: string, options?: {
    model?: string;
    size?: '256x256' | '512x512' | '1024x1024';
    quality?: 'standard' | 'hd';
    n?: number;
  }): Promise<{ url: string }[]> {
    const response = await this.request<{ data: Array<{ url: string }> }>('/v1/images/generations', {
      method: 'POST',
      body: JSON.stringify({
        prompt,
        model: options?.model || 'auto',
        size: options?.size || '1024x1024',
        quality: options?.quality || 'standard',
        n: options?.n || 1,
      }),
    });
    return response.data;
  }

  /**
   * Audio transcription
   */
  async transcribeAudio(audioFile: File | Blob, model?: string): Promise<string> {
    const formData = new FormData();
    formData.append('file', audioFile);
    formData.append('model', model || 'whisper-1');
    
    const response = await fetch(`${this.config.baseUrl}/v1/audio/transcriptions`, {
      method: 'POST',
      headers: {
        'Authorization': this.config.apiKey ? `Bearer ${this.config.apiKey}` : '',
      },
      body: formData,
    });
    
    if (!response.ok) throw new Error(`Transcription failed: ${response.statusText}`);
    return (await response.json()).text;
  }

  /**
   * Audio speech (TTS)
   */
  async generateSpeech(text: string, options?: {
    model?: string;
    voice?: string;
    speed?: number;
  }): Promise<ArrayBuffer> {
    const response = await fetch(`${this.config.baseUrl}/v1/audio/speech`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({
        input: text,
        model: options?.model || 'tts-1',
        voice: options?.voice || 'alloy',
        speed: options?.speed || 1,
      }),
    });
    
    if (!response.ok) throw new Error(`Speech generation failed: ${response.statusText}`);
    return response.arrayBuffer();
  }

  /**
   * Health check
   */
  async healthCheck(): Promise<{ healthy: boolean; latency: number; models: number }> {
    const start = Date.now();
    try {
      await this.request('/health');
      const models = await this.getModels();
      return {
        healthy: true,
        latency: Date.now() - start,
        models: models.length,
      };
    } catch (error) {
      return {
        healthy: false,
        latency: Date.now() - start,
        models: 0,
      };
    }
  }

  /**
   * Clear caches
   */
  clearCache(): void {
    this.cache.clear();
    this.modelsCache = null;
    this.modelsCacheTime = 0;
  }
}

// Singleton instance
let gatewayInstance: FreeLLMAPIClient | null = null;

export function getGatewayClient(config?: Partial<GatewayConfig>): FreeLLMAPIClient {
  if (!gatewayInstance) {
    gatewayInstance = new FreeLLMAPIClient(config);
  }
  return gatewayInstance;
}

export function resetGatewayClient(): void {
  gatewayInstance = null;
}

/**
 * Compatibility layer for Ollama API
 * Allows existing Ollama-based code to work with FreeLLMAPI
 */
export class OllamaCompatLayer {
  private client: FreeLLMAPIClient;
  private modelMap: Map<string, string> = new Map();

  constructor(client?: FreeLLMAPIClient) {
    this.client = client || getGatewayClient();
    // Map common Ollama models to FreeLLMAPI equivalents
    this.modelMap.set('llama3.1:8b', 'auto');
    this.modelMap.set('llama3.1:70b', 'auto');
    this.modelMap.set('phi3:mini', 'auto');
    this.modelMap.set('mistral:7b', 'auto');
    this.modelMap.set('codellama:7b', 'auto:coding');
    this.modelMap.set('deepseek-coder:6.7b', 'auto:coding');
  }

  mapModel(model: string): string {
    return this.modelMap.get(model) || model;
  }

  async generate(prompt: string, options?: {
    model?: string;
    stream?: boolean;
    temperature?: number;
    maxTokens?: number;
  }): Promise<{ response: string; done: boolean }> {
    const model = this.mapModel(options?.model || 'llama3.1:8b');
    
    const response = await this.client.chat({
      model,
      messages: [{ role: 'user', content: prompt }],
      temperature: options?.temperature,
      maxTokens: options?.maxTokens,
      stream: options?.stream || false,
    });

    return {
      response: response.choices[0]?.message?.content || '',
      done: true,
    };
  }

  async *generateStream(prompt: string, options?: {
    model?: string;
    temperature?: number;
    maxTokens?: number;
  }): AsyncGenerator<{ response: string; done: boolean }> {
    const model = this.mapModel(options?.model || 'llama3.1:8b');
    
    for await (const chunk of this.client.chatStream({
      model,
      messages: [{ role: 'user', content: prompt }],
      temperature: options?.temperature,
      maxTokens: options?.maxTokens,
      stream: true,
    })) {
      const content = chunk.choices[0]?.delta?.content || '';
      if (content) {
        yield { response: content, done: false };
      }
      if (chunk.choices[0]?.finishReason) {
        yield { response: '', done: true };
      }
    }
  }

  async chat(messages: Array<{ role: string; content: string }>, options?: {
    model?: string;
    stream?: boolean;
    temperature?: number;
    maxTokens?: number;
  }): Promise<{ message: { role: string; content: string }; done: boolean }> {
    const model = this.mapModel(options?.model || 'llama3.1:8b');
    
    const response = await this.client.chat({
      model,
      messages: messages as ChatMessage[],
      temperature: options?.temperature,
      maxTokens: options?.maxTokens,
      stream: options?.stream || false,
    });

    return {
      message: {
        role: 'assistant',
        content: response.choices[0]?.message?.content || '',
      },
      done: true,
    };
  }

  async listModels(): Promise<Array<{ name: string; size: number; modified: string }>> {
    const models = await this.client.getModels();
    return models.map(m => ({
      name: m.id,
      size: 0,
      modified: new Date().toISOString(),
    }));
  }

  async showModel(model: string): Promise<{ modelfile: string; parameters: string; template: string }> {
    const models = await this.client.getModels();
    const m = models.find(m => m.id === model || m.id === this.mapModel(model));
    
    return {
      modelfile: `# ${m?.name || model}\nFROM ${m?.provider || 'unknown'}`,
      parameters: JSON.stringify({
        temperature: 0.7,
        top_p: 0.9,
        num_ctx: m?.contextWindow || 4096,
      }),
      template: '{{ .Prompt }}',
    };
  }
}