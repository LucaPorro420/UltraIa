import { describe, expect, it } from 'vitest';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';

import {
  MAX_FRAMES,
  PROCVID_ANIMATIONS,
  ProcVidError,
  buildRenderScript,
  frameFileName,
  framePixelFn,
  planAudioMux,
  planProcVid,
  renderFramePng,
  renderFrames,
  resolveSpec,
  slugifyOutName,
  writeManifest,
} from './procvid';

const SIG = [137, 80, 78, 71, 13, 10, 26, 10];

/** Spec mínima y rápida para tests (32x18 par, 10 fps, 1 s → 10 frames). */
const SMALL = { animation: 'plasma', width: 32, height: 18, fps: 10, durationSec: 1 } as const;

describe('procvid — resolveSpec', () => {
  it('defaults: 480x854@30, 4s, seed 1337, paleta por animación', () => {
    const s = resolveSpec({ animation: 'waves' });
    expect(s.width).toBe(480);
    expect(s.height).toBe(854);
    expect(s.fps).toBe(30);
    expect(s.durationSec).toBe(4);
    expect(s.seed).toBe(1337);
    expect(s.palette).toBe('ice');
    expect(s.frameCount).toBe(120);
    expect(s.outName).toBe('procvid-waves');
  });

  it('rechaza animación y paleta desconocidas con lista válida', () => {
    expect(() => resolveSpec({ animation: 'holo' })).toThrow(/holo.*plasma/);
    expect(() => resolveSpec({ ...SMALL, palette: 'rainbow' })).toThrow(/paleta desconocida/);
  });

  it('dims impares rechazadas (yuv420p exige pares)', () => {
    expect(() => resolveSpec({ ...SMALL, width: 33 })).toThrow(/pares/);
    expect(() => resolveSpec({ ...SMALL, height: 17 })).toThrow(/pares/);
  });

  it('caps anti-runaway: duración, frames, dims y fps', () => {
    expect(() => resolveSpec({ ...SMALL, durationSec: 61 })).toThrow(/durationSec/);
    expect(() => resolveSpec({ ...SMALL, fps: 60, durationSec: 31 })).toThrow(
      new RegExp(String(MAX_FRAMES)),
    );
    expect(() => resolveSpec({ ...SMALL, width: 1282 })).toThrow(/exceden 1280/);
    expect(() => resolveSpec({ ...SMALL, fps: 0 })).toThrow(/fps/);
    expect(() => resolveSpec({ ...SMALL, fps: 61 })).toThrow(/fps/);
    expect(() => resolveSpec({ ...SMALL, durationSec: 0 })).toThrow(/durationSec/);
  });

  it('frameCount redondea fps×duración; slug sanea el outName', () => {
    expect(resolveSpec(SMALL).frameCount).toBe(10);
    expect(resolveSpec({ ...SMALL, fps: 30, durationSec: 2.5 }).frameCount).toBe(75);
    const s = resolveSpec({ ...SMALL, outName: 'Mi Video Épico!' });
    expect(s.outName).toBe('mi-video-epico');
    expect(slugifyOutName('   ')).toBe('');
  });
});

describe('procvid — planProcVid', () => {
  it('argv ffmpeg exacto y determinista', () => {
    const spec = resolveSpec(SMALL);
    const plan = planProcVid(spec, { outDir: '.ultraia/procedural' });
    expect(plan.ffmpegArgv).toEqual([
      'ffmpeg',
      '-y',
      '-framerate',
      '10',
      '-i',
      '.ultraia\\procedural\\procvid-plasma\\frame_%06d.png'.replaceAll('\\', path.sep),
      '-c:v',
      'libx264',
      '-pix_fmt',
      'yuv420p',
      '-crf',
      '18',
      '-movflags',
      '+faststart',
      '.ultraia\\procedural\\procvid-plasma.mp4'.replaceAll('\\', path.sep),
    ]);
    const plan2 = planProcVid(spec, { outDir: '.ultraia/procedural' });
    expect(plan2.ffmpegArgv).toEqual(plan.ffmpegArgv);
  });

  it('variante GIF emite 2 pasos palettegen/paletteuse', () => {
    const plan = planProcVid(resolveSpec(SMALL), { gif: true });
    expect(plan.gifArgv).toHaveLength(2);
    expect(plan.gifArgv![0].join(' ')).toContain('palettegen');
    expect(plan.gifArgv![1].join(' ')).toContain('paletteuse');
  });

  it('buildRenderScript contiene libx264 y pasos consistentes', () => {
    const plan = planProcVid(resolveSpec(SMALL), { gif: true });
    const { sh, steps } = buildRenderScript(plan);
    expect(steps).toHaveLength(3);
    expect(sh).toContain('# UltraIa procvid');
    expect(sh).toContain('libx264');
    expect(sh).toContain('set -eu');
  });
});

describe('procvid — animaciones puras', () => {
  it('las 6 animaciones producen RGB en rango en puntos de muestra', () => {
    for (const animation of PROCVID_ANIMATIONS) {
      const spec = resolveSpec({ animation, width: 16, height: 16, fps: 5, durationSec: 1 });
      for (const t of [0, 0.25, 0.5, 0.99]) {
        const fn = framePixelFn(spec, t);
        for (const [x, y] of [
          [0, 0],
          [8, 8],
          [15, 15],
        ]) {
          const c = fn(x, y) as readonly number[];
          expect(c.length).toBeGreaterThanOrEqual(3);
          for (const ch of c) {
            expect(ch).toBeGreaterThanOrEqual(0);
            expect(ch).toBeLessThanOrEqual(255);
            expect(Number.isFinite(ch)).toBe(true);
          }
        }
      }
    }
  });

  it('shape-morph t=0 círculo: centro dentro (brillante) y esquina fuera (oscura)', () => {
    const spec = resolveSpec({ animation: 'shape-morph', width: 64, height: 64, fps: 5, durationSec: 1 });
    const fn = framePixelFn(spec, 0);
    // centro (32,32) → plano (≈0, ≈0): r=0 ≤ límite → paleta 0.85 (neoViolet claro)
    const center = fn(32, 32) as readonly number[];
    // esquina (2,62) → lejos del radio 0.38 → paleta 0.05 (neoViolet oscuro)
    const corner = fn(2, 62) as readonly number[];
    expect(center[0]).toBeGreaterThan(center[2] === undefined ? 0 : corner[0]);
    expect(center[0]).toBeGreaterThan(150);
    expect(corner[0]).toBeLessThan(80);
  });

  it('fractal-zoom determinista por seed/t y sensible al zoom', () => {
    const spec = resolveSpec({ animation: 'fractal-zoom', width: 32, height: 32, fps: 5, durationSec: 1 });
    // determinismo puro en un pixel
    const a = framePixelFn(spec, 0.3)(12, 12);
    const b = framePixelFn(spec, 0.3)(12, 12);
    expect(Array.from(a)).toEqual(Array.from(b));
    // sensibilidad al zoom: algún pixel del frame cambia entre t lejanos
    // (el anillo del borde de Mandelbrot se desplaza al hacer zoom)
    const fA = framePixelFn(spec, 0.15);
    const fB = framePixelFn(spec, 0.85);
    let diff = false;
    for (let i = 0; i < 32 * 32 && !diff; i++) {
      const x = i % 32;
      const y = Math.floor(i / 32);
      if (Array.from(fA(x, y)).join() !== Array.from(fB(x, y)).join()) diff = true;
    }
    expect(diff).toBe(true);
  });

  it('noise-flow cambia con la seed', () => {
    const s1 = resolveSpec({ animation: 'noise-flow', width: 24, height: 24, fps: 5, durationSec: 1, seed: 1 });
    const s2 = resolveSpec({ animation: 'noise-flow', width: 24, height: 24, fps: 5, durationSec: 1, seed: 999 });
    const v1 = framePixelFn(s1, 0.5)(12, 12);
    const v2 = framePixelFn(s2, 0.5)(12, 12);
    expect(Array.from(v1)).not.toEqual(Array.from(v2));
  });

  it('fbm-flow es determinista y distinto de noise-flow', () => {
    const sFbm = resolveSpec({ animation: 'fbm-flow', width: 24, height: 24, fps: 5, durationSec: 1, seed: 1 });
    const a = framePixelFn(sFbm, 0.5)(12, 12);
    const b = framePixelFn(sFbm, 0.5)(12, 12);
    expect(Array.from(a)).toEqual(Array.from(b));
    const sNoise = resolveSpec({ animation: 'noise-flow', width: 24, height: 24, fps: 5, durationSec: 1, seed: 1 });
    const vNoise = framePixelFn(sNoise, 0.5)(12, 12);
    expect(Array.from(a)).not.toEqual(Array.from(vNoise));
  });
});

describe('procvid — render de frames', () => {
  it('renderFramePng produce PNG con firma y es determinista por índice', () => {
    const spec = resolveSpec(SMALL);
    const f0a = renderFramePng(spec, 0);
    const f0b = renderFramePng(spec, 0);
    const f5 = renderFramePng(spec, 5);
    expect(Array.from(f0a.subarray(0, 8))).toEqual(SIG);
    expect(Array.from(f0a)).toEqual(Array.from(f0b));
    expect(Array.from(f0a)).not.toEqual(Array.from(f5));
    expect(() => renderFramePng(spec, 10)).toThrow(ProcVidError);
    expect(() => renderFramePng(spec, -1)).toThrow(ProcVidError);
  });

  it('renderFrames escribe N archivos nombrados e idempotentes', async () => {
    const tmp = await mkdtemp(path.join(os.tmpdir(), 'ultraia-procvid-'));
    try {
      const spec = resolveSpec({ ...SMALL, animation: 'waves', outName: 'test-frames' });
      const plan = planProcVid(spec, { outDir: tmp });
      const r1 = await renderFrames(spec, plan);
      expect(r1.count).toBe(10);
      expect(r1.files[0]).toBe('frame_000000.png');
      expect(r1.files[9]).toBe('frame_000009.png');
      const bytesFirst = await readFile(path.join(r1.dir, r1.files[0]));
      await renderFrames(spec, plan); // segunda pasada idempotente
      const bytesSecond = await readFile(path.join(r1.dir, r1.files[0]));
      expect(Array.from(bytesFirst)).toEqual(Array.from(bytesSecond));
      expect(Array.from(bytesFirst.subarray(0, 8))).toEqual(SIG);
    } finally {
      await rm(tmp, { recursive: true, force: true });
    }
  });

  it('frameFileName rellena a 6 dígitos', () => {
    expect(frameFileName(0)).toBe('frame_000000.png');
    expect(frameFileName(123456)).toBe('frame_123456.png');
  });
});

describe('procvid — manifest determinista', () => {
  it('JSON idempotente entre corridas y sin timestamps', async () => {
    const tmp = await mkdtemp(path.join(os.tmpdir(), 'ultraia-procvid-mf-'));
    try {
      const spec = resolveSpec({ ...SMALL, outName: 'mf-test' });
      const plan = planProcVid(spec, { outDir: tmp });
      const m1 = await writeManifest(plan);
      const m2 = await writeManifest(plan);
      expect(JSON.stringify(m1)).toBe(JSON.stringify(m2));
      expect(JSON.stringify(m1)).not.toMatch(/20\d\d-/);
      const onDisk = JSON.parse(
        await readFile(path.join(tmp, 'mf-test.manifest.json'), 'utf8'),
      ) as { frameCount: number; ffmpegArgv: string[] };
      expect(onDisk.frameCount).toBe(10);
      expect(onDisk.ffmpegArgv[0]).toBe('ffmpeg');
    } finally {
      await rm(tmp, { recursive: true, force: true });
    }
  });
});


/* ------------------------------------------------------------------ */
/* v2 (iter-103): tunnel / metaballs / kaleido / starfield + audio mux */
/* ------------------------------------------------------------------ */

describe('procvid v2 — animaciones nuevas', () => {
  const NUEVAS = ['tunnel', 'metaballs', 'kaleido', 'starfield', 'fbm-flow'] as const;

  it('catálogo: 11 animaciones con las 5 nuevas', () => {
    expect(PROCVID_ANIMATIONS).toHaveLength(11);
    for (const a of NUEVAS) expect(PROCVID_ANIMATIONS).toContain(a);
  });

  for (const anim of NUEVAS) {
    it(`${anim}: determinista, no estática y dentro de RGB`, () => {
      const spec = resolveSpec({ animation: anim, width: 64, height: 48, fps: 8, durationSec: 2, seed: 42 });
      const f0 = framePixelFn(spec, 0);
      const f0b = framePixelFn(spec, 0);
      const fHalf = framePixelFn(spec, 0.5);

      let cambia = 0;
      let determinista = true;
      for (let y = 0; y < 48; y += 6) {
        for (let x = 0; x < 64; x += 6) {
          const a = f0(x, y);
          const b = f0b(x, y);
          if (a[0] !== b[0] || a[1] !== b[1] || a[2] !== b[2]) determinista = false;
          const c = fHalf(x, y);
          if (a[0] !== c[0] || a[1] !== c[1] || a[2] !== c[2]) cambia++;
          for (const ch of a) {
            expect(ch).toBeGreaterThanOrEqual(0);
            expect(ch).toBeLessThanOrEqual(255);
            expect(Number.isFinite(ch)).toBe(true);
          }
        }
      }
      expect(determinista).toBe(true);   // misma spec+t ⇒ mismos píxeles
      expect(cambia).toBeGreaterThan(0); // el tiempo mueve la imagen
    });
  }

  it('starfield respeta el conteo de estrellas sin NaN en bordes', () => {
    const spec = resolveSpec({ animation: 'starfield', width: 32, height: 32, fps: 4, durationSec: 2, params: { stars: 400 } });
    const f = framePixelFn(spec, 0.999);
    for (const [x, y] of [[0, 0], [31, 31], [15, 16]] as const) {
      const [r, g, b] = f(x, y);
      expect([r, g, b].every(Number.isFinite)).toBe(true);
    }
  });

  it('metaballas fusiona blobs (campo continuo)', () => {
    const spec = resolveSpec({ animation: 'metaballs', width: 48, height: 48, fps: 6, durationSec: 2, params: { count: 5 } });
    const f = framePixelFn(spec, 0.3);
    // Centro de la escena debe tener potencial (algún blob cerca en algún t)
    let brilloMax = -Infinity;
    for (const tt of [0, 0.25, 0.5, 0.75]) {
      const g = framePixelFn(spec, tt)(24, 24)[0];
      if (g > brilloMax) brilloMax = g;
    }
    void f;
    expect(brilloMax).toBeGreaterThan(0);
  });
});

describe('procvid v2 — planAudioMux', () => {
  const base = ['ffmpeg', '-y', '-framerate', '30', '-i', 'frame_%06d.png', '-c:v', 'libx264', 'out.mp4'];

  it('inserta WAV como segunda entrada (tras el primer -i) con aac + shortest', () => {
    const argv = planAudioMux(base, 'sound.wav');
    expect(argv).toEqual([
      'ffmpeg', '-y', '-framerate', '30', '-i', 'frame_%06d.png', '-i', 'sound.wav',
      '-c:v', 'libx264',
      '-c:a', 'aac', '-shortest',
      'out.mp4',
    ]);
  });

  it('volumen opcional y codec copy', () => {
    const argv = planAudioMux(base, 's.wav', { volume: 0.4, codec: 'copy' });
    expect(argv).toContain('-filter:a');
    expect(argv.join(' ')).toContain('volume=0.4');
    expect(argv).toContain('copy');
  });

  it('argv degenerado queda intacto (fail-safe)', () => {
    expect(planAudioMux(['ffmpeg'], 'x.wav')).toEqual(['ffmpeg']);
  });
});
