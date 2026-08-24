import { describe, expect, it } from 'vitest';

import {
  createBody,
  createStaticFloor,
  createVerletStack,
  renderPhysicsHtml,
  rigidConfigSchema,
  rigidMass,
  rigidMechanicalEnergy,
  rigidTotalMomentum,
  RIGID_DT,
  simulateRigid,
  stepRigid,
  stepVerlet,
  verletConfigSchema,
  verletImplicitVelocity,
  verletKineticEnergy,
  type RigidState,
  type VerletState,
} from './physics2d';

/* ------------------------------------------------------------------ */
/* VERLET                                                              */
/* ------------------------------------------------------------------ */

const RECT_CONTAINER = { kind: 'rect' as const, x: 0, y: 0, width: 600, height: 800 };
const CIRCLE_CONTAINER = { kind: 'circle' as const, cx: 300, cy: 300, radius: 250 };

function runVerlet(state: VerletState, container: typeof RECT_CONTAINER | typeof CIRCLE_CONTAINER, frames: number) {
  let cur = state;
  for (let i = 0; i < frames; i++) cur = stepVerlet(cur, container);
  return cur;
}

describe('physics2d — verlet', () => {
  it('es determinista bit-exact: misma entrada -> mismo estado final', () => {
    const s1 = createVerletStack(6, RECT_CONTAINER);
    const s2 = createVerletStack(6, RECT_CONTAINER);
    const a = runVerlet(s1, RECT_CONTAINER, 90);
    const b = runVerlet(s2, RECT_CONTAINER, 90);
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
  });

  it('no muta el estado de entrada', () => {
    const state = createVerletStack(3, RECT_CONTAINER);
    const snapshot = JSON.stringify(state);
    stepVerlet(state, RECT_CONTAINER);
    expect(JSON.stringify(state)).toBe(snapshot);
  });

  it('una partícula cae con la gravedad', () => {
    const p = { x: 300, y: 100, px: 300, py: 100, ax: 0, ay: 0, radius: 15 };
    const out = stepVerlet({ particles: [p], links: [] }, RECT_CONTAINER);
    expect(out.particles[0].y).toBeGreaterThan(100);
  });

  it('el contenedor circular mantiene la partícula dentro', () => {
    const p = { x: 300, y: 80, px: 300, py: 80, ax: 0, ay: 0, radius: 12 };
    const out = runVerlet({ particles: [p], links: [] }, CIRCLE_CONTAINER, 200);
    const d = Math.hypot(out.particles[0].x - CIRCLE_CONTAINER.cx, out.particles[0].y - CIRCLE_CONTAINER.cy);
    expect(d).toBeLessThanOrEqual(CIRCLE_CONTAINER.radius + 1e-6);
  });

  it('el contenedor rectangular mantiene la partícula dentro', () => {
    const p = { x: 30, y: 40, px: 30, py: 40, ax: 0, ay: 0, radius: 10 };
    const out = runVerlet({ particles: [p], links: [] }, RECT_CONTAINER, 150);
    const q = out.particles[0];
    expect(q.x).toBeGreaterThanOrEqual(RECT_CONTAINER.x);
    expect(q.x).toBeLessThanOrEqual(RECT_CONTAINER.x + RECT_CONTAINER.width);
    expect(q.y).toBeLessThanOrEqual(RECT_CONTAINER.y + RECT_CONTAINER.height);
  });

  it('un link stick conserva su longitud de reposo tras estabilizar', () => {
    const state: VerletState = {
      particles: [
        { x: 280, y: 100, px: 280, py: 100, ax: 0, ay: 0, radius: 14 },
        { x: 320, y: 140, px: 320, py: 140, ax: 0, ay: 0, radius: 14 },
      ],
      links: [{ a: 0, b: 1, length: Math.hypot(40, 40) }],
    };
    const out = runVerlet(state, RECT_CONTAINER, 180);
    const [a, b] = out.particles;
    const len = Math.hypot(b.x - a.x, b.y - a.y);
    expect(Math.abs(len - Math.hypot(40, 40))).toBeLessThan(Math.hypot(40, 40) * 0.02);
  });

  it('la pila se asienta: energía decreciente y velocidad residual ~0', () => {
    const state = createVerletStack(5, RECT_CONTAINER, 22);
    const cfg = { gravity: [0, 980] as [number, number], dt: 1 / 60, substeps: 8, responseCoef: 0.75 };
    let cur = state;
    for (let i = 1; i <= 260; i++) cur = stepVerlet(cur, RECT_CONTAINER, cfg);
    const keLate = verletKineticEnergy(cur, cfg);
    // Velocidad implícita por substep casi nula en todas las partículas
    for (const p of cur.particles) {
      expect(Math.abs(p.x - p.px)).toBeLessThan(0.75);
      expect(Math.abs(p.y - p.py)).toBeLessThan(0.75);
    }
    // La energía tardía es una fracción pequeña del pico inicial de caída
    let mid = state;
    for (let i = 1; i <= 30; i++) mid = stepVerlet(mid, RECT_CONTAINER, cfg);
    const keMid = verletKineticEnergy(mid, cfg);
    expect(keLate).toBeLessThan(keMid);
  });

  it('colisión simétrica con responseCoef 1 preserva el punto medio', () => {
    const state: VerletState = {
      particles: [
        { x: 290, y: 300, px: 290, py: 300, ax: 0, ay: 0, radius: 20 },
        { x: 315, y: 300, px: 315, py: 300, ax: 0, ay: 0, radius: 20 },
      ],
      links: [],
    };
    const cfg = { gravity: [0, 0] as [number, number] };
    const out = stepVerlet(state, RECT_CONTAINER, cfg);
    const [a, b] = out.particles;
    const midBefore = (290 + 315) / 2;
    const midAfter = (a.x + b.x) / 2;
    expect(Math.abs(midAfter - midBefore)).toBeLessThan(1e-9);
    // Solapamiento 25px -> separación simétrica
    expect(b.x - a.x).toBeGreaterThan(39);
  });

  it('verletImplicitVelocity escala por substeps/dt', () => {
    const p = { x: 101, y: 200, px: 100, py: 200, ax: 0, ay: 0, radius: 10 };
    const [vx, vy] = verletImplicitVelocity(p, { dt: 1 / 60, substeps: 4 });
    expect(vx).toBeCloseTo(4 / (1 / 60), 10);
    expect(vy).toBeCloseTo(0, 12);
  });

  it('damping reduce el desplazamiento por frame', () => {
    const mk = (): VerletState => ({
      particles: [{ x: 300, y: 100, px: 300, py: 94, ax: 0, ay: 0, radius: 10 }],
      links: [],
    });
    const noDamp = stepVerlet(mk(), RECT_CONTAINER, { gravity: [0, 0], damping: 1 });
    const damp = stepVerlet(mk(), RECT_CONTAINER, { gravity: [0, 0], damping: 0.9 });
    // La velocidad implícita (6 px/frame) persiste a través de los 8 substeps:
    // sin damping recorre ~v*substeps; con 0.9 se disipa geométricamente.
    const dNoDamp = Math.abs(noDamp.particles[0].y - 100);
    const dDamp = Math.abs(damp.particles[0].y - 100);
    expect(dNoDamp).toBeCloseTo(48, 6);
    expect(dDamp).toBeGreaterThan(28);
    expect(dDamp).toBeLessThan(dNoDamp);
  });

  it('el estado es serializable y re-simulable desde JSON', () => {
    const state = createVerletStack(4, RECT_CONTAINER);
    const parsed = JSON.parse(JSON.stringify(runVerlet(state, RECT_CONTAINER, 10))) as VerletState;
    const a = runVerlet(parsed, RECT_CONTAINER, 10);
    const direct = runVerlet(runVerlet(state, RECT_CONTAINER, 10), RECT_CONTAINER, 10);
    expect(JSON.stringify(a)).toBe(JSON.stringify(direct));
  });

  it('los defaults del config son los del SPEC (responseCoef 0.75, substeps 8)', () => {
    const cfg = verletConfigSchema.parse({});
    expect(cfg.responseCoef).toBe(0.75);
    expect(cfg.substeps).toBe(8);
    expect(cfg.gravity).toEqual([0, 980]);
  });
});

/* ------------------------------------------------------------------ */
/* RÍGIDOS                                                             */
/* ------------------------------------------------------------------ */

const ZERO_G = { gravity: [0, 0] as [number, number] };

describe('physics2d — rigidos', () => {
  it('RIGID_DT es 1/60', () => {
    expect(RIGID_DT).toBeCloseTo(1 / 60, 15);
  });

  it('un círculo cae sobre el suelo estático y se asienta', () => {
    const floor = createStaticFloor(1200, 400);
    const ball = createBody('ball', { kind: 'circle', r: 20 }, 0, 100, { restitution: 0.2, friction: 0.5 });
    const end = simulateRigid({ bodies: [floor, ball] }, 300);
    expect(end.bodies[0].x).toBe(floor.x);
    expect(end.bodies[0].y).toBe(floor.y);
    expect(Math.abs(end.bodies[1].vy)).toBeLessThan(12);
    expect(Math.abs(end.bodies[1].y - 380)).toBeLessThan(3);
  });

  it('choque elástico cabeza-a-cabeza de masas iguales intercambia velocidades (momento conservado)', () => {
    const r = 20;
    const a = createBody('a', { kind: 'circle', r }, -r - 1, 0, { restitution: 1, friction: 0 });
    a.vx = 10;
    const b = createBody('b', { kind: 'circle', r }, r + 1, 0, { restitution: 1, friction: 0 });
    b.vx = -10;
    let st: RigidState = { bodies: [a, b] };
    for (let i = 0; i < 30; i++) st = stepRigid(st, ZERO_G);
    expect(st.bodies[0].vx).toBeLessThan(-9.999);
    expect(st.bodies[1].vx).toBeGreaterThan(9.999);
    const [px, py] = rigidTotalMomentum(st);
    expect(Math.abs(px)).toBeLessThan(1e-9);
    expect(Math.abs(py)).toBeLessThan(1e-9);
  });

  it('el momento total se conserva en masas distintas (gravedad cero)', () => {
    const a = createBody('a', { kind: 'box', hw: 10, hh: 10 }, -30, 0, { restitution: 0.85, friction: 0, density: 2 });
    a.vx = 24;
    const b = createBody('b', { kind: 'box', hw: 10, hh: 10 }, 30, 0, { restitution: 0.85, friction: 0, density: 1 });
    b.vx = -8;
    const before = rigidTotalMomentum({ bodies: [a, b] });
    let st: RigidState = { bodies: [structuredClone(a), structuredClone(b)] };
    for (let i = 0; i < 60; i++) st = stepRigid(st, ZERO_G);
    const after = rigidTotalMomentum(st);
    expect(after[0]).toBeCloseTo(before[0], 6);
    expect(after[1]).toBeCloseTo(before[1], 6);
  });

  it('restitución 0 elimina el rebote', () => {
    const floor = createStaticFloor(1200, 400);
    const ball = createBody('b', { kind: 'circle', r: 20 }, 0, 120, { restitution: 0, friction: 0.4 });
    let st: RigidState = { bodies: [floor, ball] };
    let contacted = false;
    let highestAfterContact = Infinity;
    for (let i = 0; i < 240; i++) {
      st = stepRigid(st);
      const y = st.bodies[1].y;
      if (!contacted && y >= 379) contacted = true;
      else if (contacted) highestAfterContact = Math.min(highestAfterContact, y);
    }
    expect(contacted).toBe(true);
    // Sin rebote: tras el primer contacto nunca sube apreciablemente sobre la superficie
    expect(highestAfterContact).toBeGreaterThanOrEqual(380 - 1.5);
    expect(Math.abs(st.bodies[1].vy)).toBeLessThan(8);
  });

  it('la fricción reduce la velocidad tangencial al deslizar', () => {
    const mk = (friction: number) => {
      const floor = { ...createStaticFloor(1200, 400), friction: 1 };
      const box = createBody('box', { kind: 'box', hw: 30, hh: 30 }, -200, 369.99, { restitution: 0, friction });
      box.vx = 160;
      return { bodies: [floor, box] };
    };
    const lo = simulateRigid(mk(0.02), 30);
    const hi = simulateRigid(mk(0.81), 30);
    // La variante con poca fricción conserva buena parte de la velocidad; la otra casi se detiene
    expect(lo.bodies[1].vx).toBeGreaterThan(50);
    expect(hi.bodies[1].vx).toBeLessThan(5);
    expect(Math.abs(hi.bodies[1].vx)).toBeLessThan(Math.abs(lo.bodies[1].vx));
  });

  it('dos cajas solapadas se separan por el eje de menor penetración', () => {
    const a = createBody('a', { kind: 'box', hw: 20, hh: 20 }, -5, 0, { restitution: 0, friction: 0 });
    const b = createBody('b', { kind: 'box', hw: 20, hh: 20 }, 15, 0, { restitution: 0, friction: 0 });
    const out = stepRigid({ bodies: [a, b] }, ZERO_G);
    const gap = Math.abs(out.bodies[1].x - out.bodies[0].x);
    // Penetración inicial 20 -> corrección posicional 80% => separación ~36
    expect(gap).toBeGreaterThan(34);
    expect(out.bodies[1].y).toBe(0); // eje X era el de menor penetración
  });

  it('un círculo reposa sobre una caja estática', () => {
    const table = createBody('table', { kind: 'box', hw: 100, hh: 10 }, 0, 300, { isStatic: true, restitution: 0.3, friction: 0.5 });
    const ball = createBody('b', { kind: 'circle', r: 15 }, 0, 100, { restitution: 0.3, friction: 0.5 });
    const end = simulateRigid({ bodies: [table, ball] }, 240);
    expect(Math.abs(end.bodies[1].y - 275)).toBeLessThan(3);
    expect(Math.abs(end.bodies[1].vy)).toBeLessThan(12);
  });

  it('los cuerpos estáticos jamás se mueven', () => {
    const floor = createStaticFloor();
    const wall = createBody('wall', { kind: 'box', hw: 10, hh: 200 }, 500, 300, { isStatic: true });
    const snap = JSON.stringify([floor.x, floor.y, wall.x, wall.y]);
    const end = simulateRigid({ bodies: [floor, wall] }, 120);
    expect(JSON.stringify([end.bodies[0].x, end.bodies[0].y, end.bodies[1].x, end.bodies[1].y])).toBe(snap);
  });

  it('pirámide de 5 cajas: sin NaN, contenida y sin explosión tras 300 frames', () => {
    const floor = createStaticFloor(1200, 400);
    const mkBox = (id: string, x: number, y: number) =>
      createBody(id, { kind: 'box', hw: 30, hh: 30 }, x, y, { restitution: 0.1, friction: 0.55 });
    const bodies = [
      mkBox('l1', -70, 369),
      mkBox('r1', 70, 369),
      mkBox('l2', -35, 305),
      mkBox('r2', 35, 305),
      mkBox('top', 0, 241),
    ];
    const start = { bodies: [floor, ...bodies] };
    const end = simulateRigid(start, 300);
    for (const b of [...end.bodies]) {
      expect(Number.isFinite(b.x)).toBe(true);
      expect(Number.isFinite(b.y)).toBe(true);
      expect(Number.isFinite(b.vx)).toBe(true);
      expect(Number.isFinite(b.vy)).toBe(true);
    }
    // Sin explosión: todo permanece sobre la zona del suelo
    for (const b of end.bodies.filter((x) => !x.isStatic)) {
      expect(Math.abs(b.x)).toBeLessThan(400);
      expect(b.y).toBeLessThan(600);
    }
    // Disipación: al final las velocidades residuales son mínimas frente a la caída libre
    // (una caja en caída libre alcanza cientos de px/s; el reposo con micro-jitter queda < 10)
    const maxSpeed = Math.max(
      ...end.bodies.filter((b) => !b.isStatic).map((b) => Math.hypot(b.vx, b.vy)),
    );
    expect(maxSpeed).toBeLessThan(10);
  });

  it('rigidMechanicalEnergy calcula KE exacto para caja unitaria', () => {
    const b = createBody('k', { kind: 'box', hw: 1, hh: 1 }, 0, 0, { density: 1 });
    b.vx = 3;
    b.vy = 4;
    const e = rigidMechanicalEnergy({ bodies: [b] }, ZERO_G);
    // masa = 4*1*1*1 = 4 -> KE = 0.5*4*25 = 50
    expect(e.kinetic).toBeCloseTo(50, 10);
    expect(e.potential).toBeCloseTo(0, 12);
  });

  it('rigidMass usa densidad y área (círculo pi*r^2)', () => {
    const c = createBody('c', { kind: 'circle', r: 2 }, 0, 0, { density: 3 });
    expect(rigidMass(c)).toBeCloseTo(Math.PI * 4 * 3, 12);
  });

  it('createStaticFloor coloca la superficie en topY', () => {
    const f = createStaticFloor(1000, 350, 80);
    expect(f.isStatic).toBe(true);
    expect(f.y - (f.shape as { hh: number }).hh).toBe(350);
  });

  it('simulateRigid(N) equivale byte-exact a N pasos individuales', () => {
    const mk = () => ({ bodies: [createStaticFloor(), createBody('b', { kind: 'circle', r: 18 }, 5, 90, { restitution: 0.35 })] });
    const batched = simulateRigid(mk(), 137);
    let manual = mk();
    for (let i = 0; i < 137; i++) manual = stepRigid(manual);
    expect(JSON.stringify(batched)).toBe(JSON.stringify(manual));
  });

  it('el config rígido respeta sus defaults Baumgarte (percent 0.8, slop 0.01)', () => {
    const cfg = rigidConfigSchema.parse({});
    expect(cfg.percent).toBe(0.8);
    expect(cfg.slop).toBe(0.01);
    expect(cfg.dt).toBe(RIGID_DT);
  });

  it('los ids se preservan a través de los pasos', () => {
    const st = { bodies: [createBody('uno', { kind: 'box', hw: 5, hh: 5 }, 0, 0), createBody('dos', { kind: 'box', hw: 5, hh: 5 }, 40, 0)] };
    const out = stepRigid(st, ZERO_G);
    expect(out.bodies.map((b) => b.id)).toEqual(['uno', 'dos']);
  });
});

/* ------------------------------------------------------------------ */
/* RENDER HTML                                                         */
/* ------------------------------------------------------------------ */

describe('physics2d — renderPhysicsHtml', () => {
  it('genera HTML autocontenido accesible (role=img, sin recursos externos)', () => {
    const html = renderPhysicsHtml({
      verlet: { state: createVerletStack(3, CIRCLE_CONTAINER), container: CIRCLE_CONTAINER },
      rigid: { bodies: [createStaticFloor()] },
    });
    expect(html).toContain('<!doctype html>');
    expect(html).toContain('role="img"');
    expect(html).toContain('aria-labelledby');
    expect(html).toContain('<canvas');
    expect(html).not.toMatch(/https?:\/\//);
    expect(html).not.toContain('<script src=');
    // El mundo queda embebido como payload JSON
    expect(html).toContain('"particles"');
    expect(html).toContain('"bodies"');
  });

  it('escapa el título (XSS-safe en atributos)', () => {
    const html = renderPhysicsHtml({ rigid: { bodies: [] } }, { title: '<img src=x onerror=alert(1)>' });
    expect(html).not.toContain('<img src=x');
    expect(html).toContain('&lt;img');
  });

  it('funciona con mundo vacío', () => {
    const html = renderPhysicsHtml({});
    expect(html).toContain('<canvas');
  });
});
