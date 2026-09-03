// -----------------------------------------------------------------------------
// rk4.ts - capability `chaos`
// -----------------------------------------------------------------------------
// Integrador Runge-Kutta 4to orden (RK4) para sistemas ODE autónomos.
// Determinista, paso fijo, sin estado mutable global.
// -----------------------------------------------------------------------------

import type { StateVector, RK4Config } from './types';
import { DEFAULT_RK4_CONFIG } from './types';

/**
 * Realiza un solo paso RK4.
 * @param f Función ODE: f(state) → dstate/dt
 * @param state Estado actual [x, y, z]
 * @param dt Paso de tiempo
 * @returns Nuevo estado tras un paso RK4
 */
export function rk4Step(
  f: (state: StateVector) => StateVector,
  state: StateVector,
  dt: number
): StateVector {
  const [x, y, z] = state;

  // k1 = f(t, y)
  const k1 = f(state);

  // k2 = f(t + dt/2, y + dt/2 * k1)
  const k2 = f([
    x + dt * 0.5 * k1[0],
    y + dt * 0.5 * k1[1],
    z + dt * 0.5 * k1[2],
  ]);

  // k3 = f(t + dt/2, y + dt/2 * k2)
  const k3 = f([
    x + dt * 0.5 * k2[0],
    y + dt * 0.5 * k2[1],
    z + dt * 0.5 * k2[2],
  ]);

  // k4 = f(t + dt, y + dt * k3)
  const k4 = f([
    x + dt * k3[0],
    y + dt * k3[1],
    z + dt * k3[2],
  ]);

  // y_{n+1} = y_n + dt/6 * (k1 + 2*k2 + 2*k3 + k4)
  const inv6 = 1 / 6;
  return [
    x + dt * inv6 * (k1[0] + 2 * k2[0] + 2 * k3[0] + k4[0]),
    y + dt * inv6 * (k1[1] + 2 * k2[1] + 2 * k3[1] + k4[1]),
    z + dt * inv6 * (k1[2] + 2 * k2[2] + 2 * k3[2] + k4[2]),
  ] as StateVector;
}

/**
 * Integra hacia adelante N pasos RK4 y devuelve la trayectoria completa.
 * Útil para pre-computar o testing.
 */
export function rk4Integrate(
  f: (state: StateVector) => StateVector,
  initialState: StateVector,
  dt: number,
  steps: number
): StateVector[] {
  const trajectory: StateVector[] = [];
  let current = [...initialState] as StateVector;

  for (let i = 0; i < steps; i++) {
    trajectory.push([...current] as StateVector);
    current = rk4Step(f, current, dt);
  }

  return trajectory;
}

/**
 * Clase para integración RK4 con estado persistente (para simulación en tiempo real).
 * Mantiene el estado actual y config, avanza N pasos por llamada a step().
 */
export class RK4Integrator {
  private state: StateVector;
  private readonly f: (state: StateVector) => StateVector;
  private readonly config: RK4Config;

  constructor(
    f: (state: StateVector) => StateVector,
    initialState: StateVector,
    config: Partial<RK4Config> = {}
  ) {
    this.f = f;
    this.state = [...initialState] as StateVector;
    this.config = { ...DEFAULT_RK4_CONFIG, ...config };
  }

  /** Estado actual (inmutable). */
  get currentState(): StateVector {
    return [...this.state] as StateVector;
  }

  /** Configuración actual. */
  getConfig(): RK4Config {
    return { ...this.config };
  }

  /** Reinicia el integrador con nuevo estado inicial. */
  reset(newState: StateVector): void {
    this.state = [...newState] as StateVector;
  }

  /**
   * Avanza la simulación `stepsPerFrame` pasos RK4.
   * @returns Array con los estados intermedios (uno por paso RK4)
   */
  step(): StateVector[] {
    const states: StateVector[] = [];
    const { dt, stepsPerFrame } = this.config;

    for (let i = 0; i < stepsPerFrame; i++) {
      this.state = rk4Step(this.f, this.state, dt);
      states.push([...this.state] as StateVector);
    }

    return states;
  }

  /**
   * Avanza un solo paso RK4 y devuelve el nuevo estado.
   */
  stepOne(): StateVector {
    this.state = rk4Step(this.f, this.state, this.config.dt);
    return [...this.state] as StateVector;
  }
}

/**
 * Factory para crear un integrador RK4 a partir de un nombre de atractor.
 */
export function createIntegrator(
  attractorName: string,
  initialState: StateVector,
  config?: Partial<RK4Config>
): RK4Integrator {
  const def = require('./constants').ATTRACTOR_DEFS[attractorName];
  if (!def) {
    throw new Error(`Attractor "${attractorName}" no encontrado para crear integrador`);
  }
  const ode = (state: StateVector) => def.f(state, def.params);
  return new RK4Integrator(ode, initialState, config);
}

/**
 * Valida que el integrador produzca resultados finitos.
 */
export function validateIntegrator(
  integrator: RK4Integrator,
  maxSteps: number = 1000
): { valid: boolean; firstInvalidStep?: number } {
  for (let i = 0; i < maxSteps; i++) {
    const state = integrator.stepOne();
    if (!state.every(v => Number.isFinite(v))) {
      return { valid: false, firstInvalidStep: i };
    }
  }
  return { valid: true };
}