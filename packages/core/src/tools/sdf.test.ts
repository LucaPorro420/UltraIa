import { describe, it, expect } from 'vitest';
import {
  SDF_PRIMITIVES,
  SDF_OPS,
  sdSphere,
  sdBox,
  sdTorus,
  sdCapsule,
  sdPlane,
  opUnion,
  opIntersection,
  opSubtract,
  opSmoothUnion,
  evalSdf,
  planSdfScene,
  sdfSceneGlsl,
  rayMarchPlan,
  renderSdfHtml,
  sdf,
  type SdfPrimitive,
  type SdfOp,
} from './sdf';

const escenaBasica: SdfPrimitive[] = [
  { kind: 'sphere', pos: [0, 0, 0], color: '#8b5cf6', params: { radius: 1 } },
  { kind: 'box', pos: [0, 0, 0], color: '#f59e0b', params: { half: [1, 1, 1] } },
];

describe('sdf: primitivas (matemática estándar)', () => {
  it('sdSphere: centro -r, superficie 0, fuera > 0', () => {
    expect(sdSphere([0, 0, 0], [0, 0, 0], 1)).toBe(-1);
    expect(sdSphere([1, 0, 0], [0, 0, 0], 1)).toBeCloseTo(0, 10);
    expect(sdSphere([2, 0, 0], [0, 0, 0], 1)).toBe(1);
  });

  it('sdBox: centro -min(half), superficie 0, esquina diagonal', () => {
    const b: [number, number, number] = [1, 2, 3];
    expect(sdBox([0, 0, 0], [0, 0, 0], b)).toBe(-1); // -min(1,2,3)
    expect(sdBox([1, 0, 0], [0, 0, 0], b)).toBeCloseTo(0, 10);
    expect(sdBox([2, 0, 0], [0, 0, 0], b)).toBe(1);
  });

  it('sdTorus: en el anillo (r1, 0) la distancia es -r2', () => {
    expect(sdTorus([0.5, 0, 0], [0, 0, 0], 0.5, 0.25)).toBeCloseTo(-0.25, 10);
    // Encima del anillo (0.5, r2, 0): superficie del tubo → 0
    expect(sdTorus([0.5, 0.25, 0], [0, 0, 0], 0.5, 0.25)).toBeCloseTo(0, 10);
  });

  it('sdCapsule: centro del segmento -r, extremos -r', () => {
    const a: [number, number, number] = [-1, 0, 0];
    const b: [number, number, number] = [1, 0, 0];
    expect(sdCapsule([0, 0, 0], [0, 0, 0], a, b, 0.5)).toBeCloseTo(-0.5, 10);
    expect(sdCapsule([1.5, 0, 0], [0, 0, 0], a, b, 0.5)).toBeCloseTo(0, 10);
    expect(sdCapsule([0, 2, 0], [0, 0, 0], a, b, 0.5)).toBeCloseTo(1.5, 10);
  });

  it('sdPlane: distancia = p.y - h', () => {
    expect(sdPlane([0, 0, 0], 0)).toBe(0);
    expect(sdPlane([0, 3, 0], 1)).toBe(2);
    expect(sdPlane([0, -1, 0], 0)).toBe(-1);
  });

  it('SDF_PRIMITIVES y SDF_OPS contienen los 5 y 4 elementos del plan', () => {
    expect(SDF_PRIMITIVES).toEqual(['sphere', 'box', 'torus', 'capsule', 'plane']);
    expect(SDF_OPS).toEqual(['union', 'intersection', 'subtract', 'smooth']);
  });
});

describe('sdf: operaciones', () => {
  it('union = min, intersection = max', () => {
    expect(opUnion(1, 2)).toBe(1);
    expect(opUnion(-1, 0.5)).toBe(-1);
    expect(opIntersection(1, 2)).toBe(2);
    expect(opIntersection(-1, 0.5)).toBe(0.5);
  });

  it('subtract = max(a, -b)', () => {
    expect(opSubtract(1, 2)).toBe(1);
    expect(opSubtract(-1, 2)).toBe(-1); // A dentro, B fuera → nada que restar
    expect(opSubtract(1, -2)).toBe(2);
  });

  it('smooth union: continuo y |smooth - min| <= k/2', () => {
    const k = 0.5;
    // Lejos del radio de fusión coincide con min
    expect(opSmoothUnion(3, 1, k)).toBeCloseTo(1, 10);
    // En la zona de fusión difiere suavemente
    const s = opSmoothUnion(0.2, 0, k);
    expect(s).toBeGreaterThanOrEqual(Math.min(0.2, 0) - k / 2);
    expect(s).toBeLessThanOrEqual(Math.min(0.2, 0) + k / 2);
    // Continuidad: evaluar cerca no produce saltos
    expect(Math.abs(opSmoothUnion(0.2001, 0, k) - s)).toBeLessThan(0.01);
  });
});

describe('sdf: evalSdf (árbol de la escena)', () => {
  it('sin ops: devuelve la primitiva raíz y su material', () => {
    const h = evalSdf(escenaBasica, [], 0, [0, 0, 0]);
    expect(h.d).toBeCloseTo(-1, 10);
    expect(h.material).toBe(0);
  });

  it('union: min de las dos distancias', () => {
    const ops: SdfOp[] = [{ op: 'union', targets: [0, 1] }];
    // Dos esferas r=1 separadas 3 unidades: cada una gana en su zona
    const prims: SdfPrimitive[] = [
      { kind: 'sphere', pos: [0, 0, 0], color: '#8b5cf6', params: { radius: 1 } },
      { kind: 'sphere', pos: [3, 0, 0], color: '#f59e0b', params: { radius: 1 } },
    ];
    // Dentro de la esfera 0 (empate en el punto medio 1.5 → gana a por <=)
    const h = evalSdf(prims, ops, 0, [1.5, 0, 0]);
    expect(h.material).toBe(0);
    expect(h.d).toBeCloseTo(0.5, 10);
    // Dentro de la esfera 1 → gana la esfera 1
    const h2 = evalSdf(prims, ops, 0, [2.5, 0, 0]);
    expect(h2.material).toBe(1);
    expect(h2.d).toBeCloseTo(-0.5, 10);
  });

  it('subtract: esfera - caja excava la zona compartida', () => {
    const ops: SdfOp[] = [{ op: 'subtract', targets: [0, 1] }];
    // subtract(a,b)=max(a,-b); centro: a=esfera=-1, b=caja=-1 → max(-1, 1) = 1
    const h = evalSdf(escenaBasica, ops, 0, [0, 0, 0]);
    expect(h.d).toBe(1);
    // Fuera de la caja (x=2, la caja half=1 acaba en 1): solo esfera → d = 2-1 = 1
    const h2 = evalSdf(escenaBasica, ops, 0, [2, 0, 0]);
    expect(h2.d).toBeCloseTo(1, 10);
    expect(h2.material).toBe(0);
  });

  it('cadena union[0,1] + smooth[1,2]: evalúa union(0, smooth(1,2))', () => {
    const prims: SdfPrimitive[] = [
      { kind: 'sphere', pos: [-2, 0, 0], color: '#8b5cf6', params: { radius: 1 } },
      { kind: 'sphere', pos: [0, 0, 0], color: '#f59e0b', params: { radius: 1 } },
      { kind: 'sphere', pos: [2, 0, 0], color: '#10b981', params: { radius: 1 } },
    ];
    const ops: SdfOp[] = [
      { op: 'smooth', targets: [1, 2], k: 0.4 },
      { op: 'union', targets: [0, 1] },
    ];
    // Punto en el centro de la esfera 2: la cadena debe verlo (vía smooth(1,2))
    const h = evalSdf(prims, ops, 0, [2, 0, 0]);
    expect(h.material).toBe(2);
    expect(h.d).toBeCloseTo(-1, 10);
    // Punto entre 1 y 2: suavizado (d < 0 estando en la zona de fusión, pero > -1)
    const mid = evalSdf(prims, ops, 0, [1, 0.2, 0]);
    expect(mid.d).toBeGreaterThan(-1);
    expect(mid.d).toBeLessThan(0);
  });

  it('no entra en recursión con ops degeneradas (auto-referencia)', () => {
    const ops: SdfOp[] = [{ op: 'union', targets: [0, 0] }];
    const h = evalSdf(escenaBasica, ops, 0, [0, 0, 0]);
    expect(h.d).toBeCloseTo(-1, 10);
  });
});

describe('sdf: planSdfScene', () => {
  const input = {
    primitives: escenaBasica,
    ops: [{ op: 'subtract' as const, targets: [0, 1] as [number, number] }],
    camera: { fov: 60, distance: 8, tilt: 15 },
    steps: 64,
  };

  it('planifica la escena con defaults y normaliza parámetros', () => {
    const plan = planSdfScene({ primitives: escenaBasica });
    expect(plan.primitives.length).toBe(2);
    expect(plan.root).toBe(0);
    expect(plan.camera.fov).toBe(60);
    expect(plan.camera.distance).toBe(8);
    expect(plan.steps).toBe(64);
    expect(plan.epsilon).toBe(0.001);
    expect(plan.maxDist).toBe(40);
    expect(plan.palette.base).toBe('#8b5cf6');
    expect(plan.formula).toContain('sphere');
  });

  it('completa la fórmula humana con ops (chain 0: smooth(1,2) y union(0,1))', () => {
    const plan = planSdfScene({
      primitives: [escenaBasica[0], escenaBasica[0], escenaBasica[0]],
      ops: [
        { op: 'smooth', targets: [1, 2], k: 0.4 },
        { op: 'union', targets: [0, 1] },
      ],
      root: 0,
    });
    expect(plan.formula).toContain('sphere[0]');
    expect(plan.formula).toContain('smooth(0.4)');
  });

  it('valida: sin primitivas lanza error', () => {
    expect(() => planSdfScene({ primitives: [] })).toThrow('al menos 1 primitiva');
  });

  it('valida: radio <= 0, half <= 0, r1/r2 <= 0', () => {
    expect(() => planSdfScene({ primitives: [{ kind: 'sphere', pos: [0, 0, 0], color: '#fff', params: { radius: 0 } }] })).toThrow('radio');
    expect(() => planSdfScene({ primitives: [{ kind: 'box', pos: [0, 0, 0], color: '#fff', params: { half: [1, 0, 1] } }] })).toThrow('half');
    expect(() => planSdfScene({ primitives: [{ kind: 'torus', pos: [0, 0, 0], color: '#fff', params: { r1: 0 } }] })).toThrow('r1/r2');
  });

  it('valida: targets fuera de rango y k <= 0', () => {
    expect(() => planSdfScene({ primitives: escenaBasica, ops: [{ op: 'union', targets: [0, 9] }] })).toThrow('targets');
    expect(() => planSdfScene({ primitives: escenaBasica, ops: [{ op: 'smooth', targets: [0, 1], k: 0 }] })).toThrow('k');
  });

  it('clampa cámara y steps', () => {
    const plan = planSdfScene({ primitives: escenaBasica, camera: { fov: 200, distance: 1, tilt: 90 }, steps: 999 });
    expect(plan.camera.fov).toBe(120);
    expect(plan.camera.distance).toBe(2);
    expect(plan.camera.tilt).toBe(45);
    expect(plan.steps).toBe(256);
  });

  it('determinista: mismo input → mismo plan', () => {
    const a = planSdfScene(input);
    const b = planSdfScene(input);
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
  });
});

describe('sdf: sdfSceneGlsl (codegen)', () => {
  it('genera las funciones de las primitivas y ops usadas', () => {
    const plan = planSdfScene({
      primitives: escenaBasica,
      ops: [{ op: 'union', targets: [0, 1] }],
    });
    const glsl = sdfSceneGlsl(plan);
    expect(glsl).toContain('sdSphere');
    expect(glsl).toContain('sdBox');
    expect(glsl).toContain('opUnion');
    expect(glsl).toContain('calcNormal');
    expect(glsl).not.toContain('sdTorus'); // no usada
  });

  it('genera opSmoothUnion solo si hay smooth', () => {
    const plan = planSdfScene({
      primitives: [escenaBasica[0], escenaBasica[0]],
      ops: [{ op: 'smooth', targets: [0, 1], k: 0.3 }],
    });
    const glsl = sdfSceneGlsl(plan);
    expect(glsl).toContain('opSmoothUnion');
    expect(glsl).toContain('mix(b, a, h)');
  });
});

describe('sdf: rayMarchPlan', () => {
  it('planifica el render 16:9 con coste estimado determinista', () => {
    const plan = planSdfScene({ primitives: escenaBasica });
    const r = rayMarchPlan(plan);
    expect(r.marchMode).toBe('sphere-tracing');
    expect(r.resolution.w).toBe(480);
    expect(r.resolution.h).toBe(270);
    expect(r.steps).toBe(64);
    expect(r.epsilon).toBe(0.001);
    expect(r.estOpsPerFrame).toBe(480 * 270 * 64 * 2);
  });

  it('respeta steps reducidos', () => {
    const plan = planSdfScene({ primitives: escenaBasica, steps: 32 });
    const r = rayMarchPlan(plan);
    expect(r.steps).toBe(32);
  });
});

describe('sdf: renderSdfHtml', () => {
  it('genera HTML autocontenido sin script externo ni URLs', () => {
    const plan = planSdfScene({ primitives: escenaBasica, ops: [{ op: 'union', targets: [0, 1] }] });
    const html = renderSdfHtml(plan);
    expect(html).toContain('<canvas');
    expect(html).toContain('SCENE =');
    expect(html).not.toContain('<script src=');
    expect(html).not.toContain('http://');
    expect(html).not.toContain('https://');
    expect(html).toContain('role="img"');
    expect(html).toContain('aria-label');
  });

  it('incluye el GLSL de referencia comentado y la fórmula', () => {
    const plan = planSdfScene({ primitives: escenaBasica });
    const html = renderSdfHtml(plan);
    expect(html).toContain('// SDF scene');
    expect(html).toContain('sdSphere');
    expect(html).toContain('sphere[0]');
  });

  it('el JS del render usa el mismo modelo de árbol que evalSdf (convención)', () => {
    const plan = planSdfScene({ primitives: escenaBasica, ops: [{ op: 'union', targets: [0, 1] }] });
    const html = renderSdfHtml(plan);
    expect(html).toContain('evalNode');
    expect(html).toContain('combine');
  });

  it('determinista: mismo plan → mismo html', () => {
    const plan = planSdfScene({ primitives: escenaBasica });
    expect(renderSdfHtml(plan)).toBe(renderSdfHtml(plan));
  });

  it('respeta título custom y escapa comillas del GLSL', () => {
    const plan = planSdfScene({ primitives: escenaBasica });
    const html = renderSdfHtml(plan, { title: 'Mi escena "sdf"', width: 320, height: 180 });
    expect(html).toContain('Mi escena "sdf"');
    expect(html).toContain('<canvas');
  });
});

describe('sdf: exports', () => {
  it('el namespace sdf expone la API completa', () => {
    expect(sdf.SDF_PRIMITIVES).toBe(SDF_PRIMITIVES);
    expect(sdf.planSdfScene).toBe(planSdfScene);
    expect(sdf.sdfSceneGlsl).toBe(sdfSceneGlsl);
    expect(sdf.rayMarchPlan).toBe(rayMarchPlan);
    expect(sdf.renderSdfHtml).toBe(renderSdfHtml);
    expect(sdf.evalSdf).toBe(evalSdf);
    expect(sdf.sdSphere).toBe(sdSphere);
    expect(sdf.opSmoothUnion).toBe(opSmoothUnion);
  });
});