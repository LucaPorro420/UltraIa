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