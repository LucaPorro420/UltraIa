import { describe, expect, it } from 'vitest';
import {
  FORMAT_BY_CHANNEL,
  HORARIO_SUGERIDO,
  brandingFor,
  captionFor,
  hashtagsFor,
  present,
  srtFor,
  slugify,
  visualFor,
} from './present';

describe('slugify', () => {
  it('lowercases, strips punctuation, joins with hyphens and caps length', () => {
    expect(slugify('  Cómo usar IA Generativa!! (2026) ')).toBe('cómo-usar-ia-generativa-2026');
    expect(slugify('a'.repeat(200)).length).toBeLessThanOrEqual(80);
  });
});

describe('brandingFor', () => {
  it('returns the Dark Obsidian kit by default', () => {
    const kit = brandingFor();
    expect(kit.marca).toBe('UltraIa');
    expect(kit.acento).toBe('#8b5cf6');
    expect(kit.paleta).toContain('#08080a');
  });

  it('returns a known kit by name and falls back for unknown brands', () => {
    expect(brandingFor('neo_violet').marca).toBe('Neo Violet');
    expect(brandingFor('marca-desconocida').marca).toBe('marca-desconocida');
  });
});

describe('hashtagsFor', () => {
  it('builds topic tags + channel tags, capped per channel', () => {
    const yt = hashtagsFor('Como grabar video 4k', 'youtube_shorts');
    expect(yt).toContain('#shorts');
    expect(yt).toContain('#como');
    expect(yt.length).toBeLessThanOrEqual(10);

    const ig = hashtagsFor('Como grabar video 4k', 'instagram');
    expect(ig.length).toBeLessThanOrEqual(30);
    expect(ig).toContain('#instagood');
  });

  it('returns unique tags', () => {
    const tags = hashtagsFor('video video video', 'tiktok');
    expect(new Set(tags).size).toBe(tags.length);
  });
});

describe('captionFor', () => {
  it('produces per-channel captions with hashtags', () => {
    const tema = 'Como grabar video 4k';
    const body = 'Guia completa paso a paso para grabar en 4k.\nSegunda linea.';
    const yt = captionFor(tema, body, 'youtube_shorts', ['#shorts']);
    expect(yt).toContain(tema);
    expect(yt).toContain('#shorts');
    expect(yt).toContain('Guia completa paso a paso');

    const tiktok = captionFor(tema, body, 'tiktok', ['#fyp']);
    expect(tiktok).toBe(`${'Guia completa paso a paso para grabar en 4k.'} #fyp`);

    const ig = captionFor(tema, body, 'instagram', ['#reels']);
    expect(ig).toContain('#reels');
  });
});

describe('srtFor', () => {
  it('generates SRT blocks with incrementing timestamps and chunking', () => {
    const text = 'uno dos tres cuatro cinco seis siete ocho nueve diez once doce trece catorce quince';
    const srt = srtFor(text, 5, 0, 2);
    expect(srt).toContain('1\n00:00:00,000 --> ');
    expect(srt).toContain('uno dos tres cuatro cinco');
    expect(srt).toContain('\n\n2\n');
    expect(srt).toContain('trece catorce quince');
  });

  it('returns empty string for empty text', () => {
    expect(srtFor('')).toBe('');
  });
});

describe('visualFor', () => {
  it('maps channels to their aspect ratio and style', () => {
    expect(visualFor('X', 'youtube_shorts').dimensiones).toBe('1080x1920 (9:16)');
    expect(visualFor('X', 'tiktok').formato).toBe('9:16 video');
    expect(visualFor('X', 'instagram').dimensiones).toBe('1080x1080 (1:1)');
    expect(visualFor('X', 'blog').formato).toBe('16:9 articulo');
  });

  it('includes a pollinations thumbnail URL with the topic', () => {
    const vis = visualFor('Como grabar', 'blog');
    expect(vis.thumbnail).toContain('pollinations.ai/p/');
    expect(vis.thumbnail).toContain('Como%20grabar');
  });
});

describe('present', () => {
  it('builds a full PublicationPackage for all default channels', () => {
    const pkg = present({ tema: 'Como grabar video 4k', contenido: 'Guia paso a paso.\nSegunda linea.', media: ['https://x.com/a.jpg'] });
    expect(pkg.briefId).toBeNull();
    expect(pkg.canales).toEqual(['youtube_shorts', 'tiktok', 'instagram', 'blog']);
    expect(pkg.media).toEqual(['https://x.com/a.jpg']);
    expect(Object.keys(pkg.captionsByChannel)).toHaveLength(4);
    expect(Object.keys(pkg.visualByChannel)).toHaveLength(4);
    // video channels get SRT; blog/instagram do not
    expect(pkg.captionsByChannel.youtube_shorts.srt).toBeTruthy();
    expect(pkg.captionsByChannel.blog.srt).toBeNull();
    // branding + schedule present
    expect(pkg.branding.marca).toBe('UltraIa');
    expect(pkg.horarioSugerido.blog).toBe(HORARIO_SUGERIDO.blog);
  });

  it('honors explicit channels, briefId and marca', () => {
    const pkg = present({
      tema: 'Tema X',
      contenido: 'Body',
      canales: ['tiktok'],
      briefId: 'brief-123',
      marca: 'neo_violet',
    });
    expect(pkg.canales).toEqual(['tiktok']);
    expect(pkg.briefId).toBe('brief-123');
    expect(pkg.branding.marca).toBe('Neo Violet');
  });

  it('formats match the F1 topic vocabulary', () => {
    expect(FORMAT_BY_CHANNEL.tiktok).toBe('9:16 video');
    expect(FORMAT_BY_CHANNEL.instagram).toBe('1:1 imagen');
  });
});