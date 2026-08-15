import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { MOTIONS, normalizeMotion } from '../prompt/director';
import {
  anguloNormalizado,
  enrutarBrief,
  escenasParaFormato,
  generarContenido,
  guionizar,
  guionLargo,
  redactar,
  tituloDesdeBrief,
  type ContentPackage,
} from './enrutador';
import type { TopicBrief } from './topics';

function brief(overrides: Partial<TopicBrief> = {}): TopicBrief {
  return {
    tema: 'RAG en producción: errores que cuestan caro',
    canal: 'blog',
    formato: '16:9 articulo',
    tono: 'educativo',
    angulo: 'los 5 fallos al integrar RAG',
    fuentes: ['https://example.com/rag', 'https://example.com/llm'],
    score: 0.87,
    pubDate: '2026-08-15',
    ...overrides,
  };
}

describe('redactar (Redactor)', () => {
  it('produce un post estructurado con intro, cuerpo y cierre', () => {
    const c = redactar(brief());
    expect(c.titulo.length).toBeGreaterThan(5);
    expect(c.intro).toContain('RAG en producción');
    expect(c.cuerpo.length).toBeGreaterThanOrEqual(2);
    expect(c.cierre.length).toBeGreaterThan(10);
  });

  it('incluye CTA del canal y palabras clave del tema', () => {
    const c = redactar(brief());
    expect(c.cta).toContain('Suscríbete');
    expect(c.palabrasClave.length).toBeGreaterThan(0);
    expect(c.palabrasClave).toContain('producción');
  });

  it('cita las fuentes del brief en el cuerpo', () => {
    const c = redactar(brief());
    expect(c.cuerpo.join(' ')).toContain('example.com/rag');
  });

  it('trunca títulos muy largos', () => {
    const c = redactar(brief({ tema: 'a'.repeat(200) }));
    expect(c.titulo.length).toBeLessThanOrEqual(81);
  });

  it('usa el ángulo normalizado cuando existe', () => {
    const c = redactar(brief({ angulo: 'cómo evitar el fallo #1' }));
    expect(c.intro.toLowerCase()).toContain('cómo evitar el fallo #1');
  });
});

describe('guionizar (Guionista)', () => {
  it('produce hook + escenas con cámara válida del vocabulario', () => {
    const g = guionizar(brief({ canal: 'youtube_shorts', formato: '9:16 video' }));
    expect(g.hook).toContain('RAG en producción');
    expect(g.escenas.length).toBe(7);
    for (const e of g.escenas) {
      expect(MOTIONS).toContain(e.camara);
      expect(normalizeMotion(e.camara)).toBe(e.camara);
    }
  });

  it('respeta el formato 9:16 (45-60s) y 5 escenas para otros formatos', () => {
    const corto = guionizar(brief({ canal: 'tiktok', formato: '9:16 video' }));
    expect(corto.duracionSeg).toBeGreaterThanOrEqual(35);
    expect(corto.duracionSeg).toBeLessThanOrEqual(60);
    const otro = guionizar(brief({ canal: 'instagram', formato: '1:1 imagen' }));
    expect(escenasParaFormato(brief({ formato: '1:1 imagen' }))).toBe(5);
    expect(otro.escenas.length).toBe(5);
  });

  it('narración = hook + voces de todas las escenas', () => {
    const g = guionizar(brief({ canal: 'youtube_shorts', formato: '9:16 video' }));
    expect(g.narracion).toContain(g.hook);
    for (const e of g.escenas) expect(g.narracion).toContain(e.voz);
  });

  it('tiempos de escena son secuenciales y consistentes', () => {
    const g = guionizar(brief({ canal: 'tiktok', formato: '9:16 video' }));
    const segundos = g.escenas.map((e) => {
      const [mm, ss] = e.tiempo.split(':').map(Number);
      return mm * 60 + ss;
    });
    for (let i = 1; i < segundos.length; i++) expect(segundos[i]).toBeGreaterThan(segundos[i - 1]);
  });

  it('estilo visual según el tono', () => {
    const g = guionizar(brief({ canal: 'youtube_shorts', formato: '9:16 video', tono: 'noticia' }));
    expect(g.estilo).toContain('newsroom');
  });
});

describe('enrutarBrief', () => {
  it('9:16 video → guion; 16:9 articulo → texto; 1:1 imagen → texto', () => {
    expect(enrutarBrief(brief({ formato: '9:16 video' }))).toBe('guion');
    expect(enrutarBrief(brief({ formato: '16:9 articulo' }))).toBe('texto');
    expect(enrutarBrief(brief({ formato: '1:1 imagen' }))).toBe('texto');
  });
});

describe('generarContenido (manifest)', () => {
  let dir: string;
  beforeEach(async () => {
    dir = await mkdtemp(join(tmpdir(), 'ultraia-enrutador-'));
  });
  afterEach(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  it('dryRun no escribe en disco y devuelve paquete', async () => {
    const res = await generarContenido(brief(), { dir, dryRun: true });
    expect(res.escrito).toBe(false);
    expect(res.manifestPath).toBeNull();
    expect(res.paquete.tipo).toBe('texto');
  });

  it('escribe manifest JSON válido con el paquete completo', async () => {
    const res = await generarContenido(brief({ canal: 'youtube_shorts', formato: '9:16 video' }), { dir });
    expect(res.escrito).toBe(true);
    expect(res.manifestPath).toMatch(/manifest\.json$/);
    const raw = await readFile(res.manifestPath!, 'utf8');
    const paquete = JSON.parse(raw) as ContentPackage;
    expect(paquete.briefId).toBe(res.paquete.briefId);
    expect(paquete.tipo).toBe('guion');
    expect(paquete.guion?.escenas.length).toBe(7);
    expect(paquete.brief.tema).toBe('RAG en producción: errores que cuestan caro');
  });

  it('override de tipo fuerza texto aunque el formato sea video', async () => {
    const res = await generarContenido(
      brief({ canal: 'youtube_shorts', formato: '9:16 video' }),
      { dir, tipo: 'texto' },
    );
    expect(res.paquete.tipo).toBe('texto');
    expect(res.paquete.contenido?.cta).toContain('Sigue para más atajos');
  });

  it('es idempotente: regenerar sobre la misma carpeta no rompe el manifest', async () => {
    const b = brief();
    const r1 = await generarContenido(b, { dir });
    const r2 = await generarContenido(b, { dir });
    expect(r2.escrito).toBe(true);
    expect(r1.manifestPath).toBe(r2.manifestPath);
    const raw = await readFile(r2.manifestPath!, 'utf8');
    expect(JSON.parse(raw).briefId).toBe(r2.paquete.briefId);
  });

  it('anguloNormalizado tiene fallback', () => {
    expect(anguloNormalizado(brief({ angulo: '' }))).toContain('RAG en producción');
    expect(tituloDesdeBrief(brief()).length).toBeLessThanOrEqual(80);
  });
});

describe('multi-idioma es/ar (F2 tarea 2)', () => {
  let dir: string;
  beforeEach(async () => {
    dir = await mkdtemp(join(tmpdir(), 'ultraia-enrutador-ar-'));
  });
  afterEach(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  it('redactar en árabe produce texto árabe + CTA ar + palabras clave', () => {
    const post = redactar(brief({ canal: 'youtube_shorts' }), 'ar');
    expect(post.cta).toContain('تابعني');
    expect(post.intro).toMatch(/[\u0600-\u06FF]/);
    expect(post.cuerpo.join(' ')).toMatch(/[\u0600-\u06FF]/);
    expect(post.palabrasClave.length).toBeGreaterThan(0);
    expect(post.titulo).toContain('RAG');
  });

  it('redactar en es mantiene el comportamiento previo', () => {
    const post = redactar(brief(), 'es');
    expect(post.cta).toContain('Suscríbete al blog');
    expect(post.intro).not.toMatch(/[\u0600-\u06FF]/);
  });

  it('guionizar en árabe produce hook + escenas + narración árabes', () => {
    const guion = guionizar(brief({ canal: 'youtube_shorts', formato: '9:16 video' }), 'ar');
    expect(guion.hook).toMatch(/[\u0600-\u06FF]/);
    expect(guion.narracion).toMatch(/[\u0600-\u06FF]/);
    expect(guion.escenas.length).toBe(7);
    for (const esc of guion.escenas) {
      expect(esc.voz).toMatch(/[\u0600-\u06FF]/);
      expect(MOTIONS.map(normalizeMotion)).toContain(normalizeMotion(esc.camara));
    }
  });

  it('generarContenido con idioma ar guarda el idioma en el paquete', async () => {
    const b = brief({ canal: 'youtube_shorts', formato: '9:16 video' });
    const res = await generarContenido(b, { dir, idioma: 'ar', dryRun: true });
    expect(res.paquete.idioma).toBe('ar');
    expect(res.paquete.guion?.narracion).toMatch(/[\u0600-\u06FF]/);
  });
});

describe('TTS edge-tts (F2 tarea 2)', () => {
  let dir: string;
  beforeEach(async () => {
    dir = await mkdtemp(join(tmpdir(), 'ultraia-enrutador-tts-'));
  });
  afterEach(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  const ttsEngine = async (script: string, lang: string) => Buffer.from(`MP3-${lang}:${script.length}`);

  it('genera narracion.mp3 en la carpeta del brief cuando tts=true', async () => {
    const b = brief({ canal: 'youtube_shorts', formato: '9:16 video' });
    const res = await generarContenido(b, { dir, tts: true, ttsEngine });
    expect(res.paquete.audioPath).toContain('narracion.mp3');
    const audio = await readFile(res.paquete.audioPath!, 'utf8');
    expect(audio.startsWith('MP3-es:')).toBe(true);
  });

  it('tts=false o ttsEngine que devuelve null → audioPath null sin romper', async () => {
    const b = brief({ canal: 'youtube_shorts', formato: '9:16 video' });
    const sinTts = await generarContenido(b, { dir, tts: false });
    expect(sinTts.paquete.audioPath).toBeUndefined();
    const fallo = await generarContenido(b, { dir, tts: true, ttsEngine: async () => null });
    expect(fallo.paquete.audioPath).toBeNull();
    expect(fallo.paquete.guion?.narracion.length).toBeGreaterThan(0);
  });
});

describe('guion largo OMAG 60s+ (F2 tarea 3)', () => {
  let dir: string;
  beforeEach(async () => {
    dir = await mkdtemp(join(tmpdir(), 'ultraia-enrutador-largo-'));
  });
  afterEach(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  it('estructura: 3 actos, 7 escenas y shots con MOTIONS válidos', () => {
    const b = brief({ canal: 'blog', formato: '16:9 video' });
    const { proyecto } = guionLargo(b, 'es', 75);
    expect(proyecto.acts.length).toBe(3);
    expect(proyecto.acts.map((a) => a.name)).toEqual(['Apertura', 'Desarrollo', 'Cierre']);
    const escenas = proyecto.acts.flatMap((a) => a.sequences.flatMap((s) => s.scenes));
    expect(escenas.length).toBe(7);
    for (const esc of escenas) {
      expect(esc.shots.length).toBeGreaterThan(0);
      for (const shot of esc.shots) {
        expect(MOTIONS.map(normalizeMotion)).toContain(normalizeMotion(shot.motion));
        expect(shot.duration).toBeGreaterThan(0);
        expect(shot.prompt).toContain(shot.motion);
      }
    }
  });

  it('timeline sincronizada: video cubre toda la duración y 0 issues', () => {
    const b = brief({ canal: 'blog', formato: '16:9 video' });
    const { timeline, proyecto } = guionLargo(b, 'es', 90);
    expect(timeline.durationSec).toBeGreaterThanOrEqual(60);
    expect(timeline.durationSec).toBeLessThanOrEqual(180);
    const inicio = Math.min(...timeline.tracks.video.map((v) => v.start));
    const fin = Math.max(...timeline.tracks.video.map((v) => v.end));
    expect(inicio).toBe(0);
    expect(fin).toBe(timeline.durationSec);
    expect(timeline.tracks.dialogue.length).toBe(7);
    expect(proyecto.language).toBe('es');
  });

  it('narración larga es/ar con hook + 7 escenas', () => {
    const b = brief({ canal: 'blog', formato: '16:9 video' });
    const es = guionLargo(b, 'es', 75);
    expect(es.narracion.split(' ').length).toBeGreaterThan(30);
    expect(es.narracion).toContain('Abre con la pregunta');
    const ar = guionLargo(b, 'ar', 75);
    expect(ar.narracion).toMatch(/[\u0600-\u06FF]/);
    expect(ar.proyecto.language).toBe('ar');
  });

  it('duración objetivo ajusta shots por escena (60s → 1 shot, 150s → 2+ shots)', () => {
    const b = brief({ canal: 'blog', formato: '16:9 video' });
    const corto = guionLargo(b, 'es', 60);
    const cortoShots = corto.proyecto.acts.flatMap((a) => a.sequences.flatMap((s) => s.scenes.flatMap((sc) => sc.shots)));
    expect(cortoShots.length).toBe(7);
    const largo = guionLargo(b, 'es', 150);
    const largoShots = largo.proyecto.acts.flatMap((a) => a.sequences.flatMap((s) => s.scenes.flatMap((sc) => sc.shots)));
    expect(largoShots.length).toBeGreaterThan(7);
    expect(largo.timeline.durationSec).toBeGreaterThanOrEqual(60);
  });

  it('generarContenido guion_largo + tts escribe proyecto y narracion.mp3', async () => {
    const b = brief({ canal: 'blog', formato: '16:9 video' });
    const res = await generarContenido(b, {
      dir,
      tipo: 'guion_largo',
      tts: true,
      ttsEngine: async (script, lang) => Buffer.from(`MP3-${lang}:${script.length}`),
    });
    expect(res.paquete.tipo).toBe('guion_largo');
    expect(res.paquete.proyecto?.acts.length).toBe(3);
    expect(res.paquete.timeline?.durationSec).toBeGreaterThan(0);
    expect(res.paquete.audioPath).toContain('narracion.mp3');
    const raw = await readFile(res.manifestPath!, 'utf8');
    const manifest = JSON.parse(raw) as ContentPackage;
    expect(manifest.proyecto?.acts.length).toBe(3);
  });

  it('enrutarBrief: 16:9 video → guion_largo; 9:16 → guion; resto → texto', () => {
    expect(enrutarBrief(brief({ canal: 'blog', formato: '16:9 video' }))).toBe('guion_largo');
    expect(enrutarBrief(brief({ canal: 'youtube_shorts', formato: '9:16 video' }))).toBe('guion');
    expect(enrutarBrief(brief({ canal: 'blog', formato: '16:9 articulo' }))).toBe('texto');
  });
});