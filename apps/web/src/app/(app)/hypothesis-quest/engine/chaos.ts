/**
 * Hypothesis Quest 3D — Chaos Engine
 * Lorenz attractor simulation for butterfly effect mechanics.
 * 
 * The Lorenz system is a set of ordinary differential equations:
 *   dx/dt = σ(y - x)
 *   dy/dt = x(ρ - z) - y
 *   dz/dt = xy - βz
 * 
 * Classic chaotic parameters: σ=10, ρ=28, β=8/3
 * Small changes in initial conditions → drastically different trajectories.
 */

export interface LorenzParams {
  sigma: number;   // Prandtl number
  rho: number;     // Rayleigh number
  beta: number;    // Geometric factor
  dt: number;      // Time step
}

export interface ChaosState {
  x: number;
  y: number;
  z: number;
  t: number;       // Elapsed time
  seed: number;    // Initial seed for reproducibility
}

export interface ChaosTrajectoryPoint {
  x: number;
  y: number;
  z: number;
  t: number;
  normalized: { nx: number; ny: number; nz: number }; // Normalized to [-1, 1]
}

const DEFAULT_PARAMS: LorenzParams = {
  sigma: 10,
  rho: 28,
  beta: 8 / 3,
  dt: 0.005,
};

/**
 * Seeded PRNG (mulberry32) for reproducible chaos.
 */
function mulberry32(seed: number): () => number {
  let s = seed | 0;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Create a new chaos state from a seed.
 */
export function createChaosState(seed: number = Date.now()): ChaosState {
  const rng = mulberry32(seed);
  return {
    x: (rng() - 0.5) * 0.1,  // Small initial perturbation
    y: (rng() - 0.5) * 0.1,
    z: 25 + (rng() - 0.5) * 2, // Start near attractor center
    t: 0,
    seed,
  };
}

/**
 * RK4 integration step for the Lorenz system.
 * More accurate than Euler for chaotic systems.
 */
function lorenzDerivatives(
  x: number, y: number, z: number,
  params: LorenzParams
): [number, number, number] {
  const dx = params.sigma * (y - x);
  const dy = x * (params.rho - z) - y;
  const dz = x * y - params.beta * z;
  return [dx, dy, dz];
}

export function stepChaos(
  state: ChaosState,
  params: LorenzParams = DEFAULT_PARAMS,
  steps: number = 1
): ChaosState {
  let { x, y, z, t, seed } = state;

  for (let i = 0; i < steps; i++) {
    // RK4 integration
    const [k1x, k1y, k1z] = lorenzDerivatives(x, y, z, params);
    
    const x2 = x + k1x * params.dt / 2;
    const y2 = y + k1y * params.dt / 2;
    const z2 = z + k1z * params.dt / 2;
    const [k2x, k2y, k2z] = lorenzDerivatives(x2, y2, z2, params);
    
    const x3 = x + k2x * params.dt / 2;
    const y3 = y + k2y * params.dt / 2;
    const z3 = z + k2z * params.dt / 2;
    const [k3x, k3y, k3z] = lorenzDerivatives(x3, y3, z3, params);
    
    const x4 = x + k3x * params.dt;
    const y4 = y + k3y * params.dt;
    const z4 = z + k3z * params.dt;
    const [k4x, k4y, k4z] = lorenzDerivatives(x4, y4, z4, params);
    
    x += (k1x + 2 * k2x + 2 * k3x + k4x) * params.dt / 6;
    y += (k1y + 2 * k2y + 2 * k3y + k4y) * params.dt / 6;
    z += (k1z + 2 * k2z + 2 * k3z + k4z) * params.dt / 6;
    t += params.dt;
  }

  return { x, y, z, t, seed };
}

/**
 * Normalize Lorenz coordinates to [-1, 1] range for rendering.
 * Lorenz attractor typically ranges: x ∈ [-20, 20], y ∈ [-30, 30], z ∈ [0, 50]
 */
export function normalizeChaosState(state: ChaosState): ChaosTrajectoryPoint {
  return {
    x: state.x,
    y: state.y,
    z: state.z,
    t: state.t,
    normalized: {
      nx: state.x / 20,   // Normalize x to [-1, 1]
      ny: state.y / 30,   // Normalize y to [-1, 1]
      nz: (state.z - 25) / 25, // Normalize z to [-1, 1] (centered at 25)
    },
  };
}

/**
 * Generate a trajectory of N points from a seed.
 * Used for level generation and visualization.
 */
export function generateTrajectory(
  seed: number,
  numPoints: number,
  params: LorenzParams = DEFAULT_PARAMS,
  skipInitial: number = 100 // Skip transient behavior
): ChaosTrajectoryPoint[] {
  const trajectory: ChaosTrajectoryPoint[] = [];
  let state = createChaosState(seed);
  
  // Skip initial transient
  state = stepChaos(state, params, skipInitial);
  
  for (let i = 0; i < numPoints; i++) {
    state = stepChaos(state, params, 10); // 10 steps between recorded points
    trajectory.push(normalizeChaosState(state));
  }
  
  return trajectory;
}

/**
 * Compute the "butterfly distance" between two trajectories.
 * Measures divergence from slightly different initial conditions.
 */
export function butterflyDistance(
  seed1: number,
  seed2: number,
  steps: number = 1000,
  params: LorenzParams = DEFAULT_PARAMS
): number {
  let s1 = createChaosState(seed1);
  let s2 = createChaosState(seed2);
  
  for (let i = 0; i < steps; i++) {
    s1 = stepChaos(s1, params);
    s2 = stepChaos(s2, params);
  }
  
  const dx = s1.x - s2.x;
  const dy = s1.y - s2.y;
  const dz = s1.z - s2.z;
  return Math.sqrt(dx * dx + dy * dy + dz * dz);
}

/**
 * Detect if the system is in a "laminar" (non-chaotic) phase.
 * Useful for gameplay pacing.
 */
export function isLaminar(state: ChaosState, threshold: number = 0.01): boolean {
  const deriv = lorenzDerivatives(state.x, state.y, state.z, DEFAULT_PARAMS);
  const magnitude = Math.sqrt(
    deriv[0] * deriv[0] + deriv[1] * deriv[1] + deriv[2] * deriv[2]
  );
  return magnitude < threshold;
}

/**
 * Get a "chaos intensity" value [0, 1] for visual effects.
 */
export function chaosIntensity(state: ChaosState): number {
  const deriv = lorenzDerivatives(state.x, state.y, state.z, DEFAULT_PARAMS);
  const magnitude = Math.sqrt(
    deriv[0] * deriv[0] + deriv[1] * deriv[1] + deriv[2] * deriv[2]
  );
  // Typical range: 0-500, normalize to [0, 1]
  return Math.min(1, magnitude / 500);
}
