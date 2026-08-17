import { describe, it, expect } from 'vitest';
import {
  planReframe,
  planUpscale,
  planLutMatch,
  planRotoscope,
  planDrawToEdit,
  planBroll,
  vfx,
} from './vfx';

describe('planReframe', () => {
  it('16:9 -> 9:16: crop de 608x1080 sobre 1920x1080', () => {
    const p = planReframe({
      width: 1920,
      height: 1080,
      durSeg: 10,
      centers: [{ t: 2, x01: 0.5, y01: 0.5, w01: 0.3 }],
    });
    expect(p.target).toEqual({ width: 608, height: 1080 });
    expect(p.crops.length).toBeGreaterThanOrEqual(2); // hold inicial + hold final
    expect(p.crops[0].start).toBe(0);
    expect(p.crops[p.crops.length - 1].end).toBe(10);
  });

  it('centro a la izquierda: crop pegado al borde izquierdo con padding', () => {
    const p = planReframe({
      width: 1920,
      height: 1080,
      durSeg: 5,
      centers: [{ t: 1, x01: 0.1, y01: 0.5, w01: 0.2 }],
    });
    const c = p.crops.find((c) => c.start === 0)!;
    expect(c.x).toBeLessThanOrEqual(c.w); // cerca del borde
    expect(c.x).toBeGreaterThanOrEqual(0);
  });

  it('pan rapido entre centros: se interpola para respetar maxPanPerSec', () => {
    const p = planReframe({
      width: 1920,
      height: 1080,
      durSeg: 4,
      centers: [
        { t: 0.5, x01: 0.1, y01: 0.5, w01: 0.3 },
        { t: 1, x01: 0.9, y01: 0.5, w01: 0.3 },
      ],
      maxPanPerSec: 0.2,
    });
    expect(p.crops.length).toBeGreaterThan(2); // interpolacion creo mas segmentos
    expect(p.crops[0].start).toBe(0);
  });

  it('pan lento: un solo segmento entre centros (sin interpolacion)', () => {
    const p = planReframe({
      width: 1920,
      height: 1080,
      durSeg: 20,
      centers: [
        { t: 1, x01: 0.1, y01: 0.5, w01: 0.3 },
        { t: 19, x01: 0.9, y01: 0.5, w01: 0.3 },
      ],
      maxPanPerSec: 0.3,
    });
    expect(p.crops.length).toBe(3); // hold + 1 + hold
  });

  it('aspecto destino 2:1 sobre 16:9: crop 1920x960 con centrado vertical por y01', () => {
    const p = planReframe({
      width: 1920,
      height: 1080,
      durSeg: 3,
      centers: [{ t: 1, x01: 0.5, y01: 0.2, w01: 0.3 }],
      targetRatio: 2, // 2:1 mas ancho que el origen -> recorta el alto
    });
    expect(p.target).toEqual({ width: 1920, height: 960 });
    const c = p.crops.find((c) => c.start === 0)!;
    expect(c.y).toBeLessThanOrEqual(120); // sigue y01=0.2 arriba, con padding
    expect(c.x).toBe(0); // w == width
  });

  it('valida: sin centros -> error; centro fuera de rango -> error', () => {
    expect(() => planReframe({ width: 1920, height: 1080, durSeg: 5, centers: [] })).toThrow();
    expect(() =>
      planReframe({ width: 1920, height: 1080, durSeg: 5, centers: [{ t: 6, x01: 0.5, y01: 0.5, w01: 0.3 }] }),
    ).toThrow();
  });
});

describe('planUpscale', () => {
  it('720p -> 1080p: factor 1.5, lanczos, to 1920x1080', () => {
    const p = planUpscale({ width: 1280, height: 720, target: '1080p' });
    expect(p.to).toEqual({ width: 1920, height: 1080 });
    expect(p.scaleFactor).toBe(1.5);
    expect(p.kind).toBe('classic');
    expect(p.argv.join(' ')).toContain('scale=1920:1080:flags=lanczos');
  });

  it('1080p -> 4k: factor 2', () => {
    const p = planUpscale({ width: 1920, height: 1080, target: '4k' });
    expect(p.to).toEqual({ width: 3840, height: 2160 });
    expect(p.scaleFactor).toBe(2);
  });

  it('2x: factor 2 exacto', () => {
    const p = planUpscale({ width: 1280, height: 720, target: '2x' });
    expect(p.to).toEqual({ width: 2560, height: 1440 });
  });

  it('720p -> 8k: factor 6 -> generativo con nota', () => {
    const p = planUpscale({ width: 1280, height: 720, target: '8k' });
    expect(p.kind).toBe('generative');
    expect(p.notes.some((n) => n.includes('super-resolucion'))).toBe(true);
  });

  it('origen >= objetivo: no escala y lo nota', () => {
    const p = planUpscale({ width: 3840, height: 2160, target: '1080p' });
    expect(p.to.height).toBe(2160);
    expect(p.notes.some((n) => n.includes('no se escala'))).toBe(true);
  });
});

describe('planLutMatch', () => {
  it('warm-cinematic: hints calidos + eq + 3dl', () => {
    const p = planLutMatch({ style: 'warm-cinematic' });
    expect(p.hints.temperature).toBeGreaterThan(0);
    expect(p.hints.saturation).toBeGreaterThan(1);
    expect(p.eqArgs.join(' ')).toContain('eq=exposure=0.06:contrast=1.08:saturation=1.15');
    expect(p.lutName).toBe('warm-cinematic.3dl');
  });

  it('mono: saturacion 0', () => {
    const p = planLutMatch({ style: 'mono' });
    expect(p.hints.saturation).toBe(0);
  });

  it('custom con hints parciales: override merge', () => {
    const p = planLutMatch({ style: 'custom', hints: { saturation: 1.4 } });
    expect(p.hints.saturation).toBe(1.4);
    expect(p.hints.exposure).toBe(0); // base custom
  });

  it('teal-orange: temp calida + tint magenta + eqArgs', () => {
    const p = planLutMatch({ style: 'teal-orange' });
    expect(p.hints.temperature).toBeGreaterThan(0);
    expect(p.hints.tint).toBeGreaterThan(0);
    expect(p.temperatureArgs.length).toBeGreaterThan(0);
  });
});

describe('planRotoscope', () => {
  it('keyframe 30s @30fps: 900 frames, 90 keyframes, alpha straight', () => {
    const p = planRotoscope({ durSeg: 30, fps: 30 });
    expect(p.frameCount).toBe(900);
    expect(p.keyframes).toBe(90);
    expect(p.alphaMode).toBe('straight');
    expect(p.estMin).toBeCloseTo((90 * 0.35) / 60, 1);
  });

  it('full: todos los frames', () => {
    const p = planRotoscope({ durSeg: 10, fps: 30, mode: 'full' });
    expect(p.keyframes).toBe(300);
  });

  it('keyEveryFrames custom', () => {
    const p = planRotoscope({ durSeg: 10, fps: 30, keyEveryFrames: 15 });
    expect(p.keyframes).toBe(20);
  });

  it('cleanup passes incluyen despill y matte choker', () => {
    const p = planRotoscope({ durSeg: 5, fps: 30 });
    expect(p.cleanupPasses.some((c) => c.includes('despill'))).toBe(true);
    expect(p.cleanupPasses.some((c) => c.includes('matte choker'))).toBe(true);
  });
});

describe('planDrawToEdit', () => {
  it('lineart: prompt compuesto con motion + calidad + aspect', () => {
    const p = planDrawToEdit({ style: 'lineart', subject: 'un dragon volando', motion: 'orbit' });
    expect(p.prompt).toContain('un dragon volando');
    expect(p.prompt).toContain('clean line art');
    expect(p.prompt).toContain('camera orbit');
    expect(p.prompt).toContain('9:16');
  });

  it('painterly + aspect 1:1', () => {
    const p = planDrawToEdit({ style: 'painterly', subject: 'retrato', aspect: '1:1' });
    expect(p.prompt).toContain('painterly interpretation');
    expect(p.prompt).toContain('1:1');
  });

  it('seed determinista: mismo subject -> misma seed; distinto -> distinta', () => {
    const a = planDrawToEdit({ style: 'scribble', subject: 'gato' });
    const b = planDrawToEdit({ style: 'scribble', subject: 'gato' });
    const c = planDrawToEdit({ style: 'scribble', subject: 'perro' });
    expect(a.seed).toBe(b.seed);
    expect(a.seed).not.toBe(c.seed);
  });

  it('negative hint siempre presente', () => {
    const p = planDrawToEdit({ style: 'colored-sketch', subject: 'x' });
    expect(p.negativeHint).toContain('blurry');
  });
});

describe('planBroll', () => {
  it('compone prompt con los 4 campos del framework', () => {
    const p = planBroll({
      missingBeat: 'closeup del producto girando',
      frameShape: '9:16',
      motionNeed: 'slow push-in',
      transition: 'cut',
      durationSeg: 6,
      style: 'editorial dark',
    });
    expect(p.request.missingBeat).toBe('closeup del producto girando');
    expect(p.prompt).toContain('vertical 9:16');
    expect(p.prompt).toContain('camera slow push-in');
    expect(p.prompt).toContain('transition-ready cut');
    expect(p.prompt).toContain('editorial dark');
  });

  it('provider hint: <=10s keyless fallback; >10s premium', () => {
    expect(planBroll({ missingBeat: 'x', frameShape: '16:9', motionNeed: 'pan', transition: 'dissolve', durationSeg: 8, style: 's' }).providerHint).toContain('keyless');
    expect(planBroll({ missingBeat: 'x', frameShape: '16:9', motionNeed: 'pan', transition: 'dissolve', durationSeg: 15, style: 's' }).providerHint).toContain('premium');
  });
});

describe('vfx exports', () => {
  it('tiene los 6 planners', () => {
    expect(Object.keys(vfx).sort()).toEqual(['planBroll', 'planDrawToEdit', 'planLutMatch', 'planReframe', 'planRotoscope', 'planUpscale']);
  });
});