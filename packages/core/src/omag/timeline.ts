import type { MediaField } from './mediafield';

export type TrackKind = 'video' | 'audio' | 'music' | 'camera' | 'events' | 'light';

export interface TrackSpan {
  track: TrackKind;
  id: string;
  start: number;
  end: number;
  payload: Record<string, unknown>;
}

export interface AlignmentIssue {
  code: 'audio_visual_offset' | 'missing_effect_track' | 'negative_span';
  message: string;
  location?: string;
}

export function buildTimeline(field: MediaField): TrackSpan[] {
  const spans: TrackSpan[] = [];
  for (const event of field.events) {
    const start = event.start;
    const end = start + event.duration;
    if (end < start) {
      continue;
    }
    spans.push({
      track: 'events',
      id: event.id,
      start,
      end,
      payload: { cause: event.id, type: event.type, effects: event.effects, actors: event.actors },
    });
    for (const effect of event.effects) {
      const track: TrackKind = effect.includes('_sound') || effect.includes('_audio') ? 'audio' : effect.includes('_music') ? 'music' : 'video';
      const delay = Number(event.params?.[`${effect}_delay`]) || 0;
      spans.push({
        track,
        id: `${event.id}:${effect}`,
        start: Math.max(0, start + delay),
        end: Math.max(0, start + delay) + event.duration,
        payload: { cause: event.id, effect },
      });
    }
  }
  const duration = Math.max(...field.events.map((e) => e.start + e.duration), 0, field.constraints.durationSec ? Number(field.constraints.durationSec) : 0);
  if (duration > 0) {
    spans.push({ track: 'video', id: 'scene', start: 0, end: duration, payload: {} });
    spans.push({ track: 'audio', id: 'scene_ambience', start: 0, end: duration, payload: { effect: 'ambience' } });
  }
  return spans.sort((a, b) => a.start - b.start || a.track.localeCompare(b.track));
}

export function findEventsAt(spans: TrackSpan[], track: TrackKind, time: number): TrackSpan[] {
  return spans.filter((s) => s.track === track && s.start <= time && time < s.end);
}

export function checkSynchronization(field: MediaField): AlignmentIssue[] {
  const issues: AlignmentIssue[] = [];
  const events = new Map<string, TrackSpan[]>();
  const spans = buildTimeline(field);
  for (const span of spans) {
    if (span.payload.cause) {
      const list = events.get(span.payload.cause as string) ?? [];
      list.push(span);
      events.set(span.payload.cause as string, list);
    }
  }
  for (const [causeId, causeSpans] of events) {
    const anchors = causeSpans.filter((s) => s.track === 'video' || s.track === 'events');
    const audioSpans = causeSpans.filter((s) => s.track === 'audio' || s.track === 'music');
    if (!anchors.length || !audioSpans.length) continue;
    for (const vs of anchors) {
      for (const as of audioSpans) {
        const offset = Math.abs(vs.start - as.start);
        if (offset > 0.1) {
          issues.push({
            code: 'audio_visual_offset',
            message: `Audio effect "${as.payload.effect}" starts ${offset.toFixed(2)}s away from its visual cause ${causeId}`,
            location: causeId,
          });
        }
      }
    }
  }
  return issues;
}

export function alignEffectsToCause(field: MediaField): MediaField {
  for (const event of field.events) {
    event.start = Math.max(0, event.start);
    for (const effect of event.effects) {
      const key = `${effect}_delay`;
      if (typeof event.params?.[key] === 'number') {
        delete event.params[key];
      }
    }
  }
  return field;
}