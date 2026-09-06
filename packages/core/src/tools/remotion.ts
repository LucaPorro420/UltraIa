/**
 * Remotion framework planner.
 *
 * Encodes the local remotion-video-creation rules as a deterministic domain
 * layer. It plans timelines and emits a small typed starter; actual rendering
 * remains in the Remotion app/runner, never in the core tool.
 */
import { z } from 'zod';

export const REMOTION_PRESETS = ['vertical', 'landscape', 'square'] as const;
export type RemotionPreset = (typeof REMOTION_PRESETS)[number];

const PRESET_DIMENSIONS: Record<RemotionPreset, { width: number; height: number }> = {
  vertical: { width: 1080, height: 1920 },
  landscape: { width: 1920, height: 1080 },
  square: { width: 1080, height: 1080 },
};

export const REMOTION_RULES = Object.freeze([
  'Drive animation from useCurrentFrame and express timing in seconds × fps.',
  'Do not use CSS transitions, CSS animations, or Tailwind animation classes.',
  'Use Composition/Still with JSON-serializable defaultProps and calculateMetadata for dynamic media.',
  'Premount every delayed Sequence and use local frames inside nested sequences.',
  'Account for transition overlap when calculating the final duration.',
  'Use Img for images and staticFile for local assets; never native img/background-image.',
  'Use Audio from @remotion/media for trim, delay, volume, looping, and pitch.',
  'Apply subtitles and overlays last; preserve a clean base render.',
  'Use deterministic interpolation/easing/spring timing for motion.',
  'Validate text measurements and media dimensions before rendering.',
  'Keep captions synchronized to words/phrases and validate imported SRT data.',
  'Use Mediabunny checks for video/audio duration, dimensions, and decodability.',
  'Keep 3D scenes declarative and dispose of Three.js resources correctly.',
  'Prefer local fonts and explicit font loading before text measurement.',
  'Treat render inputs as untrusted and validate project metadata at the boundary.',
] as const);

const transitionSchema = z.object({
  type: z.enum(['fade', 'slide', 'wipe', 'flip', 'clock-wipe']),
  durationSec: z.number().positive().max(10),
});

const sceneSchema = z.object({
  id: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'scene id must be kebab-case').max(64),
  durationSec: z.number().positive().max(300),
  transition: transitionSchema.optional(),
});

export const remotionProjectSchema = z.object({
  id: z.string().min(1).max(100),
  preset: z.enum(REMOTION_PRESETS).default('landscape'),
  width: z.number().int().positive().max(4096).optional(),
  height: z.number().int().positive().max(4096).optional(),
  fps: z.number().int().min(1).max(60).default(30),
  scenes: z.array(sceneSchema).min(1).max(60),
});

export type RemotionProjectInput = z.input<typeof remotionProjectSchema>;
export type RemotionScene = z.infer<typeof sceneSchema>;
export type RemotionTransitionType = NonNullable<RemotionScene['transition']>['type'];
export type RemotionProjectPlan = {
  projectId: string;
  composition: {
    id: string;
    width: number;
    height: number;
    fps: number;
    durationInFrames: number;
  };
  scenes: Array<RemotionScene & { from: number; durationInFrames: number }>;
  transitions: Array<{ type: RemotionTransitionType; durationInFrames: number }>;
};

function slugify(value: string): string {
  return value
    .normalize('NFKD')
    .replace(/[^\w\s-]/g, '')
    .trim()
    .toLowerCase()
    .replace(/[\s_]+/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 64) || 'remotion-project';
}

function secondsToFrames(seconds: number, fps: number): number {
  return Math.max(1, Math.round(seconds * fps));
}

export function planRemotionProject(input: RemotionProjectInput): RemotionProjectPlan {
  const parsed = remotionProjectSchema.parse(input);
  const dimensions = PRESET_DIMENSIONS[parsed.preset];
  const width = parsed.width ?? dimensions.width;
  const height = parsed.height ?? dimensions.height;
  const sceneFrames = parsed.scenes.map((scene) => secondsToFrames(scene.durationSec, parsed.fps));
  const transitions = parsed.scenes.slice(1).flatMap((scene) =>
    scene.transition
      ? [{ type: scene.transition.type, durationInFrames: secondsToFrames(scene.transition.durationSec, parsed.fps) }]
      : [],
  );

  for (let index = 1; index < parsed.scenes.length; index += 1) {
    const transition = parsed.scenes[index].transition;
    if (transition && secondsToFrames(transition.durationSec, parsed.fps) >= sceneFrames[index - 1]) {
      throw new Error(`transition before scene "${parsed.scenes[index].id}" exceeds the previous scene`);
    }
  }

  const overlap = transitions.reduce((total, transition) => total + transition.durationInFrames, 0);
  const durationInFrames = sceneFrames.reduce((total, frames) => total + frames, 0) - overlap;
  let cursor = 0;
  const scenes = parsed.scenes.map((scene, index) => {
    const result = { ...scene, from: cursor, durationInFrames: sceneFrames[index] };
    const nextTransition = parsed.scenes[index + 1]?.transition;
    cursor += sceneFrames[index] - (nextTransition ? secondsToFrames(nextTransition.durationSec, parsed.fps) : 0);
    return result;
  });

  return {
    projectId: slugify(parsed.id),
    composition: { id: slugify(parsed.id), width, height, fps: parsed.fps, durationInFrames },
    scenes,
    transitions,
  };
}

export function buildRemotionStarter(plan: RemotionProjectPlan): {
  rootTsx: string;
  compositionTsx: string;
} {
  const sceneMarkup = plan.scenes.map((scene) =>
    `      <Sequence from={${scene.from}} durationInFrames={${scene.durationInFrames}} premountFor={fps}>\n        <Scene id="${scene.id}" />\n      </Sequence>`,
  ).join('\n');
  return {
    rootTsx: `import { Composition } from 'remotion';\nimport { VideoComposition } from './VideoComposition';\n\nexport const RemotionRoot = () => (\n  <Composition\n    id="${plan.composition.id}"\n    component={VideoComposition}\n    width={${plan.composition.width}}\n    height={${plan.composition.height}}\n    fps={${plan.composition.fps}}\n    durationInFrames={${plan.composition.durationInFrames}}\n  />\n);\n`,
    compositionTsx: `import { Sequence, interpolate, useCurrentFrame, useVideoConfig } from 'remotion';\n\ntype SceneProps = { id: string };\nconst Scene = ({ id }: SceneProps) => <div style={{ color: 'white', fontFamily: 'sans-serif' }}>{id}</div>;\n\nexport const VideoComposition = () => {\n  const frame = useCurrentFrame();\n  const { fps } = useVideoConfig();\n  const opacity = interpolate(frame, [0, fps], [0, 1], { extrapolateRight: 'clamp' });\n  return <div style={{ flex: 1, background: '#08080a', opacity }}>\n${sceneMarkup}\n  </div>;\n};\n`,
  };
}

export function buildRemotionManifest(plan: RemotionProjectPlan) {
  return {
    framework: 'remotion',
    version: 1,
    projectId: plan.projectId,
    composition: plan.composition,
    scenes: plan.scenes,
    transitions: plan.transitions,
    rules: [...REMOTION_RULES],
  };
}

export const remotion = {
  plan: planRemotionProject,
  starter: buildRemotionStarter,
  manifest: buildRemotionManifest,
};
