import { describe, expect, it } from 'vitest';
import {
  buildTakeManifest,
  buildTravelRender,
  MOTIONS,
  planTravelVideo,
  replicateLandscape,
  slugifyDestino,
  travelLeadImage,
} from './travel';

describe('travel: planTravelVideo (determinista, sin conexión)', () => {
  it('planifica un video 9:16 con hook, escenas y CTA', () => {
    const plan = planTravelVideo('Patagonia');
    expect(plan.slug).toBe('patagonia');
    expect(plan.hook).toContain('Patagonia');
    expect(plan.cta).toContain('Comparte');
    expect(plan.escenas.length).toBeGreaterThanOrEqual(3);
    expect(plan.escenas.length).toBeLessThanOrEqual(7);
    expect(plan.duracionSeg).toBeGreaterThanOrEqual(30);
    expect(plan.duracionSeg).toBeLessThanOrEqual(60);
  });

  it('respeta idioma ar (plantillas bilingües)', () => {
    const plan = planTravelVideo('المغرب', { idioma: 'ar' });
    expect(plan.idioma).toBe('ar');
    expect(plan.titulo).toContain('رحلة');
    expect(plan.escenas[0].narracion.length).toBeGreaterThan(0);
  });

  it('respeta estilo aventura y duración custom', () => {
    const plan = planTravelVideo('Machu Picchu', { estilo: 'aventura', duracionSeg: 36 });
    expect(plan.estilo).toBe('aventura');
    expect(plan.hook).toContain('despiertan');
    expect(plan.duracionSeg).toBe(36);
  });

  it('usa motions del vocabulario canónico', () => {
    const plan = planTravelVideo('Islandia');
    for (const escena of plan.escenas) {
      expect(MOTIONS).toContain(escena.motion);
    }
  });

  it('genera prompts de imagen con el destino y 9:16', () => {
    const plan = planTravelVideo('Torres del Paine');
    expect(plan.escenas[0].promptImagen).toContain('Torres del Paine');
    expect(plan.escenas[0].promptImagen).toContain('9:16 vertical');
    expect(plan.escenas[0].promptImagen).toContain(plan.escenas[0].motion);
  });

  it('determinista: mismo input → mismo plan', () => {
    const a = planTravelVideo('Bali', { estilo: 'relax' });
    const b = planTravelVideo('Bali', { estilo: 'relax' });
    expect(a).toEqual(b);
  });

  it('slugify: espacios, acentos y símbolos → guiones', () => {
    expect(slugifyDestino('Torres del Paine')).toBe('torres-del-paine');
    expect(slugifyDestino('São Paulo!!!')).toBe('sao-paulo');
    expect(slugifyDestino('')).toBe('destino');
  });
});

describe('travel: buildTakeManifest (tomas guardadas)', () => {
  it('genera manifest con slug idempotente desde fuente+destino', () => {
    const m = buildTakeManifest({ fuente: 'https://www.instagram.com/tomassporro', lugar: 'Fiordo Noruego', descripcion: 'Amanecer sobre el fiordo', tags: ['fiordo', 'amanecer'] }, 1750000000000);
    expect(m.slug).toBe('fiordo-noruego-www-instagram-com-tomassporro');
    expect(m.tipo).toBe('referencia');
    expect(m.guardadoEn).toContain('fiordo-noruego');
    expect(m.creadoEn).toBe(new Date(1750000000000).toISOString());
  });

  it('respeta tipo imagen y guardadoEn custom', () => {
    const m = buildTakeManifest({ fuente: 'instagram.com/x', lugar: 'Alpes', descripcion: 'Nieve', tags: ['nieve'], tipo: 'imagen', guardadoEn: '.ultraia/travel/tomas/alpes/manifest.json' }, 0);
    expect(m.tipo).toBe('imagen');
    expect(m.guardadoEn).toBe('.ultraia/travel/tomas/alpes/manifest.json');
    expect(m.tags).toEqual(['nieve']);
  });
});

describe('travel: buildTravelRender (argv ffmpeg determinista)', () => {
  it('genera pasos Ken Burns + xfade + render final', () => {
    const plan = planTravelVideo('Cusco', { duracionSeg: 30, escenas: 3 });
    const r = buildTravelRender(plan);
    expect(r.pasos.length).toBe(5); // 3 clips + xfade + audio/render
    expect(r.argv.length).toBe(4);
    // clip 0: zoompan con escala 720x1280
    expect(r.argv[0].join(' ')).toContain('zoompan');
    expect(r.argv[0].join(' ')).toContain('720:1280');
    // concat xfade encadenado
    const last = r.argv[3];
    expect(last[0]).toBe('ffmpeg');
    expect(last.join(' ')).toContain('xfade');
    expect(last.join(' ')).toContain('clip-0.mp4');
    expect(last.join(' ')).toContain('travel-cusco.mp4');
    expect(last.join(' ')).toContain('+faststart');
  });

  it('incluye narración y BGM cuando se pasan', () => {
    const plan = planTravelVideo('Marruecos');
    const r = buildTravelRender(plan, { narracionMp3: 'narracion.mp3', bgmMp3: 'bgm.mp3' });
    const last = r.argv[r.argv.length - 1].join(' ');
    expect(last).toContain('narracion.mp3');
    expect(last).toContain('bgm.mp3');
    expect(last).toContain('volume=0.25');
    expect(last).toContain('amix');
    expect(r.manifest.fuentes).toEqual({ narracionMp3: 'narracion.mp3', bgmMp3: 'bgm.mp3' });
  });

  it('genera render.sh ejecutable con todos los comandos', () => {
    const plan = planTravelVideo('Kyoto', { estilo: 'cultura' });
    const r = buildTravelRender(plan);
    expect(r.renderSh.startsWith('#!/usr/bin/env bash')).toBe(true);
    expect(r.renderSh).toContain('set -euo pipefail');
    expect(r.renderSh).toContain('travel-kyoto.mp4');
  });

  it('determinista: mismo input → mismo render', () => {
    const plan = planTravelVideo('Fiji');
    expect(buildTravelRender(plan)).toEqual(buildTravelRender(plan));
  });
});

describe('travel: replicateLandscape (replicar paisajes, keyless)', () => {
  it('genera N variaciones con urls pollinations', () => {
    const r = replicateLandscape('fiordo con niebla', { variaciones: 4 });
    expect(r.prompts.length).toBe(4);
    expect(r.urls.length).toBe(4);
    for (const u of r.urls) {
      expect(u.startsWith('https://image.pollinations.ai/prompt/')).toBe(true);
      expect(u).toContain('width=720');
      expect(u).toContain('height=1280');
      expect(u).toContain('model=flux');
    }
  });

  it('variantes deterministas por hora/clima/lente', () => {
    const r = replicateLandscape('playa', { variaciones: 3 });
    expect(r.prompts[0]).toContain('golden hour');
    expect(r.prompts[0]).toContain('soft fog');
    expect(r.prompts[0]).toContain('drone aerial');
    expect(r.prompts[1]).toContain('midday');
    expect(r.prompts[1]).toContain('light rain');
    // cada prompt combina una hora, un clima y una lente del banco
    for (const p of r.prompts) {
      expect(p).toMatch(/golden hour|midday|sunset|night/);
      expect(p).toMatch(/clear sky|soft fog|light rain|fresh snow/);
      expect(p).toMatch(/35mm|85mm|drone aerial|wide angle/);
    }
  });

  it('seed fijo → urls reproducibles; seed distinto → urls distintas', () => {
    const a = replicateLandscape('montaña', { variaciones: 2, seed: 7 });
    const b = replicateLandscape('montaña', { variaciones: 2, seed: 7 });
    const c = replicateLandscape('montaña', { variaciones: 2, seed: 8 });
    expect(a).toEqual(b);
    expect(a.urls[0]).not.toBe(c.urls[0]);
  });

  it('clampa variaciones 1..8', () => {
    expect(replicateLandscape('x', { variaciones: 99 }).prompts.length).toBe(8);
    expect(replicateLandscape('x', { variaciones: 0 }).prompts.length).toBe(1);
  });
});

describe('travel: travelLeadImage (imagen principal del plan)', () => {
  it('construye URL pollinations 9:16 con el prompt de la escena 0', () => {
    const plan = planTravelVideo('Santorini');
    const img = travelLeadImage(plan);
    expect(img.provider).toBe('pollinations');
    expect(img.aspectRatio).toBe('9:16');
    expect(img.url).toContain(encodeURIComponent(plan.escenas[0].promptImagen));
    expect(img.width).toBe(720);
    expect(img.height).toBe(1280);
  });
});
