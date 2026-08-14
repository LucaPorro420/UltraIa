import { describe, expect, it } from 'vitest';
import { CharacterMemory, ErrorMemory, SceneMemory, StyleMemory, WorkingMemory } from './memory';
import { addEntity, createMediaField } from './mediafield';

describe('WorkingMemory', () => {
  it('stores and returns a deep clone of the current field', () => {
    const mem = new WorkingMemory();
    const field = createMediaField({ environment: { scene: 'rain' } });
    mem.set(field);
    field.environment.scene = 'snow';
    expect(mem.get()?.environment.scene).toBe('rain');
    mem.clear();
    expect(mem.get()).toBeNull();
  });
});

describe('CharacterMemory', () => {
  it('keeps identity across scenes', () => {
    const mem = new CharacterMemory();
    const field = createMediaField();
    addEntity(field, { id: 'elena', type: 'character', identity: { name: 'Elena', age: 28 }, state: { emotion: 'sad' } });
    mem.remember(field.entities[0]);
    const recalled = mem.recall('elena');
    expect(recalled?.identity).toEqual({ name: 'Elena', age: 28 });
    expect(mem.ids()).toContain('elena');
  });
});

describe('SceneMemory', () => {
  it('appends scenes chronologically', () => {
    const mem = new SceneMemory();
    mem.push('world_001', 'rainy street', 0);
    mem.push('world_002', 'motorcycle pass', 4.7);
    expect(mem.list()).toHaveLength(2);
    expect(mem.list()[1].time).toBe(4.7);
  });
});

describe('StyleMemory', () => {
  it('merges style patches cumulatively', () => {
    const mem = new StyleMemory();
    mem.merge({ lighting: 'cinematic' });
    mem.merge({ palette: 'cold' });
    expect(mem.get()).toEqual({ lighting: 'cinematic', palette: 'cold' });
  });
});

describe('ErrorMemory', () => {
  it('groups errors by type into patterns', () => {
    const mem = new ErrorMemory();
    mem.record({ errorType: 'identity_drift', scene: 'scene_04', cause: 'weak_character_reference', solution: 'increase_identity_constraint' });
    mem.record({ errorType: 'identity_drift', scene: 'scene_07', cause: 'weak_character_reference', solution: 'increase_identity_constraint' });
    const patterns = mem.patterns();
    expect(patterns).toHaveLength(1);
    expect(patterns[0].count).toBe(2);
  });
});