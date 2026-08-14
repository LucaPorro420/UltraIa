import { describe, expect, it } from 'vitest';
import { addEntity, addEvent, createMediaField } from './mediafield';
import { alignEffectsToCause, buildTimeline, checkSynchronization, findEventsAt } from './timeline';

describe('Timeline', () => {
  it('builds a shared timeline from field events and scene tracks', () => {
    const field = createMediaField({ constraints: { durationSec: 10 } });
    addEntity(field, { id: 'motorcycle_001', type: 'vehicle' });
    addEvent(field, {
      id: 'event_001',
      type: 'motorcycle_pass',
      start: 4.7,
      duration: 1.8,
      actors: ['motorcycle_001'],
      effects: ['engine_sound', 'motion'],
    });
    const spans = buildTimeline(field);
    expect(spans.some((s) => s.track === 'events' && s.id === 'event_001')).toBe(true);
    expect(spans.some((s) => s.track === 'audio' && s.payload.cause === 'event_001')).toBe(true);
    expect(spans.some((s) => s.track === 'video' && s.start === 0 && s.end === 10)).toBe(true);
  });

  it('findEventsAt locates spans overlapping a time', () => {
    const field = createMediaField({ constraints: { durationSec: 10 } });
    const spans = buildTimeline(field);
    const at = findEventsAt(spans, 'video', 5);
    expect(at).toHaveLength(1);
  });

  it('checkSynchronization flags audio offset from visual cause', () => {
    const field = createMediaField({ constraints: { durationSec: 10 } });
    addEntity(field, { id: 'motorcycle_001', type: 'vehicle' });
    addEvent(field, {
      id: 'event_001',
      type: 'motorcycle_pass',
      start: 4.7,
      duration: 1.8,
      actors: ['motorcycle_001'],
      effects: ['engine_sound'],
      params: { engine_sound_delay: 1.2 },
    });
    const issues = checkSynchronization(field);
    expect(issues.some((i) => i.code === 'audio_visual_offset')).toBe(true);
    alignEffectsToCause(field);
    expect(checkSynchronization(field)).toHaveLength(0);
  });
});
