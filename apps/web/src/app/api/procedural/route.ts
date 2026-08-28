import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/server/context';
import {
  perlinNoise,
  fbmField,
  simplexNoiseField,
  worleyField,
  mandelbrot,
  valuesToRgba,
  renderImagePng,
  PALETTE_NAMES,
  resolveSpec,
  renderFramePng,
} from '@ultraia/core';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type Req = {
  kind?: string;
  generator?: string;
  palette?: string;
  seed?: number;
  width?: number;
  height?: number;
  frames?: number;
};

function clampDim(n: number | undefined, dflt: number, max: number): number {
  let v = Math.floor(n ?? dflt);
  if (v < 8) v = 8;
  if (v > max) v = max;
  if (v % 2 !== 0) v -= 1; // procvid requires even dims
  return v;
}

function normalizeField(f: Float32Array): Float32Array {
  let min = Infinity;
  let max = -Infinity;
  for (const v of f) {
    if (v < min) min = v;
    if (v > max) max = v;
  }
  if (max - min < 1e-9) return f;
  const out = new Float32Array(f.length);
  const inv = 1 / (max - min);
  for (let i = 0; i < f.length; i++) out[i] = (f[i] - min) * inv;
  return out;
}

function toDataUrl(png: Uint8Array): string {
  return 'data:image/png;base64,' + Buffer.from(png).toString('base64');
}

export async function POST(req: Request) {
  const user = await getCurrentUser(req);
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  let body: Req;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid json' }, { status: 400 });
  }

  const kind = body.kind ?? 'fbm';
  const palette = PALETTE_NAMES.includes(body.palette ?? '') ? (body.palette as string) : 'neoViolet';
  const seed = typeof body.seed === 'number' && Number.isFinite(body.seed) ? body.seed : Math.floor(Math.random() * 1e9);
  const width = clampDim(body.width, 384, 1024);
  const height = clampDim(body.height, 256, 1024);

  try {
    if (kind === 'fbm-flow') {
      const spec = resolveSpec({
        animation: 'fbm-flow',
        width,
        height,
        seed,
        palette,
        fps: 24,
        durationSec: Math.max(0.3, Math.min(1.2, (body.frames ?? 12) / 24)),
      });
      const frames: string[] = [];
      for (let i = 0; i < spec.frameCount; i++) {
        frames.push(toDataUrl(renderFramePng(spec, i)));
      }
      return NextResponse.json({ type: 'frames', frames, width, height, palette, seed });
    }

    const gen = body.generator ?? 'fbm';
    let field: Float32Array;
    if (kind === 'mandelbrot') {
      field = mandelbrot(width, height, { zoom: 1.4, maxIter: 96 });
    } else if (gen === 'perlin') {
      field = perlinNoise(width, height, { seed, scale: 16, octaves: 4 });
    } else if (gen === 'simplex') {
      field = simplexNoiseField(width, height, { seed, scale: 16 });
    } else if (gen === 'worley') {
      field = worleyField(width, height, { seed, scale: 16 });
    } else {
      field = fbmField(width, height, { seed, scale: 16, octaves: 5 });
    }

    const norm = normalizeField(field);
    const rgba = valuesToRgba(norm, width, height, palette);
    const png = renderImagePng({ width, height }, (x, y) => {
      const i = (y * width + x) * 4;
      return [rgba[i], rgba[i + 1], rgba[i + 2], 255] as const;
    });

    return NextResponse.json({
      type: 'image',
      dataUrl: toDataUrl(png),
      width,
      height,
      palette,
      seed,
      generator: kind === 'mandelbrot' ? 'mandelbrot' : gen,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
