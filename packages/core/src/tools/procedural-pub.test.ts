import { describe, expect, it } from 'vitest';

import { planProcVid, resolveSpec } from './procvid';
import { buildPublicationPayload } from './procedural-pub';

const SPEC = {
  animation: 'shape-morph',
  width: 480,
  height: 270,
  fps: 24,
  durationSec: 2,
  outName: 'pub-test',
} as const;

describe('procedural-pub — buildPublicationPayload', () => {
  it('estructura compatible con createPublication (tema/contenido/canales/captions)', () => {
    const spec = resolveSpec({ ...SPEC });
    const plan = planProcVid(spec, {});
    const payload = buildPublicationPayload(spec, plan, { gifPath: '.ultraia/procedural/pub-test.gif' }) as {
      tema: string;
      contenido: string;
      canales: string[];
      captionsByChannel: Record<string, { caption: string; hashtags: string[] }>;
      media: Record<string, unknown>;
    };
    expect(payload.canales).toEqual(['blog']);
    expect(payload.tema).toContain('shape morph');
    expect(payload.contenido.length).toBeGreaterThanOrEqual(80); // puntuarPaquete: 30 pts
    expect(payload.captionsByChannel.blog.hashtags).toContain('#UltraIa');
    expect(payload.media.gifPath).toBe('.ultraia/procedural/pub-test.gif');
    expect((payload as Record<string, unknown>).briefId).toBeNull();
  });

  it('caption bilingüe: ar produce título y caption en árabe', () => {
    const spec = resolveSpec({ ...SPEC });
    const plan = planProcVid(spec, {});
    const es = buildPublicationPayload(spec, plan, {}, { idioma: 'es' }) as { tema: string };
    const ar = buildPublicationPayload(spec, plan, {}, { idioma: 'ar' }) as { tema: string; contenido: string };
    expect(es.tema).toMatch(/^Video procedural:/);
    expect(ar.tema).toContain('إجرائي');
    expect(ar.contenido).toContain('المواصفات');
  });

  it('metadata procedural completa y determinista ×2', () => {
    const spec = resolveSpec({ ...SPEC });
    const plan = planProcVid(spec, {});
    const a = buildPublicationPayload(spec, plan, {}) as { procedural: Record<string, unknown> };
    const b = buildPublicationPayload(spec, plan, {}) as { procedural: Record<string, unknown> };
    expect(a.procedural).toEqual({
      animation: 'shape-morph',
      width: 480,
      height: 270,
      fps: 24,
      durationSec: 2,
      frameCount: 48,
      seed: 1337,
      palette: 'neoViolet',
      outName: 'pub-test',
    });
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
  });

  it('mp4Path cae al outputPath del plan si no se pasa outputs', () => {
    const spec = resolveSpec({ ...SPEC });
    const plan = planProcVid(spec, {});
    const payload = buildPublicationPayload(spec, plan) as { media: { mp4Path: string | null } };
    expect(payload.media.mp4Path).toBe(plan.outputPath);
  });

  it('formato visual según orientación', () => {
    const spec = resolveSpec({ ...SPEC, width: 270, height: 480 });
    const plan = planProcVid(spec, {});
    const v = buildPublicationPayload(spec, plan) as { visualByChannel: Record<string, { formato: string }> };
    expect(v.visualByChannel.blog.formato).toBe('9:16');
  });
});
