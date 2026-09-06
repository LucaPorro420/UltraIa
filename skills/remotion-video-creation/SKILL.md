---
name: remotion-video-creation
description: UltraIa framework for production-grade Remotion video planning and rendering.
---

# Remotion Video Creation

Use this skill whenever the task creates or edits a Remotion composition. The complete
reference rules remain in `vendor/everything-claude-code/skills/remotion-video-creation/`.
The executable framework surface is `@ultraia/core` capability `remotion`.

## Framework contract

- Plan compositions with `planRemotionProject()` before writing JSX.
- Use `buildRemotionStarter()` for a typed `Root.tsx` and composition baseline.
- Use `buildRemotionManifest()` as the deterministic artifact for review and rendering.
- Drive animation with frames (`useCurrentFrame()`), never CSS transitions or Tailwind animations.
- Use Remotion media primitives (`Img`, `Audio`, `Video`, `Sequence`, `Series`, `TransitionSeries`).
- Apply captions and overlays last, validate timings and media metadata, and keep renders reproducible.

## Rule reference

Read the focused files in the vendor skill for 3D, audio, captions, charts, fonts, media
metadata, sequencing, timing, transitions, trimming, and asset handling. The framework
planner encodes the safety-critical subset and leaves actual rendering to a Remotion app.
