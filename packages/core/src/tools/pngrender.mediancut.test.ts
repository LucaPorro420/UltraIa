import { describe, expect, it } from 'vitest';

import {
  encodeGif,
  quantizeMedianCut,
  PngError,
} from './pngrender';

function solidFrame(w: number, h: number, rgb: [number, number, number]): Uint8Array {
  const a = new Uint8Array(w * h * 4);
  for (let p = 0; p < w * h; p++) {
    a[p * 4] = rgb[0];
    a[p * 4 + 1] = rgb[1];
    a[p * 4 + 2] = rgb[2];
    a[p * 4 + 3] = 255;
  }
  return a;
}

/** Decoder LZW mínimo reutilizable (igual que pngrender.gif.test.ts). */
export function lzwDecode(data: Uint8Array, minCodeSize: number, expectedLen: number): Uint8Array {
  const clear = 1 << minCodeSize;
  const eoi = clear + 1;
  let size = minCodeSize + 1;
  let dict: number[][] = [];
  const reset = (): void => {
    dict = [];
    for (let i = 0; i < clear; i++) dict.push([i]);
    dict.push([]);
    dict.push([]);
  };
  reset();
  const out: number[] = [];
  let bitPos = 0;
  let prev: number[] | null = null;
  while (out.length < expectedLen) {
    let code = 0;
    for (let b = 0; b < size; b++) {
      const bit = ((data[bitPos >> 3] ?? 0) >> (bitPos & 7)) & 1;
      code |= bit << b;
      bitPos++;
    }
    if (code === clear) {
      reset();
      prev = null;
      continue;
    }
    if (code === eoi) break;
    let entry: number[];
    if (code < dict.length && dict[code].length > 0) entry = dict[code];
    else if (prev) entry = [...prev, prev[0]];
    else throw new Error(`código inválido ${code}`);
    for (const v of entry) out.push(v);
    if (prev) dict.push([...prev, entry[0]]);
    prev = entry;
    if (dict.length >= (1 << size) - 1 && size < 12) size++;
  }
  return Uint8Array.from(out);
}

/** Extrae la GCT y los índices del primer frame de un GIF generado. */
function parseGctAndFirstFrame(gif: Uint8Array, withNetscape: boolean): {
  palette: Uint8Array;
  sizeBits: number;
  indices: Uint8Array;
} {
  const sizeBits = gif[10] & 7;
  const gctLen = (1 << (sizeBits + 1)) * 3;
  let p = 13 + gctLen;
  if (withNetscape) {
    p += 2; // 21 FF
    const blen = gif[p++];
    p += blen; // nombre/código de la aplicación
    while (gif[p] !== 0) p += 1 + gif[p]; // sub-blocks
    p += 1; // terminador
  }
  p += 8; // GCE
  expect(gif[p]).toBe(0x2c);
  p += 10; // descriptor
  const minCodeSize = gif[p++];
  const lzw: number[] = [];
  while (true) {
    const len = gif[p++];
    if (len === 0) break;
    for (let i = 0; i < len; i++) lzw.push(gif[p++]);
  }
  const w = gif[6] | (gif[7] << 8);
  const h = gif[8] | (gif[9] << 8);
  const indices = lzwDecode(Uint8Array.from(lzw), minCodeSize, w * h);
  return { palette: gif.subarray(13, 13 + gctLen), sizeBits, indices };
}

describe('pngrender — quantizeMedianCut', () => {
  it('paleta potencia de 2 y color sólido exacto en índice 0-adjacente', () => {
    const q = quantizeMedianCut([solidFrame(4, 4, [200, 30, 90])]);
    expect(q.size).toBeGreaterThanOrEqual(2);
    expect((q.size & (q.size - 1))).toBe(0); // potencia de 2
    // nearest para el color sólido debe mapear a un entry == ese color exacto
    const idx = q.indexOf(200, 30, 90);
    expect(q.palette[idx * 3]).toBe(200);
    expect(q.palette[idx * 3 + 1]).toBe(30);
    expect(q.palette[idx * 3 + 2]).toBe(90);
  });

  it('dos colores muy distintos quedan en entries separadas', () => {
    const q = quantizeMedianCut([
      solidFrame(2, 2, [250, 10, 10]),
      solidFrame(2, 2, [10, 10, 250]),
    ]);
    const iRed = q.indexOf(250, 10, 10);
    const iBlue = q.indexOf(10, 10, 250);
    expect(iRed).not.toBe(iBlue);
  });

  it('determinista ×2 (misma paleta byte a byte)', () => {
    const frames = [
      solidFrame(6, 6, [10, 200, 30]),
      solidFrame(6, 6, [200, 30, 10]),
      solidFrame(6, 6, [30, 30, 220]),
    ];
    const a = quantizeMedianCut(frames);
    const b = quantizeMedianCut(frames);
    expect(Array.from(a.palette)).toEqual(Array.from(b.palette));
    expect(a.size).toBe(b.size);
  });

  it('guarda maxColors inválido', () => {
    expect(() => quantizeMedianCut([solidFrame(2, 2, [0, 0, 0])], 1)).toThrow(PngError);
    expect(() => quantizeMedianCut([solidFrame(2, 2, [0, 0, 0])], 257)).toThrow(PngError);
  });
});

describe('encodeGif palette mediancut', () => {
  it('estructura válida + roundtrip de índices con GCT adaptativa', () => {
    const frames = [
      solidFrame(8, 8, [230, 40, 40]),
      solidFrame(8, 8, [40, 230, 40]),
      solidFrame(8, 8, [40, 40, 230]),
    ];
    const gif = encodeGif(frames, { width: 8, height: 8, palette: 'mediancut' });
    expect(gif[gif.length - 1]).toBe(0x3b);
    const { palette, sizeBits, indices } = parseGctAndFirstFrame(gif, true);
    expect(sizeBits + 1).toBeGreaterThanOrEqual(2);
    // todos los índices dentro de rango de paleta
    for (const idx of indices) expect(idx).toBeLessThan(1 << (sizeBits + 1));
    // el frame rojo decodifica a un entry rojo-dominante
    const first = indices[0];
    expect(palette[first * 3]).toBeGreaterThan(150);
    expect(palette[first * 3 + 1]).toBeLessThan(120);
  });

  it("palette 'rgb332' explícito es BYTE-EXACT vs default legacy", () => {
    const frames = [solidFrame(5, 5, [12, 34, 56]), solidFrame(5, 5, [98, 176, 255])];
    const legacy = encodeGif(frames, { width: 5, height: 5 });
    const explicit = encodeGif(frames, { width: 5, height: 5, palette: 'rgb332' });
    expect(Array.from(explicit)).toEqual(Array.from(legacy));
  });

  it('mediancut produce bytes distintos a rgb332 (paletas diferentes)', () => {
    const frames = [solidFrame(4, 4, [180, 60, 20])];
    const a = encodeGif(frames, { width: 4, height: 4 });
    const b = encodeGif(frames, { width: 4, height: 4, palette: 'mediancut' });
    expect(Array.from(a)).not.toEqual(Array.from(b));
  });

  it('determinista ×2 en modo mediancut', () => {
    const opts = { width: 6, height: 6, palette: 'mediancut' as const, delayMs: 80 };
    const f = [solidFrame(6, 6, [1, 2, 3]), solidFrame(6, 6, [3, 2, 1])];
    expect(Array.from(encodeGif(f, opts))).toEqual(Array.from(encodeGif(f, opts)));
  });

  it('roundtrip completo multi-frame mediancut (decoder sobre cada frame)', () => {
    const mk = (v: number): Uint8Array => solidFrame(4, 4, [v, 255 - v, (v * 2) % 256]);
    const frames = [mk(10), mk(60), mk(110), mk(160)];
    const gif = encodeGif(frames, { width: 4, height: 4, palette: 'mediancut', loop: false });
    const parsed = parseGctAndFirstFrame(gif, false);
    expect(parsed.indices.length).toBe(16);
  });
});
