import {
  computeAutoTuneParams,
  evaluate,
  fetchWebContent,
  generateImage,
  generateMusic,
  generateParseltongueVariants,
  generateUiScreen,
  generateVideo,
  godmodeClassic,
  mixkit,
  parseRss,
  readWeb,
  runSkill,
  searchGitHub,
  searchMusic,
  searchSfx,
  searchWeb,
  TOOL_DESCRIPTIONS,
  type Capability,
  videoInfo,
} from '@ultraia/core';
import { audioLibrary } from '@ultraia/core';
import { synthSound } from '@ultraia/core';
import { ultraplinian } from '@ultraia/core';
import type { ToolsAdapter } from './ports';

/**
 * Adapter de tools de agente para el runtime desktop.
 *
 * - El catálogo (`capabilities` + `descriptions`) viene DIRECTO de core
 *   (`TOOL_DESCRIPTIONS`): si core añade capabilities, el runtime las ve sin cambios.
 * - `run(capability, input)` es un dispatcher passthrough: la validación de esquemas
 *   fina vive en core (zod de `chatStream`); aquí solo se valida lo estructural
 *   (capability conocida, sub-op conocida, campos obligatorios presentes).
 * - Todas las funciones target son keyless o degradan keyless (pollinations, edge-tts,
 *   Tunetank, DuckDuckGo, plan local) → `ping()` siempre true.
 */

type UnknownRecord = Record<string, unknown>;

function requireObject(input: unknown, capability: string): UnknownRecord {
  if (typeof input !== 'object' || input === null || Array.isArray(input)) {
    throw new Error(`tool ${capability}: input must be an object`);
  }
  return input as UnknownRecord;
}

function requireString(input: UnknownRecord, key: string, capability: string): string {
  const value = input[key];
  if (typeof value !== 'string' || !value.trim()) {
    throw new Error(`tool ${capability}: input.${key} must be a non-empty string`);
  }
  return value.trim();
}

function requireOp(input: UnknownRecord, capability: string, ops: readonly string[]): string {
  const op = requireString(input, 'op', capability);
  if (!ops.includes(op)) {
    throw new Error(`tool ${capability}: unknown op "${op}" (expected one of: ${ops.join(', ')})`);
  }
  return op;
}

export function createToolsAdapter(): ToolsAdapter {
  const capabilities = Object.keys(TOOL_DESCRIPTIONS) as Capability[];

  return {
    kind: 'tools',
    name: 'tools',
    capabilities,
    descriptions: TOOL_DESCRIPTIONS,

    async run(capability: string, input?: UnknownRecord): Promise<unknown> {
      if (!capabilities.includes(capability as Capability)) {
        throw new Error(`unknown tool capability "${capability}"`);
      }
      const args = requireObject(input ?? {}, capability);

      switch (capability) {
        case 'calculator':
          return evaluate(requireString(args, 'expression', capability));
        case 'web':
          return fetchWebContent(requireString(args, 'url', capability));
        case 'image':
          return generateImage({
            prompt: requireString(args, 'prompt', capability),
            width: args.width as number | undefined,
            height: args.height as number | undefined,
            model: args.model as string | undefined,
            seed: args.seed as number | undefined,
            nologo: args.nologo as boolean | undefined,
            imageUrl: args.imageUrl as string | undefined,
            provider: args.provider as 'pollinations' | 'meigen' | undefined,
            aspectRatio: args.aspectRatio as string | undefined,
          });
        case 'video':
          return generateVideo(requireString(args, 'prompt', capability), {
            frames: args.frames as number | undefined,
          });
        case 'music':
          return generateMusic(requireString(args, 'prompt', capability));
        case 'design':
          return generateUiScreen(requireString(args, 'prompt', capability));
        case 'reach': {
          const op = requireOp(args, capability, ['read', 'search', 'github', 'rss', 'video']);
          if (op === 'read') return readWeb({ url: requireString(args, 'url', capability), maxLength: args.maxLength as number | undefined });
          if (op === 'search') return searchWeb({ query: requireString(args, 'query', capability), maxResults: args.maxResults as number | undefined });
          if (op === 'github') return searchGitHub({ query: requireString(args, 'query', capability), maxResults: args.maxResults as number | undefined });
          if (op === 'rss') return parseRss({ url: requireString(args, 'url', capability), maxItems: args.maxItems as number | undefined });
          return videoInfo({ url: requireString(args, 'url', capability) });
        }
        case 'skills': {
          const kind = requireString(args, 'kind', capability);
          if (!['plan', 'build', 'test', 'review', 'ship', 'simplify'].includes(kind)) {
            throw new Error(`tool skills: unknown kind "${kind}"`);
          }
          return runSkill(kind as 'plan' | 'build' | 'test' | 'review' | 'ship' | 'simplify', {
            task: requireString(args, 'task', capability),
            context: args.context as string | undefined,
          });
        }
        case 'content': {
          const op = requireOp(args, capability, ['music', 'sfx', 'mixkit']);
          if (op === 'music') {
            return searchMusic({
              query: requireString(args, 'query', capability),
              duration: args.duration as number | undefined,
              tolerance: args.tolerance as number | undefined,
              maxResults: args.maxResults as number | undefined,
            });
          }
          if (op === 'sfx') {
            return searchSfx({
              query: requireString(args, 'query', capability),
              category: args.category as string | undefined,
              maxResults: args.maxResults as number | undefined,
            });
          }
          return mixkit({ type: requireString(args, 'type', capability), maxLength: args.maxLength as number | undefined });
        }
        case 'audio': {
          const op = requireOp(args, capability, ['search', 'synth']);
          if (op === 'search') {
            return audioLibrary.search({
              query: requireString(args, 'query', capability),
              kind: args.kind as 'music' | 'sfx' | undefined,
              maxResults: args.maxResults as number | undefined,
            });
          }
          const kind = requireString(args, 'kind', capability);
          if (!['tone', 'noise', 'impact', 'whoosh', 'beat', 'ambience'].includes(kind)) {
            throw new Error(`tool audio: unknown synth kind "${kind}"`);
          }
          const opts = { durationSec: args.durationSec as number | undefined, freq: args.freq as number | undefined };
          const name = args.name as string | undefined;
          const result = name ? await audioLibrary.saveSynth(kind, name, opts) : synthSound(kind, opts);
          return { kind: result.kind, durationSec: result.durationSec, sampleRate: result.sampleRate };
        }
        case 'g0dm0d3': {
          const op = requireOp(args, capability, ['parseltongue', 'autotune', 'ultraplinian', 'godmode']);
          if (op === 'parseltongue') {
            return generateParseltongueVariants(
              requireString(args, 'query', capability),
              (args.tier as 'light' | 'standard' | 'heavy' | undefined) ?? 'standard',
              args.customTriggers as string[] | undefined,
            );
          }
          if (op === 'autotune') {
            return computeAutoTuneParams(
              requireString(args, 'message', capability),
              (args.history as string[] | undefined) ?? [],
              (args.strategy as 'adaptive' | 'precise' | 'balanced' | 'creative' | 'chaotic' | undefined) ?? 'adaptive',
            );
          }
          if (op === 'ultraplinian') {
            return ultraplinian(
              requireString(args, 'query', capability),
              (args.tier as 'fast' | 'standard' | 'smart' | 'power' | 'ultra' | undefined) ?? 'standard',
              args.model as string | undefined,
            );
          }
          return godmodeClassic(requireString(args, 'query', capability), args.model as string | undefined);
        }
      }
    },

    async ping(): Promise<boolean> {
      return true;
    },

    async close(): Promise<void> {
      // Sin estado de conexión; no-op idempotente.
    },
  };
}