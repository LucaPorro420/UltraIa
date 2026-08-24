import { describe, expect, it } from 'vitest';

import { TOOL_DESCRIPTIONS, tools } from './index';
import type { Capability } from './index';

describe('pngrender — wiring', () => {
  it('descriptor registrado en TOOL_DESCRIPTIONS', () => {
    expect(TOOL_DESCRIPTIONS.pngrender).toContain('Procedural PNG renderer');
    expect(TOOL_DESCRIPTIONS.pngrender).toContain('byte-identical');
  });

  it('miembros exportados vía export * (sin namespace colisionante)', async () => {
    const m = await import('./pngrender');
    for (const fn of ['encodePng', 'renderImage', 'renderImagePng', 'valuesToRgba', 'samplePalette', 'hslToRgb', 'crc32', 'writePngAtomic']) {
      expect(typeof (m as Record<string, unknown>)[fn]).toBe('function');
    }
    for (const p of ['PALETTES', 'PALETTE_NAMES', 'MAX_DIMENSION', 'PngError']) {
      expect((m as Record<string, unknown>)[p]).toBeDefined();
    }
    // PngRenderResult es un tipo: verificado por tsc, no en runtime.
  });

  it('Capability union acepta pngrender y renderImagePng produce PNG real', async () => {
    const caps: Capability[] = ['pngrender'];
    expect(caps).toContain('pngrender');
    const { renderImagePng } = await import('./pngrender');
    const png = renderImagePng({ width: 4, height: 4 }, () => [1, 2, 3]);
    expect(png[0]).toBe(137);
    expect(png[1]).toBe(80); // 'P'
  });

  it('tool png_render registrada en el objeto tools', () => {
    expect(Object.keys(tools)).toContain('pngrender');
  });
});
