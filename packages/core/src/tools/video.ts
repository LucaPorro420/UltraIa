import { generateImage, type GeneratedImage } from './image';

export interface VideoFrame extends GeneratedImage {
  index: number;
  caption: string;
}

export interface VideoStoryboard {
  kind: 'storyboard';
  prompt: string;
  frames: VideoFrame[];
  note: string;
}

export interface VideoClip {
  kind: 'video';
  prompt: string;
  url: string;
  provider: string;
}

export type VideoResult = VideoStoryboard | VideoClip;

/**
 * A pluggable provider for real video generation. Implement this and register
 * it via `setVideoProvider` to enable actual video output once you have a
 * keyless/verified provider (e.g. a self-hosted ComfyUI, a free-tier Replicate
 * model, or an open weights endpoint). Until then, UltraIa falls back to a
 * keyless storyboard built from generated frames.
 */
export interface VideoProvider {
  name: string;
  generate(prompt: string, opts?: { frames?: number; durationSec?: number }): Promise<VideoClip>;
}

let videoProvider: VideoProvider | null = null;
export function setVideoProvider(p: VideoProvider | null): void {
  videoProvider = p;
}

function frameCaption(prompt: string, i: number, total: number): string {
  return `Frame ${i + 1}/${total} — ${prompt} (cinematic, consistent lighting and characters)`;
}

/**
 * Keyless video output: a storyboard of generated frames. This satisfies
 * "recreate as a sequence of photoreal frames" without any API key, and is the
 * default when no VideoProvider is configured.
 */
export async function generateVideoStoryboard(prompt: string, frames = 3): Promise<VideoStoryboard> {
  const count = Math.max(1, Math.min(8, frames));
  const generated: GeneratedImage[] = [];
  for (let i = 0; i < count; i++) {
    generated.push(
      await generateImage({
        prompt: frameCaption(prompt, i, count),
        seed: Math.floor(Math.random() * 1_000_000_000),
      }),
    );
  }
  return {
    kind: 'storyboard',
    prompt,
    frames: generated.map((g, i) => ({ ...g, index: i, caption: frameCaption(prompt, i, count) })),
    note: 'Keyless storyboard. Configure a VideoProvider for real video export.',
  };
}

export async function generateVideo(
  prompt: string,
  opts?: { frames?: number; durationSec?: number },
): Promise<VideoResult> {
  if (videoProvider) {
    return videoProvider.generate(prompt, opts);
  }
  return generateVideoStoryboard(prompt, opts?.frames);
}
