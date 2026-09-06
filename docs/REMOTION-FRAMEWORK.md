# UltraIa Remotion Framework

UltraIa now exposes the Remotion video-creation rules as a reusable planning
capability instead of treating them as prompt-only guidance.

## What is included

- `planRemotionProject()` validates a composition spec and normalizes it into
  deterministic frames.
- Presets: `vertical` (1080x1920), `landscape` (1920x1080), and `square`
  (1080x1080).
- Scene timelines account for transition overlap exactly once, matching
  `TransitionSeries` duration semantics.
- `buildRemotionStarter()` emits a typed `Root.tsx` and composition baseline
  driven by `useCurrentFrame()` and `interpolate()`.
- `buildRemotionManifest()` emits a reviewable, timestamp-free artifact with
  the production rules.
- The `remotion` agent capability exposes the same planner as
  `remotion_plan`.

## Core usage

```ts
import {
  buildRemotionManifest,
  buildRemotionStarter,
  planRemotionProject,
} from '@ultraia/core';

const plan = planRemotionProject({
  id: 'Product Reel',
  preset: 'vertical',
  fps: 30,
  scenes: [
    { id: 'hook', durationSec: 2 },
    { id: 'proof', durationSec: 4, transition: { type: 'fade', durationSec: 0.5 } },
    { id: 'cta', durationSec: 2, transition: { type: 'slide', durationSec: 0.4 } },
  ],
});

const files = buildRemotionStarter(plan);
const manifest = buildRemotionManifest(plan);
```

The planner is intentionally independent of the rendering runtime. A Remotion
application consumes the generated starter, adds the actual scenes/assets, and
renders with the normal Remotion CLI or server renderer.

## Production rules encoded

The framework enforces the high-risk rules from
`vendor/everything-claude-code/skills/remotion-video-creation/`: frame-driven
animation, no CSS animation, premounted sequencing, correct transition math,
Remotion media primitives, deterministic timing, metadata validation, captions
as a final layer, and safe input validation.

For detailed examples, read the focused rule files in that vendor skill:
audio, assets, captions, charts, 3D, fonts, media metadata, sequencing,
timing, transitions, trimming, and text animation.

## Rendering boundary

The core capability plans and generates source; it does not execute a browser
render or arbitrary ffmpeg command. Rendering belongs in the Remotion app or a
runner with its own dependency and resource policy.
