import type { z } from 'zod';

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface StructuredGenInput {
  model?: string;
  system: string;
  prompt: string;
  schema: z.ZodType;
}

export interface ChatTextInput {
  model?: string;
  system: string;
  input: string;
}

export interface AiGateway {
  generateStructured<T>(input: StructuredGenInput): Promise<T>;
  chatText(input: ChatTextInput): Promise<string>;
}

export class AiUnavailableError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AiUnavailableError';
  }
}
