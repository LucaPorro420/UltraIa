import { describe, expect, it } from 'vitest';
import {
  EFFECT_KINDS,
  colorimetryAnalyze,
  codevfx,
  curvatureShade,
  perspectivePlan,
  planEffect,
  renderEffectHtml,
  codevfxV2,
  ZONE_KINDS,
  castShapeFor,
  effectSettingsTree,
  deepMergePreset,
  fractionalSpawn,
  resolveSpawnDimensions,
  lightShimmer,
  phaseMachine,
  evaluatePhase,
  flickerClocks,
  noiseProfileFor,
  aimIndicatorPlan,
  zoneIndicatorPlan,
  snappedZoneRadius,
  particleSystemSpec,
  renderPipelinePlan,
  validateDecalSampling,
  geometryShapeHash,
  needsGeometryRebuild,
  drawCallBudget,
  MAX_CONCURRENT_CASTS,
  LIGHT_POOL_SIZE,
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


describe('codevfx v2: settings-as-API', () => {
  it('genera un arbol de settings por kind con contrato de cast completo', () => {
    for (const kind of EFFECT_KINDS) {
      const tree = effectSettingsTree(kind);
      expect(tree.kind).toBe(kind);
      for (const key of ['range', 'minRange', 'speed', 'cooldown'] as const) {
        expect(tree.cast[key]).toBeDefined();
      }
      expect(tree.cast.range.unit).toBe('m');
      expect(tree.cast.speed.unit).toBe('m/s');
    }
  });

  it('los kinds de zona exponen zoneRadius y minRange 0 (regla de la trampa)', () => {
    for (const kind of ZONE_KINDS) {
      const tree = effectSettingsTree(kind);
      expect(castShapeFor(kind)).toBe('zone');
      expect(tree.cast.zoneRadius).toBeDefined();
      expect(tree.cast.minRange.value).toBe(0);
    }
  });

  it('overrides por kind: beam llega mas lejos que ice', () => {
    const ice = effectSettingsTree('ice');
    const beam = effectSettingsTree('beam');
    expect(beam.cast.range.value).toBeGreaterThan(ice.cast.range.value);
  });

  it('deepMergePreset es inmutable sobre base y mezcla anidado', () => {
    const tree = effectSettingsTree('ice');
    const snapshot = JSON.stringify(tree);
    const merged = deepMergePreset(tree, { cast: { range: { value: 18 } }, global: { glow: { value: 2.5 } } });
    expect(JSON.stringify(tree)).toBe(snapshot); // base intacta
    expect(merged.cast.range.value).toBe(18);
    expect(merged.cast.range.max).toBe(tree.cast.range.max); // hermanos conservados
    expect(merged.global.glow.value).toBe(2.5);
    expect(merged.effect).toEqual(tree.effect); // grupo no tocado igual
  });

  it('deepMergePreset reemplaza arrays completos (sin merge por indice)', () => {
    const base = { items: [1, 2, 3], nested: { list: ['a'] } };
    const merged = deepMergePreset(base, { items: [9], nested: { list: ['b', 'c'] } });
    expect(merged.items).toEqual([9]);
    expect(merged.nested.list).toEqual(['b', 'c']);
  });
});

describe('codevfx v2: no-dimensions-on-CPU', () => {
  it('fractionalSpawn captura SOLO fracciones + seed + timestamp', () => {
    const rec = fractionalSpawn('lightning', { seed: 0.7, distance01: 1.4, lateral01: -3, atMs: 1234 });
    expect(rec.seed).toBe(0.7);
    expect(rec.distance01).toBe(1); // clamp a fraccion valida
    expect(rec.lateral01).toBe(-1); // clamp lateral
    expect(rec.spawnedAtMs).toBe(1234);
    expect(Object.keys(rec).sort()).toEqual(['distance01', 'kind', 'lateral01', 'seed', 'spawnedAtMs']);
  });

  it('es determinista sin seed explicita (default fijo, no aleatorio)', () => {
    expect(fractionalSpawn('beam')).toEqual(fractionalSpawn('beam'));
    expect(fractionalSpawn('beam').seed).toBe(0.42);
  });

  it('resolveSpawnDimensions resuelve metros contra el arbol VIGENTE', () => {
    const rec = fractionalSpawn('ice', { distance01: 0.5, seed: 0.1 });
    const base = resolveSpawnDimensions(rec);
    expect(base.distanceM).toBeCloseTo(1.5 + 0.5 * (12 - 1.5), 3); // minRange + frac*(range-min)
    // Editar en pausa: un preset con range distinto cambia la resolucion del MISMO record
    const tree = effectSettingsTree('ice');
    const patched = deepMergePreset(tree, { cast: { range: { value: 20 } } });
    const after = resolveSpawnDimensions(rec, patched as unknown as Parameters<typeof resolveSpawnDimensions>[1]);
    expect(after.distanceM).toBeGreaterThan(base.distanceM);
  });

  it('easeIn del frente usa ventana 0.08s outQuad (peso sin paso cero)', () => {
    const rec = fractionalSpawn('meteor');
    expect(resolveSpawnDimensions(rec, undefined, 0).easeIn).toBe(0);
    expect(resolveSpawnDimensions(rec, undefined, 0.04).easeIn).toBeCloseTo(0.75, 3);
    expect(resolveSpawnDimensions(rec, undefined, 0.08).easeIn).toBe(1);
    expect(resolveSpawnDimensions(rec, undefined, 5).easeIn).toBe(1); // saturado
  });

  it('shimmer de luz: formula senoidal lenta verificada del vendor', () => {
    expect(lightShimmer(0)).toBeCloseTo(0.9, 6);
    const s1 = lightShimmer(Math.PI / 9.3 / 2); // primer pico parcial del primer seno
    expect(s1).toBeGreaterThan(0.8);
    expect(s1).toBeLessThan(1.01);
  });

  it('zona resuelve zoneRadiusM; linea lo deja null', () => {
    expect(resolveSpawnDimensions(fractionalSpawn('ground')).zoneRadiusM).not.toBeNull();
    expect(resolveSpawnDimensions(fractionalSpawn('fire')).zoneRadiusM).toBeNull();
  });
});

describe('codevfx v2: phase machine', () => {
  it('windup solo para beam/plasma (beat 4 del upstream)', () => {
    expect(phaseMachine('beam').phases[0]).toBe('windup');
    expect(phaseMachine('plasma').windupS).toBe(0.7);
    expect(phaseMachine('fire').phases[0]).toBe('travel');
    expect(phaseMachine('ice').windupS).toBe(0);
  });

  it('duraciones impact/fade fijas del upstream (1.1s / 1.2s)', () => {
    for (const kind of EFFECT_KINDS) {
      const pm = phaseMachine(kind);
      expect(pm.impactS).toBe(1.1);
      expect(pm.fadeS).toBe(1.2);
    }
  });

  it('evaluatePhase transita travel->impact->fade->done determinista', () => {
    const pm = phaseMachine('ice'); // sin windup
    const d = 10;
    const v = 20; // travel dura 0.5s
    expect(evaluatePhase(pm, 0, d, v).phase).toBe('travel');
    expect(evaluatePhase(pm, 0.25, d, v).t).toBeCloseTo(0.5, 2);
    expect(evaluatePhase(pm, 0.5, d, v).phase).toBe('impact');
    expect(evaluatePhase(pm, 0.5 + 1.1 + 0.6, d, v).phase).toBe('fade');
    // edad claramente PASADA del borde: el instante exacto es ambiguo en FP
    expect(evaluatePhase(pm, 3, d, v)).toEqual({ phase: 'done', t: 1 });
    expect(evaluatePhase(pm, 0.5 + 1.1 + 1.19, d, v).phase).toBe('fade');
  });
});

describe('codevfx v2: dos relojes de flicker', () => {
  it('strikeIndex floor(t*restrike) con default 24 Hz del vendor', () => {
    expect(flickerClocks(0).strikeIndex).toBe(0);
    expect(flickerClocks(1).strikeIndex).toBe(24);
    expect(flickerClocks(2 / 24).strikeIndex).toBe(2);
  });

  it('crawlPhase es continua y wrappea en 1 (default 3.2 del vendor)', () => {
    const a = flickerClocks(0.125); // 0.125*3.2 = 0.4
    expect(a.crawlPhase).toBeCloseTo(0.4, 4);
    const b = flickerClocks(10); // 32 -> wrap exacto a 0
    expect(b.crawlPhase).toBeCloseTo(0, 4);
    expect(flickerClocks(5, { restrikeHz: 0 }).strikeIndex).toBe(0); // guard max(0.01)
  });
});

describe('codevfx v2: perfiles de ruido', () => {
  it('rayo/meteoro = piecewise-linear; las esquinas SON el rayo', () => {
    expect(noiseProfileFor('lightning').profile).toBe('piecewise-linear');
    expect(noiseProfileFor('meteor').sampling).toBe('plane');
    expect(noiseProfileFor('lightning').rationale).toContain('esquinas');
  });

  it('beam/plasma = smooth-flow (un beam que se quiebra es un bolt)', () => {
    expect(noiseProfileFor('beam').profile).toBe('smooth-flow');
    expect(noiseProfileFor('plasma').rationale).toContain('bolt');
  });

  it('hielo = fbm dual espacio mundo+local; resto = plano warpeado', () => {
    expect(noiseProfileFor('ice').profile).toBe('dual-space-fbm');
    expect(noiseProfileFor('frost').sampling).toBe('world+local');
    expect(noiseProfileFor('ground').profile).toBe('domain-warped-plane');
  });
});

describe('codevfx v2: indicadores SDF en metros', () => {
  it('flecha: constantes metricas del upstream + derivacion desde UNA SDF', () => {
    const aim = aimIndicatorPlan({ rangeM: 15, minRangeM: 2 });
    expect(aim.shaftHalfWidthM).toBe(0.42);
    expect(aim.headLengthM).toBe(2.6);
    expect(aim.cornerRoundM).toBe(0.12);
    expect(aim.units).toBe('metres');
    expect(aim.silhouette).toContain('triangle-head');
    expect(aim.derivation.length).toBeGreaterThanOrEqual(5);
    expect(aim.rangeM).toBe(15);
    expect(aim.minRangeM).toBe(2);
  });

  it('circulo de zona: borde metrico constante sea cual sea el radio', () => {
    const small = zoneIndicatorPlan({ zoneRadiusM: 2 });
    const big = zoneIndicatorPlan({ zoneRadiusM: 8 });
    expect(small.boundaryM).toBe(big.boundaryM); // 0.34 m SIEMPRE
    expect(small.snap).toBe(1.18);
    expect(small.boundaryBias).toBeLessThan(0.5); // crece hacia adentro
  });

  it('snappedZoneRadius implementa outCubic x bump pico tardio que muere en 1', () => {
    expect(snappedZoneRadius(4.5, 0)).toBeCloseTo(0, 3);
    expect(snappedZoneRadius(4.5, 1)).toBeCloseTo(4.5, 3); // bump muerto en t=1
    const mid = snappedZoneRadius(4.5, 0.5);
    expect(mid).toBeGreaterThan(4.5); // overshoot real en el medio
    const peak = Math.max(...Array.from({ length: 101 }, (_, i) => snappedZoneRadius(4.5, i / 100)));
    expect(peak).toBeGreaterThan(4.5 * 1.14); // overshoot material
    expect(peak).toBeLessThan(4.5 * 1.18); // sin superar el techo del snap
  });
});

describe('codevfx v2: GPU particles ring buffer', () => {
  it('familia hielo: mist non-additive + glitter con gravedad negativa', () => {
    const spec = particleSystemSpec('ice');
    const mist = spec.systems.find((s) => s.id === 'mist');
    const glitter = spec.systems.find((s) => s.id === 'glitter');
    expect(mist?.blending).toBe('normal');
    expect(glitter?.gravitySign).toBe(-1);
    expect(spec.systems.every((s) => s.gradient.length === 4)).toBe(true);
  });

  it('rayo: sparks streak + nota anti-fireworks del vendor', () => {
    const spec = particleSystemSpec('lightning');
    expect(spec.systems.map((s) => s.silhouette)).toContain('streak');
    expect(spec.designNote).toContain('fireworks');
  });

  it('gradiente lifetime nace en energy y muere oscuro; capacidades > 0', () => {
    const spec = particleSystemSpec('beam');
    expect(spec.systems[0].gradient[3]).toBe('#0b0b10');
    for (const s of particleSystemSpec('meteor').systems) {
      expect(s.capacity).toBeGreaterThan(0);
    }
  });
});

describe('codevfx v2: pipeline + decal + hash + budget', () => {
  it('pipeline ordenado depth-prepass -> grade con ACES antes del grade', () => {
    const plan = renderPipelinePlan();
    const ids = plan.passes.map((p) => p.id);
    expect(ids[0]).toBe('depth-prepass');
    expect(ids.indexOf('tonemap-aces')).toBeLessThan(ids.indexOf('grade'));
    expect(plan.gradeTerms).toContain('chromaticAberration');
    expect(plan.notes.join(' ')).toContain('1.75');
  });

  it('anti-patron angular: RECHAZA atan/polar y exige domain warp', () => {
    const bad = validateDecalSampling({ sampling: 'angular-atan' });
    expect(bad.ok).toBe(false);
    expect(bad.errors[0]).toContain('ANGULAR_SAMPLING_DRAWS_STARS');
    const meh = validateDecalSampling({ sampling: 'plane' });
    expect(meh.ok).toBe(true);
    expect(meh.warnings.length).toBe(1); // sin warp avisa
    const good = validateDecalSampling({ sampling: 'plane', domainWarp: true });
    expect(good.ok).toBe(true);
    expect(good.warnings.length).toBe(0);
  });

  it('hash de forma: formato facets|taper|roughness|bend y rebuild solo si cambia', () => {
    const a = { facets: 6, taper: 0.72, roughness: 0.31, bend: 0.05 };
    expect(geometryShapeHash(a)).toBe('6|0.720|0.310|0.050');
    const same = { ...a, taper: 0.7204 };
    expect(needsGeometryRebuild(a, same)).toBe(false); // 3 decimales: sin rebuild
    const diff = { ...a, bend: 0.11 };
    expect(needsGeometryRebuild(a, diff)).toBe(true);
  });

  it('presupuesto de draws por familia verificado del vendor', () => {
    expect(drawCallBudget('lightning').calls).toBe(6);
    expect(drawCallBudget('lightning').caps.filaments).toBe(24);
    expect(drawCallBudget('beam').calls).toBe(10);
    expect(drawCallBudget('beam').lights.usedByEffect).toBe(2);
    expect(drawCallBudget('ice').caps.crystals).toBe(288);
    const zoneArmed = drawCallBudget('ground', { zoneCircleArmed: true });
    expect(zoneArmed.calls).toBe(5); // jaula 2 + campo 1 + circulo 2
    expect(MAX_CONCURRENT_CASTS).toBe(4);
    expect(LIGHT_POOL_SIZE).toBe(6);
  });

  it('namespace codevfxV2 expone toda la superficie nueva', () => {
    for (const fn of [
      'effectSettingsTree',
      'deepMergePreset',
      'fractionalSpawn',
      'resolveSpawnDimensions',
      'phaseMachine',
      'evaluatePhase',
      'flickerClocks',
      'noiseProfileFor',
      'aimIndicatorPlan',
      'zoneIndicatorPlan',
      'particleSystemSpec',
      'renderPipelinePlan',
      'validateDecalSampling',
      'geometryShapeHash',
      'drawCallBudget',
    ] as const) {
      expect(typeof (codevfxV2 as Record<string, unknown>)[fn]).toBe('function');
    }
  });
});