import { describe, expect, it } from 'vitest';
import {
  MAX_SYNTH_DURATION_SEC,
  STUDIO_CLOUD_DIR_BY_TYPE,
  STUDIO_MEDIA_TYPES,
  WEBHARVEST_TIMEOUT_MS,
  assetKindFromMime,
  buildDerivePlan,
  buildSavePlan,
  buildSlideshowFfmpegArgv,
  compositionToSynthPlan,
  planWebHarvestArgv,
  renderCompositionWav,
  resynthOverridesSchema,
  runStudioAction,
  slugifyPrompt,
  studioToolSchema,
} from './studio';
import { OSS_CATALOG, validateCatalog } from './studio-catalog';

const COMPOSITION = {
  mood: 'calm',
  genre: 'lo-fi',
  key: 'A minor',
  tempoBpm: 90,
  sections: [{ name: 'Intro' }, { name: 'Verse' }],
};

describe('assetKindFromMime', () => {
  it('mapea image/*', () => {
    expect(assetKindFromMime('image/png')).toBe('image');
    expect(assetKindFromMime('image/jpeg')).toBe('image');
    expect(assetKindFromMime('image/webp')).toBe('image');
  });
  it('mapea audio wav a music y mp3 a audio', () => {
    expect(assetKindFromMime('audio/wav')).toBe('music');
    expect(assetKindFromMime('audio/mpeg')).toBe('audio');
  });
  it('mapea video/design/text', () => {
    expect(assetKindFromMime('video/mp4')).toBe('video');
    expect(assetKindFromMime('text/html')).toBe('design');
    expect(assetKindFromMime('text/plain')).toBe('text');
  });
  it('desconocido cae a text y ignora charset', () => {
    expect(assetKindFromMime('application/octet-stream')).toBe('text');
    expect(assetKindFromMime('image/png; charset=binary')).toBe('image');
  });
});

describe('slugifyPrompt', () => {
  it('normaliza acentos y puntuación', () => {
    expect(slugifyPrompt('Café con Leche, ¡sí!')).toBe('cafe-con-leche-si');
  });
  it('vacío produce asset', () => {
    expect(slugifyPrompt('!!!')).toBe('asset');
  });
  it('recorta a 40 chars sin guion final', () => {
    const s = slugifyPrompt('a'.repeat(60) + '-');
    expect(s.length).toBeLessThanOrEqual(40);
    expect(s.endsWith('-')).toBe(false);
  });
});

describe('buildSavePlan', () => {
  const base = { prompt: 'un gato astronauta', url: 'https://x/img.png', provider: 'pollinations', mediaType: 'image' };
  it('ok: normaliza model vacío y arma fileName con seed', () => {
    const r = buildSavePlan({ ...base, seed: 42 });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.plan.asset.model).toBe('');
    expect(r.plan.fileName).toBe('un-gato-astronauta-42');
    expect(r.plan.cloudDir).toBe('media/images');
  });
  it('cloudDir por tipo', () => {
    for (const t of STUDIO_MEDIA_TYPES) {
      const r = buildSavePlan({ ...base, mediaType: t });
      expect(r.ok).toBe(true);
      if (r.ok) expect(r.plan.cloudDir).toBe(STUDIO_CLOUD_DIR_BY_TYPE[t]);
    }
  });
  it('errores de validación', () => {
    const r = buildSavePlan({ ...base, prompt: '' });
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.errors.some((e) => e.includes('prompt'))).toBe(true);
  });
  it('parentId inválido falla', () => {
    expect(buildSavePlan({ ...base, parentId: '' }).ok).toBe(false);
  });
});

describe('compositionToSynthPlan', () => {
  it('defaults deterministas', () => {
    const p1 = compositionToSynthPlan(COMPOSITION);
    const p2 = compositionToSynthPlan(COMPOSITION);
    expect(p1).toEqual(p2);
    expect(p1.seed).toBe(1337);
    expect(p1.bpm).toBe(90);
  });
  it('overrides bpm y mood cambian el plan', () => {
    const calm = compositionToSynthPlan(COMPOSITION);
    const dark = compositionToSynthPlan(COMPOSITION, { bpm: 140, mood: 'dark' });
    expect(dark.bpm).toBe(140);
    expect(dark.baseFreq).toBe(82.41);
    expect(calm.baseFreq).toBe(110);
  });
  it('duración por defecto = 4 compases acotada', () => {
    const p = compositionToSynthPlan(COMPOSITION);
    expect(p.durationSec).toBeCloseTo((60 / 90) * 16, 5);
    expect(p.durationSec).toBeLessThanOrEqual(MAX_SYNTH_DURATION_SEC);
  });
  it('override durationSec respeta tope por schema', () => {
    expect(resynthOverridesSchema.safeParse({ durationSec: 31 }).success).toBe(false);
    expect(resynthOverridesSchema.safeParse({ durationSec: 30 }).success).toBe(true);
  });
  it('capas beat/pad/motif en orden', () => {
    expect(compositionToSynthPlan(COMPOSITION).layers.map((l) => l.kind)).toEqual(['beat', 'pad', 'motif']);
  });
});

describe('renderCompositionWav', () => {
  it('WAV válido con header RIFF y tamaño exacto', () => {
    const r = renderCompositionWav(COMPOSITION, { durationSec: 3 });
    expect(r.wav.subarray(0, 4).toString('ascii')).toBe('RIFF');
    expect(r.wav.readUInt32LE(24)).toBe(44_100);
    const expected = 44 + Math.floor(44_100 * 3) * 2;
    expect(r.wav.length).toBe(expected);
  });
  it('determinista por seed y distinto entre seeds', () => {
    const a = renderCompositionWav(COMPOSITION, { seed: 7, durationSec: 2 }).wav;
    const b = renderCompositionWav(COMPOSITION, { seed: 7, durationSec: 2 }).wav;
    const c = renderCompositionWav(COMPOSITION, { seed: 8, durationSec: 2 }).wav;
    expect(a.equals(b)).toBe(true);
    expect(a.equals(c)).toBe(false);
  });
  it('produce señal no silenciosa', () => {
    const r = renderCompositionWav(COMPOSITION, { durationSec: 2 });
    let nonZero = 0;
    for (let i = 44; i < Math.min(r.wav.length, 44 + 4096); i += 2) {
      if (r.wav.readInt16LE(i) !== 0) nonZero++;
    }
    expect(nonZero).toBeGreaterThan(100);
  });
  it('más duración → más bytes; plan embebido refleja overrides', () => {
    const short = renderCompositionWav(COMPOSITION, { durationSec: 2 });
    const long = renderCompositionWav(COMPOSITION, { durationSec: 6 });
    expect(long.wav.length).toBeGreaterThan(short.wav.length);
    const withBpm = renderCompositionWav(COMPOSITION, { bpm: 150, durationSec: 4 });
    expect(withBpm.plan.bpm).toBe(150);
  });
});

describe('buildDerivePlan', () => {
  it('image-reroll arma providerCall hacia /api/tools/image', () => {
    const p = buildDerivePlan({ op: 'image-reroll', prompt: 'mismo gato al atardecer', sourceUrl: 'https://x/a.png' });
    expect(p.childMediaType).toBe('image');
    expect(p.providerCall?.endpoint).toBe('/api/tools/image');
    expect(p.providerCall?.body).toEqual({ prompt: 'mismo gato al atardecer', imageUrl: 'https://x/a.png' });
  });
  it('music-resynth incluye synthPlan con overrides', () => {
    const p = buildDerivePlan({ op: 'music-resynth', composition: COMPOSITION, overrides: { bpm: 120 } });
    expect(p.childMediaType).toBe('music');
    expect(p.synthPlan?.bpm).toBe(120);
  });
  it('video-slideshow estima duración', () => {
    const p = buildDerivePlan({
      op: 'video-slideshow',
      frames: [
        { url: 'f1', caption: '' },
        { url: 'f2', caption: '' },
        { url: 'f3', caption: '' },
      ],
      fps: 30,
      secondsPerFrame: 2,
    });
    expect(p.fps).toBe(30);
    expect(p.estimatedDurationSec).toBe(6);
  });
});

describe('buildSlideshowFfmpegArgv', () => {
  const imgs = ['/tmp/f1.png', '/tmp/f2.png', '/tmp/f3.png'];
  it('argv determinista con un input por frame', () => {
    const argv = buildSlideshowFfmpegArgv(imgs, '/tmp/out.mp4');
    expect(argv[0]).toBe('ffmpeg');
    expect(argv[1]).toBe('-y');
    expect(argv.filter((a) => a === '-i').length).toBe(3);
    expect(argv[argv.length - 1]).toBe('/tmp/out.mp4');
  });
  it('contiene zoompan, xfade n-1, faststart y fps', () => {
    const argv = buildSlideshowFfmpegArgv(imgs, '/tmp/out.mp4', { fps: 24, secondsPerFrame: 2 });
    const fc = argv[argv.indexOf('-filter_complex') + 1];
    expect(fc).toContain('zoompan');
    expect(fc.split('xfade=').length - 1).toBe(2);
    expect(argv).toContain('+faststart');
    expect(fc).toContain('fps=24');
  });
  it('con 1 frame no hay xfade y el map apunta al chain único', () => {
    const argv = buildSlideshowFfmpegArgv(['/tmp/one.png'], '/tmp/o.mp4');
    const mapIdx = argv.indexOf('-map');
    expect(argv[mapIdx + 1]).toBe('[v0]');
  });
  it('falla sin frames', () => {
    expect(() => buildSlideshowFfmpegArgv([], '/tmp/x.mp4')).toThrow();
  });
});

describe('runStudioAction', () => {
  it('save_plan ok y con errores', () => {
    const ok = runStudioAction({
      action: 'save_plan',
      asset: { prompt: 'p', url: 'https://x/i.png', provider: 'meigen', model: 'flux', mediaType: 'image' },
    });
    expect(ok.action).toBe('save_plan');
    if (ok.action === 'save_plan') expect(ok.plan?.cloudDir).toBe('media/images');

    const bad = runStudioAction({ action: 'save_plan', asset: { prompt: '', url: '', provider: '' } as never });
    if (bad.action === 'save_plan') {
      expect(bad.plan).toBeNull();
      expect(bad.errors?.length).toBeGreaterThan(0);
    }
  });
  it('derive_plan / synth_plan / catalog', () => {
    const d = runStudioAction({
      action: 'derive_plan',
      derive: {
        op: 'video-slideshow',
        frames: [{ url: 'u', caption: '' }],
        fps: 24,
        secondsPerFrame: 2,
      },
    });
    expect(d.action).toBe('derive_plan');

    const s = runStudioAction({ action: 'synth_plan', composition: COMPOSITION });
    if (s.action === 'synth_plan') expect(s.maxDurationSec).toBe(MAX_SYNTH_DURATION_SEC);

    const c = runStudioAction({ action: 'catalog' });
    if (c.action === 'catalog') {
      expect(c.entries.length).toBe(OSS_CATALOG.length);
      expect(c.integrityErrors).toEqual([]);
    }
  });
  it('lanza si faltan payloads requeridos', () => {
    expect(() => runStudioAction({ action: 'save_plan' })).toThrow(/asset/);
    expect(() => runStudioAction({ action: 'derive_plan' })).toThrow(/derive/);
    expect(() => runStudioAction({ action: 'synth_plan' })).toThrow(/composition/);
  });
  it('schema de tool rechaza acciones desconocidas', () => {
    expect(studioToolSchema.safeParse({ action: 'hack' }).success).toBe(false);
  });
});

describe('planWebHarvestArgv (OSS webharvest)', () => {
  it('candidatos deterministas: directo + py -3 -m + python -m', () => {
    const { candidates, timeoutMs } = planWebHarvestArgv('https://example.com/a');
    expect(candidates.length).toBe(3);
    expect(candidates[0]).toEqual(['webharvest', 'scrape', 'https://example.com/a']);
    expect(candidates[1]).toEqual(['py', '-3', '-m', 'webharvest', 'scrape', 'https://example.com/a']);
    expect(candidates[2][0]).toBe('python');
    expect(timeoutMs).toBe(WEBHARVEST_TIMEOUT_MS);
  });
  it('rechaza URL no-http(s)', () => {
    expect(() => planWebHarvestArgv('ftp://x')).toThrow(/http/);
    expect(() => planWebHarvestArgv('nota-url')).toThrow(/http/);
  });
  it('todos los candidatos terminan en scrape+url', () => {
    const { candidates } = planWebHarvestArgv('https://ejemplo.test/');
    for (const c of candidates) expect(c.slice(-2)).toEqual(['scrape', 'https://ejemplo.test/']);
  });
});

describe('OSS catalog integrity', () => {
  it('catálogo completo pasa validateCatalog limpio', () => {
    expect(validateCatalog(OSS_CATALOG)).toEqual([]);
  });
  it('webharvest queda wired tras loop-106', () => {
    expect(OSS_CATALOG.find((e) => e.id === 'webharvest')?.status).toBe('wired');
  });
  it('detecta ids duplicados y vendorPath inválidos', () => {
    const errs = validateCatalog([
      ...OSS_CATALOG.slice(0, 1),
      { ...OSS_CATALOG[0], vendorPath: 'otro' },
    ]);
    expect(errs.some((e) => e.includes('duplicado'))).toBe(true);
    expect(errs.some((e) => e.includes('vendorPath'))).toBe(true);
  });
});
