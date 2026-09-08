/**
 * theatre-sequence — Deterministic Animation Sequence Planner (capability `theatre-sequence`)
 *
 * Port ORIGINAL de los PRINCIPIOS de Theatre.js core (Apache-2.0, 12.6k stars):
 *   - Project → Sheet → Sequence → Track → Keyframe → Easing
 *   - JSON determinista testeable (mismo input → mismo output)
 *   - Vocabulario de cámara reutiliza MOTIONS de prompt/director.ts
 *   - Keyless, sin red, sin dependencias externas
 *
 * Fuente: enlaces.txt → learning/sources/web3d-motion.md →
 * docs/RAZONAMIENTO-WEB3D-MOTION.md (decisiones iter-178).
 *
 * @theatre/core (Apache-2.0) se usa SOLO para reproducir en browser via adapter;
 * @theatre/studio (AGPL-3.0) NUNCA entra al bundle de producción.
 */
import { z } from 'zod';
import { MOTIONS } from '../prompt/director';

/* ------------------------------------------------------------------ */
/* Easing presets (portable, no external deps)                         */
/* ------------------------------------------------------------------ */

export const EASING_PRESETS = [
  'linear',
  'easeIn',
  'easeOut',
  'easeInOut',
  'spring',
  'bounce',
  'elastic',
  'steps',
] as const;
export type EasingPreset = (typeof EASING_PRESETS)[number];

/* ------------------------------------------------------------------ */
/* Zod schemas                                                        */
/* ------------------------------------------------------------------ */

export const KeyframeSchema = z.object({
  time: z.number().min(0).max(1),
  value: z.unknown(),
  easing: z.enum(EASING_PRESETS).optional().default('linear'),
  duration: z.number().min(0).optional(),
});
export type Keyframe = z.infer<typeof KeyframeSchema>;

export const TrackSchema = z.object({
  name: z.string().min(1).max(120),
  property: z.string().min(1).max(200),
  keyframes: z.array(KeyframeSchema).min(1),
  interpolation: z.enum(['linear', 'step', 'cubic']).optional().default('linear'),
});
export type Track = z.infer<typeof TrackSchema>;

export const SequenceSchema = z.object({
  name: z.string().min(1).max(120),
  tracks: z.array(TrackSchema).min(1),
  duration: z.number().gt(0).max(600),
  fps: z.number().int().min(1).max(120).default(24),
});
export type Sequence = z.infer<typeof SequenceSchema>;

export const SheetSchema = z.object({
  name: z.string().min(1).max(120),
  sequences: z.array(SequenceSchema).min(1),
});
export type Sheet = z.infer<typeof SheetSchema>;

export const TheatreProjectSchema = z.object({
  name: z.string().min(1).max(200),
  version: z.string().default('1.0.0'),
  sheets: z.array(SheetSchema).min(1),
});
export type TheatreProject = z.infer<typeof TheatreProjectSchema>;

export const PlanOptionsSchema = z.object({
  sheets: z.array(SheetSchema).min(1),
  duration: z.number().gt(0).max(600).default(30),
  fps: z.number().int().min(1).max(120).default(24),
});
export type PlanOptions = z.infer<typeof PlanOptionsSchema>;

export const AddTrackSchema = z.object({
  projectName: z.string(),
  sheetName: z.string(),
  sequenceName: z.string(),
  track: TrackSchema,
});

export const AddKeyframeSchema = z.object({
  projectName: z.string(),
  sheetName: z.string(),
  sequenceName: z.string(),
  trackName: z.string(),
  keyframe: KeyframeSchema,
});

export const PreviewSchema = z.object({
  projectName: z.string(),
});

export const ExportSchema = z.object({
  projectName: z.string(),
  cdnVersion: z.string().default('0.5.0'),
});

/* ------------------------------------------------------------------ */
/* Helpers                                                            */
/* ------------------------------------------------------------------ */

/** Canonical easing name (lowercase, trimmed). */
export function normalizeEasing(e: string): EasingPreset {
  const v = e.toLowerCase().trim().replace(/[\s_]+/g, '');
  const map: Record<string, EasingPreset> = {
    linear: 'linear',
    easein: 'easeIn',
    easeout: 'easeOut',
    easeinout: 'easeInOut',
    spring: 'spring',
    bounce: 'bounce',
    elastic: 'elastic',
    steps: 'steps',
  };
  return map[v] ?? 'linear';
}

/** Check if a motion key is in the canonical MOTIONS vocabulary. */
export function isValidMotion(key: string): boolean {
  return (MOTIONS as readonly string[]).includes(key);
}

/** Sort keyframes by time (in-place). */
export function sortKeyframes(kfs: Keyframe[]): Keyframe[] {
  return [...kfs].sort((a, b) => a.time - b.time);
}

/** Generate a deterministic easing CSS string for preview. */
export function easingToCss(easing: EasingPreset): string {
  const map: Record<EasingPreset, string> = {
    linear: 'linear',
    easeIn: 'cubic-bezier(0.4, 0, 1, 1)',
    easeOut: 'cubic-bezier(0, 0, 0.2, 1)',
    easeInOut: 'cubic-bezier(0.4, 0, 0.2, 1)',
    spring: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
    bounce: 'cubic-bezier(0.68, -0.55, 0.27, 1.55)',
    elastic: 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',
    steps: 'steps(4, end)',
  };
  return map[easing] ?? 'linear';
}

/** Calculate total frame count from duration + fps. */
export function frameCount(duration: number, fps: number): number {
  return Math.ceil(duration * fps);
}

/* ------------------------------------------------------------------ */
/* Core planners                                                      */
/* ------------------------------------------------------------------ */

/**
 * Create a complete theatre project with sheets, sequences, tracks, and keyframes.
 * Deterministic: same input → same JSON output.
 */
export function theatreSequencePlan(
  name: string,
  opts: z.input<typeof PlanOptionsSchema>,
): TheatreProject {
  const parsed = PlanOptionsSchema.parse(opts);
  return TheatreProjectSchema.parse({
    name,
    version: '1.0.0',
    sheets: parsed.sheets,
  });
}

/**
 * Add a track to an existing sequence in a project.
 * Returns a NEW project (immutable).
 */
export function addTrack(
  project: TheatreProject,
  input: z.input<typeof AddTrackSchema>,
): TheatreProject {
  const parsed = AddTrackSchema.parse(input);
  const sheets = project.sheets.map((sheet) => {
    if (sheet.name !== parsed.sheetName) return sheet;
    const sequences = sheet.sequences.map((seq) => {
      if (seq.name !== parsed.sequenceName) return seq;
      return { ...seq, tracks: [...seq.tracks, parsed.track] };
    });
    return { ...sheet, sequences };
  });
  return TheatreProjectSchema.parse({ ...project, sheets });
}

/**
 * Add a keyframe to an existing track in a project.
 * Returns a NEW project (immutable). Keyframes are auto-sorted by time.
 */
export function addKeyframe(
  project: TheatreProject,
  input: z.input<typeof AddKeyframeSchema>,
): TheatreProject {
  const parsed = AddKeyframeSchema.parse(input);
  const sheets = project.sheets.map((sheet) => {
    if (sheet.name !== parsed.sheetName) return sheet;
    const sequences = sheet.sequences.map((seq) => {
      if (seq.name !== parsed.sequenceName) return seq;
      const tracks = seq.tracks.map((track) => {
        if (track.name !== parsed.trackName) return track;
        const keyframes = sortKeyframes([...track.keyframes, parsed.keyframe]);
        return { ...track, keyframes };
      });
      return { ...seq, tracks };
    });
    return { ...sheet, sequences };
  });
  return TheatreProjectSchema.parse({ ...project, sheets });
}

/**
 * Generate a preview JSON structure for playback without @theatre/core.
 * Maps the project into a flat timeline with CSS-ready easing and frame data.
 */
export function previewSequence(
  project: TheatreProject,
  input: z.input<typeof PreviewSchema>,
): Record<string, unknown> {
  const parsed = PreviewSchema.parse(input);
  const proj = project.name !== parsed.projectName
    ? TheatreProjectSchema.parse({ ...project, name: parsed.projectName })
    : project;

  const timeline: Record<string, unknown> = {
    name: proj.name,
    version: proj.version,
    totalFrames: 0,
    sequences: [],
  };

  for (const sheet of proj.sheets) {
    for (const seq of sheet.sequences) {
      const fc = frameCount(seq.duration, seq.fps);
      (timeline.totalFrames as number) = Math.max(timeline.totalFrames as number, fc);
      const seqData: Record<string, unknown> = {
        name: seq.name,
        duration: seq.duration,
        fps: seq.fps,
        frames: fc,
        tracks: seq.tracks.map((track) => ({
          name: track.name,
          property: track.property,
          interpolation: track.interpolation,
          keyframes: track.keyframes.map((kf) => ({
            frame: Math.round(kf.time * fc),
            time: kf.time,
            value: kf.value,
            easing: kf.easing,
            cssTiming: easingToCss(kf.easing ?? 'linear'),
          })),
        })),
      };
      (timeline.sequences as unknown[]).push(seqData);
    }
  }

  return timeline;
}

/**
 * Generate a self-contained HTML file with @theatre/core CDN for playback.
 * Studio (AGPL) is NEVER included in the output.
 */
export function exportToHtml(
  project: TheatreProject,
  input: z.input<typeof ExportSchema>,
): string {
  const parsed = ExportSchema.parse(input);
  const proj = project.name !== parsed.projectName
    ? TheatreProjectSchema.parse({ ...project, name: parsed.projectName })
    : project;

  const cdnBase = `https://unpkg.com/@theatre/core@${parsed.cdnVersion}/dist`;
  const projectJson = JSON.stringify(proj, null, 2);

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${proj.name} — Theatre.js Sequence</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { background: #08080a; color: #e5e5ea; font-family: system-ui, sans-serif; }
    #app { width: 100vw; height: 100vh; position: relative; overflow: hidden; }
    .info { position: fixed; bottom: 16px; left: 16px; font-size: 12px; opacity: 0.5; }
  </style>
</head>
<body>
  <div id="app"></div>
  <div class="info">${proj.name} v${proj.version}</div>
  <script type="importmap">
  { "imports": { "@theatre/core": "${cdnBase}/theatre-core.esm.js" } }
  </script>
  <script type="module">
    import { getProject } from '@theatre/core';
    const projectData = ${projectJson};
    const project = getProject(projectData.name);
    // Note: real playback requires @theatre/core runtime initialization.
    // This export provides the project JSON for adapter consumption.
    console.log('Theatre project loaded:', projectData.name);
  </script>
</body>
</html>`;
}

/* ------------------------------------------------------------------ */
/* Tool handler                                                       */
/* ------------------------------------------------------------------ */

export type TheatreAction =
  | { action: 'plan'; name: string; options: z.input<typeof PlanOptionsSchema> }
  | { action: 'add-track'; input: z.input<typeof AddTrackSchema> & { projectName: string } }
  | { action: 'add-keyframe'; input: z.input<typeof AddKeyframeSchema> & { projectName: string } }
  | { action: 'preview'; projectName: string }
  | { action: 'export'; projectName: string; cdnVersion?: string };

// In-memory project store (persists across calls within same session)
const projects = new Map<string, TheatreProject>();

export function theatreSequenceHandler(input: TheatreAction): Record<string, unknown> {
  switch (input.action) {
    case 'plan': {
      const proj = theatreSequencePlan(input.name, input.options);
      projects.set(proj.name, proj);
      return { ok: true, project: proj, totalTracks: countTracks(proj), totalKeyframes: countKeyframes(proj) };
    }
    case 'add-track': {
      const existing = projects.get(input.input.projectName);
      if (!existing) return { ok: false, error: `Project "${input.input.projectName}" not found` };
      const updated = addTrack(existing, input.input);
      projects.set(updated.name, updated);
      return { ok: true, project: updated };
    }
    case 'add-keyframe': {
      const existing = projects.get(input.input.projectName);
      if (!existing) return { ok: false, error: `Project "${input.input.projectName}" not found` };
      const updated = addKeyframe(existing, input.input);
      projects.set(updated.name, updated);
      return { ok: true, project: updated };
    }
    case 'preview': {
      const existing = projects.get(input.projectName);
      if (!existing) return { ok: false, error: `Project "${input.projectName}" not found` };
      return { ok: true, preview: previewSequence(existing, { projectName: input.projectName }) };
    }
    case 'export': {
      const existing = projects.get(input.projectName);
      if (!existing) return { ok: false, error: `Project "${input.projectName}" not found` };
      const html = exportToHtml(existing, { projectName: input.projectName, cdnVersion: input.cdnVersion ?? '0.5.0' });
      return { ok: true, html, length: html.length };
    }
    default:
      return { ok: false, error: 'Unknown action' };
  }
}

/* ------------------------------------------------------------------ */
/* Stats helpers                                                      */
/* ------------------------------------------------------------------ */

export function countTracks(proj: TheatreProject): number {
  let n = 0;
  for (const sheet of proj.sheets)
    for (const seq of sheet.sequences)
      n += seq.tracks.length;
  return n;
}

export function countKeyframes(proj: TheatreProject): number {
  let n = 0;
  for (const sheet of proj.sheets)
    for (const seq of sheet.sequences)
      for (const track of seq.tracks)
        n += track.keyframes.length;
  return n;
}

/** Clear in-memory project store (for tests). */
export function clearProjects(): void {
  projects.clear();
}
