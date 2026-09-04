//! OMAG Generators — pluggable media generation adapters.
// Each generator handles one modality (image/video/music/audio/vfx/design).
// Generators are deterministic adapters (keyless by default) that produce
// artifacts from MediaField context. The orchestrator calls them in sequence.
import type { MediaField, Modality } from './mediafield';
import { generateImage } from '../tools/image';
import { generateMusic, type MusicResult } from '../tools/music';
import { generateVideo, type VideoResult } from '../tools/video';
import { edgeTts, type TtsOutput } from './tts';
import { createVfxGeneratorAdapter, VfxGeneratorAdapter } from './vfx-generator';
import { DesignGeneratorAdapter } from './design-generator';

export interface GeneratorContext {
  field: MediaField;
  constraints?: Record<string, unknown>;
  quality?: 'fast' | 'balanced' | 'high';
}

export interface GenerationResult {
  artifact: unknown;
  metadata: Record<string, unknown>;
  confidence: number;
  provenance: string;
}

export interface Generator {
  name: string;
  modality: Modality;
  validate(ctx: GeneratorContext): string[];
  prepare(ctx: GeneratorContext): Promise<void>;
  generate(ctx: GeneratorContext): Promise<GenerationResult>;
  inspect(result: GenerationResult): Record<string, unknown>;
  export(result: GenerationResult, target?: string): Promise<string | null>;
}

const QUALITY_STEPS: Record<NonNullable<GeneratorContext['quality']>, number> = {
  fast: 8,
  balanced: 12,
  high: 16,
};

function promptFor(field: MediaField, modality: Modality): string {
  const scene = (field.environment.scene as string) ?? 'a cinematic scene';
  const style = Object.entries(field.style.visual ?? {})
    .map(([k, v]) => `${k} ${v}`)
    .join(', ');
  return style ? `${scene}, ${style}` : scene;
}

function artifactUrl(result: GenerationResult): string | null {
  const artifact = result.artifact as { url?: unknown };
  return typeof artifact?.url === 'string' ? artifact.url : null;
}

export class ImageGeneratorAdapter implements Generator {
  name = 'image-keyless';
  modality: Modality = 'image';

  validate(ctx: GeneratorContext): string[] {
    if (!ctx.field.environment.scene) return ['MediaField.environment.scene is required for image generation'];
    return [];
  }

  async prepare(): Promise<void> {}

  async generate(ctx: GeneratorContext): Promise<GenerationResult> {
    const img = await generateImage({ prompt: promptFor(ctx.field, 'image') });
    return {
      artifact: img,
      metadata: { provider: img.provider, model: img.model, seed: img.seed, aspectRatio: img.aspectRatio },
      confidence: img.provider === 'meigen' ? 0.95 : 0.8,
      provenance: `image:${img.provider}:${img.model}`,
    };
  }

  inspect(result: GenerationResult): Record<string, unknown> {
    return { url: artifactUrl(result), ...result.metadata };
  }

  async export(result: GenerationResult): Promise<string | null> {
    return artifactUrl(result);
  }
}

export class VideoGeneratorAdapter implements Generator {
  name = 'video-storyboard';
  modality: Modality = 'video';

  validate(ctx: GeneratorContext): string[] {
    if (!ctx.field.environment.scene) return ['MediaField.environment.scene is required for video generation'];
    return [];
  }

  async prepare(): Promise<void> {}

  async generate(ctx: GeneratorContext): Promise<GenerationResult> {
    const frames = QUALITY_STEPS[ctx.quality ?? 'balanced'];
    const video: VideoResult = await generateVideo(promptFor(ctx.field, 'video'), { frames });
    const isClip = video.kind === 'video';
    return {
      artifact: video,
      metadata: { kind: video.kind, provider: isClip ? video.provider : 'keyless-storyboard', frames: isClip ? undefined : video.frames.length },
      confidence: isClip ? 0.9 : 0.65,
      provenance: isClip ? `video:${video.provider}` : 'video:keyless:storyboard',
    };
  }

  inspect(result: GenerationResult): Record<string, unknown> {
    const video = result.artifact as VideoResult;
    if (video.kind === 'video') return { url: video.url, frames: undefined };
    return { url: video.frames[0]?.url ?? null, frames: video.frames.length };
  }

  async export(result: GenerationResult): Promise<string | null> {
    const video = result.artifact as VideoResult;
    return video.kind === 'video' ? video.url : (video.frames[0]?.url ?? null);
  }
}

export class AudioGeneratorAdapter implements Generator {
  name = 'audio-tts';
  modality: Modality = 'audio';

  validate(ctx: GeneratorContext): string[] {
    const narration = (ctx.field.audio as { narration?: unknown })?.narration;
    if (!narration && !ctx.field.environment.scene) {
      return ['MediaField.audio.narration or environment.scene is required for TTS narration'];
    }
    return [];
  }

  async prepare(): Promise<void> {}

  async generate(ctx: GeneratorContext): Promise<GenerationResult> {
    const audio = (ctx.field.audio as { narration?: string }) ?? {};
    const script = audio.narration ?? String(ctx.field.environment.scene ?? '');
    const tts: TtsOutput = await edgeTts(script);
    return {
      artifact: tts,
      metadata: {
        voice: tts.voice,
        lang: tts.lang,
        script: tts.script,
        audio: tts.audio,
        url: tts.url,
      },
      confidence: tts.audio ? 0.9 : 0.4,
      provenance: tts.audio ? 'audio:tts:edge' : 'audio:tts:unavailable',
    };
  }

  inspect(result: GenerationResult): Record<string, unknown> {
    const tts = result.artifact as TtsOutput;
    return { url: tts.url, voice: tts.voice, lang: tts.lang, script: tts.script };
  }

  async export(result: GenerationResult): Promise<string | null> {
    const tts = result.artifact as TtsOutput;
    return tts.url;
  }
}

export class MusicGeneratorAdapter implements Generator {
  name = 'music-composition';
  modality: Modality = 'music';

  validate(ctx: GeneratorContext): string[] {
    if (!ctx.field.environment.scene) return ['MediaField.environment.scene is required for music generation'];
    return [];
  }

  async prepare(): Promise<void> {}

  async generate(ctx: GeneratorContext): Promise<GenerationResult> {
    const music: MusicResult = await generateMusic(promptFor(ctx.field, 'music'), {
      durationSec: Number(ctx.constraints?.durationSec ?? 30),
    });
    const isTrack = music.kind === 'audio';
    return {
      artifact: music,
      metadata: isTrack
        ? { provider: music.provider, url: music.url }
        : { title: music.title, mood: music.mood, genre: music.genre, key: music.key, tempoBpm: music.tempoBpm, sections: music.sections.length },
      confidence: isTrack ? 0.9 : 0.6,
      provenance: isTrack ? `music:${music.provider}` : 'music:keyless:composition',
    };
  }

  inspect(result: GenerationResult): Record<string, unknown> {
    const music = result.artifact as MusicResult;
    return music.kind === 'audio'
      ? { url: music.url }
      : { title: music.title, mood: music.mood, genre: music.genre, key: music.key, tempoBpm: music.tempoBpm };
  }

  async export(result: GenerationResult): Promise<string | null> {
    const music = result.artifact as MusicResult;
    return music.kind === 'audio' ? music.url : null;
  }
}

export function defaultGenerators(): Generator[] {
  return [new ImageGeneratorAdapter(), new AudioGeneratorAdapter(), new VideoGeneratorAdapter(), new MusicGeneratorAdapter(), new VfxGeneratorAdapter(), new DesignGeneratorAdapter()];
}

export { VfxGeneratorAdapter } from './vfx-generator';