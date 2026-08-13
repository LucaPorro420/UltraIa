export interface GenerateImageOptions {
  prompt: string;
  width?: number;
  height?: number;
  model?: string;
  seed?: number;
  nologo?: boolean;
  /** Source image URL for image-to-image ("recreate this as a photoreal photo"). */
  imageUrl?: string;
}

export interface GeneratedImage {
  prompt: string;
  url: string;
  width: number;
  height: number;
  model: string;
  seed: number;
}

const DEFAULT_MODEL = 'flux';
const TIMEOUT_MS = 60_000;

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, Math.round(n)));
}

/**
 * Generate an image from a text prompt using Pollinations.ai — a free,
 * keyless, open image-generation API. Returns a direct, hotlinkable image URL.
 *
 * Docs: https://pollinations.ai/ (no authentication required)
 */
export async function generateImage(opts: GenerateImageOptions): Promise<GeneratedImage> {
  const prompt = (opts.prompt || '').trim();
  if (!prompt) throw new Error('Prompt is required');
  if (prompt.length > 2000) throw new Error('Prompt too long (max 2000 chars)');

  const width = clamp(opts.width ?? 1024, 128, 1792);
  const height = clamp(opts.height ?? 1024, 128, 1792);
  const model = opts.model || DEFAULT_MODEL;
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

  return { prompt, url: finalUrl, width, height, model, seed };
}
