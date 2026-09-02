/**
 * chaos-game — Deterministic fractal generator via the chaos game method.
 *
 * The chaos game: pick a random starting point inside a polygon, then
 * repeatedly move toward a randomly chosen vertex by a relaxation factor
 * (default 0.5 = halfway). Plot each landing point. Different polygon sizes,
 * relaxation factors, and vertex-selection rules produce different fractals:
 *
 *   3 sides, r=0.5 → Sierpinski triangle
 *   5 sides, r=0.5 → pentagon fractal
 *   6 sides, r=0.5 → hexagon fractal (Koch-like)
 *   3 sides, r=0.618 (golden) → golden triangle
 *   custom rules → constrained chaos (ban same vertex, ban adjacent, etc.)
 *
 * Deterministic: seeded mulberry32 PRNG. Same spec → same points → same image.
 * Zero dependencies (only generative.ts mulberry32 + fnv1a for checksum).
 */
import { mulberry32, fnv1a } from './generative';

/* ------------------------------------------------------------------ */
/* Types                                                               */
/* ------------------------------------------------------------------ */

export interface Point2D {
  x: number;
  y: number;
}

export interface ChaosGameSpec {
  /** Number of polygon vertices (3..12). Default 3 (triangle). */
  sides: number;
  /** Number of iterations (points to generate). Default 100000. */
  iterations: number;
  /** Relaxation factor (0..1). 0.5 = halfway. Default 0.5. */
  relaxation: number;
  /** Random seed. Default 42. */
  seed: number;
  /** Output image width in pixels. Default 800. */
  width: number;
  /** Output image height in pixels. Default 800. */
  height: number;
  /** Vertex selection rule. Default 'random'. */
  rule: 'random' | 'no-same' | 'no-adjacent' | 'skip-1' | 'skip-2';
  /** Color palette name. Default 'neoViolet'. */
  palette: 'neoViolet' | 'obsidian' | 'fire' | 'ice' | 'mono' | 'rainbow';
}

export interface ChaosGameInput extends Partial<ChaosGameSpec> {
  /** Pre-defined fractal preset (overrides sides/relaxation/rule). */
  preset?: ChaosPreset;
}

/** Resolved spec — all fields guaranteed. */
export type ResolvedChaosSpec = Required<ChaosGameSpec>;

export type ChaosPreset =
  | 'sierpinski'
  | 'pentagon'
  | 'hexagon'
  | 'golden-triangle'
  | 'dragon'
  | 'square-no-same'
  | 'star';

export interface ChaosGameResult {
  /** Generated points (normalized 0..1). */
  points: Point2D[];
  /** Accumulated density grid (width × height). */
  density: Float64Array;
  /** Width of the density grid. */
  gridWidth: number;
  /** Height of the density grid. */
  gridHeight: number;
  /** FNV-1a checksum of the point data. */
  checksum: string;
  /** Polygon vertices used (normalized 0..1). */
  vertices: Point2D[];
  /** Spec used (after applying preset defaults). */
  spec: ResolvedChaosSpec;
}

/* ------------------------------------------------------------------ */
/* Presets                                                             */
/* ------------------------------------------------------------------ */

const PRESETS: Record<ChaosPreset, Partial<ChaosGameSpec>> = {
  sierpinski: { sides: 3, relaxation: 0.5, rule: 'random' },
  pentagon: { sides: 5, relaxation: 0.5, rule: 'random' },
  hexagon: { sides: 6, relaxation: 0.5, rule: 'random' },
  'golden-triangle': { sides: 3, relaxation: 0.618033988749895, rule: 'random' },
  dragon: { sides: 4, relaxation: 0.5, rule: 'no-same' },
  'square-no-same': { sides: 4, relaxation: 0.5, rule: 'no-same' },
  star: { sides: 5, relaxation: 0.381966011250105, rule: 'no-adjacent' }, // (3-sqrt(5))/2
};

/* ------------------------------------------------------------------ */
/* Palettes (RGBA tuples)                                              */
/* ------------------------------------------------------------------ */

const PALETTE: Record<string, Array<[number, number, number]>> = {
  neoViolet: [
    [139, 92, 246],  // primary
    [168, 85, 247],  // lighter
    [124, 58, 237],  // darker
    [196, 181, 253], // lavender
    [91, 33, 182],   // deep
  ],
  obsidian: [
    [139, 92, 246],  // primary accent
    [255, 255, 255], // white
    [180, 180, 180], // gray
    [100, 100, 100], // dark gray
    [50, 50, 50],    // near-black
  ],
  fire: [
    [255, 87, 51],   // red-orange
    [255, 159, 67],  // orange
    [255, 224, 102], // yellow
    [255, 59, 48],   // red
    [200, 40, 30],   // dark red
  ],
  ice: [
    [0, 210, 255],   // cyan
    [100, 220, 255], // light cyan
    [0, 150, 200],   // teal
    [200, 240, 255], // ice white
    [50, 100, 150],  // dark teal
  ],
  mono: [
    [255, 255, 255], // white
    [200, 200, 200], // light gray
    [150, 150, 150], // mid gray
    [100, 100, 100], // dark gray
    [50, 50, 50],    // near-black
  ],
  rainbow: [
    [255, 0, 0],     // red
    [255, 127, 0],   // orange
    [255, 255, 0],   // yellow
    [0, 255, 0],     // green
    [0, 0, 255],     // blue
    [75, 0, 130],    // indigo
    [148, 0, 211],   // violet
  ],
};

/* ------------------------------------------------------------------ */
/* Core: polygon vertices + chaos game                                 */
/* ------------------------------------------------------------------ */

/** Compute polygon vertices on a unit circle centered at (0.5, 0.5). */
export function polygonVertices(sides: number): Point2D[] {
  const verts: Point2D[] = [];
  for (let i = 0; i < sides; i++) {
    const angle = (2 * Math.PI * i) / sides - Math.PI / 2; // start from top
    verts.push({
      x: 0.5 + 0.45 * Math.cos(angle),
      y: 0.5 + 0.45 * Math.sin(angle),
    });
  }
  return verts;
}

/** Resolve a preset into a full spec. */
export function resolveChaosSpec(raw: ChaosGameInput): ResolvedChaosSpec {
  const preset = raw.preset ? PRESETS[raw.preset] : {};
  return {
    sides: raw.sides ?? preset.sides ?? 3,
    iterations: raw.iterations ?? 100000,
    relaxation: raw.relaxation ?? preset.relaxation ?? 0.5,
    seed: raw.seed ?? 42,
    width: raw.width ?? 800,
    height: raw.height ?? 800,
    rule: raw.rule ?? preset.rule ?? 'random',
    palette: raw.palette ?? 'neoViolet',
  };
}

/**
 * Apply vertex selection rule. Returns the index of the next vertex.
 *
 * - 'random': any vertex (uniform)
 * - 'no-same': cannot pick the same vertex twice in a row
 * - 'no-adjacent': cannot pick a vertex adjacent to the last one
 * - 'skip-1': always skip 1 vertex clockwise from last
 * - 'skip-2': always skip 2 vertices clockwise from last
 */
export function selectVertex(
  rule: ChaosGameSpec['rule'],
  sides: number,
  lastIndex: number,
  rand: () => number,
): number {
  switch (rule) {
    case 'random':
      return Math.floor(rand() * sides);

    case 'no-same': {
      let idx: number;
      do { idx = Math.floor(rand() * sides); } while (idx === lastIndex);
      return idx;
    }

    case 'no-adjacent': {
      let idx: number;
      do { idx = Math.floor(rand() * sides); } while (
        idx === lastIndex ||
        idx === (lastIndex + 1) % sides ||
        idx === (lastIndex - 1 + sides) % sides
      );
      return idx;
    }

    case 'skip-1':
      return (lastIndex + 1 + Math.floor(rand() * (sides - 1))) % sides;

    case 'skip-2':
      return (lastIndex + 2 + Math.floor(rand() * (sides - 2))) % sides;

    default:
      return Math.floor(rand() * sides);
  }
}

/**
 * Run the chaos game. Returns normalized points (0..1) and density grid.
 */
export function generateChaosGame(rawSpec: ChaosGameInput): ChaosGameResult {
  const spec = resolveChaosSpec(rawSpec);
  const vertices = polygonVertices(spec.sides);
  const rand = mulberry32(spec.seed);

  // Start at center
  let px = 0.5;
  let py = 0.5;
  const points: Point2D[] = new Array(spec.iterations);
  let lastIdx = 0;

  // Density grid for anti-aliased rendering
  const gw = spec.width;
  const gh = spec.height;
  const density = new Float64Array(gw * gh);

  for (let i = 0; i < spec.iterations; i++) {
    const vi = selectVertex(ruleCompat(spec), spec.sides, lastIdx, rand);
    lastIdx = vi;
    const v = vertices[vi];

    // Move toward vertex by relaxation factor
    px = px + (v.x - px) * spec.relaxation;
    py = py + (v.y - py) * spec.relaxation;

    points[i] = { x: px, y: py };

    // Accumulate density (skip first 100 points as transient)
    if (i >= 100) {
      const gx = Math.floor(px * (gw - 1));
      const gy = Math.floor(py * (gh - 1));
      if (gx >= 0 && gx < gw && gy >= 0 && gy < gh) {
        density[gy * gw + gx] += 1;
      }
    }
  }

  // Checksum over point data (sample every 100th point for speed)
  const sampled: number[] = [];
  for (let i = 0; i < points.length; i += 100) {
    sampled.push(points[i].x, points[i].y);
  }
  const checksum = fnv1a(new Float32Array(sampled));

  return { points, density, gridWidth: gw, gridHeight: gh, checksum, vertices, spec };
}

/** Backwards-compatible rule accessor. */
function ruleCompat(spec: ResolvedChaosSpec): ChaosGameSpec['rule'] {
  return spec.rule;
}

/* ------------------------------------------------------------------ */
/* Density → RGBA conversion                                           */
/* ------------------------------------------------------------------ */

/** Map density grid to RGBA buffer using a palette. */
export function chaosDensityToRgba(
  density: Float64Array,
  gw: number,
  gh: number,
  paletteName: string,
): Uint8Array {
  const palette = PALETTE[paletteName] ?? PALETTE.neoViolet;
  const rgba = new Uint8Array(gw * gh * 4);

  // Find max density for normalization
  let maxD = 0;
  for (let i = 0; i < density.length; i++) {
    if (density[i] > maxD) maxD = density[i];
  }
  if (maxD === 0) maxD = 1;

  for (let i = 0; i < density.length; i++) {
    // Log-scale density for better visual range
    const t = Math.log1p(density[i]) / Math.log1p(maxD);
    // Map to palette index (continuous interpolation)
    const pi = t * (palette.length - 1);
    const p0 = Math.floor(pi);
    const p1 = Math.min(p0 + 1, palette.length - 1);
    const frac = pi - p0;

    const r = Math.round(palette[p0][0] * (1 - frac) + palette[p1][0] * frac);
    const g = Math.round(palette[p0][1] * (1 - frac) + palette[p1][1] * frac);
    const b = Math.round(palette[p0][2] * (1 - frac) + palette[p1][2] * frac);

    const o = i * 4;
    rgba[o] = r;
    rgba[o + 1] = g;
    rgba[o + 2] = b;
    rgba[o + 3] = density[i] > 0 ? 255 : 0; // transparent background
  }

  return rgba;
}

/* ------------------------------------------------------------------ */
/* Preset descriptions (for tool output)                                */
/* ------------------------------------------------------------------ */

export const PRESET_DESCRIPTIONS: Record<ChaosPreset, string> = {
  sierpinski: 'Sierpinski triangle — 3 sides, r=0.5, random vertex',
  pentagon: 'Pentagon fractal — 5 sides, r=0.5',
  hexagon: 'Hexagon fractal — 6 sides, r=0.5 (Koch-like pattern)',
  'golden-triangle': 'Golden triangle — 3 sides, r=φ⁻¹≈0.618 (golden ratio)',
  dragon: 'Dragon curve chaos — 4 sides, r=0.5, no-same rule',
  'square-no-same': 'Square fractal — 4 sides, r=0.5, cannot repeat vertex',
  star: 'Star fractal — 5 sides, r≈0.382, no-adjacent rule',
};

/** List all available presets with descriptions. */
export function listPresets(): Array<{ name: ChaosPreset; description: string; sides: number; relaxation: number }> {
  return (Object.keys(PRESETS) as ChaosPreset[]).map((name) => ({
    name,
    description: PRESET_DESCRIPTIONS[name],
    sides: PRESETS[name].sides!,
    relaxation: PRESETS[name].relaxation!,
  }));
}
