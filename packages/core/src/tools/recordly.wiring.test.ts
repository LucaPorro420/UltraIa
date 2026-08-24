import { describe, expect, it } from 'vitest';

import { recordly, TOOL_DESCRIPTIONS, tools } from './index';
import type { Capability } from './index';

describe('recordly — wiring', () => {
  it('descriptor registrado en TOOL_DESCRIPTIONS', () => {
    expect(TOOL_DESCRIPTIONS.recordly).toContain('ScreenFlow Studio planner');
    expect(TOOL_DESCRIPTIONS.recordly).toContain('Deterministic, keyless');
  });

  it('namespace completo expuesto en tools', () => {
    for (const fn of [
      'normalizeCursorTelemetry',
      'detectZoomDwellCandidates',
      'buildInteractionZoomSuggestions',
      'CURSOR_MOTION_PRESETS',
      'resolveCursorMotionPresetId',
      'getWebcamPositionForPreset',
      'normalizeWebcamCropRegion',
      'calculateMp4ExportDimensions',
      'buildRegionTimeline',
      'buildRecordlyManifest',
      'recordlyPlan',
    ]) {
      const member = (recordly as Record<string, unknown>)[fn];
      expect(['function', 'object']).toContain(typeof member);
    }
  });

  it('Capability union acepta recordly y recordlyPlan funciona end-to-end', () => {
    const caps: Capability[] = ['recordly'];
    expect(caps).toContain('recordly');
    const result = recordly.recordlyPlan({
      sourcePath: 'demo.mp4',
      durationMs: 60_000,
      cursorTelemetry: [{ timeMs: 5_000, cx: 0.4, cy: 0.6, interactionType: 'click' }],
    });
    expect(result.zoom.suggestions).toBeInstanceOf(Array);
    const manifest = JSON.parse(result.manifest) as { sourcePath: string };
    expect(manifest.sourcePath).toBe('demo.mp4');
  });

  it('sin colisión de símbolos con screenflow/video_edit vía export *', () => {
    const keys = Object.keys(recordly);
    expect(keys).not.toContain('buildEdl');
    expect(Object.keys(tools)).toContain('recordly');
  });
});
