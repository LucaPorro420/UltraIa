import { describe, expect, it } from 'vitest';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';

import {
  MAX_GIF_FRAMES,
  PngError,
  encodeGif,
  renderImage,
  writeGifAtomic,
} from './pngrender';

const SIG = [0x47, 0x49, 0x46, 0x38, 0x39, 0x61]; // "GIF89a"

/** Frame RGBA sólido. */
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

/**
 * Decoder LZW de GIF MÍNIMO (solo para tests): prueba el roundtrip real del
 * encoder. Reglas spec: códigos variable-width LSB-first, clear/EOI, dict que
 * crece con la misma cadencia que el encoder.
 */
function lzwDecodeGif(data: Uint8Array, minCodeSize: number, expectedLen: number): Uint8Array {
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
      const byteI = bitPos >> 3;
      const bit = (data[byteI] ?? 0) >> (bitPos & 7);
      code |= (bit & 1) << b;
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
    else throw new Error(`código LZW inválido ${code} en posición ${bitPos}`);
    for (const v of entry) out.push(v);
    if (prev) dict.push([...prev, entry[0]]);
    prev = entry;
    if (dict.length >= (1 << size) - 1 && size < 12) size++;
  }
  return Uint8Array.from(out);
}

describe('pngrender — encodeGif (GIF89a animado)', () => {
  it('firma GIF89a + dims LE16 + packed GCT 0xF7', () => {
    const gif = encodeGif([solidFrame(4, 4, [255, 0, 0])], { width: 4, height: 4 });
    expect(Array.from(gif.subarray(0, 6))).toEqual(SIG);
    expect(gif[6] | (gif[7] << 8)).toBe(4);
    expect(gif[8] | (gif[9] << 8)).toBe(4);
    expect(gif[10]).toBe(0xf7); // GCT flag + colorRes 7 + size 7 (256)
    expect(gif[gif.length - 1]).toBe(0x3b); // trailer
  });

  it('paleta RGB332 en offset 13: negro, blanco y primarias exactas', () => {
    const gif = encodeGif([solidFrame(2, 2, [0, 0, 0])], { width: 2, height: 2 });
    const at = (i: number) => Array.from(gif.subarray(13 + i * 3, 16 + i * 3));
    expect(at(0)).toEqual([0, 0, 0]);
    expect(at(255)).toEqual([255, 255, 255]); // r7g7b3
    expect(at((7 << 5))).toEqual([255, 0, 0]);
    expect(at((7 << 2))).toEqual([0, 255, 0]);
    expect(at(3)).toEqual([0, 0, 255]);
  });

  it('NETSCAPE loop presente por defecto y ausente con loop:false', () => {
    const f = solidFrame(2, 2, [10, 20, 30]);
    const withLoop = encodeGif([f], { width: 2, height: 2 });
    const text = Buffer.from(withLoop).toString('latin1');
    expect(text).toContain('NETSCAPE2.0');
    const noLoop = encodeGif([f], { width: 2, height: 2, loop: false });
    expect(Buffer.from(noLoop).toString('latin1')).not.toContain('NETSCAPE2.0');
  });

  it('delay en centisegundos dentro del primer GCE (100ms → 10)', () => {
    const gif = encodeGif([solidFrame(2, 2, [0, 0, 0])], { width: 2, height: 2, delayMs: 100 });
    // tras header(6)+LSD(7)+GCT(768)+NETSCAPE(19) viene 21 F9 04 packed dLo dHi tIdx 00
    const gceOff = 6 + 7 + 768 + 19;
    expect([gif[gceOff], gif[gceOff + 1], gif[gceOff + 2]]).toEqual([0x21, 0xf9, 0x04]);
    expect(gif[gceOff + 4] | (gif[gceOff + 5] << 8)).toBe(10);
  });

  it('un Image Descriptor (0x2C) por frame', () => {
    const frames = [solidFrame(3, 3, [1, 2, 3]), solidFrame(3, 3, [4, 5, 6]), solidFrame(3, 3, [7, 8, 9])];
    const gif = encodeGif(frames, { width: 3, height: 3 });
    let count = 0;
    for (let i = 0; i < gif.length - 1; i++) {
      if (gif[i] === 0x21 && gif[i + 1] === 0xf9) count++;
    }
    expect(count).toBe(3);
  });

  it('ROUNDTRIP REAL: el decoder LZW mínimo recupera los índices exactos', () => {
    const w = 32;
    const h = 32;
    // patrón determinista variado (gradiente + módulo) para estresar el diccionario
    const rgba = new Uint8Array(w * h * 4);
    for (let p = 0; p < w * h; p++) {
      rgba[p * 4] = (p * 37) % 256;
      rgba[p * 4 + 1] = (p * 11) % 256;
      rgba[p * 4 + 2] = (p * 5) % 256;
      rgba[p * 4 + 3] = 255;
    }
    const gif = encodeGif([rgba], { width: w, height: h });
    // localizar Image Descriptor: buscar secuencia 2C 00 00 00 00 (x=0,y=0)
    let off = 13 + 768 + 19; // header+lsd+gct+netscape
    while (!(gif[off] === 0x2c)) off++; // salta NETSCAPE variable ya contada si loop on -> usar loop:false arriba mejor
    void off;
    // reconstrucción determinista sin búsqueda: regenerar con loop:false y offsets fijos
    const gif2 = encodeGif([rgba], { width: w, height: h, loop: false });
    let p = 6 + 7 + 768;
    expect(gif2[p]).toBe(0x21); // GCE
    p += 8; // 21 F9 04 XX dlo dhi ti 00
    expect(gif2[p]).toBe(0x2c); // Image Descriptor
    p += 10; // 2C x4 w4 packed
    const minCodeSize = gif2[p];
    expect(minCodeSize).toBe(8);
    p += 1;
    // concatenar sub-blocks hasta terminador 00
    const lzw: number[] = [];
    while (true) {
      const len = gif2[p++];
      if (len === 0) break;
      for (let i = 0; i < len; i++) lzw.push(gif2[p++]);
    }
    const decoded = lzwDecodeGif(Uint8Array.from(lzw), minCodeSize, w * h);
    expect(decoded.length).toBe(w * h);
    // índices esperados según RGB332
    for (let q = 0; q < w * h; q++) {
      const expectedIdx = ((rgba[q * 4] >> 5) << 5) | ((rgba[q * 4 + 1] >> 5) << 2) | (rgba[q * 4 + 2] >> 6);
      expect(decoded[q]).toBe(expectedIdx);
    }
  });

  it('determinista byte a byte entre llamadas', () => {
    const opts = { width: 8, height: 8, delayMs: 50 };
    const a = encodeGif([solidFrame(8, 8, [9, 9, 9]), solidFrame(8, 8, [90, 90, 90])], opts);
    const b = encodeGif([solidFrame(8, 8, [9, 9, 9]), solidFrame(8, 8, [90, 90, 90])], opts);
    expect(Array.from(a)).toEqual(Array.from(b));
  });

  it('guardas: 0 frames, longitud inconsistente, dims>512, frames>600', () => {
    expect(() => encodeGif([], { width: 4, height: 4 })).toThrow(PngError);
    expect(() =>
      encodeGif([new Uint8Array(4)], { width: 4, height: 4 }),
    ).toThrow(PngError);
    expect(() =>
      encodeGif([solidFrame(2, 2, [0, 0, 0])], { width: 513, height: 4 }),
    ).toThrow(PngError);
    const many = Array.from({ length: MAX_GIF_FRAMES + 1 }, () => solidFrame(2, 2, [0, 0, 0]));
    expect(() => encodeGif(many, { width: 2, height: 2 })).toThrow(PngError);
  });

  it('renderImage→encodeGif integración: frame completo válido', () => {
    const frame = renderImage({ width: 6, height: 6 }, (x, y) => [x * 40, y * 40, 128]).rgba;
    const gif = encodeGif([frame], { width: 6, height: 6 });
    expect(gif.length).toBeGreaterThan(13 + 768 + 25);
  });

  it('writeGifAtomic escribe firma en disco e idempotente', async () => {
    const dir = await mkdtemp(path.join(os.tmpdir(), 'ultraia-gif-'));
    try {
      const file = path.join(dir, 'nested', 'anim.gif');
      const bytes = encodeGif([solidFrame(4, 4, [50, 100, 150])], { width: 4, height: 4 });
      await writeGifAtomic(file, bytes);
      await writeGifAtomic(file, bytes);
      const onDisk = await readFile(file);
      expect(Array.from(onDisk.subarray(0, 6))).toEqual(SIG);
      expect(onDisk.byteLength).toBe(bytes.byteLength);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });
});
