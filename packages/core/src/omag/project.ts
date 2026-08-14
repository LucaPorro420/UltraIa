/**
 * Long-form OMAG scaffolding — MVP-0.3 base (from AUDIO/VIDEO/MVPModify.txt).
 *
 * Adds the hierarchical structure Project → Act → Sequence → Scene → Shot plus
 * MasterTimeline, WorldCheckpoint and LongTermMemory. This is the foundation for
 * producing works of arbitrary duration without redoing the core: each Shot is a
 * ~5-10s render unit, scenes share world/character/style memory, and checkpoints
 * allow selective regeneration from any minute.
 *
 * The existing orchestrator keeps working untouched; this module only ADDS the
 * long-horizon data model.
 */

import { z } from 'zod';
import type { Entity, MediaField } from './mediafield';

export const shotSchema = z.object({
  id: z.string().min(1),
  /** Seconds. The render unit (~5-10s). */
  duration: z.number().min(0).default(5),
  /** Camera movement from the director vocabulary (director.ts MOTIONS). */
  motion: z.string().default('zoom-in'),
  /** Prompt fragment: subject + action + camera + light + style. */
  prompt: z.string().default(''),
  /** MediaField snapshot/seed for this shot (optional). */
  fieldRef: z.string().optional(),
});
export type Shot = z.infer<typeof shotSchema>;

export const sceneSchema = z.object({
  id: z.string().min(1),
  summary: z.string().default(''),
  shots: z.array(shotSchema).default([]),
  /** Shared world/character/style state for the whole scene. */
  worldStateRef: z.string().optional(),
});
export type Scene = z.infer<typeof sceneSchema>;

export const sequenceSchema = z.object({
  id: z.string().min(1),
  summary: z.string().default(''),
  scenes: z.array(sceneSchema).default([]),
});
export type Sequence = z.infer<typeof sequenceSchema>;

export const actSchema = z.object({
  id: z.string().min(1),
  name: z.string().default(''),
  sequences: z.array(sequenceSchema).default([]),
});
export type Act = z.infer<typeof actSchema>;

export const projectSchema = z.object({
  id: z.string().min(1),
  title: z.string().default('Untitled OMAG project'),
  language: z.string().default('es'),
  acts: z.array(actSchema).default([]),
  createdAt: z.string().default(() => new Date().toISOString()),
});
export type OmagProject = z.infer<typeof projectSchema>;

/** Master timeline — single synchronized clock for video/audio/events. */
export const masterTimelineSchema = z.object({
  projectId: z.string().min(1),
  /** Total duration in seconds (composition target). */
  durationSec: z.number().min(0).default(0),
  tracks: z
    .object({
      video: z.array(z.object({ start: z.number(), end: z.number(), shotId: z.string() })).default([]),
      dialogue: z
        .array(z.object({ start: z.number(), end: z.number(), text: z.string(), voice: z.string().optional() }))
        .default([]),
      music: z.array(z.object({ start: z.number(), end: z.number(), url: z.string().optional() })).default([]),
      sfx: z.array(z.object({ start: z.number(), end: z.number(), kind: z.string() })).default([]),
    })
    .default({}),
  /** Sync issues: any offset between audio and video tracks > 0.1s. */
  issues: z.array(z.string()).default([]),
});
export type MasterTimeline = z.infer<typeof masterTimelineSchema>;

export function createMasterTimeline(projectId: string): MasterTimeline {
  return masterTimelineSchema.parse({ projectId });
}

export function checkTimelineSync(timeline: MasterTimeline): string[] {
  const issues: string[] = [];
  const clips = timeline.tracks.video;
  for (const d of timeline.tracks.dialogue) {
    const overlap = clips.find((c) => c.start < d.end && d.start < c.end);
    if (overlap && Math.abs(overlap.start - d.start) > 0.1) {
      issues.push(
        `dialogue "${d.text.slice(0, 20)}…" starts ${(d.start - overlap.start).toFixed(2)}s off from its shot`,
      );
    }
  }
  return issues;
}

export const checkpointSchema = z.object({
  id: z.string().min(1),
  projectId: z.string().min(1),
  /** Time in seconds this checkpoint freezes. */
  timeSec: z.number().min(0),
  /** Serialized MediaField world state at this moment. */
  world: z.record(z.string(), z.unknown()),
  /** Character memory snapshot (id → snapshot). */
  characters: z.record(z.string(), z.record(z.string(), z.unknown())),
  /** Scene summaries up to this point. */
  scenes: z.array(z.object({ id: z.string(), summary: z.string(), time: z.number() })),
  style: z.record(z.string(), z.unknown()).default({}),
  createdAt: z.string().default(() => new Date().toISOString()),
});
export type WorldCheckpoint = z.infer<typeof checkpointSchema>;

export interface CheckpointStore {
  save(cp: WorldCheckpoint): void;
  get(id: string): WorldCheckpoint | undefined;
  latestBefore(timeSec: number): WorldCheckpoint | undefined;
  list(): WorldCheckpoint[];
}

/** In-memory checkpoint store (swap for a disk/DB store later). */
export class MemoryCheckpointStore implements CheckpointStore {
  private cps: WorldCheckpoint[] = [];

  save(cp: WorldCheckpoint): void {
    const existing = this.cps.findIndex((c) => c.id === cp.id);
    if (existing >= 0) this.cps[existing] = cp;
    else this.cps.push(cp);
  }

  get(id: string): WorldCheckpoint | undefined {
    return this.cps.find((c) => c.id === id);
  }

  latestBefore(timeSec: number): WorldCheckpoint | undefined {
    const before = this.cps.filter((c) => c.timeSec <= timeSec);
    if (!before.length) return undefined;
    return before.reduce((a, b) => (b.timeSec > a.timeSec ? b : a));
  }

  list(): WorldCheckpoint[] {
    return [...this.cps];
  }
}

/** Build a checkpoint from a MediaField + character snapshots. */
export function checkpointFromField(
  id: string,
  projectId: string,
  timeSec: number,
  field: MediaField,
  characters: Record<string, Record<string, unknown>>,
  style: Record<string, unknown>,
): WorldCheckpoint {
  return checkpointSchema.parse({
    id,
    projectId,
    timeSec,
    world: JSON.parse(JSON.stringify(field)),
    characters,
    scenes: [],
    style,
  });
}

/** Long-horizon memory — decisions from minute 1 can affect minute 9. */
export class LongTermMemory {
  constructor(
    readonly checkpoints: CheckpointStore = new MemoryCheckpointStore(),
    readonly characters = new Map<string, Record<string, unknown>>(),
    readonly scenes = new Map<string, string>(),
    readonly style: Record<string, unknown> = {},
  ) {}

  rememberCharacter(entity: Entity): void {
    this.characters.set(entity.id, {
      identity: entity.identity,
      appearance: entity.appearance,
      personality: entity.personality,
      voice: entity.voice,
      state: entity.state,
    });
  }

  recallCharacter(id: string): Record<string, unknown> | undefined {
    return this.characters.get(id);
  }

  rememberScene(sceneId: string, summary: string): void {
    this.scenes.set(sceneId, summary);
  }

  /** Restore the closest world state before `timeSec` to regenerate a segment. */
  restoreBefore(timeSec: number): WorldCheckpoint | undefined {
    return this.checkpoints.latestBefore(timeSec);
  }
}

/** Helpers to build a long-form project incrementally. */
export const project = {
  create(title: string, language = 'es'): OmagProject {
    return projectSchema.parse({ id: `proj_${Date.now().toString(36)}`, title, language });
  },
  addAct(p: OmagProject, name: string): Act {
    const act = actSchema.parse({ id: `act_${p.acts.length + 1}`, name });
    p.acts.push(act);
    return act;
  },
  addSequence(act: Act, summary: string): Sequence {
    const seq = sequenceSchema.parse({ id: `seq_${act.sequences.length + 1}`, summary });
    act.sequences.push(seq);
    return seq;
  },
  addScene(seq: Sequence, summary: string): Scene {
    const scene = sceneSchema.parse({ id: `scn_${seq.scenes.length + 1}`, summary });
    seq.scenes.push(scene);
    return scene;
  },
  addShot(scene: Scene, prompt: string, opts?: { duration?: number; motion?: string }): Shot {
    const shot = shotSchema.parse({
      id: `shot_${scene.shots.length + 1}`,
      prompt,
      duration: opts?.duration ?? 5,
      motion: opts?.motion ?? 'zoom-in',
    });
    scene.shots.push(shot);
    return shot;
  },
};