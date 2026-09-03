// -----------------------------------------------------------------------------
// types.ts - capability `chaos`
// -----------------------------------------------------------------------------
// Tipos de dominio para el motor de atractores caóticos (Chaos Game).
// Dominio puro, 0 deps, determinista, keyless.
// -----------------------------------------------------------------------------

/** Vector de estado 3D [x, y, z]. */
export type StateVector = readonly [number, number, number];

/** Punto de la estela con coordenadas 3D + alpha (opacidad) + timestamp. */
export interface TrailPoint {
  x: number;
  y: number;
  z: number;
  alpha: number;
  t: number;
}

/** Parámetros configurables del integrador RK4. */
export interface RK4Config {
  /** Paso de integración (default: 0.005). */
  dt: number;
  /** Pasos por frame de render (default: 10). */
  stepsPerFrame: number;
  /** Máximo de puntos en el buffer de estela (default: 5000). */
  maxTrailPoints: number;
  /** Ventana de decay de opacidad (últimos N puntos, default: 500). */
  opacityDecayWindow: number;
}

/** Definición de un atractor extraño. */
export interface AttractorDef {
  /** Nombre único del atractor. */
  name: AttractorName;
  /** Parámetros fijos del sistema (σ, ρ, β, etc.). */
  params: Record<string, number>;
  /** Condiciones iniciales por defecto [x, y, z]. */
  defaultIC: StateVector;
  /** Rango sugerido para sliders de IC. */
  icRange: [number, number];
  /** Color primario de la trayectoria (hex string). */
  primaryColor: string;
  /** Color secundario de la trayectoria divergente (hex string). */
  secondaryColor: string;
  /** Función ODE: f(state) → dstate/dt. */
  f: (state: StateVector, params: Record<string, number>) => StateVector;
}

/** Nombres válidos de atractores implementados. */
export type AttractorName = 'lorenz' | 'rossler' | 'chen' | 'aizawa';

/** Configuración completa de la simulación. */
export interface ChaosConfig {
  attractor: AttractorName;
  primaryIC: StateVector;
  epsilon: number;
  rk4: RK4Config;
  running: boolean;
}

/** Métricas en vivo calculadas cada frame. */
export interface LiveMetrics {
  /** Distancia euclidiana entre las dos trayectorias. */
  distance: number;
  /** Exponente de Lyapunov aproximado λ ≈ ln(d/ε)/t. */
  lyapunovEstimate: number;
  /** Tiempo de simulación transcurrido. */
  elapsedTime: number;
  /** Frames por segundo. */
  fps: number;
  /** Número de puntos en buffer primario. */
  primaryPoints: number;
  /** Número de puntos en buffer secundario. */
  secondaryPoints: number;
}

/** Parámetros por defecto del integrador RK4. */
export const DEFAULT_RK4_CONFIG: RK4Config = {
  dt: 0.005,
  stepsPerFrame: 10,
  maxTrailPoints: 5000,
  opacityDecayWindow: 500,
};

/** Separación inicial por defecto (ε). */
export const DEFAULT_EPSILON = 0.001;

/** Rangos por defecto para sliders de condiciones iniciales. */
export const DEFAULT_IC_RANGE: [number, number] = [-2.0, 2.0];