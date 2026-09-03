// -----------------------------------------------------------------------------
// constants.ts - capability `chaos`
// -----------------------------------------------------------------------------
// Constantes, paletas y parámetros de los 4 atractores clásicos.
// -----------------------------------------------------------------------------

import type { AttractorDef, StateVector } from './types';

/** Colores del tema Dark Obsidian (tokens CSS). */
export const CHAOS_COLORS = {
  /** Background canvas: #08080a */
  canvas: '#08080a',
  /** Panel background: #111115 */
  panel: '#111115',
  /** Border subtle: #1f1f2a */
  borderSubtle: '#1f1f2a',
  /** Neo Violet primary: #8b5cf6 */
  primary: '#8b5cf6',
  /** Cyan secondary: #06b6d4 */
  secondary: '#06b6d4',
  /** Star field color */
  star: '#3a3a4a',
  /** Wireframe ghost color */
  wireframe: '#1f1f2a',
  /** Glow intensities */
  glowPrimary: 'rgba(139, 92, 246, 0.6)',
  glowSecondary: 'rgba(6, 182, 212, 0.6)',
} as const;

/** Límites de la simulación. */
export const CHAOS_LIMITS = {
  /** Máximo puntos en buffer de estela. */
  maxTrailPoints: 5000,
  /** Ventana de decay de opacidad. */
  opacityDecayWindow: 500,
  /** Rango de sliders IC. */
  icSliderRange: [-2.5, 2.5] as [number, number],
  /** Rango de slider epsilon. */
  epsilonRange: [0.0001, 0.1] as [number, number],
  /** Factor de decay exponencial de opacidad. */
  opacityDecayFactor: 0.995,
  /** Umbral de divergencia para indicador visual. */
  divergenceThreshold: 0.5,
} as const;

/** Parámetros de Lorenz (σ=10, ρ=28, β=8/3). */
export const LORENZ_PARAMS = {
  sigma: 10,
  rho: 28,
  beta: 8 / 3,
} as const;

/** Parámetros de Rössler (a=0.2, b=0.2, c=5.7). */
export const ROSSLER_PARAMS = {
  a: 0.2,
  b: 0.2,
  c: 5.7,
} as const;

/** Parámetros de Chen (a=35, b=3, c=28). */
export const CHEN_PARAMS = {
  a: 35,
  b: 3,
  c: 28,
} as const;

/** Parámetros de Aizawa (a=0.95, b=0.7, c=0.6, d=3.5, e=0.25, f=0.1). */
export const AIZAWA_PARAMS = {
  a: 0.95,
  b: 0.7,
  c: 0.6,
  d: 3.5,
  e: 0.25,
  f: 0.1,
} as const;

/** Condiciones iniciales por defecto para cada atractor. */
export const DEFAULT_ICS: Record<string, StateVector> = {
  lorenz: [0.1, 0.0, 0.0],
  rossler: [0.1, 0.1, 0.1],
  chen: [-0.1, 0.5, -0.5],
  aizawa: [0.1, 0.0, 0.0],
} as const;

/** Definiciones completas de los 4 atractores. */
export const ATTRACTOR_DEFS: Record<string, AttractorDef> = {
  lorenz: {
    name: 'lorenz',
    params: LORENZ_PARAMS,
    defaultIC: DEFAULT_ICS.lorenz,
    icRange: [-2.5, 2.5],
    primaryColor: CHAOS_COLORS.primary,
    secondaryColor: CHAOS_COLORS.secondary,
    f: (state: StateVector, params: Record<string, number>): StateVector => {
      const [x, y, z] = state;
      const { sigma, rho, beta } = params;
      const dx = sigma * (y - x);
      const dy = x * (rho - z) - y;
      const dz = x * y - beta * z;
      return [dx, dy, dz];
    },
  },

  rossler: {
    name: 'rossler',
    params: ROSSLER_PARAMS,
    defaultIC: DEFAULT_ICS.rossler,
    icRange: [-2.5, 2.5],
    primaryColor: CHAOS_COLORS.primary,
    secondaryColor: CHAOS_COLORS.secondary,
    f: (state: StateVector, params: Record<string, number>): StateVector => {
      const [x, y, z] = state;
      const { a, b, c } = params;
      const dx = -y - z;
      const dy = x + a * y;
      const dz = b + z * (x - c);
      return [dx, dy, dz];
    },
  },

  chen: {
    name: 'chen',
    params: CHEN_PARAMS,
    defaultIC: DEFAULT_ICS.chen,
    icRange: [-2.5, 2.5],
    primaryColor: CHAOS_COLORS.primary,
    secondaryColor: CHAOS_COLORS.secondary,
    f: (state: StateVector, params: Record<string, number>): StateVector => {
      const [x, y, z] = state;
      const { a, b, c } = params;
      const dx = a * (y - x);
      const dy = (c - a) * x - x * z + c * y;
      const dz = x * y - b * z;
      return [dx, dy, dz];
    },
  },

  aizawa: {
    name: 'aizawa',
    params: AIZAWA_PARAMS,
    defaultIC: DEFAULT_ICS.aizawa,
    icRange: [-2.5, 2.5],
    primaryColor: CHAOS_COLORS.primary,
    secondaryColor: CHAOS_COLORS.secondary,
    f: (state: StateVector, params: Record<string, number>): StateVector => {
      const [x, y, z] = state;
      const { a, b, c, d, e, f } = params;
      const xz = x * z;
      const dx = (z - b) * x - d * y;
      const dy = d * x + (z - b) * y;
      const dz = c + a * z - (z * z * z) / 3 - (x * x + y * y) * (1 + e * z) + f * z * xz;
      return [dx, dy, dz];
    },
  },
} as const;

/** Nombres de atractores disponibles (orden de UI). */
export const ATTRACTOR_NAMES = ['lorenz', 'rossler', 'chen', 'aizawa'] as const;

/** Etiquetas legibles para UI. */
export const ATTRACTOR_LABELS: Record<string, string> = {
  lorenz: 'Lorenz (1963)',
  rossler: 'Rössler (1976)',
  chen: 'Chen (1999)',
  aizawa: 'Aizawa (2009)',
} as const;

/** Descripciones para tooltips. */
export const ATTRACTOR_DESCRIPTIONS: Record<string, string> = {
  lorenz: 'El atractor clásico de convección atmosférica. σ=10, ρ=28, β=8/3. Forma de "mariposa" 3D.',
  rossler: 'Sistema más simple con una sola no-linealidad. a=0.2, b=0.2, c=5.7. Espiral caótica.',
  chen: 'Generalización de Lorenz con estructura dual. a=35, b=3, c=28. Dos lóbulos asimétricos.',
  aizawa: 'Atractor con simetría rota y estructura toroidal. Parámetros del paper original 2009.',
} as const;