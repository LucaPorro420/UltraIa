import { describe, expect, it } from 'vitest';

import { PROCVID_DEFAULTS, renderGifBytes, resolveSpec } from './procvid';

describe('procvid — renderGifBytes (GIF nativo sin ffmpeg)', () => {
  const SPEC = {
    animation: 'waves',
    width: 32,
    height: 32,
    fps: 10,
    durationSec: 1,
    outName: 'gif-test',
  } as const;

  it('produce GIF89a con trailer y tamaño razonable', async () => {
    const spec = resolveSpec({ ...SPEC });
    const gif = await renderGifBytes(spec);
    expect(Array.from(gif.subarray(0, 6))).toEqual([0x47, 0x49, 0x46, 0x38, 0x39, 0x61]);
    expect(gif[gif.length - 1]).toBe(0x3b);
    // header+palette(768)+netscape+10 frames comprimidos: > 900 bytes
    expect(gif.byteLength).toBeGreaterThan(900);
  });

  it('determinista byte a byte para la misma spec', async () => {
    const spec = resolveSpec({ ...SPEC });
    const a = await renderGifBytes(spec);
    const b = await renderGifBytes(spec);
    expect(Array.from(a)).toEqual(Array.from(b));
  });

  it('delay default derivado de fps (30fps → ~33ms → 3 centisegundos)', async () => {
    const spec = resolveSpec({ ...SPEC, fps: 30 });
    const gif = await renderGifBytes(spec);
    const gceOff = 6 + 7 + 768 + 19;
    expect([gif[gceOff], gif[gceOff + 1], gif[gceOff + 2]]).toEqual([0x21, 0xf9, 0x04]);
    expect(gif[gceOff + 4] | (gif[gceOff + 5] << 8)).toBe(Math.max(2, Math.round((1000 / 30) / 10)));
  });

  it('respeta delayMs explícito y loop:false', async () => {
    const spec = resolveSpec({ ...SPEC });
    const gif = await renderGifBytes(spec, { delayMs: 250, loop: false });
    const text = Buffer.from(gif).toString('latin1');
    expect(text).not.toContain('NETSCAPE2.0');
    const gceOff = 6 + 7 + 768; // sin NETSCAPE el primer GCE está antes
    expect(gif[gceOff + 4] | (gif[gceOff + 5] << 8)).toBe(25);
  });

  it('usa los guards del encoder vía dims de la spec', async () => {
    // dims impares ya se rechazan en resolveSpec (yuv420p), así que la única vía
    // es una spec válida pequeña — verifica que frameCount del plan == frames GIF
    const spec = resolveSpec({ ...SPEC, durationSec: 0.5 });
    const gif = await renderGifBytes(spec);
    let frames = 0;
    for (let i = 0; i < gif.length - 1; i++) {
      if (gif[i] === 0x21 && gif[i + 1] === 0xf9) frames++;
    }
    expect(frames).toBe(spec.frameCount);
    void PROCVID_DEFAULTS;
  });
});
