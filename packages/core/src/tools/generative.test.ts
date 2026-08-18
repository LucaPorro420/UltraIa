import { describe, expect, it } from 'vitest';
import {
  applyAdsr,
  buildVideoPlan,
  catmullRom,
  encodeWav,
  flowField,
  fnv1a,
  fnv1aStr,
  interpolateKeyframes,
  kenBurnsFrames,
  lSystem,
  mandelbrot,
  mixSynths,
  mulberry32,
  particleFrames,
  perlinNoise,
  sequenceNotes,
  simplexNoise2D,
  simplexNoiseField,
  synthFm,
  synthGranular,
  synthPinkNoise,
  synthWave,
  valuesToSvg,
  valuesToSvgPalette,
} from './generative';

describe('PRNG + hashing', () => {
  it('mulberry32 es determinista por seed y difiere entre seeds', () => {
    const a = mulberry32(42);
    const b = mulberry32(42);
    const c = mulberry32(43);
    const seqA = [a(), a(), a()];
    const seqB = [b(), b(), b()];
    const seqC = [c(), c(), c()];
    expect(seqA).toEqual(seqB);
    expect(seqA).not.toEqual(seqC);
    for (const v of seqA) expect(v).toBeGreaterThanOrEqual(0);
    for (const v of seqA) expect(v).toBeLessThan(1);
  });

  it('fnv1a es estable y sensible a cambios', () => {
    const a = new Float32Array([1, 2, 3]);
    const b = new Float32Array([1, 2, 3]);
    const c = new Float32Array([1, 2, 4]);
    expect(fnv1a(a)).toBe(fnv1a(b));
    expect(fnv1a(a)).not.toBe(fnv1a(c));
    expect(fnv1aStr('ultraia')).toBe(fnv1aStr('ultraia'));
    expect(fnv1aStr('ultraia')).not.toBe(fnv1aStr('ultraib'));
  });
});

describe('perlinNoise', () => {
  it('genera un campo con las dimensiones pedidas', () => {
    const out = perlinNoise(64, 48);
    expect(out.length).toBe(64 * 48);
  });

  it('es determinista (misma seed) y difiere con otra seed', () => {
    const a = perlinNoise(64, 64, { seed: 1 });
    const b = perlinNoise(64, 64, { seed: 1 });
    const c = perlinNoise(64, 64, { seed: 2 });
    expect(fnv1a(a)).toBe(fnv1a(b));
    expect(fnv1a(a)).not.toBe(fnv1a(c));
  });

  it('los valores quedan en [0, 1]', () => {
    const out = perlinNoise(32, 32, { octaves: 3 });
    for (let i = 0; i < out.length; i += 7) {
      expect(out[i]).toBeGreaterThanOrEqual(0);
      expect(out[i]).toBeLessThanOrEqual(1);
    }
  });

  it('octavas cambian el resultado', () => {
    const a = perlinNoise(64, 64, { seed: 5, octaves: 1 });
    const b = perlinNoise(64, 64, { seed: 5, octaves: 4 });
    expect(fnv1a(a)).not.toBe(fnv1a(b));
  });
});

describe('simplexNoise2D / field', () => {
  it('valor puntual determinista y en rango aproximado [-1, 1]', () => {
    const v1 = simplexNoise2D(3.3, 7.7, 12);
    const v2 = simplexNoise2D(3.3, 7.7, 12);
    const v3 = simplexNoise2D(3.4, 7.7, 12);
    expect(v1).toBe(v2);
    expect(v1).not.toBe(v3);
    expect(Math.abs(v1)).toBeLessThanOrEqual(1.1);
  });

  it('campo normalizado a [0, 1] y determinista', () => {
    const a = simplexNoiseField(32, 32, { seed: 8 });
    const b = simplexNoiseField(32, 32, { seed: 8 });
    expect(fnv1a(a)).toBe(fnv1a(b));
    for (let i = 0; i < a.length; i += 11) {
      expect(a[i]).toBeGreaterThanOrEqual(0);
      expect(a[i]).toBeLessThanOrEqual(1);
    }
  });
});

describe('mandelbrot', () => {
  it('dimensión, determinismo y sensibilidad al zoom', () => {
    const a = mandelbrot(64, 48);
    const b = mandelbrot(64, 48);
    const c = mandelbrot(64, 48, { zoom: 8 });
    expect(a.length).toBe(64 * 48);
    expect(fnv1a(a)).toBe(fnv1a(b));
    expect(fnv1a(a)).not.toBe(fnv1a(c));
  });

  it('valores en [0, 1]', () => {
    const out = mandelbrot(32, 32, { maxIter: 32 });
    for (let i = 0; i < out.length; i += 5) {
      expect(out[i]).toBeGreaterThanOrEqual(0);
      expect(out[i]).toBeLessThanOrEqual(1);
    }
  });
});

describe('flowField', () => {
  it('ángulos en [0, 2π), determinista', () => {
    const a = flowField(32, 32, { seed: 3 });
    const b = flowField(32, 32, { seed: 3 });
    expect(fnv1a(a)).toBe(fnv1a(b));
    for (let i = 0; i < a.length; i += 9) {
      expect(a[i]).toBeGreaterThanOrEqual(0);
      expect(a[i]).toBeLessThan(2 * Math.PI);
    }
  });
});

describe('lSystem', () => {
  it('expande según reglas y es determinista', () => {
    const a = lSystem('F', { F: 'F+F--F+F' }, 3);
    const b = lSystem('F', { F: 'F+F--F+F' }, 3);
    expect(a).toBe(b);
    expect(a).toContain('+');
    expect(a).toContain('-');
    // F+F--F+F tiene 4 F: len 1 -> 8 -> 36 -> 148
    expect(a.length).toBe(148);
  });

  it('aplica el límite de longitud', () => {
    const s = lSystem('F', { F: 'FF' }, 100, 1000);
    expect(s.length).toBeLessThanOrEqual(1000);
  });
});

describe('valuesToSvg / valuesToSvgPalette', () => {
  it('genera SVG autocontenido y determinista', () => {
    const values = perlinNoise(8, 8, { seed: 1, scale: 4 });
    const a = valuesToSvg(values, 8, 8, { cell: 4 });
    const b = valuesToSvg(values, 8, 8, { cell: 4 });
    expect(a).toBe(b);
    expect(a).toContain('<svg');
    expect(a).toContain('role="img"');
    expect(a).toContain('aria-labelledby');
    expect(a).not.toContain('<script');
    expect((a.match(/<rect/g) || []).length).toBe(64);
  });

  it('paleta mapea valores a colores', () => {
    const values = perlinNoise(4, 4, { seed: 2, scale: 2 });
    const svg = valuesToSvgPalette(values, 4, 4, ['#08080a', '#8b5cf6']);
    expect(svg).toContain('#08080a');
    expect(svg).toContain('#8b5cf6');
    expect((svg.match(/<rect/g) || []).length).toBe(16);
  });
});

describe('interpolateKeyframes / catmullRom', () => {
  it('lineal: punto medio exacto', () => {
    const out = interpolateKeyframes(
      [
        { t: 0, value: [0, 10] },
        { t: 1, value: [10, 20] },
      ],
      0.5,
    );
    expect(out).toEqual([5, 15]);
  });

  it('clampa fuera de rango y maneja keyframes únicos', () => {
    expect(interpolateKeyframes([{ t: 0, value: [7] }], 0.9)).toEqual([7]);
    expect(interpolateKeyframes([], 0.5)).toEqual([]);
    const out = interpolateKeyframes(
      [
        { t: 0.2, value: [0] },
        { t: 0.8, value: [10] },
      ],
      0.1,
    );
    expect(out[0]).toBe(0);
  });

  it('catmullRom es determinista y pasa por p1 en t=0', () => {
    expect(catmullRom(0, 5, 10, 15, 0)).toBe(5);
    expect(catmullRom(0, 5, 10, 15, 1)).toBe(10);
    const a = catmullRom(0, 5, 10, 15, 0.3);
    const b = catmullRom(0, 5, 10, 15, 0.3);
    expect(a).toBe(b);
  });

  it('cubic interpola suavemente entre keyframes', () => {
    const kfs = [
      { t: 0, value: [0] },
      { t: 0.5, value: [10] },
      { t: 1, value: [0] },
    ];
    const mid = interpolateKeyframes(kfs, 0.5, 'cubic');
    expect(mid[0]).toBe(10); // pasa por el keyframe medio
    const near = interpolateKeyframes(kfs, 0.25, 'cubic');
    expect(near[0]).toBeGreaterThan(0);
    expect(near[0]).toBeLessThan(10);
  });
});

describe('particleFrames', () => {
  it('una frame por step, determinista', () => {
    const a = particleFrames({ count: 8, seed: 1, steps: 10 });
    const b = particleFrames({ count: 8, seed: 1, steps: 10 });
    expect(a.length).toBe(10);
    expect(a[0].length).toBe(8);
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
  });

  it('la gravedad positiva arrastra hacia abajo (y medio crece)', () => {
    const frames = particleFrames({ count: 64, seed: 2, steps: 8, gravity: 100, wind: 0, friction: 0 });
    const first = frames[0];
    const last = frames[frames.length - 1];
    const meanDelta = first.reduce((acc, p, i) => acc + (last[i].y - p.y), 0) / first.length;
    expect(meanDelta).toBeGreaterThan(0);
  });

  it('vida decrece con el tiempo', () => {
    const frames = particleFrames({ count: 4, seed: 3, steps: 6 });
    for (let i = 0; i < frames[0].length; i++) {
      expect(frames[5][i].life).toBeLessThan(frames[0][i].life);
      expect(frames[5][i].life).toBeGreaterThanOrEqual(0);
    }
  });
});

describe('kenBurnsFrames', () => {
  it('genera fps*duration frames con zoom creciente', () => {
    const out = kenBurnsFrames(2, 30, { width: 1920, height: 1080, startZoom: 1, endZoom: 1.2 });
    expect(out.length).toBe(60);
    expect(out[0].zoom).toBe(1);
    expect(out[59].zoom).toBeCloseTo(1.2, 5);
    expect(out[10].zoom).toBeGreaterThan(out[0].zoom);
  });

  it('la ventana de recorte queda dentro de los límites', () => {
    const out = kenBurnsFrames(1, 10, { width: 100, height: 100, startZoom: 1, endZoom: 2, pan: [0.2, 0.3, 0.8, 0.7] });
    for (const f of out) {
      expect(f.x).toBeGreaterThanOrEqual(0);
      expect(f.y).toBeGreaterThanOrEqual(0);
      expect(f.x + f.w).toBeLessThanOrEqual(100 + 1e-6);
      expect(f.y + f.h).toBeLessThanOrEqual(100 + 1e-6);
      expect(f.w).toBeGreaterThanOrEqual(f.h); // aspect preservado
    }
  });

  it('determinista', () => {
    const a = kenBurnsFrames(1.5, 24);
    const b = kenBurnsFrames(1.5, 24);
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
  });
});

describe('buildVideoPlan', () => {
  it('total de frames = suma de escenas, con rangos por escena', () => {
    const plan = buildVideoPlan(
      [
        { durationSec: 2, label: 'intro' },
        { durationSec: 3, label: 'climax' },
      ],
      { fps: 10, width: 100, height: 100 },
    );
    expect(plan.frames.length).toBe(50);
    expect(plan.sceneRanges).toHaveLength(2);
    expect(plan.sceneRanges[0]).toMatchObject({ start: 0, end: 19, durationSec: 2 });
    expect(plan.sceneRanges[1]).toMatchObject({ start: 20, end: 49, durationSec: 3 });
  });

  it('checksum determinista y sensible', () => {
    const scenes = [{ durationSec: 1, label: 'a' }];
    const p1 = buildVideoPlan(scenes, { fps: 10 });
    const p2 = buildVideoPlan(scenes, { fps: 10 });
    const p3 = buildVideoPlan([{ durationSec: 2, label: 'b' }], { fps: 10 });
    expect(p1.checksum).toBe(p2.checksum);
    expect(p1.checksum).not.toBe(p3.checksum);
    expect(p1.checksum).toMatch(/^[0-9a-f]{8}$/);
  });

  it('lanza con cero escenas', () => {
    expect(() => buildVideoPlan([])).toThrow(/escena/);
  });
});

describe('audio: synthWave / synthFm', () => {
  it('onda seno: determinista y con la duración pedida', () => {
    const a = synthWave({ type: 'sine', freq: 440, durationSec: 0.1 });
    const b = synthWave({ type: 'sine', freq: 440, durationSec: 0.1 });
    expect(a.pcm.length).toBe(4410);
    expect(fnv1a(a.pcm)).toBe(fnv1a(b.pcm));
    expect(a.kind).toBe('wave:sine');
  });

  it('tipos de onda generan formas distintas', () => {
    const sine = synthWave({ type: 'sine', freq: 220, durationSec: 0.05 });
    const sq = synthWave({ type: 'square', freq: 220, durationSec: 0.05 });
    const saw = synthWave({ type: 'saw', freq: 220, durationSec: 0.05 });
    expect(fnv1a(sine.pcm)).not.toBe(fnv1a(sq.pcm));
    expect(fnv1a(sq.pcm)).not.toBe(fnv1a(saw.pcm));
  });

  it('detune altera el espectro (checksum distinto)', () => {
    const base = synthWave({ type: 'saw', freq: 200, durationSec: 0.05 });
    const det = synthWave({ type: 'saw', freq: 200, durationSec: 0.05, detuneCents: 12 });
    expect(fnv1a(base.pcm)).not.toBe(fnv1a(det.pcm));
  });

  it('FM difiere de la portadora pura y es determinista', () => {
    const a = synthFm({ carrier: 220, mod: 660, modIndex: 3, durationSec: 0.05 });
    const b = synthFm({ carrier: 220, mod: 660, modIndex: 3, durationSec: 0.05 });
    expect(fnv1a(a.pcm)).toBe(fnv1a(b.pcm));
    const pure = synthWave({ freq: 220, durationSec: 0.05 });
    expect(fnv1a(a.pcm)).not.toBe(fnv1a(pure.pcm));
  });
});

describe('audio: granular / pink', () => {
  it('granular determinista y con duración correcta', () => {
    const a = synthGranular({ seed: 9, freq: 440, durationSec: 0.3, grainsPerSec: 20 });
    const b = synthGranular({ seed: 9, freq: 440, durationSec: 0.3, grainsPerSec: 20 });
    expect(a.pcm.length).toBe(13230);
    expect(fnv1a(a.pcm)).toBe(fnv1a(b.pcm));
    const c = synthGranular({ seed: 10, freq: 440, durationSec: 0.3, grainsPerSec: 20 });
    expect(fnv1a(a.pcm)).not.toBe(fnv1a(c.pcm));
  });

  it('pink noise determinista y con energía', () => {
    const a = synthPinkNoise({ seed: 5, durationSec: 0.2 });
    const b = synthPinkNoise({ seed: 5, durationSec: 0.2 });
    expect(fnv1a(a.pcm)).toBe(fnv1a(b.pcm));
    let energy = 0;
    for (let i = 0; i < a.pcm.length; i += 100) energy += Math.abs(a.pcm[i]);
    expect(energy).toBeGreaterThan(0);
  });
});

describe('audio: ADSR / sequencer / mix', () => {
  it('ADSR: ataque comienza cerca de cero y sostiene', () => {
    const base = synthWave({ type: 'sine', freq: 440, durationSec: 0.5 });
    const env = applyAdsr(base, { attackSec: 0.1, decaySec: 0.1, sustain: 0.5, releaseSec: 0.1 });
    expect(Math.abs(env.pcm[0])).toBeLessThan(200);
    const midIdx = Math.floor(0.25 * 0.5 * 44100);
    expect(Math.abs(env.pcm[midIdx])).toBeGreaterThan(0);
  });

  it('sequencer: suena solo donde hay notas (determinista)', () => {
    const pattern = [
      { step: 0, freq: 220, type: 'sine' as const },
      { step: 8, freq: 330, type: 'sine' as const },
    ];
    const a = sequenceNotes({ bpm: 120, pattern, bars: 1 });
    const b = sequenceNotes({ bpm: 120, pattern, bars: 1 });
    expect(fnv1a(a.pcm)).toBe(fnv1a(b.pcm));
    // 16 pasos a 120bpm = 2s
    expect(a.durationSec).toBeCloseTo(2, 5);
    // el paso 4 (silencioso) debe tener amplitud ~0; el paso 0 no
    const stepN = Math.floor((60 / 120 / 4) * 44100);
    const quietIdx = Math.floor(stepN * 4.5);
    expect(Math.abs(a.pcm[quietIdx])).toBeLessThan(400);
  });

  it('mix combina duraciones y es determinista', () => {
    const t1 = synthWave({ freq: 220, durationSec: 0.1 });
    const t2 = synthWave({ freq: 330, durationSec: 0.2 });
    const m = mixSynths([t1, t2]);
    expect(m.pcm.length).toBe(Math.floor(0.2 * 44100));
    const m2 = mixSynths([t1, t2]);
    expect(fnv1a(m.pcm)).toBe(fnv1a(m2.pcm));
  });

  it('encodeWav produce un WAV RIFF válido', () => {
    const r = synthWave({ freq: 440, durationSec: 0.05 });
    const wav = encodeWav(r);
    expect(wav.toString('ascii', 0, 4)).toBe('RIFF');
    expect(wav.toString('ascii', 8, 12)).toBe('WAVE');
    expect(wav.readUInt16LE(22)).toBe(1); // mono
    expect(wav.readUInt16LE(34)).toBe(16); // 16-bit
    expect(wav.length).toBe(44 + r.pcm.length * 2);
  });
});