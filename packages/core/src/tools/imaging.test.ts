import { describe, it, expect } from 'vitest';
import {
  createImage,
  imageFrom,
  cloneImage,
  fromRgba,
  toGrayBytes,
  toArray,
  sampleAt,
  bilinearSample,
  convolve2d,
  convolveSeparable,
  correlate2d,
  flipKernel,
  gaussianKernel1d,
  boxKernel1d,
  kernel2d,
  SOBEL_X,
  LAPLACIAN4,
  gaussianBlur,
  boxBlur,
  sobelGradients,
  laplacianFilter,
  unsharpMask,
  medianFilter,
  erodeImage,
  dilateImage,
  openImage,
  closeImage,
  morphGradient,
  imageStats,
  imageHistogram,
  otsuThreshold,
  thresholdImage,
  normalizeImage,
  gammaCorrect,
  equalizeImage,
  cropImage,
  resizeBilinear,
  downsample2,
  gaussianPyramid,
  nonMaxSuppression,
  hysteresisThreshold,
  cannyEdges,
  absDiffMap,
  squaredDiffMap,
  ssimMap,
  compareImages,
  lucasKanadeFlow,
  pyramidalFlow,
  warpByOffset,
  medianFlow,
  imagingSurface,
  type GrayImage,
} from './imaging';
import { flowStats, decomposeMotion } from './motion';

// --- helpers deterministas ---------------------------------------------------

function ramp(width: number, height: number, slope = 2): GrayImage {
  const img = createImage(width, height);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) img.data[y * width + x] = x * slope;
  }
  return img;
}

function texture(width: number, height: number, phase = 0): GrayImage {
  const img = createImage(width, height);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      img.data[y * width + x] =
        128 + 40 * Math.sin((x + phase) / 3) + 30 * Math.sin(y / 4) + 15 * Math.sin((x + y) / 5);
    }
  }
  return img;
}

function square(size: number, from: number, to: number, value = 255): GrayImage {
  const img = createImage(size, size, 0);
  for (let y = from; y < to; y++) {
    for (let x = from; x < to; x++) img.data[y * size + x] = value;
  }
  return img;
}

// --- construcción ------------------------------------------------------------

describe('imaging: construcción y conversión', () => {
  it('createImage respeta dimensiones y relleno', () => {
    const img = createImage(4, 3, 7);
    expect(img.width).toBe(4);
    expect(img.height).toBe(3);
    expect(img.data.length).toBe(12);
    expect([...img.data].every((v) => v === 7)).toBe(true);
  });

  it('imageFrom copia defensivamente y valida el tamaño', () => {
    const src = [1, 2, 3, 4];
    const img = imageFrom(2, 2, src);
    src[0] = 99;
    expect(img.data[0]).toBe(1);
    expect(() => imageFrom(2, 2, [1, 2, 3])).toThrow(/no cuadra/);
    expect(() => createImage(0, 5)).toThrow(/dimensiones inválidas/);
  });

  it('cloneImage es independiente del original', () => {
    const a = imageFrom(2, 2, [1, 2, 3, 4]);
    const b = cloneImage(a);
    b.data[0] = 50;
    expect(a.data[0]).toBe(1);
  });

  it('fromRgba aplica luminancia BT.709', () => {
    const rgba = [255, 0, 0, 255, 0, 255, 0, 255, 0, 0, 255, 255, 255, 255, 255, 255];
    const img = fromRgba(2, 2, rgba);
    expect(img.data[0]).toBeCloseTo(0.2126 * 255, 6);
    expect(img.data[1]).toBeCloseTo(0.7152 * 255, 6);
    expect(img.data[2]).toBeCloseTo(0.0722 * 255, 6);
    expect(img.data[3]).toBeCloseTo(255, 6);
    expect(() => fromRgba(4, 4, rgba)).toThrow(/insuficiente/);
  });

  it('toGrayBytes redondea y satura; toArray devuelve un array plano', () => {
    const img = imageFrom(2, 2, [-10, 0.4, 254.6, 300]);
    const bytes = toGrayBytes(img);
    expect([...bytes]).toEqual([0, 0, 255, 255]);
    expect(toArray(img)).toEqual([-10, 0.4, 254.6, 300]);
  });
});

// --- muestreo ----------------------------------------------------------------

describe('imaging: muestreo y bordes', () => {
  const img = imageFrom(3, 1, [10, 20, 30]);

  it('resuelve los cuatro modos de borde', () => {
    expect(sampleAt(img, -1, 0, 'clamp')).toBe(10);
    expect(sampleAt(img, 3, 0, 'clamp')).toBe(30);
    expect(sampleAt(img, -1, 0, 'zero')).toBe(0);
    expect(sampleAt(img, -1, 0, 'wrap')).toBe(30);
    expect(sampleAt(img, -1, 0, 'reflect')).toBe(20);
    expect(sampleAt(img, 1, 0)).toBe(20);
  });

  it('bilinearSample es exacto en enteros e interpola en el medio', () => {
    expect(bilinearSample(img, 1, 0)).toBeCloseTo(20, 10);
    expect(bilinearSample(img, 0.5, 0)).toBeCloseTo(15, 10);
    expect(bilinearSample(img, 1.25, 0)).toBeCloseTo(22.5, 10);
  });
});

// --- convolución -------------------------------------------------------------

describe('imaging: convolución', () => {
  it('el kernel identidad no altera la imagen', () => {
    const img = texture(8, 8);
    const out = convolve2d(img, kernel2d(3, 3, [0, 0, 0, 0, 1, 0, 0, 0, 0]));
    for (let i = 0; i < img.data.length; i++) expect(out.data[i]).toBeCloseTo(img.data[i], 10);
  });

  it('una caja normalizada preserva una imagen constante', () => {
    const img = createImage(6, 6, 42);
    const out = convolve2d(img, kernel2d(3, 3, new Array(9).fill(1)), { normalize: true });
    expect([...out.data].every((v) => Math.abs(v - 42) < 1e-9)).toBe(true);
  });

  it('separable y 2D coinciden para un kernel gaussiano', () => {
    const img = texture(12, 10);
    const k = gaussianKernel1d(1.2);
    const values: number[] = [];
    for (const ky of k) for (const kx of k) values.push(ky * kx);
    const full = convolve2d(img, kernel2d(k.length, k.length, values));
    const sep = convolveSeparable(img, k, k);
    for (let i = 0; i < img.data.length; i++) expect(sep.data[i]).toBeCloseTo(full.data[i], 8);
  });

  it('valida el tamaño del kernel y aplica bias', () => {
    const img = createImage(3, 3, 1);
    expect(() => convolve2d(img, { width: 2, height: 2, values: [1, 2, 3] })).toThrow(/no cuadra/);
    const out = convolve2d(img, kernel2d(1, 1, [1]), { bias: 5 });
    expect(out.data[0]).toBe(6);
  });

  it('la convolución voltea el kernel (asimétrico) — no es correlación', () => {
    const img = imageFrom(3, 1, [0, 1, 0]);
    // Volteado: out[x] = 1·img[x+1] (si NO volteara sería out[x] = img[x-1]).
    const out = convolve2d(img, kernel2d(3, 1, [1, 0, 0]), { border: 'zero' });
    expect(out.data[0]).toBe(1);
    expect(out.data[2]).toBe(0);
    // correlate2d aplica el kernel tal cual: out[x] = img[x-1].
    const corr = correlate2d(img, kernel2d(3, 1, [1, 0, 0]), { border: 'zero' });
    expect(corr.data[2]).toBe(1);
    expect(corr.data[0]).toBe(0);
  });
});

describe('imaging: kernels', () => {
  it('gaussianKernel1d suma 1 y es simétrico', () => {
    const k = gaussianKernel1d(1.5);
    expect(k.reduce((a, b) => a + b, 0)).toBeCloseTo(1, 12);
    expect(k[0]).toBeCloseTo(k[k.length - 1], 12);
    expect(k.length).toBe(2 * Math.ceil(3 * 1.5) + 1);
    expect(() => gaussianKernel1d(0)).toThrow(/sigma/);
  });

  it('boxKernel1d reparte peso uniforme', () => {
    const k = boxKernel1d(2);
    expect(k.length).toBe(5);
    expect(k.every((v) => Math.abs(v - 0.2) < 1e-12)).toBe(true);
    expect(() => boxKernel1d(0)).toThrow(/radius/);
  });

  it('kernel2d valida y SOBEL_X es antisimétrico', () => {
    expect(() => kernel2d(2, 2, [1])).toThrow(/no cuadra/);
    expect(SOBEL_X.values.reduce((a, b) => a + b, 0)).toBe(0);
    expect(LAPLACIAN4.values.reduce((a, b) => a + b, 0)).toBe(0);
  });
});

// --- filtros -----------------------------------------------------------------

describe('imaging: filtros', () => {
  it('gaussianBlur y boxBlur preservan una imagen constante', () => {
    const img = createImage(9, 9, 100);
    for (const out of [gaussianBlur(img, 1.5), boxBlur(img, 2)]) {
      expect([...out.data].every((v) => Math.abs(v - 100) < 1e-9)).toBe(true);
    }
  });

  it('gaussianBlur reduce la varianza del ruido', () => {
    const img = createImage(20, 20);
    for (let i = 0; i < img.data.length; i++) img.data[i] = i % 2 === 0 ? 0 : 255;
    const before = imageStats(img).variance;
    const after = imageStats(gaussianBlur(img, 2)).variance;
    expect(after).toBeLessThan(before / 10);
  });

  it('sobelGradients recupera la pendiente real en una rampa', () => {
    const img = ramp(16, 16, 3);
    const g = sobelGradients(img);
    const center = 8 * 16 + 8;
    expect(g.gx.data[center]).toBeCloseTo(3, 6);
    expect(g.gy.data[center]).toBeCloseTo(0, 6);
    expect(g.magnitude.data[center]).toBeCloseTo(3, 6);
    expect(g.direction.data[center]).toBeCloseTo(0, 6);
  });

  it('sin normalizar, Sobel escala por 8', () => {
    const img = ramp(16, 16, 3);
    const raw = sobelGradients(img, { normalize: false });
    expect(raw.gx.data[8 * 16 + 8]).toBeCloseTo(24, 6);
  });

  it('laplacianFilter se anula sobre una rampa lineal', () => {
    const img = ramp(16, 16, 4);
    const lap = laplacianFilter(img);
    expect(Math.abs(lap.data[8 * 16 + 8])).toBeLessThan(1e-9);
    expect(laplacianFilter(img, { neighbors: 8 }).data.length).toBe(img.data.length);
  });

  it('unsharpMask realza el detalle y respeta el umbral', () => {
    const img = texture(16, 16);
    const sharp = unsharpMask(img, { sigma: 1, amount: 1.5 });
    expect(imageStats(sharp).variance).toBeGreaterThan(imageStats(img).variance);
    const untouched = unsharpMask(img, { sigma: 1, amount: 5, threshold: 1e6 });
    for (let i = 0; i < img.data.length; i++) expect(untouched.data[i]).toBeCloseTo(img.data[i], 10);
  });

  it('medianFilter elimina sal y pimienta sin desplazar el fondo', () => {
    const img = createImage(9, 9, 50);
    img.data[4 * 9 + 4] = 255;
    img.data[2 * 9 + 6] = 0;
    const out = medianFilter(img, 1);
    expect(out.data[4 * 9 + 4]).toBe(50);
    expect(out.data[2 * 9 + 6]).toBe(50);
    expect(() => medianFilter(img, 0)).toThrow(/radius/);
  });
});

// --- morfología --------------------------------------------------------------

describe('imaging: morfología', () => {
  it('dilatación expande y erosión borra un punto aislado', () => {
    const img = createImage(7, 7, 0);
    img.data[3 * 7 + 3] = 255;
    const d = dilateImage(img, 1);
    expect(d.data[3 * 7 + 2]).toBe(255);
    expect(d.data[2 * 7 + 2]).toBe(255);
    const e = erodeImage(img, 1);
    expect(e.data[3 * 7 + 3]).toBe(0);
  });

  it('apertura borra motas y cierre rellena huecos', () => {
    const speck = createImage(11, 11, 0);
    speck.data[5 * 11 + 5] = 255;
    expect([...openImage(speck, 1).data].every((v) => v === 0)).toBe(true);

    const holed = createImage(11, 11, 255);
    holed.data[5 * 11 + 5] = 0;
    expect(closeImage(holed, 1).data[5 * 11 + 5]).toBe(255);
  });

  it('morphGradient es no negativo y marca el contorno', () => {
    const img = square(12, 4, 8);
    const g = morphGradient(img, 1);
    expect([...g.data].every((v) => v >= 0)).toBe(true);
    expect(g.data[4 * 12 + 3]).toBeGreaterThan(0);
    expect(g.data[0]).toBe(0);
  });
});

// --- estadística y tono ------------------------------------------------------

describe('imaging: estadística, histograma y tono', () => {
  it('imageStats calcula min/max/media/varianza', () => {
    const img = imageFrom(2, 2, [0, 10, 20, 30]);
    const s = imageStats(img);
    expect(s.min).toBe(0);
    expect(s.max).toBe(30);
    expect(s.mean).toBe(15);
    expect(s.variance).toBeCloseTo(125, 10);
    expect(s.stdDev).toBeCloseTo(Math.sqrt(125), 10);
    expect(s.entropy).toBeGreaterThan(0);
  });

  it('la entropía de una imagen plana es 0', () => {
    expect(imageStats(createImage(5, 5, 3)).entropy).toBeCloseTo(0, 12);
  });

  it('imageHistogram conserva el total de píxeles', () => {
    const img = texture(20, 20);
    const h = imageHistogram(img, 32);
    expect(h.counts.reduce((a, b) => a + b, 0)).toBe(400);
    expect(h.bins).toBe(32);
    expect(() => imageHistogram(img, 0)).toThrow(/bins/);
  });

  it('otsuThreshold separa una imagen bimodal', () => {
    const img = createImage(20, 20, 20);
    for (let i = 0; i < 200; i++) img.data[i] = 220;
    const t = otsuThreshold(img);
    expect(t).toBeGreaterThan(20);
    expect(t).toBeLessThan(220);
  });

  it('thresholdImage binariza y admite inversión', () => {
    const img = imageFrom(2, 2, [10, 200, 10, 200]);
    expect([...thresholdImage(img, 100).data]).toEqual([0, 255, 0, 255]);
    expect([...thresholdImage(img, 100, { invert: true }).data]).toEqual([255, 0, 255, 0]);
  });

  it('normalizeImage lleva el rango a 0-255 y gammaCorrect(1) es identidad', () => {
    const n = normalizeImage(imageFrom(2, 2, [5, 10, 15, 20]));
    expect(Math.min(...n.data)).toBeCloseTo(0, 10);
    expect(Math.max(...n.data)).toBeCloseTo(255, 10);
    const img = imageFrom(2, 2, [0, 64, 128, 255]);
    const same = gammaCorrect(img, 1);
    for (let i = 0; i < img.data.length; i++) expect(same.data[i]).toBeCloseTo(img.data[i], 8);
    expect(gammaCorrect(img, 0.5).data[1]).toBeGreaterThan(img.data[1]);
    expect(() => gammaCorrect(img, 0)).toThrow(/gamma/);
  });

  it('equalizeImage expande el contraste de una imagen apagada', () => {
    const img = createImage(16, 16);
    for (let i = 0; i < img.data.length; i++) img.data[i] = 100 + (i % 8);
    const eq = equalizeImage(img);
    expect(imageStats(eq).max - imageStats(eq).min).toBeGreaterThan(
      imageStats(img).max - imageStats(img).min,
    );
    expect(equalizeImage(img, { clipLimit: 2 }).data.length).toBe(img.data.length);
  });
});

// --- geometría ---------------------------------------------------------------

describe('imaging: geometría y pirámides', () => {
  it('cropImage extrae la región y valida los límites', () => {
    const img = ramp(8, 8, 1);
    const c = cropImage(img, 2, 1, 3, 2);
    expect(c.width).toBe(3);
    expect(c.height).toBe(2);
    expect([...c.data]).toEqual([2, 3, 4, 2, 3, 4]);
    expect(() => cropImage(img, 6, 6, 4, 4)).toThrow(/fuera de/);
  });

  it('resizeBilinear cambia el tamaño y preserva una imagen constante', () => {
    const img = createImage(8, 8, 77);
    const up = resizeBilinear(img, 16, 16);
    expect(up.width).toBe(16);
    expect([...up.data].every((v) => Math.abs(v - 77) < 1e-9)).toBe(true);
    expect(resizeBilinear(img, 4, 4).height).toBe(4);
  });

  it('downsample2 reduce a la mitad y la pirámide encadena niveles', () => {
    const img = texture(32, 32);
    const half = downsample2(img);
    expect(half.width).toBe(16);
    expect(half.height).toBe(16);
    const pyr = gaussianPyramid(img, 4);
    expect(pyr.map((p) => p.width)).toEqual([32, 16, 8, 4]);
    expect(() => gaussianPyramid(img, 0)).toThrow(/levels/);
  });

  it('la pirámide se detiene antes de degenerar', () => {
    const pyr = gaussianPyramid(texture(8, 8), 6);
    expect(pyr.length).toBeLessThan(6);
    expect(pyr[pyr.length - 1].width).toBeGreaterThanOrEqual(2);
  });
});

// --- bordes ------------------------------------------------------------------

describe('imaging: detección de bordes', () => {
  it('nonMaxSuppression adelgaza una cresta horizontal', () => {
    const mag = createImage(7, 7, 0);
    for (let x = 0; x < 7; x++) {
      mag.data[2 * 7 + x] = 5;
      mag.data[3 * 7 + x] = 10;
      mag.data[4 * 7 + x] = 5;
    }
    const dir = createImage(7, 7, Math.PI / 2);
    const thin = nonMaxSuppression(mag, dir);
    expect(thin.data[3 * 7 + 3]).toBe(10);
    expect(thin.data[2 * 7 + 3]).toBe(0);
  });

  it('hysteresisThreshold propaga desde los píxeles fuertes', () => {
    const img = createImage(5, 5, 0);
    img.data[2 * 5 + 1] = 100;
    img.data[2 * 5 + 2] = 40;
    img.data[2 * 5 + 3] = 40;
    img.data[0] = 40;
    const out = hysteresisThreshold(img, 30, 80);
    expect(out.data[2 * 5 + 1]).toBe(255);
    expect(out.data[2 * 5 + 3]).toBe(255);
    expect(out.data[0]).toBe(0);
  });

  it('cannyEdges encuentra el contorno de un cuadrado', () => {
    const img = square(32, 10, 22);
    const res = cannyEdges(img, { sigma: 1 });
    expect(res.density).toBeGreaterThan(0);
    expect(res.density).toBeLessThan(0.3);
    expect(res.thresholds.low).toBeLessThan(res.thresholds.high);
    let onBorder = 0;
    for (let y = 8; y <= 24; y++) if (res.edges.data[y * 32 + 9] > 0 || res.edges.data[y * 32 + 10] > 0) onBorder++;
    expect(onBorder).toBeGreaterThan(5);
  });

  it('una imagen plana no produce bordes', () => {
    expect(cannyEdges(createImage(16, 16, 120)).density).toBe(0);
  });
});

// --- comparación (puente videoqa) -------------------------------------------

describe('imaging: comparación 2D (puente con videoqa)', () => {
  it('absDiffMap y squaredDiffMap miden la diferencia por píxel', () => {
    const a = imageFrom(2, 2, [10, 20, 30, 40]);
    const b = imageFrom(2, 2, [12, 20, 25, 40]);
    expect([...absDiffMap(a, b).data]).toEqual([2, 0, 5, 0]);
    expect([...squaredDiffMap(a, b).data]).toEqual([4, 0, 25, 0]);
    expect(() => absDiffMap(a, createImage(3, 3))).toThrow(/distinto tamaño/);
  });

  it('ssimMap da 1 para imágenes idénticas', () => {
    const img = texture(24, 24);
    const res = ssimMap(img, cloneImage(img));
    expect(res.mean).toBeCloseTo(1, 6);
    expect(res.min).toBeCloseTo(1, 6);
  });

  it('ssimMap localiza un defecto puntual que el SSIM global diluye', () => {
    const a = texture(32, 32);
    const b = cloneImage(a);
    for (let y = 14; y < 18; y++) for (let x = 14; x < 18; x++) b.data[y * 32 + x] = 0;
    const res = ssimMap(a, b);
    expect(res.min).toBeLessThan(0.5);
    expect(res.mean).toBeGreaterThan(res.min);
    expect(res.worstAt.x).toBeGreaterThanOrEqual(12);
    expect(res.worstAt.x).toBeLessThanOrEqual(20);
  });

  it('compareImages reporta PSNR infinito y MSSIM 1 en un render idéntico', () => {
    const img = texture(16, 16);
    const rep = compareImages(img, cloneImage(img));
    expect(rep.mse).toBe(0);
    expect(rep.psnr).toBe(Infinity);
    expect(rep.mssim).toBeCloseTo(1, 6);
    expect(rep.maxAbsError).toBe(0);
  });

  it('compareImages identifica el cuadrante con más error', () => {
    const a = createImage(16, 16, 100);
    const b = cloneImage(a);
    for (let y = 9; y < 15; y++) for (let x = 9; x < 15; x++) b.data[y * 16 + x] = 200;
    const rep = compareImages(a, b);
    expect(rep.worstQuadrant).toBe('br');
    expect(rep.psnr).toBeGreaterThan(0);
    expect(rep.meanAbsError).toBeGreaterThan(0);
  });
});

// --- flujo óptico (puente motion) -------------------------------------------

describe('imaging: flujo óptico Lucas-Kanade (puente con motion)', () => {
  it('warpByOffset desplaza el contenido de forma exacta en enteros', () => {
    const img = texture(16, 16);
    const shifted = warpByOffset(img, -3, 0);
    expect(shifted.data[8 * 16 + 8]).toBeCloseTo(img.data[8 * 16 + 5], 8);
  });

  it('detecta un desplazamiento de 1 px hacia la derecha', () => {
    const prev = texture(48, 48);
    const next = warpByOffset(prev, -1, 0);
    const field = lucasKanadeFlow(prev, next, { windowRadius: 4, step: 6 });
    const med = medianFlow(field);
    expect(med.u).toBeGreaterThan(0.7);
    expect(med.u).toBeLessThan(1.3);
    expect(Math.abs(med.v)).toBeLessThan(0.3);
  });

  it('detecta un desplazamiento diagonal', () => {
    const prev = texture(48, 48);
    const next = warpByOffset(prev, -1, -1);
    const med = medianFlow(lucasKanadeFlow(prev, next, { windowRadius: 4, step: 6 }));
    expect(med.u).toBeGreaterThan(0.6);
    expect(med.v).toBeGreaterThan(0.6);
  });

  it('devuelve flujo nulo entre fotogramas idénticos', () => {
    const prev = texture(32, 32);
    const field = lucasKanadeFlow(prev, cloneImage(prev), { windowRadius: 3, step: 4 });
    expect(field.vectors.every(([, , u, v]) => Math.abs(u) < 1e-6 && Math.abs(v) < 1e-6)).toBe(true);
  });

  it('el campo es consumible por motion.flowStats / decomposeMotion', () => {
    const prev = texture(48, 48);
    const next = warpByOffset(prev, -2, 0);
    const field = lucasKanadeFlow(prev, next, { windowRadius: 5, step: 8 });
    const stats = flowStats(field);
    expect(stats.meanMagnitude).toBeGreaterThan(0);
    const d = decomposeMotion(field);
    expect(d.cameraTranslation.x).toBeGreaterThan(0.5);
    expect(['camera', 'mixed']).toContain(d.dominant);
  });

  it('no resuelve regiones sin textura (determinante ~0)', () => {
    const flat = createImage(32, 32, 128);
    const field = lucasKanadeFlow(flat, warpByOffset(flat, -3, 0), { windowRadius: 3, step: 4 });
    expect(field.vectors.every(([, , u, v]) => u === 0 && v === 0)).toBe(true);
  });

  it('pyramidalFlow resuelve un desplazamiento mayor que la ventana', () => {
    const prev = texture(64, 64);
    const next = warpByOffset(prev, -6, 0);
    const res = pyramidalFlow(prev, next, { levels: 3, windowRadius: 4, step: 8 });
    expect(res.globalShift.u).toBeGreaterThan(4.5);
    expect(res.globalShift.u).toBeLessThan(7.5);
    expect(Math.abs(res.globalShift.v)).toBeLessThan(1.5);
    expect(res.perLevel.length).toBeGreaterThanOrEqual(2);
    expect(res.field.vectors.length).toBeGreaterThan(0);
  });

  it('medianFlow es robusto ante outliers', () => {
    const field = {
      width: 10,
      height: 10,
      vectors: [
        [0, 0, 1, 0],
        [1, 0, 1, 0],
        [2, 0, 1, 0],
        [3, 0, 900, 0],
      ],
    } as const;
    expect(medianFlow(field as never).u).toBe(1);
    expect(medianFlow({ width: 1, height: 1, vectors: [] }).u).toBe(0);
  });
});

// --- contrato ----------------------------------------------------------------

describe('imaging: contrato de la capability', () => {
  it('las operaciones no mutan la entrada', () => {
    const img = texture(12, 12);
    const before = [...img.data];
    gaussianBlur(img, 1);
    sobelGradients(img);
    erodeImage(img, 1);
    equalizeImage(img);
    normalizeImage(img);
    cannyEdges(img);
    expect([...img.data]).toEqual(before);
  });

  it('flipKernel es involutivo y convolve2d(flip(k)) === correlate2d(k)', () => {
    const k = kernel2d(3, 3, [1, 2, 3, 4, 5, 6, 7, 8, 9]);
    expect(flipKernel(flipKernel(k)).values).toEqual(k.values);
    const img = texture(10, 10);
    const a = convolve2d(img, flipKernel(k));
    const b = correlate2d(img, k);
    for (let i = 0; i < img.data.length; i++) expect(a.data[i]).toBeCloseTo(b.data[i], 10);
  });

  it('es determinista: dos ejecuciones dan el mismo resultado bit a bit', () => {
    const img = texture(24, 24);
    const next = warpByOffset(img, -2, -1);
    const runA = pyramidalFlow(img, next, { levels: 2, windowRadius: 3, step: 4 });
    const runB = pyramidalFlow(img, next, { levels: 2, windowRadius: 3, step: 4 });
    expect(runA.globalShift).toEqual(runB.globalShift);
    expect([...cannyEdges(img).edges.data]).toEqual([...cannyEdges(img).edges.data]);
    expect([...equalizeImage(img).data]).toEqual([...equalizeImage(img).data]);
  });

  it('cannyEdges acepta umbrales explícitos', () => {
    const res = cannyEdges(square(24, 8, 16), { sigma: 1, low: 5, high: 20 });
    expect(res.thresholds).toEqual({ low: 5, high: 20 });
  });

  it('imagingSurface declara los grupos y los gaps que cierra', () => {
    expect(imagingSurface.flujo).toContain('lucasKanadeFlow');
    expect(imagingSurface.convolucion).toContain('correlate2d');
    expect(imagingSurface.comparacion).toContain('ssimMap');
    expect(Object.keys(imagingSurface.cierra)).toEqual(['A8', 'A9-A11', 'A22-A24']);
    expect(imagingSurface.schemas.image.parse({ width: 2, height: 2, data: [1, 2, 3, 4] }).width).toBe(2);
    expect(imagingSurface.schemas.border.parse('reflect')).toBe('reflect');
  });
});
