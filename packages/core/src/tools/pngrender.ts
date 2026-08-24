// -----------------------------------------------------------------------------
// pngrender.ts - capability `pngrender`
// -----------------------------------------------------------------------------
// LibrerÃ­a procedural de IMÃGENES REALES (pedido usuario 23/08/2026): encoder
// PNG puro TypeScript â€” sin dependencias externas, solo node:zlib (built-in,
// mismo patrÃ³n que cloud.ts/enrutador.ts con node:fs) â€” para convertir
// funciones matemÃ¡ticas pixel(x,y) â†’ RGBA en archivos .png de verdad.
//
//   firma | IHDR(8-bit RGBA) | IDAT(deflate nivel fijo) | IEND
//
// DiseÃ±o (dominio puro determinista keyless):
// - `encodePng({width,height,rgba})`: valida dimensiones y longitud exacta;
//   deflateSync con level FIJO â†’ mismos bytes de entrada producen el MISMO
//   archivo byte a byte (determinismo verificable en tests).
// - `renderImage(spec, pixelFn)` / `renderImagePng`: cualquier funciÃ³n pura
//   (x,y) â†’ [r,g,b,(a)] se convierte en imagen; alpha default opaco.
// - `valuesToRgba(values, w, h, palette)`: puente con `generative.ts` â€” los
//   campos perlin/simplex/mandelbrot EXISTENTES se vuelven PNG reales.
// - Paletas Dark Obsidian / Neo Violet / fire / ice / mono + `hslToRgb`.
// - `writePngAtomic`: escritura tmp+rename (patrÃ³n repo) con mkdir recursivo.
// -----------------------------------------------------------------------------

import { deflateSync } from 'node:zlib';
import { mkdir, rename, writeFile } from 'node:fs/promises';
import * as path from 'node:path';

/** Error de dominio pngrender. */
export class PngError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'PngError';
  }
}

/** LÃ­mite anti-runaway por dimensiÃ³n. */
export const MAX_DIMENSION = 4096;

const PNG_SIGNATURE = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]);

/* ------------------------------------------------------------------ */
/* CRC32 (IEEE 802.3, polinomio reflejado 0xEDB88320)                  */
/* ------------------------------------------------------------------ */

const CRC_TABLE: Uint32Array = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    table[n] = c >>> 0;
  }
  return table;
})();

/** CRC32 estÃ¡ndar de PNG (verificado contra "123456789" â†’ 0xCBF43926). */
export function crc32(bytes: ArrayLike<number>): number {
  let c = 0xffffffff;
  for (let i = 0; i < bytes.length; i++) {
    c = CRC_TABLE[(c ^ bytes[i]) & 0xff] ^ (c >>> 8);
  }
  return (c ^ 0xffffffff) >>> 0;
}

/* ------------------------------------------------------------------ */
/* Chunks                                                              */
/* ------------------------------------------------------------------ */

function putBE32(out: Uint8Array, offset: number, value: number): void {
  out[offset] = (value >>> 24) & 0xff;
  out[offset + 1] = (value >>> 16) & 0xff;
  out[offset + 2] = (value >>> 8) & 0xff;
  out[offset + 3] = value & 0xff;
}

function chunkBytes(type: string, data: Uint8Array): Uint8Array {
  const out = new Uint8Array(12 + data.length);
  putBE32(out, 0, data.length);
  for (let i = 0; i < 4; i++) out[4 + i] = type.charCodeAt(i);
  out.set(data, 8);
  // CRC cubre type + data
  const crcInput = out.subarray(4, 8 + data.length);
  putBE32(out, 8 + data.length, crc32(crcInput));
  return out;
}

/* ------------------------------------------------------------------ */
/* Encoder                                                             */
/* ------------------------------------------------------------------ */

export interface EncodePngSpec {
  width: number;
  height: number;
  /** RGBA interleaved, longitud exacta width*height*4. */
  rgba: Uint8Array;
}

function validateDims(width: number, height: number): void {
  if (!Number.isInteger(width) || !Number.isInteger(height))
    throw new PngError(`dimensiones deben ser enteras (${width}x${height})`);
  if (width < 1 || height < 1)
    throw new PngError(`dimensiones deben ser >= 1 (${width}x${height})`);
  if (width > MAX_DIMENSION || height > MAX_DIMENSION)
    throw new PngError(`dimensiones exceden ${MAX_DIMENSION} (${width}x${height})`);
}

/**
 * Codifica un buffer RGBA como PNG real (color type 6, bit depth 8, filtro 0).
 * Determinista: misma entrada â†’ mismos bytes (deflate level fijo 6).
 */
export function encodePng(spec: EncodePngSpec): Uint8Array {
  const { width, height } = spec;
  validateDims(width, height);
  const expected = width * height * 4;
  if (!(spec.rgba instanceof Uint8Array) || spec.rgba.length !== expected)
    throw new PngError(`rgba debe tener longitud ${expected} (recibido ${spec.rgba?.length ?? 'no-uint8'})`);

  // Scanlines: cada fila precedida por byte de filtro 0 (None).
  const raw = new Uint8Array(height * (1 + width * 4));
  for (let y = 0; y < height; y++) {
    const rowStart = y * (1 + width * 4);
    raw[rowStart] = 0;
    raw.set(
      spec.rgba.subarray(y * width * 4, (y + 1) * width * 4),
      rowStart + 1,
    );
  }

  const ihdr = new Uint8Array(13);
  putBE32(ihdr, 0, width);
  putBE32(ihdr, 4, height);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // color type RGBA
  ihdr[10] = 0; // compression: deflate
  ihdr[11] = 0; // filter method 0
  ihdr[12] = 0; // interlace none

  const idat = deflateSync(Buffer.from(raw), { level: 6 });

  const total =
    PNG_SIGNATURE.length +
    (12 + ihdr.length) +
    (12 + idat.length) +
    12; // IEND vacÃ­o
  const out = new Uint8Array(total);
  let off = 0;
  out.set(PNG_SIGNATURE, off);
  off += PNG_SIGNATURE.length;
  out.set(chunkBytes('IHDR', ihdr), off);
  off += 12 + ihdr.length;
  out.set(chunkBytes('IDAT', new Uint8Array(idat)), off);
  off += 12 + idat.length;
  out.set(chunkBytes('IEND', new Uint8Array(0)), off);
  return out;
}

/* ------------------------------------------------------------------ */
/* Render desde funciones matemÃ¡ticas                                  */
/* ------------------------------------------------------------------ */

/** FunciÃ³n de pÃ­xel pura: (x,y) â†’ [r,g,b] o [r,g,b,a] en 0..255. */
export type PixelFn = (x: number, y: number) => readonly [number, number, number] | readonly [number, number, number, number];

export interface PngRenderResult {
  width: number;
  height: number;
  rgba: Uint8Array;
}

/** Renderiza pixelFn sobre la rejilla completa (fila por fila, orden determinista). */
export function renderImage(spec: { width: number; height: number }, pixelFn: PixelFn): PngRenderResult {
  validateDims(spec.width, spec.height);
  const { width, height } = spec;
  const rgba = new Uint8Array(width * height * 4);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const c = pixelFn(x, y);
      const o = (y * width + x) * 4;
      rgba[o] = clampByte(c[0]);
      rgba[o + 1] = clampByte(c[1]);
      rgba[o + 2] = clampByte(c[2]);
      rgba[o + 3] = c.length === 4 ? clampByte(c[3]) : 255;
    }
  }
  return { width, height, rgba };
}

/** Atajo: renderiza Y codifica a PNG en una llamada. */
export function renderImagePng(spec: { width: number; height: number }, pixelFn: PixelFn): Uint8Array {
  const r = renderImage(spec, pixelFn);
  return encodePng(r);
}

function clampByte(v: number): number {
  if (!Number.isFinite(v)) return 0;
  return v < 0 ? 0 : v > 255 ? 255 : Math.round(v);
}

/* ------------------------------------------------------------------ */
/* Paletas                                                             */
/* ------------------------------------------------------------------ */

type RgbStop = readonly [number, number, number];

/** Paletas del sistema de diseÃ±o (Dark Obsidian / Neo Violet) + utilitarias. */
export const PALETTES: Record<string, readonly RgbStop[]> = {
  obsidian: [
    [8, 8, 10],
    [17, 17, 21],
    [45, 45, 60],
    [139, 92, 246],
    [237, 233, 254],
  ],
  neoViolet: [
    [24, 16, 43],
    [76, 29, 149],
    [139, 92, 246],
    [196, 181, 253],
    [250, 245, 255],
  ],
  fire: [
    [10, 6, 4],
    [120, 20, 10],
    [230, 80, 20],
    [255, 180, 40],
    [255, 245, 200],
  ],
  ice: [
    [4, 10, 18],
    [12, 74, 110],
    [59, 130, 246],
    [147, 197, 253],
    [240, 249, 255],
  ],
  mono: [
    [0, 0, 0],
    [255, 255, 255],
  ],
};

export const PALETTE_NAMES: readonly string[] = Object.keys(PALETTES);

/** Muestrea la paleta en tâˆˆ[0,1] con interpolaciÃ³n lineal entre stops. */
export function samplePalette(paletteName: string, t: number): [number, number, number] {
  const stops = PALETTES[paletteName];
  if (!stops) throw new PngError(`paleta desconocida: ${paletteName} (vÃ¡lidas: ${PALETTE_NAMES.join(', ')})`);
  const tt = t < 0 ? 0 : t > 1 ? 1 : t;
  const pos = tt * (stops.length - 1);
  const i = Math.max(0, Math.min(stops.length - 2, Math.floor(pos)));
  const f = pos - i;
  const a = stops[i];
  const b = stops[i + 1] ?? a;
  return [
    Math.round(a[0] + (b[0] - a[0]) * f),
    Math.round(a[1] + (b[1] - a[1]) * f),
    Math.round(a[2] + (b[2] - a[2]) * f),
  ];
}

/** HSL (h 0..360, s/l 0..1) â†’ RGB 0..255. */
export function hslToRgb(h: number, s: number, l: number): [number, number, number] {
  const hh = ((h % 360) + 360) % 360;
  const ss = s < 0 ? 0 : s > 1 ? 1 : s;
  const ll = l < 0 ? 0 : l > 1 ? 1 : l;
  const c = (1 - Math.abs(2 * ll - 1)) * ss;
  const x = c * (1 - Math.abs(((hh / 60) % 2) - 1));
  const m = ll - c / 2;
  let rp = 0;
  let gp = 0;
  let bp = 0;
  if (hh < 60) [rp, gp, bp] = [c, x, 0];
  else if (hh < 120) [rp, gp, bp] = [x, c, 0];
  else if (hh < 180) [rp, gp, bp] = [0, c, x];
  else if (hh < 240) [rp, gp, bp] = [0, x, c];
  else if (hh < 300) [rp, gp, bp] = [x, 0, c];
  else [rp, gp, bp] = [c, 0, x];
  return [
    Math.round((rp + m) * 255),
    Math.round((gp + m) * 255),
    Math.round((bp + m) * 255),
  ];
}

/* ------------------------------------------------------------------ */
/* Puente generative.ts                                                */
/* ------------------------------------------------------------------ */

/**
 * Convierte un campo escalar (p.ej. perlinNoise/simplexNoiseField/mandelbrot de
 * `generative.ts`, valores 0..1) en un buffer RGBA mapeado por paleta.
 */
export function valuesToRgba(
  values: Float32Array,
  width: number,
  height: number,
  paletteName: string,
): Uint8Array {
  validateDims(width, height);
  if (values.length !== width * height)
    throw new PngError(`values debe tener longitud ${width * height} (recibido ${values.length})`);
  const rgba = new Uint8Array(width * height * 4);
  for (let i = 0; i < values.length; i++) {
    const [r, g, b] = samplePalette(paletteName, values[i]);
    rgba[i * 4] = r;
    rgba[i * 4 + 1] = g;
    rgba[i * 4 + 2] = b;
    rgba[i * 4 + 3] = 255;
  }
  return rgba;
}

/* ------------------------------------------------------------------ */
/* Escritura atÃ³mica                                                   */
/* ------------------------------------------------------------------ */

/** Escribe el PNG a disco de forma atÃ³mica (tmp + rename) creando directorios. */
export async function writePngAtomic(filePath: string, bytes: Uint8Array): Promise<void> {
  const dir = path.dirname(filePath);
  await mkdir(dir, { recursive: true });
  const tmp = `${filePath}.tmp`;
  await writeFile(tmp, bytes);
  await rename(tmp, filePath);
}
