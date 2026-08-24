import { describe, expect, it } from 'vitest';

import { TOOL_DESCRIPTIONS, tools } from './index';
import type { Capability } from './index';

describe('procvid — wiring', () => {
  it('descriptor registrado en TOOL_DESCRIPTIONS', () => {
    expect(TOOL_DESCRIPTIONS.procvid).toContain('Procedural video library');
    expect(TOOL_DESCRIPTIONS.procvid).toContain('fractal-zoom');
  });

  it('miembros exportados vía export *', async () => {
    const m = await import('./procvid');
    for (const fn of [
      'PROCVID_ANIMATIONS',
      'resolveSpec',
      'framePixelFn',
      'planProcVid',
      'renderFramePng',
      'renderFrames',
      'buildRenderScript',
      'writeManifest',
    ]) {
      expect(m[fn as keyof typeof m]).toBeDefined();
    }
  });

  it('Capability union acepta procvid y el plan argv es estable', async () => {
    const caps: Capability[] = ['procvid'];
    expect(caps).toContain('procvid');
    const { resolveSpec, planProcVid } = await import('./procvid');
    const spec = resolveSpec({
      animation: 'waves',
      width: 32,
      height: 32,
      fps: 10,
      durationSec: 1,
    });
    const plan = planProcVid(spec, {});
    expect(plan.ffmpegArgv[0]).toBe('ffmpeg');
    expect(plan.frameCount).toBe(10);
  });

  it('tool procvid_render registrada en el objeto tools', () => {
    expect(Object.keys(tools)).toContain('procvid');
  });
});
