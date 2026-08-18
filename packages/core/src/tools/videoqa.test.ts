/**
 * Tests de la capability videoqa (ciclo 59) — dominio puro determinista.
 * CERO ejecución de ffmpeg: solo matemática sobre buffers + generación de argv.
 */
import { describe, expect, it } from 'vitest';
import {
  buildVmafArgv,
  covariance,
  eFlow,
  ePixelFromPsnr,
  eTotal,
  flowMagnitude,
  mae,
  mean,
  mse,
  psnr,
  ssim,
  variance,
  verdictVideo,
  videoqaInputSchema,
  vmafRunnerSchema,
} from './videoqa';

describe('MAE/MSE (valores exactos)', () => {
  it('mae: buffers idénticos = 0', () => {
    expect(mae([1, 2, 3], [1, 2, 3])).toBe(0);
  });

  it('mae: desviación constante = valor exacto', () => {
    expect(mae([0, 0, 0], [2, 2, 2])).toBe(2);
    expect(mae([1, 2, 3], [1, 0, 3])).toBeCloseTo(2 / 3, 9);
  });

  it('mse: idénticos = 0, desviación d = d²', () => {
    expect(mse([1, 2, 3], [1, 2, 3])).toBe(0);
    expect(mse([0, 0], [2, 2])).toBe(4);
    expect(mse([1, 2], [3, 4])).toBe(4); // ((2² + 2²) / 2)
  });

  it('mae/mse: buffers de distinta longitud lanzan', () => {
    expect(() => mae([1], [1, 2])).toThrow();
    expect(() => mse([1], [1, 2])).toThrow();
  });
});

describe('PSNR (dB)', () => {
  it('psnr: mse=0 → Infinity (idénticos)', () => {
    expect(psnr(0)).toBe(Infinity);
  });

  it('psnr: mse=1 → 10·log10(255²) ≈ 48.13 dB', () => {
    expect(psnr(1)).toBeCloseTo(48.1308, 3);
  });

  it('psnr: mse=255² → 0 dB', () => {
    expect(psnr(255 * 255)).toBeCloseTo(0, 9);
  });

  it('psnr: respeta maxValue alternativo', () => {
    expect(psnr(1, 1)).toBeCloseTo(0, 9); // 10·log10(1/1)
  });
});

describe('SSIM (estructural)', () => {
  it('ssim: buffers idénticos = 1', () => {
    expect(ssim([10, 20, 30, 40, 50], [10, 20, 30, 40, 50])).toBe(1);
  });

  it('ssim: buffers constantes = 1', () => {
    expect(ssim([7, 7, 7], [7, 7, 7])).toBe(1);
  });

  it('ssim: degradación uniforme reduce el valor (< 1)', () => {
    const a = [10, 20, 30, 40, 50, 60, 70, 80];
    const b = a.map((x) => x + 30);
    expect(ssim(a, b)).toBeGreaterThan(0);
    expect(ssim(a, b)).toBeLessThan(1);
  });

  it('ssim: inversión de señal degrada fuerte', () => {
    const a = [0, 50, 100, 150, 200, 250];
    const b = a.map((x) => 250 - x);
    expect(ssim(a, b)).toBeLessThan(0.5);
  });

  it('ssim: buffers de distinta longitud lanzan', () => {
    expect(() => ssim([1], [1, 2])).toThrow();
  });
});

describe('estadísticas auxiliares', () => {
  it('mean/variance exactas', () => {
    expect(mean([1, 2, 3, 4])).toBe(2.5);
    expect(variance([1, 2, 3, 4], 2.5)).toBeCloseTo(1.25, 9);
  });

  it('covariance: correlacionada positiva, inversa negativa', () => {
    expect(covariance([1, 2, 3], [2, 4, 6])).toBeCloseTo(2 / 3 * 2, 9);
    expect(covariance([1, 2, 3], [6, 4, 2])).toBeLessThan(0);
  });
});

describe('E_flow (flujo óptico)', () => {
  it('flowMagnitude: promedio de magnitudes', () => {
    expect(flowMagnitude([[3, 4], [0, 0]])).toBe(2.5); // (5 + 0)/2
  });

  it('eFlow: flujos idénticos = 0', () => {
    expect(eFlow([[1, 0], [0, 1]], [[1, 0], [0, 1]])).toBe(0);
  });

  it('eFlow: diferencia proporcional = ~0.5 (relativa)', () => {
    // ref magnitud media = 2 (5+3)/2=4? no: [3,4]→5, [0,0]→0 → media 2.5
    // dist: [0,0],[0,0] → diff media 2.5 → 2.5/(1+2.5) = 0.714
    expect(eFlow([[3, 4], [0, 0]], [[0, 0], [0, 0]])).toBeCloseTo(2.5 / 3.5, 9);
  });

  it('eFlow: flujos de distinta longitud lanzan', () => {
    expect(() => eFlow([[1, 0]], [[1, 0], [0, 1]])).toThrow();
  });
});

describe('E_total ponderado', () => {
  it('ePixelFromPsnr: perfecto (∞) = 0, peor = 1', () => {
    expect(ePixelFromPsnr(Infinity)).toBe(0);
    expect(ePixelFromPsnr(0)).toBe(1);
    expect(ePixelFromPsnr(40)).toBeCloseTo(0.5, 9);
  });

  it('eTotal: buffers idénticos sin flujo ni semántica = 0', () => {
    const r = eTotal({ reference: [1, 2, 3], distorted: [1, 2, 3] });
    expect(r.ePixel).toBe(0);
    expect(r.eTotal).toBe(0);
  });

  it('eTotal: pesos por defecto α=0.6 β=0.3 γ=0.1 combinan correctamente', () => {
    const input = {
      reference: [0, 0, 0],
      distorted: [0, 0, 0],
      flowReference: [[1, 0]] as const,
      flowDistorted: [[0, 0]] as const,
      semanticError: 1,
    };
    const r = eTotal(input);
    expect(r.eFlowValue).toBeCloseTo(1 / 2, 9); // diff 1 / (1+1)
    expect(r.eTotal).toBeCloseTo(0.6 * 0 + 0.3 * 0.5 + 0.1 * 1, 9);
  });

  it('eTotal: pesos custom', () => {
    const r = eTotal({ reference: [0], distorted: [2] }, { alpha: 1, beta: 0, gamma: 0 });
    // mse=4 → psnr=10·log10(255²/4)=42.13 → ePixel=1/(1+42.13/40)=0.487
    expect(r.eTotal).toBeCloseTo(ePixelFromPsnr(psnr(4)), 9);
  });
});

describe('Veredicto (umbrales del fuente: PSNR>40, SSIM>0.95, E_total<0.05)', () => {
  it('pass: vídeo casi idéntico (ruido pequeño)', () => {
    const ref = Array.from({ length: 64 }, (_, i) => i % 256);
    const dist = ref.map((x) => Math.min(255, x + 1)); // ruido +1 (PSNR alto)
    const v = verdictVideo({ reference: ref, distorted: dist });
    expect(v.pass).toBe(true);
    expect(v.checks.psnr).toBe(true);
    expect(v.checks.ssim).toBe(true);
  });

  it('fail: degradación fuerte rompe PSNR', () => {
    const ref = Array.from({ length: 64 }, (_, i) => i % 256);
    const dist = ref.map((x) => (x + 128) % 256);
    const v = verdictVideo({ reference: ref, distorted: dist });
    expect(v.pass).toBe(false);
    expect(v.checks.psnr).toBe(false);
    expect(v.summary).toContain('FAIL');
  });

  it('fail por umbral custom (psnrMin más exigente)', () => {
    const ref = Array.from({ length: 64 }, (_, i) => i % 256);
    const dist = ref.map((x) => x + 0.5);
    // con psnrMin=40 pasa; con psnrMin=80 falla
    expect(verdictVideo({ reference: ref, distorted: dist }).pass).toBe(true);
    expect(verdictVideo({ reference: ref, distorted: dist }, { psnrMin: 80, ssimMin: 0.95, eTotalMax: 0.05 }).pass).toBe(false);
  });

  it('eTotal alto falla por umbral', () => {
    const v = verdictVideo({ reference: [0], distorted: [255], semanticError: 1 });
    expect(v.checks.eTotal).toBe(false);
    expect(v.pass).toBe(false);
  });

  it('schema zod: input con semanticError fuera de rango lanza', () => {
    expect(() => videoqaInputSchema.parse({ reference: [1], distorted: [1], semanticError: 2 })).toThrow();
  });
});

describe('Runner ffmpeg/libvmaf (solo argv, determinista)', () => {
  it('buildVmafArgv: contiene inputs, lavfi libvmaf y salida null', () => {
    const argv = buildVmafArgv(vmafRunnerSchema.parse({ reference: 'ref.mp4', distorted: 'dist.mp4' }));
    expect(argv[0]).toBe('ffmpeg');
    expect(argv).toContain('ref.mp4');
    expect(argv).toContain('dist.mp4');
    expect(argv.join(' ')).toContain('libvmaf');
    expect(argv.join(' ')).toContain('-f');
  });

  it('buildVmafArgv: psnr=1 y ssim=1 cuando se piden features', () => {
    const argv = buildVmafArgv(
      vmafRunnerSchema.parse({
        reference: 'r.mp4',
        distorted: 'd.mp4',
        features: ['psnr', 'ssim'],
      }),
    );
    expect(argv.join(' ')).toContain(':psnr=1');
    expect(argv.join(' ')).toContain(':ssim=1');
  });

  it('buildVmafArgv: determinista (misma config → mismo argv)', () => {
    const cfg = vmafRunnerSchema.parse({ reference: 'a.mp4', distorted: 'b.mp4', model: 'vmaf_v0.6.1' });
    expect(buildVmafArgv(cfg)).toEqual(buildVmafArgf(cfg));
    function buildVmafArgf(c: typeof cfg) {
      return buildVmafArgv(c);
    }
  });
});