import { generateMeigenImage } from './meigen';

export interface GenerateImageOptions {
  prompt: string;
  width?: number;
  height?: number;
  model?: string;
  seed?: number;
  nologo?: boolean;
  /** Source image URL for image-to-image ("recreate this as a photoreal photo"). */
  imageUrl?: string;
  /** Provider: pollinations (keyless, default) | meigen (cloud, needs MEIGEN_API_TOKEN). */
  provider?: 'pollinations' | 'meigen';
  /** MeiGEN aspect ratio (e.g. "1:1", "3:4", "16:9"). Overrides width/height when provider=meigen. */
  aspectRatio?: string;
}

export interface GeneratedImage {
  prompt: string;
  url: string;
  width: number;
  height: number;
  model: string;
  seed: number;
  provider: 'pollinations' | 'meigen';
  aspectRatio: string;
}

const DEFAULT_MODEL = 'flux';
const TIMEOUT_MS = 60_000;

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, Math.round(n)));
}

export function isMeigenEnabled(): boolean {
  return Boolean(process.env.MEIGEN_API_TOKEN);
}

/**
 * Generate an image from a text prompt.
 *
 * Multi-provider:
 *  - `pollinations` (default): free, keyless, open image API. Returns a direct,
 *    hotlinkable image URL. Docs: https://pollinations.ai/
 *  - `meigen`: MeiGen cloud (GPT Image 2, Nanobanana, Midjourney…). Requires
 *    MEIGEN_API_TOKEN. Docs: https://docs.meigen.ai/
 *
 * Without an explicit `provider`, falls back to meigen when MEIGEN_API_TOKEN is
 * set and the requested model is not a Pollinations model (gpt-image-2,
 * nanobanana, midjourney, seedance, veo…), otherwise pollinations.
 */
export async function generateImage(opts: GenerateImageOptions): Promise<GeneratedImage> {
  const prompt = (opts.prompt || '').trim();
  if (!prompt) throw new Error('Prompt is required');
  if (prompt.length > 2000) throw new Error('Prompt too long (max 2000 chars)');

  const model = opts.model || DEFAULT_MODEL;
  const pollinationsModels = new Set(['flux', 'turbo', 'flux-2', 'flux-schnell']);
  const wantsMeigen = !pollinationsModels.has(model.toLowerCase());
  const provider = opts.provider ?? (isMeigenEnabled() && wantsMeigen ? 'meigen' : 'pollinations');

  if (provider === 'meigen') {
    const res = await generateMeigenImage({
      prompt,
      modelId: wantsMeigen ? model : undefined,
      aspectRatio: opts.aspectRatio || '1:1',
    });
    return {
      prompt,
      url: res.url,
      width: 0,
      height: 0,
      model: res.modelId,
      seed: 0,
      provider,
      aspectRatio: res.aspectRatio,
    };
  }

  const width = clamp(opts.width ?? 1024, 128, 1792);
  const height = clamp(opts.height ?? 1024, 128, 1792);
  const seed = opts.seed ?? Math.floor(Math.random() * 1_000_000_000);
  const nologo = opts.nologo ?? true;

  const query = new URLSearchParams({
    width: String(width),
    height: String(height),
    seed: String(seed),
    model,
    nologo: nologo ? 'true' : 'false',
  });
  if (opts.imageUrl) {
    query.set('imageUrl', opts.imageUrl);
    query.set('enhance', 'true');
  }

  const base = `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?${query.toString()}`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  let res: Response;
  try {
    res = await fetch(base, { signal: controller.signal, redirect: 'follow' });
  } catch (e) {
    clearTimeout(timer);
    throw new Error(`Image generation failed: ${(e as Error).message}`);
  }
  clearTimeout(timer);

  if (!res.ok) throw new Error(`Image generation failed with status ${res.status}`);
  const finalUrl = res.url || base;

  return {
    prompt,
    url: finalUrl,
    width,
    height,
    model,
    seed,
    provider,
    aspectRatio: `${width}:${height}`,
  };
}