# Plan — iter-92: capability `recordly` (ScreenFlow Studio planner, port of principles)

**Objective (P):** Integrate the Recordly repo (github.com/webadderallorg/Recordly, AGPL-3.0, open-source
screen-recorder + demo-video editor, 21.9k★) into UltraIa per the link-curation/learning protocol, and
port its transferable EDITING PRINCIPLES as an original, deterministic, keyless/offline capability
`recordly` — a ScreenFlow Studio planner that complements the existing `screenflow` + `video_edit` + `vfx`
domains. NOT a copy of Recordly's Electron/PixiJS runtime (license + portability); an original
implementation of its algorithms (auto-zoom from cursor telemetry, cursor-motion presets, webcam-bubble
layout, export dimensions, region-based timeline model, `.recordly`-style project manifest).

**Context:** User: "Continua con todo y adiciona el repositorio." → keep building net-new safe
capabilities AND add this repo. Recordly's editing model maps directly onto UltraIa's screenflow/video
domains. Source README saved to learning/sources/recordly-README.md (documentation only; no AGPL code
copied — original port to respect AGPL-3.0). Grep confirmed no existing `recordly` capability.

**ARCHIVOS A TOCAR:**
- `learning/sources/recordly-README.md` (DONE — copied repo README, attribution).
- `docs/RAZONAMIENTO-RECORDLY.md` (NEW — analysis + implemented/pending mapping).
- `packages/core/src/tools/recordly.ts` (NEW) — original deterministic domain:
  `normalizeCursorTelemetry`, `detectZoomDwellCandidates`, `detectInteractionCandidates`,
  `buildInteractionZoomSuggestions`, `buildClickClusters` (auto-zoom); `CURSOR_MOTION_PRESETS` +
  `resolveCursorMotionPresetId`; `getWebcamPositionForPreset`/`getWebcamOverlayScale`/
  `getWebcamOverlaySizePx`/`getWebcamOverlayPosition`/`normalizeWebcamCropRegion`;
  `calculateMp4ExportDimensions`/`fitAspectRatioWithinBounds`/`normalizeEvenDimension` (export);
  `buildRegionTimeline` (ZoomRegion/ClipRegion/AnnotationRegion/AudioRegion model); `buildRecordlyManifest`.
- `packages/core/src/tools/recordly.test.ts` (NEW) — unit tests for each group.
- `packages/core/src/tools/index.ts` — export `./recordly`, import namespace, tools, TOOL_DESCRIPTIONS, Capability.
- `packages/core/src/ai/llm.ts` — static import + `recordly_plan` tool (actions: zoom|cursor|webcam|export|timeline|manifest).

**RECURSOS/PRESUPUESTO:** core tsc + core tests only. No new deps.
**NO-hacer:** don't copy AGPL source code (original port only); don't touch concurrent #25 WIP; don't stage WIP.
**CRITERIOS scoped:** `npx tsc --noEmit -p packages/core` 0 + `npm run test` (core) green.
**CRITERIOS FULL (commit):** scoped + build unaffected.
**TOLERANCIAS:** fail-soft; deterministic; low false-positive on auto-zoom.
**RIESGOS:** low — pure additive; original code (no AGPL contamination).
**ESFUERZO:** L (larger module, multiple groups).
**PRIORIDAD:** P1.

**Predicción:** gates green; `recordly_plan` returns zoom suggestions for sample telemetry, cursor/webcam/
export/timeline plans, and a deterministic manifest; commit `feat(core): add recordly screenflow-studio planner (port of principles)`.
