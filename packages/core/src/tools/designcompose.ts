// -----------------------------------------------------------------------------
// designcompose.ts — capability `designcompose`
// -----------------------------------------------------------------------------
// Modelo de diseño 2D/3D determinista y keyless (pedido usuario 26/08/2026:
// "modelo de diseno 2D e 3D" en la mejora del proyecto completo).
//
// Compone las librerías procedimentales YA existentes del repo en un único
// "modelo de diseño":
//   - 2D: campo escalar desde `generative` (mandelbrot / flowField / anillos
//         propios) → PNG vía `pngrender.valuesToRgba`.
//   - 3D: malla desde `geometry` (superShape3D / mobiusSurface) → PNG vía
//         `pngrender.renderMeshPng` (rasterizador software, cero GPU).
//
// Diseño: dominio PURO y determinista. Misma entrada (semilla + estilo +
// paleta) ⇒ mismos bytes PNG. CERO deps, CERO red. Testeable 100%.
// -----------------------------------------------------------------------------

import { valuesToRgba, encodePng } from './pngrender';
import { mandelbrot, flowField } from './generative';
import {
  superShape3D,
  mobiusSurface,
  renderMeshPng,
  type GeoMesh,
  type SuperShapeParams,
} from './geometry';

export const DESIGN_PALETTES = [
  'obsidian',
  'neoViolet',
  'fire',
  'ice',
  'mono',
] as const;
export type DesignPalette = (typeof DESIGN_PALETTES)[number];

export interface Design2DOptions {
  width: number;
  height: number;
  seed: number;
  palette?: DesignPalette;
  style?: 'fractal' | 'flow' | 'rings';
}

export interface Design3DOptions {
  width?: number;
  height?: number;
  seed: number;
  palette?: DesignPalette;
  kind?: 'supershape' | 'mobius';
  shape?: SuperShapeParams;
}

export interface DesignSpec {
  id: string;
  dimension: '2d' | '3d';
  style: string;
  palette: DesignPalette;
  seed: number;
  width: number;
  height: number;
}

export interface DesignBatchOptions {
  count?: number;
  seed?: number;
  width?: number;
  height?: number;
}

/** PRNG determinista (mulberry32) — misma semilla ⇒ misma secuencia. */
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function resolvePalette(p: string | undefined): DesignPalette {
  return (DESIGN_PALETTES as readonly string[]).includes(p ?? '')
    ? (p as DesignPalette)
    : 'obsidian';
}

function clampDim(n: number): number {
  return Math.max(8, Math.min(2048, Math.round(n)));
}

/**
 * Diseño 2D: campo escalar 0..1 → PNG (paleta rampada).
 * - fractal: conjunto de Mandelbrot (zoom/center derivados de la semilla).
 * - flow:   campo de ángulos flowField normalizado a 0..1.
 * - rings:  patrón de interferencia concéntrico propio (sin deps externas).
 */
export function composeDesign2D(opts: Design2DOptions): Uint8Array {
  const w = clampDim(opts.width);
  const h = clampDim(opts.height);
  const palette = resolvePalette(opts.palette);
  const style = opts.style ?? 'fractal';
  const rand = mulberry32(opts.seed);

  let field: Float32Array;
  if (style === 'fractal') {
    const zoom = 0.6 + rand() * 1.8;
    const cx = -0.75 + (rand() - 0.5) * 0.5;
    const cy = (rand() - 0.5) * 0.5;
    field = mandelbrot(w, h, { center: [cx, cy], zoom, maxIter: 96 });
  } else if (style === 'flow') {
    const f = flowField(w, h, { seed: opts.seed });
    field = new Float32Array(f.length);
    const inv = 1 / (Math.PI * 2);
    for (let i = 0; i < f.length; i++) field[i] = f[i] * inv;
  } else {
    field = new Float32Array(w * h);
    const cxp = w * (0.3 + rand() * 0.4);
    const cyp = h * (0.3 + rand() * 0.4);
    const k = 0.02 + rand() * 0.08;
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const d = Math.hypot(x - cxp, y - cyp);
        field[y * w + x] = 0.5 + 0.5 * Math.sin(d * k + opts.seed);
      }
    }
  }
  return encodePng({ width: w, height: h, rgba: valuesToRgba(field, w, h, palette) });
}

/**
 * Diseño 3D: malla paramétrica → PNG (rasterizador software Lambert).
 * - supershape: superfórmula de Gielis 3D (longitudinal + latitudinal).
 * - mobius:     banda de Möbius (superficie no orientable).
 */
export function composeDesign3D(opts: Design3DOptions): Uint8Array {
  const palette = resolvePalette(opts.palette);
  const kind = opts.kind ?? 'supershape';
  const rand = mulberry32(opts.seed);

  let mesh: GeoMesh;
  if (kind === 'mobius') {
    mesh = mobiusSurface({
      radius: 1 + rand(),
      width: 0.4 + rand() * 0.5,
      uSegs: 120,
      vSegs: 16,
    });
  } else {
    const base: SuperShapeParams = opts.shape ?? {
      m: 5,
      n1: 0.3 + rand() * 0.6,
      n2: 0.3 + rand() * 0.6,
      n3: 0.3 + rand() * 0.6,
    };
    const lon: SuperShapeParams = {
      m: 3 + Math.floor(rand() * 7),
      n1: base.n1,
      n2: base.n2,
      n3: base.n3,
    };
    const lat: SuperShapeParams = {
      m: 2 + Math.floor(rand() * 6),
      n1: base.n1,
      n2: base.n2,
      n3: base.n3,
    };
    mesh = superShape3D(lon, lat, { uSegs: 96, vSegs: 48, scale: 1 });
  }

  return renderMeshPng(mesh, {
    width: clampDim(opts.width ?? 512),
    height: clampDim(opts.height ?? 512),
    palette: palette,
    yaw: rand() * Math.PI,
    pitch: (rand() - 0.5) * 0.6,
  });
}

/**
 * Lote determinista de diseños (idempotente: misma semilla ⇒ mismos specs).
 * El runner (cerebro-cycle) materializa cada spec con composeDesign2D/3D.
 */
export function planDesignBatch(opts: DesignBatchOptions = {}): DesignSpec[] {
  const count = Math.max(1, Math.min(24, Math.round(opts.count ?? 4)));
  const baseSeed = opts.seed ?? 1234;
  const w = opts.width ?? 512;
  const h = opts.height ?? 512;
  const rand = mulberry32(baseSeed);
  const styles2d = ['fractal', 'flow', 'rings'] as const;

  const specs: DesignSpec[] = [];
  for (let i = 0; i < count; i++) {
    const r = rand();
    const palette = DESIGN_PALETTES[Math.floor(rand() * DESIGN_PALETTES.length)];
    const dimension = r < 0.5 ? '2d' : '3d';
    const seed = (baseSeed * 31 + i) >>> 0;
    if (dimension === '2d') {
      specs.push({
        id: `design-${baseSeed}-${i}`,
        dimension,
        style: styles2d[Math.floor(rand() * styles2d.length)],
        palette,
        seed,
        width: w,
        height: h,
      });
    } else {
      specs.push({
        id: `design-${baseSeed}-${i}`,
        dimension,
        style: r < 0.75 ? 'supershape' : 'mobius',
        palette,
        seed,
        width: w,
        height: h,
      });
    }
  }
  return specs;
}
