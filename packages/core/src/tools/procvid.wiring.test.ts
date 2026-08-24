import { describe, expect, it } from 'vitest';

import { procvid, TOOL_DESCRIPTIONS } from './index';
import type { Capability } from './index';

describe('procvid — wiring', () => {
  it('descriptor registrado en TOOL_DESCRIPTIONS', () => {
    expect(TOOL_DESCRIPTIONS.procvid).toContain('Procedural video library');
    expect(TOOL_DESCRIPTIONS.procvid).toContain('fractal-zoom');
  });

  it('namespace completo expuesto', () => {
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
      expect(procvid[fn as keyof typeof procvid]).toBeDefined();
    }
  });

  it('Capability union acepta procvid y el plan argv es estable', () => {
    const caps: Capability[] = ['procvid'];
    expect(caps).toContain('procvid');
    const spec = procvid.resolveSpec({
      animation: 'waves',
      width: 32,
      height: 32,
      fps: 10,
      durationSec: 1,
    });
    const plan = procvid.planProcVid(spec, {});
    expect(plan.ffmpegArgv[0]).toBe('ffmpeg');
    expect(plan.frameCount).toBe(10);
  });
});
