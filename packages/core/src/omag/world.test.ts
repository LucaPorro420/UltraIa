import { describe, expect, it } from 'vitest';
import { addEntity, addEvent, createMediaField } from './mediafield';
import { stateHasIssue, WorldTransitionEngine } from './world';

describe('WorldTransitionEngine', () => {
  it('advanceTime integrates velocity into position', () => {
    const field = createMediaField();
    addEntity(field, { id: 'motorcycle_001', type: 'vehicle', velocity: [8.4, 0, 0] });
    WorldTransitionEngine.advanceTime(field, 2);
    expect(field.time).toBe(2);
    expect(field.entities[0].position).toEqual([16.8, 0, 0]);
  });

  it('applyEvent mutates entity state from event params', () => {
    const field = createMediaField();
    addEntity(field, { id: 'woman_001', type: 'character', state: { emotion: 'calm' } });
    addEvent(field, {
      id: 'event_001',
      type: 'motorcycle_pass',
      start: 4.7,
      duration: 1.8,
      actors: ['woman_001'],
      effects: ['motion'],
      params: { emotion: 'startled' },
    });
    const { applied } = WorldTransitionEngine.applyEvent(field, 'event_001');
    expect(applied).toContain('state:woman_001');
    expect(field.entities[0].state.emotion).toBe('startled');
  });

  it('validateState flags dangling references and updateEntity patches', () => {
    const field = createMediaField({
      events: [{ id: 'e1', type: 'boom', start: 0, actors: ['ghost'], effects: ['sound'] }],
    });
    addEntity(field, { id: 'a', type: 'object' });
    const issues = WorldTransitionEngine.validateState(field);
    expect(issues.some((i) => i.code === 'dangling_event_ref')).toBe(true);
    expect(stateHasIssue(field, 'dangling_event_ref')).toBe(true);

    WorldTransitionEngine.updateEntity(field, 'a', { state: { broken: true } });
    expect(field.entities[0].state.broken).toBe(true);
    expect(() => WorldTransitionEngine.updateEntity(field, 'nope', {})).toThrow(/not found/);
  });
});
