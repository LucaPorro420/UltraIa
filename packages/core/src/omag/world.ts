//! WorldTransitionEngine — state mutation for OMAG worlds.
// W_{t+1} = F(W_t, E_t, A_t): applies events to the MediaField, mutating
// entity state based on event params. advanceTime integrates velocity.
// validateState checks for dangling entity references.
import { findEntity, type Entity, type MediaField } from './mediafield';

export interface StateIssue {
  code: string;
  message: string;
  location?: string;
}

export interface TransitionResult {
  field: MediaField;
  applied: string[];
}

export class WorldTransitionEngine {
  /**
   * W_{t+1} = F(W_t, E_t, A_t): aplica un evento al mundo, mutando el estado
   * de las entidades actoras/target según los params del evento.
   */
  static applyEvent(field: MediaField, eventId: string): TransitionResult {
    const event = field.events.find((ev) => ev.id === eventId);
    if (!event) throw new Error(`Event not found: ${eventId}`);
    const applied: string[] = [];

    for (const actorId of event.actors) {
      const entity = findEntity(field, actorId);
      if (!entity) continue;
      entity.state = { ...entity.state, ...(event.params as Record<string, unknown>) };
      applied.push(`state:${actorId}`);
    }
    for (const targetId of event.targets) {
      const entity = findEntity(field, targetId);
      if (!entity) continue;
      entity.state = { ...entity.state, ...(event.params as Record<string, unknown>) };
      applied.push(`state:${targetId}`);
    }
    return { field, applied };
  }

  static advanceTime(field: MediaField, dt: number): MediaField {
    field.time = Math.max(0, field.time + dt);
    for (const entity of field.entities) {
      if (entity.velocity) {
        entity.position = [
          entity.position[0] + entity.velocity[0] * dt,
          entity.position[1] + entity.velocity[1] * dt,
          entity.position[2] + entity.velocity[2] * dt,
        ];
      }
    }
    return field;
  }

  static updateEntity(field: MediaField, id: string, patch: Partial<Entity>): Entity {
    const entity = findEntity(field, id);
    if (!entity) throw new Error(`Entity not found: ${id}`);
    Object.assign(entity, patch);
    return entity;
  }

  static validateState(field: MediaField): StateIssue[] {
    const issues: StateIssue[] = [];
    const entityIds = new Set(field.entities.map((e) => e.id));

    for (const relation of field.relations) {
      if (!entityIds.has(relation.source)) {
        issues.push({
          code: 'dangling_relation_source',
          message: `Relation ${relation.relation} references missing source ${relation.source}`,
          location: relation.source,
        });
      }
      if (!entityIds.has(relation.target)) {
        issues.push({
          code: 'dangling_relation_target',
          message: `Relation ${relation.relation} references missing target ${relation.target}`,
          location: relation.target,
        });
      }
    }
    for (const event of field.events) {
      for (const ref of [...event.actors, ...event.targets]) {
        if (!entityIds.has(ref)) {
          issues.push({
            code: 'dangling_event_ref',
            message: `Event ${event.type} references missing entity ${ref}`,
            location: ref,
          });
        }
      }
    }
    return issues;
  }
}

export function stateHasIssue(field: MediaField, code: string): boolean {
  return WorldTransitionEngine.validateState(field).some((i) => i.code === code);
}