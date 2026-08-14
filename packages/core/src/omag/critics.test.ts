import { describe, expect, it } from 'vitest';
import { addEntity, addEvent, createMediaField } from './mediafield';
import { CausalCritic, fuseCritiques, IdentityCritic, MultimodalCritic, TemporalSyncCritic } from './critics';

function critiqued(name: string, score: number, errors: Array<{ code: string; message: string; location?: string }> = [], recommendations: string[] = []) {
  return { name, critique: { score, errors, recommendations } };
}

describe('TemporalSyncCritic', () => {
  it('scores 1 on a synchronized field', () => {
    const field = createMediaField({ constraints: { durationSec: 10 } });
    addEntity(field, { id: 'moto', type: 'vehicle' });
    addEvent(field, { id: 'e1', type: 'pass', start: 4.7, duration: 1.8, actors: ['moto'], effects: ['engine_sound'] });
    const c = new TemporalSyncCritic().critique({ field, results: [] });
    expect(c.score).toBe(1);
  });

  it('penalizes audio offset', () => {
    const field = createMediaField({ constraints: { durationSec: 10 } });
    addEntity(field, { id: 'moto', type: 'vehicle' });
    addEvent(field, { id: 'e1', type: 'pass', start: 4.7, duration: 1.8, actors: ['moto'], effects: ['engine_sound'], params: { engine_sound_delay: 1.4 } });
    const c = new TemporalSyncCritic().critique({ field, results: [] });
    expect(c.score).toBeLessThan(1);
    expect(c.errors.some((e) => e.code === 'audio_visual_offset')).toBe(true);
  });
});

describe('IdentityCritic', () => {
  it('flags dangling references', () => {
    const field = createMediaField({ events: [{ id: 'e1', type: 'boom', start: 0, actors: ['ghost'], effects: ['sound'] }] });
    const c = new IdentityCritic().critique({ field, results: [] });
    expect(c.score).toBeLessThan(1);
  });
});

describe('CausalCritic', () => {
  it('requires effects on every event', () => {
    const field = createMediaField();
    addEntity(field, { id: 'x', type: 'object' });
    addEvent(field, { id: 'e1', type: 'move', start: 0, actors: ['x'], effects: [] });
    const c = new CausalCritic().critique({ field, results: [] });
    expect(c.score).toBeLessThan(1);
    expect(c.errors[0].code).toBe('event_without_effects');
  });
});

describe('MultimodalCritic', () => {
  it('reports planned modalities that were not produced', () => {
    const field = createMediaField();
    field.metadata.modalities = ['image', 'video', 'music'];
    const c = new MultimodalCritic().critique({
      field,
      results: [{ artifact: {}, metadata: { modality: 'image' }, confidence: 0.8, provenance: 'x' }],
    });
    expect(c.errors.map((e) => e.location)).toEqual(['video', 'music']);
  });
});

describe('fuseCritiques', () => {
  it('computes a weighted overall with dynamic priorities', () => {
    const result = fuseCritiques([
      critiqued('visual', 0.9),
      critiqued('audio', 0.5),
    ]);
    expect(result.overall).toBeCloseTo(0.7, 5);
    expect(result.breakdown.visual).toBe(0.9);
  });

  it('boosts weights when a priority is declared', () => {
    const flat = fuseCritiques([critiqued('visual', 0.9), critiqued('audio', 0.5)]);
    const boosted = fuseCritiques([critiqued('visual', 0.9), critiqued('audio', 0.5)], { priorities: { audio: 3 } });
    expect(boosted.overall).toBeLessThan(flat.overall);
  });

  it('aggregates errors and dedupes recommendations', () => {
    const result = fuseCritiques([
      critiqued('a', 0.4, [{ code: 'x', message: 'boom' }], ['fix it']),
      critiqued('b', 0.9, [], ['fix it']),
    ]);
    expect(result.errors).toHaveLength(1);
    expect(result.recommendations).toEqual(['fix it']);
  });
});