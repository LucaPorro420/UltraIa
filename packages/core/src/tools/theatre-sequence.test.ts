/**
 * theatre-sequence.test.ts — tests for the theatre-sequence capability
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { z } from 'zod';
import {
  theatreSequencePlan,
  addTrack,
  addKeyframe,
  previewSequence,
  exportToHtml,
  normalizeEasing,
  isValidMotion,
  sortKeyframes,
  easingToCss,
  frameCount,
  countTracks,
  countKeyframes,
  clearProjects,
  theatreSequenceHandler,
  EASING_PRESETS,
  KeyframeSchema,
  TrackSchema,
  SequenceSchema,
  TheatreProjectSchema,
  type TheatreProject,
  type Keyframe,
  type Track,
} from './theatre-sequence.js';

/* ------------------------------------------------------------------ */
/* Helpers                                                            */
/* ------------------------------------------------------------------ */

function makeKf(time: number, value: unknown = 1, easing?: string): Keyframe {
  return { time, value, easing: easing as any };
}

function makeTrack(name: string, kfs?: Keyframe[]): z.input<typeof TrackSchema> {
  return {
    name,
    property: 'opacity',
    keyframes: kfs ?? [makeKf(0, 0), makeKf(1, 1)],
    interpolation: 'linear',
  };
}

function makeSimpleProject(name = 'Test'): TheatreProject {
  return theatreSequencePlan(name, {
    sheets: [
      {
        name: 'Main',
        sequences: [
          {
            name: 'Intro',
            tracks: [makeTrack('fadeIn')],
            duration: 5,
            fps: 24,
          },
        ],
      },
    ],
    duration: 5,
    fps: 24,
  });
}

/* ------------------------------------------------------------------ */
/* Tests                                                              */
/* ------------------------------------------------------------------ */

beforeEach(() => {
  clearProjects();
});

describe('EASING_PRESETS', () => {
  it('has 8 presets', () => {
    expect(EASING_PRESETS).toHaveLength(8);
  });
  it('includes linear', () => {
    expect(EASING_PRESETS).toContain('linear');
  });
});

describe('normalizeEasing', () => {
  it('normalizes lowercase', () => {
    expect(normalizeEasing('linear')).toBe('linear');
    expect(normalizeEasing('easein')).toBe('easeIn');
    expect(normalizeEasing('easeOut')).toBe('easeOut');
    expect(normalizeEasing('EASEINOUT')).toBe('easeInOut');
  });
  it('handles spaces and underscores', () => {
    expect(normalizeEasing('ease in')).toBe('easeIn');
    expect(normalizeEasing('ease_in')).toBe('easeIn');
  });
  it('defaults to linear for unknown', () => {
    expect(normalizeEasing('unknown')).toBe('linear');
  });
});

describe('isValidMotion', () => {
  it('validates known motions', () => {
    expect(isValidMotion('zoom-in')).toBe(true);
    expect(isValidMotion('pan-left')).toBe(true);
    expect(isValidMotion('orbiting-shot')).toBe(true);
    expect(isValidMotion('handheld-camera')).toBe(true);
  });
  it('rejects unknown motions', () => {
    expect(isValidMotion('fly-away')).toBe(false);
    expect(isValidMotion('')).toBe(false);
  });
});

describe('sortKeyframes', () => {
  it('sorts by time ascending', () => {
    const kfs = [makeKf(0.5, 5), makeKf(0, 0), makeKf(1, 10)];
    const sorted = sortKeyframes(kfs);
    expect(sorted.map((k) => k.time)).toEqual([0, 0.5, 1]);
  });
  it('does not mutate original', () => {
    const kfs = [makeKf(1, 1), makeKf(0, 0)];
    sortKeyframes(kfs);
    expect(kfs[0].time).toBe(1);
  });
});

describe('easingToCss', () => {
  it('returns valid CSS strings', () => {
    expect(easingToCss('linear')).toBe('linear');
    expect(easingToCss('easeIn')).toContain('cubic-bezier');
    expect(easingToCss('spring')).toContain('cubic-bezier');
    expect(easingToCss('steps')).toBe('steps(4, end)');
  });
});

describe('frameCount', () => {
  it('calculates frames correctly', () => {
    expect(frameCount(5, 24)).toBe(120);
    expect(frameCount(1, 30)).toBe(30);
    expect(frameCount(0.5, 60)).toBe(30);
  });
});

describe('theatreSequencePlan', () => {
  it('creates a valid project', () => {
    const proj = makeSimpleProject();
    expect(proj.name).toBe('Test');
    expect(proj.version).toBe('1.0.0');
    expect(proj.sheets).toHaveLength(1);
    expect(proj.sheets[0].sequences).toHaveLength(1);
    expect(proj.sheets[0].sequences[0].tracks).toHaveLength(1);
  });
  it('is deterministic (same input → same output)', () => {
    const a = makeSimpleProject('Det');
    const b = makeSimpleProject('Det');
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
  });
  it('validates with TheatreProjectSchema', () => {
    const proj = makeSimpleProject();
    expect(() => TheatreProjectSchema.parse(proj)).not.toThrow();
  });
  it('rejects invalid project (no sheets)', () => {
    expect(() =>
      theatreSequencePlan('Bad', { sheets: [], duration: 5 }),
    ).toThrow();
  });
});

describe('addTrack', () => {
  it('adds a track to a sequence', () => {
    const proj = makeSimpleProject();
    const updated = addTrack(proj, {
      projectName: 'Test',
      sheetName: 'Main',
      sequenceName: 'Intro',
      track: makeTrack('scale'),
    });
    expect(updated.sheets[0].sequences[0].tracks).toHaveLength(2);
    expect(updated.sheets[0].sequences[0].tracks[1].name).toBe('scale');
  });
  it('returns new project (immutable)', () => {
    const proj = makeSimpleProject();
    const updated = addTrack(proj, {
      projectName: 'Test',
      sheetName: 'Main',
      sequenceName: 'Intro',
      track: makeTrack('new'),
    });
    expect(proj.sheets[0].sequences[0].tracks).toHaveLength(1);
    expect(updated.sheets[0].sequences[0].tracks).toHaveLength(2);
  });
  it('fails for missing project', () => {
    const proj = makeSimpleProject();
    const result = theatreSequenceHandler({
      action: 'add-track',
      input: {
        projectName: 'Nonexistent',
        sheetName: 'Main',
        sequenceName: 'Intro',
        track: makeTrack('x'),
      },
    });
    expect(result.ok).toBe(false);
  });
});

describe('addKeyframe', () => {
  it('adds a keyframe to a track', () => {
    const proj = makeSimpleProject();
    const updated = addKeyframe(proj, {
      projectName: 'Test',
      sheetName: 'Main',
      sequenceName: 'Intro',
      trackName: 'fadeIn',
      keyframe: makeKf(0.5, 0.5),
    });
    const kfs = updated.sheets[0].sequences[0].tracks[0].keyframes;
    expect(kfs).toHaveLength(3);
  });
  it('sorts keyframes by time after adding', () => {
    const proj = makeSimpleProject();
    const updated = addKeyframe(proj, {
      projectName: 'Test',
      sheetName: 'Main',
      sequenceName: 'Intro',
      trackName: 'fadeIn',
      keyframe: makeKf(0.05, 0.1),
    });
    const kfs = updated.sheets[0].sequences[0].tracks[0].keyframes;
    expect(kfs[0].time).toBe(0);
    expect(kfs[1].time).toBe(0.05);
    expect(kfs[2].time).toBe(1);
  });
});

describe('previewSequence', () => {
  it('generates a preview structure', () => {
    const proj = makeSimpleProject();
    const preview = previewSequence(proj, { projectName: 'Test' });
    expect(preview.name).toBe('Test');
    expect(preview.totalFrames).toBe(120); // 5s * 24fps
    expect((preview.sequences as any[])).toHaveLength(1);
    const seq = (preview.sequences as any[])[0];
    expect(seq.frames).toBe(120);
    expect(seq.tracks).toHaveLength(1);
    expect(seq.tracks[0].keyframes[0].frame).toBe(0);
    expect(seq.tracks[0].keyframes[0].cssTiming).toBe('linear');
  });
});

describe('exportToHtml', () => {
  it('generates self-contained HTML', () => {
    const proj = makeSimpleProject();
    const html = exportToHtml(proj, { projectName: 'Test' });
    expect(html).toContain('<!DOCTYPE html>');
    expect(html).toContain('@theatre/core');
    expect(html).toContain('Test');
    expect(html).toContain('theatre-core.esm.js');
    expect(html).not.toContain('studio');
  });
  it('respects custom CDN version', () => {
    const proj = makeSimpleProject();
    const html = exportToHtml(proj, { projectName: 'Test', cdnVersion: '0.4.0' });
    expect(html).toContain('core@0.4.0');
  });
});

describe('theatreSequenceHandler', () => {
  it('plan action creates project', () => {
    const result = theatreSequenceHandler({
      action: 'plan',
      name: 'Demo',
      options: {
        sheets: [{
          name: 'Main',
          sequences: [{
            name: 'Seq1',
            tracks: [makeTrack('fadeIn')],
            duration: 3,
            fps: 24,
          }],
        }],
        duration: 3,
      },
    });
    expect(result.ok).toBe(true);
    expect((result as any).totalTracks).toBe(1);
    expect((result as any).totalKeyframes).toBe(2);
  });
  it('preview action on nonexistent project fails', () => {
    const result = theatreSequenceHandler({
      action: 'preview',
      projectName: 'Ghost',
    });
    expect(result.ok).toBe(false);
  });
  it('export action returns HTML', () => {
    theatreSequenceHandler({
      action: 'plan',
      name: 'Exp',
      options: {
        sheets: [{
          name: 'S',
          sequences: [{ name: 'Q', tracks: [makeTrack('t')], duration: 1, fps: 24 }],
        }],
        duration: 1,
      },
    });
    const result = theatreSequenceHandler({
      action: 'export',
      projectName: 'Exp',
    });
    expect(result.ok).toBe(true);
    expect((result as any).html).toContain('<!DOCTYPE html>');
  });
  it('unknown action returns error', () => {
    const result = theatreSequenceHandler({ action: 'unknown' } as any);
    expect(result.ok).toBe(false);
  });
});

describe('countTracks / countKeyframes', () => {
  it('counts correctly', () => {
    const proj = makeSimpleProject();
    expect(countTracks(proj)).toBe(1);
    expect(countKeyframes(proj)).toBe(2);
  });
});

describe('Zod schemas', () => {
  it('KeyframeSchema validates valid keyframe', () => {
    expect(() => KeyframeSchema.parse({ time: 0.5, value: 42 })).not.toThrow();
  });
  it('KeyframeSchema rejects time > 1', () => {
    expect(() => KeyframeSchema.parse({ time: 1.5, value: 0 })).toThrow();
  });
  it('TrackSchema requires at least 1 keyframe', () => {
    expect(() => TrackSchema.parse({
      name: 'x', property: 'y', keyframes: [],
    })).toThrow();
  });
  it('SequenceSchema rejects duration 0', () => {
    expect(() => SequenceSchema.parse({
      name: 'x', tracks: [{ name: 't', property: 'p', keyframes: [{ time: 0, value: 0 }] }], duration: 0,
    })).toThrow();
  });
});
