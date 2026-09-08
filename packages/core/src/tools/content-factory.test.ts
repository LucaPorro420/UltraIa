import { describe, it, expect, vi } from 'vitest';
import { contentFactoryGenerate, contentFactorySearch } from './content-factory';

vi.mock('./holagpt', async () => {
  const actual = await vi.importActual<typeof import('./holagpt')>('./holagpt');
  return { ...actual, holagptConfigured: () => false };
});
vi.mock('./image', () => ({ generateImage: async () => ({ url: 'https://pollinations.example/img.png' }) }));
vi.mock('./video', () => ({ generateVideo: async () => ({ frames: ['a', 'b'] }) }));
vi.mock('./music', () => ({ generateMusic: async () => ({ title: 'Test', sections: [] }) }));
vi.mock('./stitch', () => ({ generateUiScreen: async () => { throw new Error('no key'); } }));
vi.mock('../omag/tts', () => ({ edgeTtsAudio: async () => Buffer.alloc(200) }));
vi.mock('../omag/sound', () => ({ synthSound: () => ({ kind: 'tone', durationSec: 1 }) }));

describe('content-factory', () => {
  it('dryRun', async () => {
    const r = await contentFactoryGenerate({ kind: 'web', brief: 'landing para café', dryRun: true, idioma: 'es' });
    expect(r.provider).toBe('dry-run');
    expect((r.output as { dryRun: boolean }).dryRun).toBe(true);
  });

  for (const kind of ['web', 'video', 'game', 'app', 'image', 'audio', 'music'] as const) {
    it(`kind ${kind} keyless`, async () => {
      const r = await contentFactoryGenerate({ kind, brief: `brief ${kind}`, idioma: 'es' });
      expect(r.kind).toBe(kind);
      expect(r.brief).toContain(kind);
      expect(r.provider.length).toBeGreaterThan(0);
    });
  }

  it('search fallback sin holagpt', async () => {
    const r = await contentFactorySearch('ultraia', 3);
    expect(r.provider).toContain('none');
    expect(r.results).toEqual([]);
  });

  it('valida schema', async () => {
    await expect(contentFactoryGenerate({ kind: 'web' as unknown as 'web', brief: '', idioma: 'es' })).rejects.toThrow();
  });
});
