import { describe, expect, it } from 'vitest';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';

import {
  MAX_DIMENSION,
  PALETTES,
  PALETTE_NAMES,
  PngError,
  crc32,
  encodePng,
  hslToRgb,
  renderImage,
  renderImagePng,
  samplePalette,
  valuesToRgba,
  writePngAtomic,
} from './pngrender';

const SIG = [137, 80, 78, 71, 13, 10, 26, 10];

function solid(w: number, h: number): Uint8Array {
  const a = new Uint8Array(w * h * 4);
  for (let i = 0; i < w * h; i++) {
    a[i * 4] = 200;
    a[i * 4 + 1] = 100;
    a[i * 4 + 2] = 50;
    a[i * 4 + 3] = 255;
  }
  return a;
}

describe('pngrender — crc32', () => {
  it('valor canónico IEEE: "123456789" → 0xCBF43926', () => {
    const bytes = new TextEncoder().encode('123456789');
    expect(crc32(bytes)).toBe(0xcbf43926);
  });

  it('determinista y sensible a la entrada', () => {
    expect(crc32(new Uint8Array([1, 2, 3]))).toBe(crc32(new Uint8Array([1, 2, 3])));
    expect(crc32(new Uint8Array([1, 2, 3]))).not.toBe(crc32(new Uint8Array([1, 2, 4])));
  });
});

describe('pngrender — encodePng', () => {
  it('firma PNG correcta', () => {
    const png = encodePng({ width: 2, height: 2, rgba: solid(2, 2) });
    expect(Array.from(png.subarray(0, 8))).toEqual(SIG);
  });

  it('IHDR: dimensiones BE32, bit depth 8, color type 6', () => {
    const png = encodePng({ width: 7, height: 3, rgba: solid(7, 3) });
    const view = new DataView(png.buffer, png.byteOffset, png.byteLength);
    // sig(8) + len(4) + 'IHDR'(4) → datos en offset 16
    expect(view.getUint32(16)).toBe(7);
    expect(view.getUint32(20)).toBe(3);
    expect(png[24]).toBe(8);
    expect(png[25]).toBe(6);
  });

  it('estructura de chunks válida con CRC auto-consistente', () => {
    const png = encodePng({ width: 4, height: 4, rgba: solid(4, 4) });
    const types: string[] = [];
    let off = 8;
    while (off < png.length - 8) {
      const len = (png[off] << 24) | (png[off + 1] << 16) | (png[off + 2] << 8) | png[off + 3];
      const type = String.fromCharCode(png[off + 4], png[off + 5], png[off + 6], png[off + 7]);
      types.push(type);
      // El CRC cubre type(4) + data(len)
      const crcInput = png.subarray(off + 4, off + 8 + len);
      const stored =
        ((png[off + 8 + len] << 24) |
          (png[off + 9 + len] << 16) |
          (png[off + 10 + len] << 8) |
          png[off + 11 + len]) >>>
        0;
      expect(stored).toBe(crc32(crcInput));
      off += 12 + len;
    }
    expect(types).toEqual(['IHDR', 'IDAT', 'IEND']);
  });

  it('determinista byte a byte entre llamadas', () => {
    const spec = { width: 16, height: 16, rgba: solid(16, 16) };
    expect(Array.from(encodePng(spec))).toEqual(Array.from(encodePng(spec)));
  });

  it('rechaza longitud rgba incorrecta, dims inválidas y exceso de tamaño', () => {
    expect(() => encodePng({ width: 2, height: 2, rgba: new Uint8Array(3) })).toThrow(PngError);
    expect(() => encodePng({ width: 0, height: 2, rgba: new Uint8Array(0) })).toThrow(PngError);
    expect(() => encodePng({ width: 1.5, height: 2, rgba: new Uint8Array(12) })).toThrow(PngError);
    expect(() =>
      encodePng({ width: MAX_DIMENSION + 1, height: 1, rgba: new Uint8Array((MAX_DIMENSION + 1) * 4) }),
    ).toThrow(PngError);
  });
});

describe('pngrender — renderImage / renderImagePng', () => {
  it('pasa coordenadas exactas y produce alpha opaco por defecto', () => {
    const seen: Array<[number, number]> = [];
    const r = renderImage({ width: 3, height: 2 }, (x, y) => {
      seen.push([x, y]);
      return [x * 80, y * 100, 7];
    });
    expect(seen).toHaveLength(6);
    expect(seen[0]).toEqual([0, 0]);
    expect(seen[5]).toEqual([2, 1]);
    expect(r.rgba[3]).toBe(255); // alpha default
    expect(r.rgba[(1 * 3 + 2) * 4]).toBe(160); // x=2 → 160
  });

  it('acepta tuplas de 4 canales y satura valores fuera de rango', () => {
    const r = renderImage({ width: 1, height: 1 }, () => [-20, 999.6, 10, 128]);
    expect(Array.from(r.rgba)).toEqual([0, 255, 10, 128]);
  });

  it('renderImagePng produce bytes con firma PNG', () => {
    const png = renderImagePng({ width: 2, height: 2 }, () => [1, 2, 3]);
    expect(Array.from(png.subarray(0, 8))).toEqual(SIG);
  });
});

describe('pngrender — paletas y HSL', () => {
  it('las 5 paletas existen con >= 2 stops', () => {
    expect([...PALETTE_NAMES].sort()).toEqual(['fire', 'ice', 'mono', 'neoViolet', 'obsidian'].sort());
    for (const name of PALETTE_NAMES) expect(PALETTES[name].length).toBeGreaterThanOrEqual(2);
  });

  it('samplePalette: extremos exactos e interpolación media', () => {
    expect(samplePalette('obsidian', 0)).toEqual([8, 8, 10]);
    expect(samplePalette('obsidian', 1)).toEqual([237, 233, 254]);
    expect(samplePalette('mono', 0.5)).toEqual([128, 128, 128]);
    // fuera de rango se satura
    expect(samplePalette('mono', -3)).toEqual([0, 0, 0]);
    expect(samplePalette('mono', 9)).toEqual([255, 255, 255]);
  });

  it('paleta desconocida lanza PngError con lista válida', () => {
    expect(() => samplePalette('nope', 0.5)).toThrow(/paleta desconocida/);
  });

  it('hslToRgb: primarias puras', () => {
    expect(hslToRgb(0, 1, 0.5)).toEqual([255, 0, 0]);
    expect(hslToRgb(120, 1, 0.5)).toEqual([0, 255, 0]);
    expect(hslToRgb(240, 1, 0.5)).toEqual([0, 0, 255]);
    expect(hslToRgb(360 + 60, 1, 0.5)).toEqual(hslToRgb(60, 1, 0.5));
  });
});

describe('pngrender — valuesToRgba (puente generative)', () => {
  it('mapea v=0 → primer stop y v=1 → último stop; satura fuera de rango', () => {
    const values = new Float32Array([0, 1, -5, 42]);
    const rgba = valuesToRgba(values, 2, 2, 'mono');
    expect(Array.from(rgba.subarray(0, 4))).toEqual([0, 0, 0, 255]);
    expect(Array.from(rgba.subarray(4, 8))).toEqual([255, 255, 255, 255]);
    expect(Array.from(rgba.subarray(8, 12))).toEqual([0, 0, 0, 255]);
    expect(Array.from(rgba.subarray(12, 16))).toEqual([255, 255, 255, 255]);
  });

  it('longitud inconsistente lanza PngError', () => {
    expect(() => valuesToRgba(new Float32Array(3), 2, 2, 'ice')).toThrow(PngError);
  });
});

describe('pngrender — writePngAtomic', () => {
  it('escribe un PNG real (firma en disco), crea directorios y es idempotente', async () => {
    const dir = await mkdtemp(path.join(os.tmpdir(), 'ultraia-png-'));
    try {
      const file = path.join(dir, 'nested', 'out.png');
      const bytes = renderImagePng({ width: 8, height: 8 }, () => [10, 20, 30]);
      await writePngAtomic(file, bytes);
      await writePngAtomic(file, bytes); // overwrite idempotente
      const onDisk = await readFile(file);
      expect(Array.from(onDisk.subarray(0, 8))).toEqual(SIG);
      expect(onDisk.byteLength).toBe(bytes.byteLength);
      expect(Array.from(onDisk)).toEqual(Array.from(bytes));
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });
});
