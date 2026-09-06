import { describe, expect, it } from 'vitest';

import {
  REMOTION_RULES,
  buildRemotionManifest,
  buildRemotionStarter,
  planRemotionProject,
} from './remotion';

describe('remotion framework', () => {
  it('applies the vertical preset and computes frames from seconds', () => {
    const plan = planRemotionProject({
      id: 'Travel Reel',
      preset: 'vertical',
      scenes: [
        { id: 'intro', durationSec: 2 },
        { id: 'outro', durationSec: 3, transition: { type: 'fade', durationSec: 0.5 } },
      ],
    });

    expect(plan.composition).toEqual({
      id: 'travel-reel',
      width: 1080,
      height: 1920,
      fps: 30,
      durationInFrames: 135,
    });
    expect(plan.scenes[1].from).toBe(45);
    expect(plan.scenes[1].durationInFrames).toBe(90);
  });

  it('subtracts transition overlap once from the total duration', () => {
    const plan = planRemotionProject({
      id: 'Demo',
      fps: 30,
      scenes: [
        { id: 'a', durationSec: 2 },
        { id: 'b', durationSec: 2, transition: { type: 'slide', durationSec: 1 } },
        { id: 'c', durationSec: 2, transition: { type: 'wipe', durationSec: 0.5 } },
      ],
    });

    expect(plan.composition.durationInFrames).toBe(135);
    expect(plan.transitions).toEqual([
      { type: 'slide', durationInFrames: 30 },
      { type: 'wipe', durationInFrames: 15 },
    ]);
  });

  it('rejects unsafe transition durations and invalid scene ids', () => {
    expect(() =>
      planRemotionProject({
        id: 'Demo',
        scenes: [{ id: 'bad id', durationSec: 1 }],
      }),
    ).toThrow(/scene id/);
    expect(() =>
      planRemotionProject({
        id: 'Demo',
        scenes: [
          { id: 'a', durationSec: 1 },
          { id: 'b', durationSec: 1, transition: { type: 'fade', durationSec: 2 } },
        ],
      }),
    ).toThrow(/transition/);
  });

  it('generates a deterministic starter and manifest without timestamps', () => {
    const plan = planRemotionProject({
      id: 'Starter',
      preset: 'square',
      scenes: [{ id: 'hello', durationSec: 1 }],
    });
    const starter = buildRemotionStarter(plan);
    const manifest = buildRemotionManifest(plan);

    expect(starter.rootTsx).toContain('<Composition');
    expect(starter.compositionTsx).toContain('useCurrentFrame');
    expect(starter.compositionTsx).toContain('interpolate');
    expect(JSON.stringify(manifest)).not.toMatch(/20\d\d-/);
    expect(manifest.rules).toHaveLength(REMOTION_RULES.length);
  });
});
