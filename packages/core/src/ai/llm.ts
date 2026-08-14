import { generateObject, generateText, streamText, tool, type LanguageModel, type Tool } from 'ai';
import { createOpenAI, openai } from '@ai-sdk/openai';
import { google } from '@ai-sdk/google';
import { z } from 'zod';
import type { AiGateway, ChatMessage, ChatTextInput, StructuredGenInput } from './gateway';
import { AiUnavailableError } from './gateway';
import { evaluate } from '../tools/calculator';
import { fetchWebContent } from '../tools/web';
import { generateImage } from '../tools/image';
import { generateVideo } from '../tools/video';
import { generateMusic } from '../tools/music';
import { generateUiScreen } from '../tools/stitch';
import { readWeb, searchWeb, searchGitHub, parseRss, videoInfo } from '../tools/reach';
import { runSkill } from '../tools/skills';

const modelCache = new Map<string, LanguageModel>();

function googleModel(name: string): LanguageModel {
  if (!process.env.GOOGLE_API_KEY) {
    throw new AiUnavailableError(
      'GOOGLE_API_KEY is not set (ULTRAIA_PROVIDER=google). Get a free key at https://aistudio.google.com/apikey.',
    );
  }
  return google(name);
}

// Ollama serves an OpenAI-compatible API locally — fully free (Meta Llama, Microsoft Phi, etc.).
function ollamaModel(name: string): LanguageModel {
  const baseURL = process.env.OLLAMA_BASE_URL || 'http://localhost:11434/v1';
  const provider = createOpenAI({ baseURL, apiKey: 'ollama', compatibility: 'compatible' });
  return provider(name);
}

// LM Studio serves an OpenAI-compatible API locally — fully free (Qwen, Llama, etc.).
function lmstudioModel(name: string): LanguageModel {
  const baseURL = process.env.LMSTUDIO_BASE_URL || 'http://localhost:1234/v1';
  const provider = createOpenAI({ baseURL, apiKey: 'lmstudio', compatibility: 'compatible' });
  return provider(name);
}

function openaiModel(name: string): LanguageModel {
  if (!process.env.OPENAI_API_KEY) {
    throw new AiUnavailableError(
      'OPENAI_API_KEY is not set. Add it to apps/web/.env (see .env.example) to enable agent design, evaluation and chat.',
    );
  }
  return openai(name);
}

// DeepSeek is OpenAI-compatible: point the SDK at its base URL with a (free) key.
function deepseekModel(name: string): LanguageModel {
  if (!process.env.DEEPSEEK_API_KEY) {
    throw new AiUnavailableError(
      'DEEPSEEK_API_KEY is not set (ULTRAIA_PROVIDER=deepseek). Get a free key at https://platform.deepseek.com.',
    );
  }
  const provider = createOpenAI({
    baseURL: process.env.DEEPSEEK_BASE_URL || 'https://api.deepseek.com/v1',
    apiKey: process.env.DEEPSEEK_API_KEY,
    compatibility: 'compatible',
  });
  return provider(name);
}

/**
 * Resolve a LanguageModel by provider. Controlled by ULTRAIA_PROVIDER
 * (openai | google | ollama | lmstudio). Keeps the user's existing OpenAI path
 * as an option while defaulting to local Ollama (Llama/Phi) — free, no keys.
 */
export function resolveModel(model?: string): LanguageModel {
  // * Por defecto Ollama (local, sin API key). Cambia ULTRAIA_PROVIDER para usar
  // * openai / google / deepseek / lmstudio.
  const provider = (process.env.ULTRAIA_PROVIDER || 'ollama').toLowerCase();
  const defaultName =
    provider === 'google'
      ? 'gemini-2.5-flash'
      : provider === 'ollama'
        ? 'llama3.1'
        : provider === 'lmstudio'
          ? 'qwen2.5-7b-instruct'
          : provider === 'deepseek'
            ? 'deepseek-chat'
            : 'gpt-4o-mini';
  const name = model || process.env.ULTRAIA_MODEL || defaultName;
  const cacheKey = `${provider}:${name}`;
  let cached = modelCache.get(cacheKey);
  if (!cached) {
    cached =
      provider === 'google'
        ? googleModel(name)
        : provider === 'ollama'
          ? ollamaModel(name)
          : provider === 'lmstudio'
            ? lmstudioModel(name)
            : provider === 'deepseek'
              ? deepseekModel(name)
              : openaiModel(name);
    modelCache.set(cacheKey, cached);
  }
  return cached;
}

export type ProviderName = 'openai' | 'google' | 'ollama' | 'lmstudio' | 'deepseek';

export class OpenAICompatibleGateway implements AiGateway {
  async generateStructured<T>(input: StructuredGenInput): Promise<T> {
    const { object } = await generateObject({
      model: resolveModel(input.model),
      system: input.system,
      prompt: input.prompt,
      schema: input.schema as z.ZodType<T>,
    });
    return object;
  }

  async chatText(input: ChatTextInput): Promise<string> {
    const { text } = await generateText({
      model: resolveModel(input.model),
      system: input.system,
      prompt: input.input,
    });
    return text;
  }
}

export function guardrailsBlock(guardrails: string[]): string {
  if (!guardrails.length) return '';
  return `\n\n## Guardrails\n${guardrails.map((g, i) => `${i + 1}. ${g}`).join('\n')}`;
}

export function chatStream(opts: {
  model?: string;
  system: string;
  messages: ChatMessage[];
  tools?: string[];
  onFinish?: (result: { text: string }) => void;
}) {
  const tools: Record<string, Tool> = {};
  if (opts.tools?.includes('calculator')) {
    tools.calculator = tool({
      description:
        'Safely evaluate a mathematical expression. Supports + - * / % ^, parentheses, and functions sqrt, abs, round, floor, ceil, min, max, pow.',
      parameters: z.object({ expression: z.string().min(1).max(200) }),
      execute: async ({ expression }) => String(evaluate(expression)),
    });
  }
  if (opts.tools?.includes('web')) {
    tools.web = tool({
      description:
        'Fetch a public web page (website or non-private social post) and return its title, description, metadata and readable text. Use for current info, links, or grounding answers in real sources. Keyless.',
      parameters: z.object({ url: z.string().url() }),
      execute: async ({ url }) => fetchWebContent(url),
    });
  }
  if (opts.tools?.includes('image')) {
    tools.image = tool({
      description:
        'Generate a photoreal image from a text prompt using a free, keyless image model. Returns a hotlinkable image URL. Use when the task needs visuals or "recreating" a scene/photo.',
      parameters: z.object({
        prompt: z.string().min(1).max(2000),
        width: z.number().int().min(128).max(1792).optional(),
        height: z.number().int().min(128).max(1792).optional(),
        model: z.string().max(50).optional(),
      }),
      execute: async ({ prompt, width, height, model }) => generateImage({ prompt, width, height, model }),
    });
  }
  if (opts.tools?.includes('video')) {
    tools.video = tool({
      description:
        'Produce a sequence of photoreal frames (a video storyboard) from a text prompt. Keyless; returns a storyboard of image URLs. Use when the task needs video/motion.',
      parameters: z.object({ prompt: z.string().min(1).max(2000), frames: z.number().int().min(1).max(8).optional() }),
      execute: async ({ prompt, frames }) => generateVideo(prompt, { frames }),
    });
  }
  if (opts.tools?.includes('music')) {
    tools.music = tool({
      description:
        'Compose an original music piece (title, mood, key, tempo, structured sections, production notes) from a text prompt. Keyless; returns a composition. Use when the task needs music/audio.',
      parameters: z.object({ prompt: z.string().min(1).max(2000) }),
      execute: async ({ prompt }) => generateMusic(prompt),
    });
  }
  if (opts.tools?.includes('design')) {
    tools.design = tool({
      description:
        'Generate a high-fidelity UI screen/mockup from a text prompt using Google Stitch (free Google Labs). Returns a screenshot URL and an HTML URL. Use when the task is about building or designing interfaces/UI.',
      parameters: z.object({ prompt: z.string().min(1).max(2000) }),
      execute: async ({ prompt }) => generateUiScreen(prompt),
    });
  }
  if (opts.tools?.includes('reach')) {
    tools.reach_read = tool({
      description:
        'Read any public web page as clean text (Jina Reader). Use for current info, docs, articles, or grounding answers in real sources. Returns title, description and readable text.',
      parameters: z.object({ url: z.string().url(), maxLength: z.number().int().min(500).max(50000).optional() }),
      execute: async ({ url, maxLength }) => readWeb({ url, maxLength }),
    });
    tools.reach_search = tool({
      description:
        'Search the live web in real time (DuckDuckGo or Exa). Returns recent, factual results with titles, URLs and snippets. Use for anything current: news, prices, events, docs, or verifying facts from this year.',
      parameters: z.object({ query: z.string().min(1).max(200), maxResults: z.number().int().min(1).max(10).optional() }),
      execute: async ({ query, maxResults }) => searchWeb({ query, maxResults }),
    });
    tools.reach_github = tool({
      description:
        'Search public GitHub repositories by keyword (sorted by stars). Returns repo names, descriptions, star counts and languages.',
      parameters: z.object({ query: z.string().min(1).max(200), maxResults: z.number().int().min(1).max(10).optional() }),
      execute: async ({ query, maxResults }) => searchGitHub({ query, maxResults }),
    });
    tools.reach_rss = tool({
      description: 'Fetch and parse any RSS/Atom feed. Returns the feed title and recent items with links and descriptions.',
      parameters: z.object({ url: z.string().url(), maxItems: z.number().int().min(1).max(20).optional() }),
      execute: async ({ url, maxItems }) => parseRss({ url, maxItems }),
    });
    tools.reach_video = tool({
      description: 'Get YouTube video metadata (title, author, thumbnail) from a video URL via oEmbed.',
      parameters: z.object({ url: z.string().url() }),
      execute: async ({ url }) => videoInfo({ url }),
    });
  }
  if (opts.tools?.includes('skills')) {
    const skill = (kind: 'plan' | 'build' | 'test' | 'review' | 'ship' | 'simplify', label: string) =>
      tool({
        description: `${label}. Runs a step of the agent-development pipeline using the configured model and returns a structured Markdown artifact. Use when the task maps to ${label.toLowerCase()}.`,
        parameters: z.object({
          task: z.string().min(1).max(2000),
          context: z.string().max(4000).optional(),
        }),
        execute: async ({ task, context }) => runSkill(kind, { task, context }),
      });
    tools.skill_plan = skill('plan', 'Plan');
    tools.skill_build = skill('build', 'Build');
    tools.skill_test = skill('test', 'Test');
    tools.skill_review = skill('review', 'Review');
    tools.skill_ship = skill('ship', 'Ship');
    tools.skill_simplify = skill('simplify', 'Simplify');
  }
  return streamText({
    model: resolveModel(opts.model),
    system: opts.system,
    messages: opts.messages.map((m) => ({ role: m.role, content: m.content })),
    tools: Object.keys(tools).length ? tools : undefined,
    maxSteps: 4,
    onFinish: opts.onFinish,
  });
}
