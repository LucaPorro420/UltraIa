// -----------------------------------------------------------------------------
// attractors.ts - capability `chaos`
// -----------------------------------------------------------------------------
// 4 sistemas ODE autónomos para atractores caóticos clásicos.
// Funciones puras: misma entrada → misma salida, sin estado mutable.
// -----------------------------------------------------------------------------

import type { StateVector, AttractorDef } from './types';
import { ATTRACTOR_DEFS } from './constants';

/**
 * Evalúa la ODE de un atractor por nombre.
 * @param name Nombre del atractor ('lorenz' | 'rossler' | 'chen' | 'aizawa')
 * @param state Vector de estado actual [x, y, z]
 * @returns Derivada [dx/dt, dy/dt, dz/dt]
 * @throws Si el atractor no existe
 */
export function evaluateAttractor(name: string, state: StateVector): StateVector {
  const def = ATTRACTOR_DEFS[name];
  if (!def) {
    throw new Error(`Attractor "${name}" no implementado. Válidos: ${Object.keys(ATTRACTOR_DEFS).join(', ')}`);
  }
  return def.f(state, def.params);
}

/**
 * Obtiene la definición completa de un atractor.
 */
export function getAttractorDef(name: string): AttractorDef {
  const def = ATTRACTOR_DEFS[name];
  if (!def) {
    throw new Error(`Attractor "${name}" no encontrado.`);
  }
  return def;
}

/**
 * Lista todos los nombres de atractores disponibles.
 */
export function listAttractors(): string[] {
  return Object.keys(ATTRACTOR_DEFS);
}

/**
 * Crea la condición inicial secundaria añadiendo ε a la primaria.
 * La perturbación se aplica solo a X para mantener la comparación controlada.
 */
export function createSecondaryIC(primaryIC: StateVector, epsilon: number): StateVector {
  return [
    primaryIC[0] + epsilon,
    primaryIC[1],
    primaryIC[2],
  ];
}

/**
 * Valida que un estado sea finito (no NaN/Infinity).
 */
export function isValidState(state: StateVector): boolean {
  return state.every(v => Number.isFinite(v));
}

/**
 * Clona un estado (inmutabilidad).
 */
export function cloneState(state: StateVector): StateVector {
  return [...state] as StateVector;
}

/**
 * Suma dos estados componente a componente.
 */
export function addState(a: StateVector, b: StateVector): StateVector {
  return [a[0] + b[0], a[1] + b[1], a[2] + b[2]] as StateVector;
}

/**
 * Escala un estado por un factor escalar.
 */
export function scaleState(state: StateVector, scalar: number): StateVector {
  return [state[0] * scalar, state[1] * scalar, state[2] * scalar] as StateVector;
}

/**
 * Distancia euclidiana entre dos estados.
 */
export function stateDistance(a: StateVector, b: StateVector): number {
  const dx = a[0] - b[0];
  const dy = a[1] - b[1];
  const dz = a[2] - b[2];
  return Math.sqrt(dx * dx + dy * dy + dz * dz);
}

/**
 * Norma euclidiana de un estado.
 */
export function stateNorm(state: StateVector): number {
  return Math.sqrt(state[0] * state[0] + state[1] * state[1] + state[2] * state[2]);
}