/**
 * attractors.ts — Strange attractor definitions for the Chaos Game.
 *
 * Each attractor is a pure function: (x, y, z, params) => [dx, dt, dz].
 * No side effects, no imports — pure math.
 */

/* ------------------------------------------------------------------ */
/* Types                                                               */
/* ------------------------------------------------------------------ */

export interface AttractorParams {
  /** Name display. */
  name: string;
  /** Default parameters for the attractor. */
  defaults: Record<string, number>;
  /** Parameter ranges for sliders. */
  ranges: Record<string, [number, number]>;
  /** Scale factor to normalize the attractor into a viewable volume. */
  scale: number;
  /** Suggested initial conditions near the attractor. */
  initial: [number, number, number];
}

export type AttractorFn = (
  x: number, y: number, z: number,
  params: Record<string, number>,
) => [number, number, number];

export interface AttractorDef {
  id: string;
  fn: AttractorFn;
  meta: AttractorParams;
}

/* ------------------------------------------------------------------ */
/* Lorenz Attractor (1963)                                             */
/* dx/dt = σ(y - x)                                                   */
/* dy/dt = x(ρ - z) - y                                               */
/* dz/dt = xy - βz                                                     */
/* ------------------------------------------------------------------ */

const lorenzFn: AttractorFn = (x, y, z, p) => {
  const sigma = p.sigma ?? 10;
  const rho = p.rho ?? 28;
  const beta = p.beta ?? 8 / 3;
  return [
    sigma * (y - x),
    x * (rho - z) - y,
    x * y - beta * z,
  ];
};

const lorenzMeta: AttractorParams = {
  name: 'Lorenz',
  defaults: { sigma: 10, rho: 28, beta: 8 / 3 },
  ranges: {
    sigma: [1, 30],
    rho: [1, 50],
    beta: [0.1, 10],
  },
  scale: 0.06,
  initial: [1, 1, 1],
};

/* ------------------------------------------------------------------ */
/* Rössler Attractor (1976)                                            */
/* dx/dt = -y - z                                                      */
/* dy/dt = x + ay                                                      */
/* dz/dt = b + z(x - c)                                                */
/* ------------------------------------------------------------------ */

const rosslerFn: AttractorFn = (x, y, z, p) => {
  const a = p.a ?? 0.2;
  const b = p.b ?? 0.2;
  const c = p.c ?? 5.7;
  return [
    -y - z,
    x + a * y,
    b + z * (x - c),
  ];
};

const rosslerMeta: AttractorParams = {
  name: 'Rössler',
  defaults: { a: 0.2, b: 0.2, c: 5.7 },
  ranges: {
    a: [0.01, 0.5],
    b: [0.01, 0.5],
    c: [1, 15],
  },
  scale: 0.12,
  initial: [1, 1, 0],
};

/* ------------------------------------------------------------------ */
/* Thomas Attractor (1984)                                             */
/* dx/dt = sin(y) - bx                                                 */
/* dy/dt = sin(z) - by                                                 */
/* dz/dt = sin(x) - bz                                                 */
/* ------------------------------------------------------------------ */

const thomasFn: AttractorFn = (x, y, z, p) => {
  const b = p.b ?? 0.208186;
  return [
    Math.sin(y) - b * x,
    Math.sin(z) - b * y,
    Math.sin(x) - b * z,
  ];
};

const thomasMeta: AttractorParams = {
  name: 'Thomas',
  defaults: { b: 0.208186 },
  ranges: {
    b: [0.05, 0.5],
  },
  scale: 0.8,
  initial: [1, 0, 0],
};

/* ------------------------------------------------------------------ */
/* Halvorsen Attractor (1984)                                          */
/* dx/dt = -ax - 4y - 4z - y²                                         */
/* dy/dt = -ay - 4z - 4x - z²                                         */
/* dz/dt = -az - 4x - 4y - x²                                         */
/* ------------------------------------------------------------------ */

const halvorsenFn: AttractorFn = (x, y, z, p) => {
  const a = p.a ?? 1.89;
  return [
    -a * x - 4 * y - 4 * z - y * y,
    -a * y - 4 * z - 4 * x - z * z,
    -a * z - 4 * x - 4 * y - x * x,
  ];
};

const halvorsenMeta: AttractorParams = {
  name: 'Halvorsen',
  defaults: { a: 1.89 },
  ranges: {
    a: [1, 3],
  },
  scale: 0.15,
  initial: [1, 0, 0],
};

/* ------------------------------------------------------------------ */
/* Registry                                                            */
/* ------------------------------------------------------------------ */

export const ATTRACTORS: AttractorDef[] = [
  { id: 'lorenz', fn: lorenzFn, meta: lorenzMeta },
  { id: 'rossler', fn: rosslerFn, meta: rosslerMeta },
  { id: 'thomas', fn: thomasFn, meta: thomasMeta },
  { id: 'halvorsen', fn: halvorsenFn, meta: halvorsenMeta },
];

export function getAttractor(id: string): AttractorDef {
  const a = ATTRACTORS.find(a => a.id === id);
  if (!a) throw new Error(`Unknown attractor: ${id}`);
  return a;
}

export function attractorIds(): string[] {
  return ATTRACTORS.map(a => a.id);
}
