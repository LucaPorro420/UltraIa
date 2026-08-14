import { describe, expect, it } from 'vitest';
import {
  addEntity,
  addEvent,
  addRelation,
  createMediaField,
  findEntity,
  parseMediaField,
  removeEntity,
  serializeMediaField,
} from './mediafield';

describe('MediaField schema & serialization', () => {
  it('creates a field with defaults', () => {
    const field = createMediaField();
    expect(field.world_id).toMatch(/^world_\d+$/);
    expect(field.time).toBe(0);
    expect(field.entities).toEqual([]);
    expect(field.camera.movement).toBe('static');
  });

  it('round-trips through JSON serialization', () => {
    const field = createMediaField({ environment: { scene: 'rainy night city' } });
    addEntity(field, { id: 'woman_001', type: 'character', state: { emotion: 'sad' } });
    const parsed = parseMediaField(serializeMediaField(field));
    expect(parsed.environment.scene).toBe('rainy night city');
    expect(parsed.entities[0].id).toBe('woman_001');
    expect(parsed.entities[0].position).toEqual([0, 0, 0]);
  });

  it('addEntity rejects duplicate ids', () => {
    const field = createMediaField();
    addEntity(field, { id: 'a', type: 'object' });
    expect(() => addEntity(field, { id: 'a', type: 'object' })).toThrow(/already exists/);
  });

  it('removeEntity cascades relations and events referencing it', () => {
    const field = createMediaField();
    addEntity(field, { id: 'motorcycle_001', type: 'vehicle', velocity: [1, 0, 0] });
    addEntity(field, { id: 'woman_001', type: 'character' });
    addRelation(field, { source: 'motorcycle_001', relation: 'passing_near', target: 'woman_001' });
    addEvent(field, {
      id: 'event_001',
      type: 'motorcycle_pass',
      start: 4.7,
      duration: 1.8,
      actors: ['motorcycle_001'],
      targets: ['woman_001'],
      effects: ['engine_sound', 'motion'],
    });

    const removed = removeEntity(field, 'motorcycle_001');
    expect(removed).toHaveLength(1);
    expect(field.relations).toHaveLength(0);
    expect(field.events).toHaveLength(0);
    expect(findEntity(field, 'woman_001')).toBeDefined();
  });
});
