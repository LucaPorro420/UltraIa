import { describe, expect, it } from 'vitest';
import {
  EFFECT_KINDS,
  colorimetryAnalyze,
  codevfx,
  curvatureShade,
  perspectivePlan,
  planEffect,
  renderEffectHtml,
} from './codevfx';

describe('codevfx: planEffect', () => {
  it('genera un plan para cada uno de los 9 kinds', () => {
    for (const kind of EFFECT_KINDS) {
      const plan = planEffect(kind);
      expect(plan.kind).toBe(kind);
      expect(plan.palette.base).toMatch(/^#[0-9a-f]{6}$/i);
      expect(plan.particles.count).toBeGreaterThan(0);
      expect(plan.shaderGlsl).toContain('vec3');
      expect(plan.hotkey).toMatch(/^[A-Z]$/);
    }
  });

  it('es determinista: mismo input → mismo plan', () => {
    expect(planEffect('fire')).toEqual(planEffect('fire'));
  });

  it('intensidad escala el conteo de partículas (±40%)', () => {
    const low = planEffect('fire', { intensity: 0 });
    const high = planEffect('fire', { intensity: 100 });
    expect(high.particles.count).toBeGreaterThan(low.particles.count);
    expect(low.particles.count).toBeGreaterThanOrEqual(Math.round(420 * 0.6));
    expect(high.particles.count).toBeLessThanOrEqual(Math.round(420 * 1.4));
  });

  it('intensidad aumenta la vida de las partículas', () => {
    const low = planEffect('ice', { intensity: 0 });
    const high = planEffect('ice', { intensity: 100 });
    expect(high.particles.life).toBeGreaterThan(low.particles.life);
  });

  it('clampa intensidad y velocidad a rangos válidos', () => {
    const plan = planEffect('meteor', { intensity: 500, speed: 9 });
    expect(plan.intensity).toBe(100);
    expect(plan.speed).toBe(3);
  });

  it('cada kind tiene paleta, física y capas coherentes', () => {
    const fire = planEffect('fire');
    expect(fire.physics.gravity).toBeLessThan(0); // fuego sube
    expect(fire.layers.some((l) => l.blend === 'lighter')).toBe(true);
    const beam = planEffect('beam');
    expect(beam.physics.gravity).toBe(0); // rayo no cae
    const lightning = planEffect('lightning');
    expect(lightning.particles.life).toBeLessThan(1); // chispas efímeras
  });

  it('incluye los campos del plan completo', () => {
    const plan = planEffect('void');
    expect(plan).toHaveProperty('name');
    expect(plan).toHaveProperty('palette.energy');
    expect(plan).toHaveProperty('layers');
    expect(plan.layers.length).toBeGreaterThanOrEqual(2);
  });
});

describe('codevfx: colorimetryAnalyze', () => {
  it('convierte hex a HSL y calcula calor', () => {
    const report = colorimetryAnalyze(['#ff2d2d']);
    expect(report.colors[0].hsl.h).toBeLessThan(30); // rojo puro → hue 0
    expect(report.colors[0].warmth).toBeGreaterThan(0.5); // cálido
  });

  it('clasifica paletas cálidas vs frías', () => {
    const fire = colorimetryAnalyze(['#ff6b35', '#ffd166']);
    const ice = colorimetryAnalyze(['#7dd3fc', '#38bdf8']);
    expect(fire.warmthMean).toBeGreaterThan(0);
    expect(ice.warmthMean).toBeLessThan(0);
  });

  it('detecta coherencia cuando saturación y calor están cerca', () => {
    const coherent = colorimetryAnalyze(['#ff6b35', '#ffd166']);
    expect(coherent.coherent).toBe(true);
  });

  it('detecta incoherencia (mezcla frío-cálido o saturación extrema)', () => {
    const incoherent = colorimetryAnalyze(['#ff6b35', '#38bdf8']);
    expect(incoherent.coherent).toBe(false);
  });

  it('elige dominante por luminancia', () => {
    const report = colorimetryAnalyze(['#111111', '#f5f5f5']);
    expect(report.dominant).toBe('#f5f5f5');
  });

  it('lanza error sin colores', () => {
    expect(() => colorimetryAnalyze([])).toThrow('al menos un color');
  });
});

describe('codevfx: curvatureShade', () => {
  it('plano (curvatura 0) apenas sombrea', () => {
    const flat = curvatureShade('#888888', 0);
    expect(flat.factor).toBeLessThanOrEqual(0.26);
  });

  it('curvatura alta oscurece más el lado opuesto', () => {
    const flat = curvatureShade('#888888', 0);
    const curved = curvatureShade('#888888', 1);
    expect(curved.factor).toBeGreaterThan(flat.factor);
  });

  it('devuelve degradado highlight → shadow válido', () => {
    const res = curvatureShade('#8b5cf6', 0.6);
    expect(res.gradient).toHaveLength(3);
    for (const c of res.gradient) expect(c).toMatch(/^#[0-9a-f]{6}$/i);
    expect(res.highlight).not.toBe(res.shadow);
  });

  it('clampa curvatura fuera de rango', () => {
    expect(curvatureShade('#fff', 5).factor).toBe(curvatureShade('#fff', 1).factor);
  });

  it('el highlight nunca supera 255 y el shadow nunca baja de 0', () => {
    const res = curvatureShade('#ffffff', 1);
    expect(res.highlight).toBe('#ffffff');
    const dark = curvatureShade('#000000', 1);
    expect(dark.shadow).toBe('#000000');
  });
});

describe('codevfx: perspectivePlan', () => {
  it('calcula fov desde distancia', () => {
    const far = perspectivePlan(3, { distance: 20 });
    const near = perspectivePlan(3, { distance: 6 });
    expect(near.camera.fov).toBeGreaterThan(far.camera.fov);
  });

  it('genera offsets de parallax por profundidad', () => {
    const plan = perspectivePlan(4);
    expect(plan.layerOffsets).toHaveLength(4);
    expect(plan.layerOffsets[3].offsetPx).toBeGreaterThan(plan.layerOffsets[0].offsetPx);
  });

  it('la capa más lejana tiene mayor offset', () => {
    const plan = perspectivePlan(3);
    const offsets = plan.layerOffsets.map((l) => l.offsetPx);
    expect(offsets).toEqual([...offsets].sort((a, b) => a - b));
  });

  it('clampa número de capas', () => {
    expect(perspectivePlan(0).layerOffsets).toHaveLength(1);
    expect(perspectivePlan(99).layerOffsets).toHaveLength(8);
  });

  it('incluye tilt configurable y aspect 16:9', () => {
    const plan = perspectivePlan(2, { tilt: 30 });
    expect(plan.camera.tilt).toBe(30);
    expect(plan.aspect).toBe('16:9');
  });
});

describe('codevfx: renderEffectHtml', () => {
  it('genera HTML autocontenido sin recursos externos', () => {
    const html = renderEffectHtml(planEffect('lightning'));
    expect(html).toContain('<!doctype html>');
    expect(html).toContain('<canvas id="fx">');
    expect(html).not.toContain('http');
    expect(html).not.toContain('src=');
  });

  it('incrusta la paleta y física del plan', () => {
    const plan = planEffect('fire');
    const html = renderEffectHtml(plan);
    expect(html).toContain(plan.palette.base);
    expect(html).toContain(String(plan.particles.count));
    expect(html).toContain(String(plan.physics.gravity));
  });

  it('incluye el GLSL hand-written como referencia comentada', () => {
    const html = renderEffectHtml(planEffect('void'));
    expect(html).toContain('GLSL hand-written');
    expect(html).toContain('vec3');
  });

  it('incluye reacción a input (pointermove + hotkey)', () => {
    const html = renderEffectHtml(planEffect('meteor'));
    expect(html).toContain('pointermove');
    expect(html).toContain('keydown');
  });

  it('acepta tamaño y título custom', () => {
    const html = renderEffectHtml(planEffect('plasma'), { width: 1280, height: 720, title: 'Plasma Demo' });
    expect(html).toContain('<title>Plasma Demo</title>');
  });
});

describe('codevfx: export', () => {
  it('expone las 5 funciones y los kinds', () => {
    expect(codevfx.planEffect).toBeTypeOf('function');
    expect(codevfx.colorimetryAnalyze).toBeTypeOf('function');
    expect(codevfx.curvatureShade).toBeTypeOf('function');
    expect(codevfx.perspectivePlan).toBeTypeOf('function');
    expect(codevfx.renderEffectHtml).toBeTypeOf('function');
    expect(EFFECT_KINDS).toHaveLength(9);
  });
});
