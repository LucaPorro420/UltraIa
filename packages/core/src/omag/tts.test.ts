import { afterEach, describe, expect, it, vi } from 'vitest';
import { DEFAULT_VOICE, detectLang, edgeTts, voiceFor, VOICES_BY_LANG } from './tts';

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('detectLang', () => {
  it('detects arabic script', () => {
    expect(detectLang('مرحبا بالعالم')).toBe('ar');
  });

  it('detects spanish', () => {
    expect(detectLang('Una mujer camina bajo la lluvia de noche')).toBe('es');
  });

  it('detects english', () => {
    expect(detectLang('A woman walks through the rainy city at night')).toBe('en');
  });

  it('detects french', () => {
    expect(detectLang('Une femme marche dans la ville sous la pluie')).toBe('fr');
  });

  it('falls back to the default language for unknown scripts', () => {
    expect(detectLang('')).toBe(DEFAULT_VOICE ? 'es' : 'es');
    expect(detectLang('xyz 123')).toBe('es');
  });
});

describe('voiceFor', () => {
  it('maps a language code to an edge-tts voice', () => {
    expect(voiceFor('ar-SA')).toBe('ar-SA-HamedNeural');
    expect(voiceFor('es')).toBe('es-ES-ElviraNeural');
    expect(voiceFor('pt-BR')).toBe('pt-BR-FranciscaNeural');
  });

  it('falls back to the default voice for unknown languages', () => {
    expect(voiceFor('xx')).toBe(DEFAULT_VOICE);
    expect(VOICES_BY_LANG['en']).toBe('en-US-JennyNeural');
  });
});

describe('edgeTts', () => {
  it('returns narration metadata without a WebSocket (graceful)', async () => {
    vi.stubGlobal('WebSocket', undefined);
    const out = await edgeTts('Una mujer camina bajo la lluvia');
    expect(out.lang).toBe('es');
    expect(out.script).toContain('mujer');
    expect(out.voice).toBe('es-ES-ElviraNeural');
    expect(out.audio).toBe(false);
  });
});