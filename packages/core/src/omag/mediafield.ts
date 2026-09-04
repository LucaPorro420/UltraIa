//! MediaField — the core data model for OMAG worlds.
// Entities have persistent identity, relations form a world graph, and events
// are first-class objects with causal effects. The field serializes to JSON
// and drives the WorldTransitionEngine, Timeline, and Critics.
import { z } from 'zod';
import { safeJsonParseOrThrow } from '../utils/safe-json';

export const vec3Schema = z.tuple([z.number(), z.number(), z.number()]);
export type Vec3 = z.infer<typeof vec3Schema>;

export const entitySchema = z.object({
  id: z.string().min(1),
  type: z.string().min(1),
  identity: z.record(z.string(), z.unknown()).default({}),
  appearance: z.record(z.string(), z.unknown()).default({}),
  personality: z.record(z.string(), z.unknown()).default({}),
  voice: z.record(z.string(), z.unknown()).default({}),
  position: vec3Schema.default([0, 0, 0]),
  rotation: vec3Schema.default([0, 0, 0]),
  velocity: vec3Schema.optional(),
  state: z.record(z.string(), z.unknown()).default({}),
});
export type Entity = z.infer<typeof entitySchema>;

export const relationSchema = z.object({
  source: z.string().min(1),
  relation: z.string().min(1),
  target: z.string().min(1),
  since: z.number().optional(),
});
export type Relation = z.infer<typeof relationSchema>;

export const omagEventSchema = z.object({
  id: z.string().min(1),
  type: z.string().min(1),
  start: z.number().min(0),
  duration: z.number().min(0).default(0),
  actors: z.array(z.string()).default([]),
  targets: z.array(z.string()).default([]),
  effects: z.array(z.string()).default([]),
  params: z.record(z.string(), z.unknown()).default({}),
});
export type OmagEvent = z.infer<typeof omagEventSchema>;

export const cameraSchema = z.object({
  position: vec3Schema.default([0, 0, 0]),
  target: vec3Schema.default([0, 0, 0]),
  lens: z.string().default('35mm'),
  movement: z.string().default('static'),
});
export type CameraState = z.infer<typeof cameraSchema>;

export const styleSchema = z.object({
  visual: z.record(z.string(), z.unknown()).default({}),
  audio: z.record(z.string(), z.unknown()).default({}),
});
export type StyleState = z.infer<typeof styleSchema>;

export const mediaFieldSchema = z.object({
  world_id: z.string().min(1),
  time: z.number().min(0).default(0),
  environment: z.record(z.string(), z.unknown()).default({}),
  entities: z.array(entitySchema).default([]),
  relations: z.array(relationSchema).default([]),
  events: z.array(omagEventSchema).default([]),
  camera: cameraSchema.default({}),
  audio: z.record(z.string(), z.unknown()).default({}),
  style: styleSchema.default({}),
  constraints: z.record(z.string(), z.unknown()).default({}),
  metadata: z.record(z.string(), z.unknown()).default({}),
});
export type MediaField = z.infer<typeof mediaFieldSchema>;

export type MediaFieldInput = z.input<typeof mediaFieldSchema>;
export type OmagEventInput = z.input<typeof omagEventSchema>;

export type Modality = 'image' | 'audio' | 'video' | 'music' | 'vfx' | 'design';

export const MODALITIES: readonly Modality[] = ['image', 'audio', 'video', 'music', 'vfx', 'design'];

let worldCounter = 0;
export function createMediaField(overrides?: Partial<MediaFieldInput>): MediaField {
  worldCounter += 1;
  return mediaFieldSchema.parse({
    world_id: `world_${String(worldCounter).padStart(3, '0')}`,
    ...(overrides ?? {}),
  });
}

export function serializeMediaField(field: MediaField): string {
  return JSON.stringify(field);
}

export function parseMediaField(json: string): MediaField {
  return mediaFieldSchema.parse(safeJsonParseOrThrow(json, 'MediaField JSON'));
}

export function findEntity(field: MediaField, id: string): Entity | undefined {
  return field.entities.find((e) => e.id === id);
}

export function addEntity(field: MediaField, entity: Partial<Entity> & { id: string; type: string }): Entity {
  if (findEntity(field, entity.id)) throw new Error(`Entity already exists: ${entity.id}`);
  const parsed = entitySchema.parse(entity);
  field.entities.push(parsed);
  return parsed;
}

export function removeEntity(field: MediaField, id: string): Entity[] {
  const removed = field.entities.filter((e) => e.id === id);
  if (!removed.length) return [];
  field.entities = field.entities.filter((e) => e.id !== id);
  field.relations = field.relations.filter((r) => r.source !== id && r.target !== id);
  field.events = field.events.filter((ev) => !ev.actors.includes(id) && !ev.targets.includes(id));
  return removed;
}

export function addRelation(field: MediaField, relation: Relation): Relation {
  if (!findEntity(field, relation.source)) throw new Error(`Relation source not found: ${relation.source}`);
  if (!findEntity(field, relation.target)) throw new Error(`Relation target not found: ${relation.target}`);
  const parsed = relationSchema.parse(relation);
  field.relations.push(parsed);
  return parsed;
}

export function addEvent(field: MediaField, event: OmagEventInput): OmagEvent {
  if (field.events.some((ev) => ev.id === event.id)) throw new Error(`Event already exists: ${event.id}`);
  for (const actor of event.actors ?? []) {
    if (!findEntity(field, actor)) throw new Error(`Event actor not found: ${actor}`);
  }
  for (const target of event.targets ?? []) {
    if (!findEntity(field, target)) throw new Error(`Event target not found: ${target}`);
  }
  const parsed = omagEventSchema.parse(event);
  field.events.push(parsed);
  return parsed;
}