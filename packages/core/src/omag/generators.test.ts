import { afterEach, describe, expect, it, vi } from 'vitest';
import { createMediaField } from './mediafield';
import {
  AudioGeneratorAdapter,
  defaultGenerators,
  ImageGeneratorAdapter,
  MusicGeneratorAdapter,
  VfxGeneratorAdapter,
  VideoGeneratorAdapter,
} from './generators';

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

function fieldFor(): ReturnType<typeof createMediaField> {
  return createMediaField({
    environment: { scene: 'a woman walking a rainy city street at night' },
    style: { visual: { style: 'cinematic', lighting: 'blue hour' } },
  });
}

describe('ImageGeneratorAdapter', () => {
  it('validates a missing scene', () => {
    const gen = new ImageGeneratorAdapter();
    const problems = gen.validate({ field: createMediaField() });
    expect(problems.length).toBeGreaterThan(0);
  });

  it('generates a keyless image via pollinations', async () => {
    const finalUrl = 'https://image.pollinations.ai/seed/1/img.png';
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, status: 200, url: finalUrl }));
    const gen = new ImageGeneratorAdapter();
    const ctx = { field: fieldFor(), quality: 'high' as const };
    const result = await gen.generate(ctx);
    const img = result.artifact as { url: string };
    expect(img.url).toBe(finalUrl);
    expect(result.provenance).toContain('image');
    expect(await gen.export(result)).toBe(finalUrl);
  });
});

describe('VideoGeneratorAdapter', () => {
  it('generates a keyless storyboard', async () => {
    const finalUrl = 'https://image.pollinations.ai/seed/1/frame.png';
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, status: 200, url: finalUrl }));
    const gen = new VideoGeneratorAdapter();
    const result = await gen.generate({ field: fieldFor(), quality: 'fast' as const });
    expect(result.metadata.kind).toBe('storyboard');
    const video = result.artifact as { kind: string; frames: unknown[] };
    expect(video.frames.length).toBeGreaterThan(0);
  });
});

describe('MusicGeneratorAdapter', () => {
  it('produces a keyless composition without network', async () => {
    const gen = new MusicGeneratorAdapter();
    const result = await gen.generate({ field: fieldFor(), quality: 'balanced' as const });
    expect(result.metadata.title).toBeTruthy();
    expect(result.metadata.sections).toBeGreaterThan(0);
    expect(await gen.export(result)).toBeNull();
  });
});

describe('AudioGeneratorAdapter', () => {
  it('validates a missing narration and scene', () => {
    const gen = new AudioGeneratorAdapter();
    const problems = gen.validate({ field: createMediaField() });
    expect(problems.length).toBeGreaterThan(0);
  });

  it('validates when a narration is provided', () => {
    const gen = new AudioGeneratorAdapter();
    const field = createMediaField({ audio: { narration: 'Hola mundo' } });
    expect(gen.validate({ field })).toEqual([]);
  });

  it('generates narration metadata (keyless, ws gracefully unavailable)', async () => {
    vi.stubGlobal('WebSocket', undefined);
    const gen = new AudioGeneratorAdapter();
    const field = createMediaField({ audio: { narration: 'Una mujer camina bajo la lluvia de noche' } });
    const result = await gen.generate({ field, quality: 'balanced' as const });
    expect(result.metadata.lang).toBe('es');
    expect(result.metadata.script).toContain('mujer');
    expect(result.provenance).toContain('audio');
  });
});

describe('defaultGenerators', () => {
  it('exposes image, audio, video, music and vfx adapters', () => {
    const gens = defaultGenerators();
    expect(gens.map((g) => g.modality)).toEqual(['image', 'audio', 'video', 'music', 'vfx']);
    expect(gens.find((g) => g.name === 'vfx-code')).toBeInstanceOf(VfxGeneratorAdapter);
  });
});