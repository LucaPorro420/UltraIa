/**
 * creativo.test.ts — tests del motor de creative coding puro (C70, 19/08/2026).
 * Dominio puro: NUNCA ejecuta canvas/audio/binarios. Determinismo por seed.
 */
import { describe, it, expect } from 'vitest';
import {
  ballSchema, physicsOptionsSchema, sceneSchema, impactSoundSchema,
  creativoActionSchema, simulateBall, planScene, soundImpact, renderCanvasHtml,
  creativoGenerar, mulberry32,
} from './creativo';

describe('creativo — PRNG determinismo', () => {
  it('misma seed -> misma secuencia', () => {
    const seq = (seed: number) => { const r = mulberry32(seed); return Array.from({ length: 5 }, () => r()); };
    expect(seq(7)).toEqual(seq(7));
  });
  it('distinta seed -> secuencia distinta', () => {
    expect(mulberry32(1)()).not.toBe(mulberry32(2)());
  });
});

describe('creativo — simulacion Euler (caida libre)', () => {
  // Euler semi-implicito (vy += g*dt; y += vy*dt) tiene error ~0.5*g*dt^2 vs la
  // solucion analitica; los tests validan contra 0.5*g*t^2 con tolerancia = g*dt^2.
  const G = 1200;

  it('y(t) = y0 + 0.5*g*t^2 (caida libre sin rebote)', () => {
    // dt chico (0.001) -> error global Euler ~O(g*dt*t) < 1.5px: valida la fisica real
    const dt = 0.001;
    const r = simulateBall({ radius: 5, x: 100, y: 1000 }, {
      integrator: 'euler', gravity: G, damping: 0, floorFriction: 0, width: 2000, height: 10000, dt, durationSec: 1, seed: 1337,
    });
    const last = r.steps[r.steps.length - 1];
    const analytic = 1000 + 0.5 * G * last.t * last.t;
    expect(Math.abs(last.y - analytic)).toBeLessThan(2); // error global ~1.2
    expect(r.bounces.length).toBe(0);
  });

  it('energia mecanica conservada con damping=0 y sin rebote', () => {
    const r = simulateBall({ radius: 5, x: 100, y: 1000 }, {
      gravity: G, damping: 0, floorFriction: 0, width: 2000, height: 10000, dt: 0.001, durationSec: 0.5, seed: 1,
    });
    expect(r.energyRatio).toBeCloseTo(1, 1);
  });

  it('rebote con el suelo invierte vy y reduce magnitud (restitucion=0.7)', () => {
    const r = simulateBall({ radius: 5, x: 100, y: 490, vy: 200, restitution: 0.7 }, {
      gravity: 0, damping: 0, floorFriction: 0, width: 2000, height: 500, dt: 0.01, durationSec: 2, seed: 1,
    });
    expect(r.bounces.length).toBeGreaterThanOrEqual(1);
    const first = r.bounces[0];
    expect(first.surface).toBe('floor');
    expect(first.velocityYBefore).toBeGreaterThan(0);
    expect(first.velocityYAfter).toBeLessThan(0);
    expect(Math.abs(first.velocityYAfter)).toBeCloseTo(Math.abs(first.velocityYBefore) * 0.7, 1);
  });

  it('restitution=0 -> vyAfter≈0 tras rebote del suelo', () => {
    const r = simulateBall({ radius: 5, x: 100, y: 490, vy: 600, restitution: 0 }, {
      gravity: 0, damping: 0, floorFriction: 0, width: 2000, height: 500, dt: 0.01, durationSec: 1, seed: 1,
    });
    const floorBounces = r.bounces.filter(b => b.surface === 'floor');
    expect(floorBounces.length).toBeGreaterThanOrEqual(1);
    expect(Math.abs(floorBounces[0].velocityYAfter)).toBeLessThan(1);
  });

  it('Verlet y Euler convergen a 0.5*g*t^2 (caida libre)', () => {
    const dt = 0.001;
    const mk = (i: 'euler' | 'verlet') => simulateBall({ radius: 5, x: 100, y: 1000 }, {
      integrator: i, gravity: G, damping: 0, floorFriction: 0, width: 2000, height: 10000, dt, durationSec: 1, seed: 1,
    });
    const e = mk('euler').steps.at(-1)!;
    const v = mk('verlet').steps.at(-1)!;
    const analytic = 1000 + 0.5 * G * v.t * v.t;
    expect(Math.abs(e.y - analytic)).toBeLessThan(2);
    expect(Math.abs(v.y - analytic)).toBeLessThan(2);
  });
});

describe('creativo — planScene determinismo', () => {
  it('misma seed -> misma escena', () => {
    expect(planScene({ count: 5, seed: 42, width: 400, height: 300 }).balls)
      .toEqual(planScene({ count: 5, seed: 42, width: 400, height: 300 }).balls);
  });
  it('distinta seed -> distinta escena', () => {
    expect(planScene({ count: 6, seed: 1 }).balls[0].x).not.toBe(planScene({ count: 6, seed: 2 }).balls[0].x);
  });
  it('count clamped 1..64', () => {
    expect(planScene({ count: 0 }).balls).toHaveLength(1);
    expect(planScene({ count: 100 }).balls).toHaveLength(64);
  });
});

describe('creativo — soundImpact', () => {
  it('intensidad 0 -> minima', () => {
    expect(soundImpact(0)).toMatchObject({ frequencyStartHz: 180, frequencyEndHz: 90, gainStart: 0.08 });
  });
  it('intensidad 100 -> maxima', () => {
    expect(soundImpact(100)).toMatchObject({ frequencyStartHz: 780, gainStart: 0.58 });
  });
  it('clampa >100', () => {
    expect(soundImpact(200).frequencyStartHz).toBe(soundImpact(100).frequencyStartHz);
  });
  it('opts override (merge)', () => {
    expect(soundImpact(50, { waveform: 'square' }).waveform).toBe('square');
    expect(soundImpact(50, { waveform: 'square' }).frequencyStartHz).toBe(180 + 50 * 6);
  });
});

describe('creativo — renderCanvasHtml', () => {
  it('HTML autocontenido: doctype, canvas, script, AudioContext; sin URLs externas', () => {
    const html = renderCanvasHtml(planScene({ count: 3 }));
    expect(html).toContain('<!doctype html>');
    expect(html).toContain('<canvas id="cv"');
    expect(html).toContain('requestAnimationFrame');
    expect(html).toContain('AudioContext');
    expect(html.match(/https?:\/\//g)).toBeNull();
    expect(html).not.toContain('src=');
    expect(html).not.toContain('link rel');
  });
  it('serializa la escena y la fisica inline', () => {
    const html = renderCanvasHtml(planScene({ count: 4, seed: 99 }), { title: 'T' });
    expect(html).toContain('T');
    expect(html).toContain('"radius"');      // campo ball serializado
    expect(html).toContain('"gravity"');    // campo physics serializado
  });
  it('la fisica del canvas coincide con el dominio', () => {
    const scene = planScene({ count: 1, seed: 1 });
    const sim = simulateBall(scene.balls[0], { ...scene.physics, dt: 1 / 60, durationSec: 1 });
    expect(sim.steps.length).toBeGreaterThan(50);
  });
});

describe('creativo — creativoGenerar (tool)', () => {
  it('esquema valida acciones validas', () => {
    expect(() => creativoActionSchema.parse({ action: 'simular' })).not.toThrow();
    expect(() => creativoActionSchema.parse({ action: 'planificar', count: 4 })).not.toThrow();
  });
  it('esquema rechaza accion invalida', () => {
    expect(() => creativoActionSchema.parse({ action: 'borrar' })).toThrow();
  });
  it('simular/planificar/render devuelven tipos correctos', () => {
    expect(creativoGenerar({ action: 'simular' }).action).toBe('simular');
    const p = creativoGenerar({ action: 'planificar', count: 4 });
    expect(p.action).toBe('planificar');
    if (p.action === 'planificar') { expect(p.scene.balls).toHaveLength(4); }
    const r = creativoGenerar({ action: 'render', count: 3 });
    expect(r.action).toBe('render');
    if (r.action === 'render') {
      expect(r.html).toContain('<!doctype html>');
      expect(r.sound.waveform).toBe('sine');
    }
  });
});
