import { describe, expect, it } from 'vitest';
import { puntuarMedia, puntuarPaquete } from './media-score';

describe('puntuarMedia (port media_score.py)', () => {
  it('imagen válida → PASS', () => {
    const v = puntuarMedia({ modalidad: 'image', url: 'https://image.pollinations.ai/prompt/x', model: 'flux' });
    expect(v.score).toBe(25);
    expect(v.status).toBe('PASS');
  });

  it('imagen sin url ni modelo → FAIL con notas', () => {
    const v = puntuarMedia({ modalidad: 'image' });
    expect(v.score).toBe(0);
    expect(v.status).toBe('FAIL');
    expect(v.notas).toContain('url invalida');
    expect(v.notas).toContain('sin modelo');
  });

  it('audio con provider edge-tts + mp3 → PASS', () => {
    const v = puntuarMedia({ modalidad: 'audio', provider: 'edge-tts', url: 'https://x/audio.mp3' });
    expect(v.score).toBe(25);
    expect(v.status).toBe('PASS');
  });

  it('audio sin provider → FAIL', () => {
    const v = puntuarMedia({ modalidad: 'audio', url: '/media/audio.wav' });
    expect(v.status).toBe('FAIL');
    expect(v.notas.join(' ')).toContain('provider');
  });

  it('video con frames y motion válida → PASS', () => {
    const v = puntuarMedia({
      modalidad: 'video',
      frames: ['a', 'b'],
      motion: 'zoom-in',
      provider: 'storyboard',
    });
    expect(v.score).toBe(20);
    expect(v.status).toBe('PASS');
  });

  it('video sin frames ni motion → FAIL', () => {
    const v = puntuarMedia({ modalidad: 'video' });
    expect(v.status).toBe('FAIL');
    expect(v.notas).toContain('sin frames ni url');
  });

  it('tts con idioma es + voz Neural → PASS', () => {
    const v = puntuarMedia({ modalidad: 'tts', language: 'es', voz: 'es-ES-ElviraNeural', url: 'https://x/v.mp3' });
    expect(v.score).toBe(25);
    expect(v.status).toBe('PASS');
  });

  it('director con plan válido → PASS', () => {
    const v = puntuarMedia({
      modalidad: 'director',
      plan: { language: 'es', script: 'hola mundo', images: ['i1'] },
    });
    expect(v.score).toBe(25);
    expect(v.status).toBe('PASS');
  });

  it('music usa el scorer de audio', () => {
    const v = puntuarMedia({ modalidad: 'music', provider: 'composition', url: '/media/m.wav' });
    expect(v.score).toBe(25);
    expect(v.status).toBe('PASS');
  });
});

describe('puntuarPaquete (PublicationPackage pre-pub)', () => {
  const paqueteCompleto = {
    caption: 'Caption largo para el post',
    hashtags: ['#ia', '#ai'],
    captionsByChannel: { blog: { caption: 'Caption larga para blog' } },
    canales: ['blog'],
    visualByChannel: { blog: { formato: '16:9', thumbnail: 'https://image.pollinations.ai/prompt/x' } },
    contenido: 'Contenido '.repeat(20),
    horarioSugerido: '2026-08-16T10:00:00Z',
    media: ['https://image.pollinations.ai/prompt/x'],
  };

  it('paquete completo → 100', () => {
    const { score, notas } = puntuarPaquete(paqueteCompleto);
    expect(score).toBe(100);
    expect(notas).toHaveLength(0);
  });

  it('paquete vacío → 0 con notas', () => {
    const { score, notas } = puntuarPaquete({});
    expect(score).toBe(0);
    expect(notas.length).toBeGreaterThanOrEqual(4);
  });

  it('contenido corto resta puntos', () => {
    const { score } = puntuarPaquete({ ...paqueteCompleto, contenido: 'corto' });
    expect(score).toBeLessThan(100);
  });

  it('sin horario ni hashtags resta puntos', () => {
    const { score, notas } = puntuarPaquete({ ...paqueteCompleto, horarioSugerido: undefined, hashtags: [] });
    expect(score).toBeLessThan(100);
    expect(notas.join(' ')).toContain('hashtags');
    expect(notas.join(' ')).toContain('horario');
  });
});