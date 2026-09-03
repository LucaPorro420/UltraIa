// -----------------------------------------------------------------------------
// index.ts - capability `chaos`
// -----------------------------------------------------------------------------
// Barrel export para el motor de atractores caóticos (Chaos Game).
// -----------------------------------------------------------------------------

export * from './types';
export * from './constants';
export * from './attractors';
export * from './rk4';
export * from './trajectory';

// Namespace para registro en tools/index.ts (ESM — sin require)
import * as types from './types';
import * as constants from './constants';
import * as attractors from './attractors';
import * as rk4 from './rk4';
import * as trajectory from './trajectory';

export const chaos = {
  ...types,
  ...constants,
  ...attractors,
  ...rk4,
  ...trajectory,
};

// Capability metadata para registro en llm.ts
export const chaosCapability = {
  name: 'chaos',
  description: 'Motor de atractores caóticos determinista (Lorenz, Rössler, Chen, Aizawa) con integrador RK4, visualización Three.js interactiva, métricas de divergencia y exponente de Lyapunov.',
  version: '1.0.0',
  tools: [
    'evaluateAttractor',
    'getAttractorDef',
    'listAttractors',
    'createIntegrator',
    'rk4Step',
    'rk4Integrate',
    'TrailBuffer',
    'DualTrailBuffer',
  ],
  keywords: ['chaos', 'attractor', 'lorenz', 'rossler', 'chen', 'aizawa', 'rk4', 'lyapunov', 'butterfly-effect', 'deterministic', 'threejs'],
};