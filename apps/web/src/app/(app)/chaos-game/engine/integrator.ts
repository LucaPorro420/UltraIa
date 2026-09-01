/**
 * integrator.ts — RK4 numerical integrator for chaotic ODEs.
 *
 * Fourth-order Runge-Kutta provides much better trajectory accuracy
 * than Euler for chaotic systems. Step size dt=0.005 is a good balance
 * between smoothness and performance.
 */

import type { AttractorFn } from './attractors';

/* ------------------------------------------------------------------ */
/* Types                                                               */
/* ------------------------------------------------------------------ */

export interface IntegrationState {
  x: number;
  y: number;
  z: number;
  /** Current time (accumulated dt * step). */
  t: number;
}

export interface IntegrationParams {
  /** Time step. Smaller = more accurate but slower. */
  dt: number;
  /** Number of points to generate. */
  steps: number;
}

/* ------------------------------------------------------------------ */
/* RK4 Integrator                                                      */
/* ------------------------------------------------------------------ */

/**
 * Integrate a 3D ODE system using RK4.
 * Returns an array of [x, y, z] points forming the trajectory.
 */
export function integrate(
  fn: AttractorFn,
  params: Record<string, number>,
  initial: [number, number, number],
  integParams: IntegrationParams,
): [number, number, number][] {
  const { dt, steps } = integParams;
  const points: [number, number, number][] = new Array(steps);
  let [x, y, z] = initial;

  for (let i = 0; i < steps; i++) {
    points[i] = [x, y, z];

    // RK4 stages
    const [k1x, k1y, k1z] = fn(x, y, z, params);

    const x2 = x + 0.5 * dt * k1x;
    const y2 = y + 0.5 * dt * k1y;
    const z2 = z + 0.5 * dt * k1z;
    const [k2x, k2y, k2z] = fn(x2, y2, z2, params);

    const x3 = x + 0.5 * dt * k2x;
    const y3 = y + 0.5 * dt * k2y;
    const z3 = z + 0.5 * dt * k2z;
    const [k3x, k3y, k3z] = fn(x3, y3, z3, params);

    const x4 = x + dt * k3x;
    const y4 = y + dt * k3y;
    const z4 = z + dt * k3z;
    const [k4x, k4y, k4z] = fn(x4, y4, z4, params);

    x += (dt / 6) * (k1x + 2 * k2x + 2 * k3x + k4x);
    y += (dt / 6) * (k1y + 2 * k2y + 2 * k3y + k4y);
    z += (dt / 6) * (k1z + 2 * k2z + 2 * k3z + k4z);
  }

  return points;
}

/**
 * Step the ODE forward by a single RK4 step.
 * Returns the new state.
 */
export function stepRK4(
  fn: AttractorFn,
  params: Record<string, number>,
  state: IntegrationState,
  dt: number,
): IntegrationState {
  const { x, y, z } = state;

  const [k1x, k1y, k1z] = fn(x, y, z, params);
  const [k2x, k2y, k2z] = fn(
    x + 0.5 * dt * k1x,
    y + 0.5 * dt * k1y,
    z + 0.5 * dt * k1z,
    params,
  );
  const [k3x, k3y, k3z] = fn(
    x + 0.5 * dt * k2x,
    y + 0.5 * dt * k2y,
    z + 0.5 * dt * k2z,
    params,
  );
  const [k4x, k4y, k4z] = fn(
    x + dt * k3x,
    y + dt * k3y,
    z + dt * k3z,
    params,
  );

  return {
    x: x + (dt / 6) * (k1x + 2 * k2x + 2 * k3x + k4x),
    y: y + (dt / 6) * (k1y + 2 * k2y + 2 * k3y + k4y),
    z: z + (dt / 6) * (k1z + 2 * k2z + 2 * k3z + k4z),
    t: state.t + dt,
  };
}

/**
 * Compute Euclidean distance between two 3D points.
 */
export function distance3D(
  a: [number, number, number],
  b: [number, number, number],
): number {
  const dx = a[0] - b[0];
  const dy = a[1] - b[1];
  const dz = a[2] - b[2];
  return Math.sqrt(dx * dx + dy * dy + dz * dz);
}
