import { describe, expect, it } from 'vitest';
import { encodeWav, synthBeat, synthSound, synthTone, synthWhoosh, SAMPLE_RATE } from './sound';

describe('procedural sound synthesis', () => {
  it('synthesizes a tone with valid PCM', () => {
    const t = synthTone({ freq: 440, durationSec: 0.1 });
    expect(t.sampleRate).toBe(SAMPLE_RATE);
    expect(t.pcm.length).toBe(Math.floor(SAMPLE_RATE * 0.1));
    expect(t.kind).toBe('tone');
  });

  it('encodes PCM to a valid WAV header', () => {
    const t = synthTone({ durationSec: 0.05 });
    const wav = encodeWav(t);
    expect(wav.subarray(0, 4).toString()).toBe('RIFF');
    expect(wav.subarray(8, 12).toString()).toBe('WAVE');
    expect(wav.subarray(36, 40).toString()).toBe('data');
    expect(wav.length).toBe(44 + t.pcm.length * 2);
  });

  it('produces the known sound kinds', () => {
    expect(synthWhoosh({ durationSec: 0.2 }).kind).toBe('whoosh');
    expect(synthBeat({ durationSec: 1 }).kind).toBe('beat');
  });

  it('rejects unknown kinds', () => {
    expect(() => synthSound('bogus')).toThrow(/unknown sound kind/i);
  });

  it('is deterministic for a given seed', () => {
    const a = synthSound('noise', { seed: 5, durationSec: 0.05 });
    const b = synthSound('noise', { seed: 5, durationSec: 0.05 });
    expect(a.pcm).toEqual(b.pcm);
  });
});