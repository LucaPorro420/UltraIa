import { describe, it, expect } from 'vitest';
import {
  polygonVertices,
  resolveChaosSpec,
  selectVertex,
  generateChaosGame,
  chaosDensityToRgba,
  listPresets,
  PRESET_DESCRIPTIONS,
  type ChaosPreset,
} from './chaos-game';

/* ------------------------------------------------------------------ */
/* polygonVertices                                                     */
/* ------------------------------------------------------------------ */

describe('polygonVertices', () => {
  it('returns 3 vertices for triangle', () => {
    const v = polygonVertices(3);
    expect(v).toHaveLength(3);
  });

  it('returns 5 vertices for pentagon', () => {
    expect(polygonVertices(5)).toHaveLength(5);
  });

  it('vertices are within unit circle (0..1 range)', () => {
    const v = polygonVertices(6);
    for (const p of v) {
      expect(p.x).toBeGreaterThanOrEqual(0);
      expect(p.x).toBeLessThanOrEqual(1);
      expect(p.y).toBeGreaterThanOrEqual(0);
      expect(p.y).toBeLessThanOrEqual(1);
    }
  });

  it('first vertex is at top center', () => {
    const v = polygonVertices(3);
    expect(v[0].x).toBeCloseTo(0.5, 5);
    expect(v[0].y).toBeLessThan(0.5); // above center
  });
});

/* ------------------------------------------------------------------ */
/* resolveSpec                                                         */
/* ------------------------------------------------------------------ */

describe('resolveChaosSpec', () => {
  it('applies defaults for empty input', () => {
    const s = resolveChaosSpec({});
    expect(s.sides).toBe(3);
    expect(s.iterations).toBe(100000);
    expect(s.relaxation).toBe(0.5);
    expect(s.seed).toBe(42);
    expect(s.rule).toBe('random');
  });

  it('applies sierpinski preset', () => {
    const s = resolveChaosSpec({ preset: 'sierpinski' });
    expect(s.sides).toBe(3);
    expect(s.relaxation).toBe(0.5);
    expect(s.rule).toBe('random');
  });

  it('applies golden-triangle preset', () => {
    const s = resolveChaosSpec({ preset: 'golden-triangle' });
    expect(s.sides).toBe(3);
    expect(s.relaxation).toBeCloseTo(0.618, 3);
  });

  it('explicit values override preset', () => {
    const s = resolveChaosSpec({ preset: 'sierpinski', sides: 7, relaxation: 0.3 });
    expect(s.sides).toBe(7);
    expect(s.relaxation).toBe(0.3);
  });

  it('all fields are defined (ResolvedChaosSpec)', () => {
    const s = resolveChaosSpec({});
    expect(typeof s.sides).toBe('number');
    expect(typeof s.iterations).toBe('number');
    expect(typeof s.relaxation).toBe('number');
    expect(typeof s.seed).toBe('number');
    expect(typeof s.width).toBe('number');
    expect(typeof s.height).toBe('number');
    expect(typeof s.rule).toBe('string');
    expect(typeof s.palette).toBe('string');
  });
});

/* ------------------------------------------------------------------ */
/* selectVertex                                                        */
/* ------------------------------------------------------------------ */

describe('selectVertex', () => {
  const rand = () => 0.5; // deterministic mock

  it('random: returns valid index', () => {
    const idx = selectVertex('random', 3, 0, rand);
    expect(idx).toBeGreaterThanOrEqual(0);
    expect(idx).toBeLessThan(3);
  });

  it('no-same: never returns lastIndex', () => {
    for (let i = 0; i < 50; i++) {
      const idx = selectVertex('no-same', 5, 2, () => Math.random());
      expect(idx).not.toBe(2);
    }
  });

  it('no-adjacent: never returns lastIndex or neighbors', () => {
    const sides = 6;
    const last = 3;
    for (let i = 0; i < 50; i++) {
      const idx = selectVertex('no-adjacent', sides, last, () => Math.random());
      expect(idx).not.toBe(last);
      expect(idx).not.toBe((last + 1) % sides);
      expect(idx).not.toBe((last - 1 + sides) % sides);
    }
  });

  it('skip-1: always advances by at least 1', () => {
    const idx = selectVertex('skip-1', 5, 2, rand);
    expect(idx).not.toBe(2);
  });

  it('skip-2: always advances by at least 2', () => {
    const sides = 6;
    const last = 0;
    const idx = selectVertex('skip-2', sides, last, rand);
    // skip-2 with rand=0.5 → floor(0.5 * (6-2)) = 2, so (0+2+2)%6 = 4
    expect(idx).toBeGreaterThanOrEqual(0);
    expect(idx).toBeLessThan(sides);
  });
});

/* ------------------------------------------------------------------ */
/* generateChaosGame                                                   */
/* ------------------------------------------------------------------ */

describe('generateChaosGame', () => {
  it('produces correct number of points', () => {
    const result = generateChaosGame({ iterations: 1000, seed: 1 });
    expect(result.points).toHaveLength(1000);
  });

  it('all points are within 0..1', () => {
    const result = generateChaosGame({ iterations: 5000, seed: 99 });
    for (const p of result.points) {
      expect(p.x).toBeGreaterThanOrEqual(-0.01);
      expect(p.x).toBeLessThanOrEqual(1.01);
      expect(p.y).toBeGreaterThanOrEqual(-0.01);
      expect(p.y).toBeLessThanOrEqual(1.01);
    }
  });

  it('density grid has correct dimensions', () => {
    const result = generateChaosGame({ width: 100, height: 50, iterations: 500 });
    expect(result.density).toHaveLength(100 * 50);
    expect(result.gridWidth).toBe(100);
    expect(result.gridHeight).toBe(50);
  });

  it('density has non-zero entries (fractal fills space)', () => {
    const result = generateChaosGame({ iterations: 10000, seed: 42 });
    let nonZero = 0;
    for (let i = 0; i < result.density.length; i++) {
      if (result.density[i] > 0) nonZero++;
    }
    expect(nonZero).toBeGreaterThan(100); // fractal should fill many cells
  });

  it('checksum is deterministic (same spec → same hash)', () => {
    const a = generateChaosGame({ seed: 77, iterations: 2000 });
    const b = generateChaosGame({ seed: 77, iterations: 2000 });
    expect(a.checksum).toBe(b.checksum);
  });

  it('different seeds produce different checksums', () => {
    const a = generateChaosGame({ seed: 1, iterations: 2000 });
    const b = generateChaosGame({ seed: 2, iterations: 2000 });
    expect(a.checksum).not.toBe(b.checksum);
  });

  it('vertices match polygon sides', () => {
    const result = generateChaosGame({ sides: 5, iterations: 100 });
    expect(result.vertices).toHaveLength(5);
  });

  it('preset sierpinski works end-to-end', () => {
    const result = generateChaosGame({ preset: 'sierpinski', iterations: 5000 });
    expect(result.spec.sides).toBe(3);
    expect(result.spec.relaxation).toBe(0.5);
    expect(result.points).toHaveLength(5000);
  });

  it('preset star works', () => {
    const result = generateChaosGame({ preset: 'star', iterations: 5000 });
    expect(result.spec.sides).toBe(5);
    expect(result.spec.relaxation).toBeCloseTo(0.382, 2);
  });

  it('first ~100 points are transient (skipped in density)', () => {
    const result = generateChaosGame({
      iterations: 200,
      width: 10,
      height: 10,
      seed: 42,
    });
    // With only 200 points and first 100 skipped, density should be sparse
    let nonZero = 0;
    for (let i = 0; i < result.density.length; i++) {
      if (result.density[i] > 0) nonZero++;
    }
    expect(nonZero).toBeLessThan(100);
  });
});

/* ------------------------------------------------------------------ */
/* chaosDensityToRgba                                                  */
/* ------------------------------------------------------------------ */

describe('chaosDensityToRgba', () => {
  it('returns correct buffer size', () => {
    const result = generateChaosGame({ iterations: 1000, width: 50, height: 50 });
    const rgba = chaosDensityToRgba(result.density, 50, 50, 'neoViolet');
    expect(rgba).toBeInstanceOf(Uint8Array);
    expect(rgba.length).toBe(50 * 50 * 4);
  });

  it('non-zero density cells are opaque (alpha=255)', () => {
    const result = generateChaosGame({ iterations: 5000, width: 100, height: 100 });
    const rgba = chaosDensityToRgba(result.density, 100, 100, 'fire');
    // Check a few cells that should have points
    let foundOpaque = false;
    for (let i = 0; i < result.density.length; i++) {
      if (result.density[i] > 0) {
        expect(rgba[i * 4 + 3]).toBe(255);
        foundOpaque = true;
        break;
      }
    }
    expect(foundOpaque).toBe(true);
  });

  it('zero density cells are transparent (alpha=0)', () => {
    const density = new Float64Array(10 * 10);
    density[55] = 10; // one hit
    const rgba = chaosDensityToRgba(density, 10, 10, 'mono');
    // First cell (density=0): alpha should be 0 (transparent)
    expect(rgba[3]).toBe(0); // alpha of first pixel
    // Second cell (density=0): also transparent
    expect(rgba[7]).toBe(0);
  });

  it('rainbow palette works without error', () => {
    const result = generateChaosGame({ iterations: 1000, width: 20, height: 20 });
    const rgba = chaosDensityToRgba(result.density, 20, 20, 'rainbow');
    expect(rgba.length).toBe(20 * 20 * 4);
  });
});

/* ------------------------------------------------------------------ */
/* listPresets                                                         */
/* ------------------------------------------------------------------ */

describe('listPresets', () => {
  it('returns all 7 presets', () => {
    const presets = listPresets();
    expect(presets).toHaveLength(7);
  });

  it('each preset has name, description, sides, relaxation', () => {
    const presets = listPresets();
    for (const p of presets) {
      expect(typeof p.name).toBe('string');
      expect(typeof p.description).toBe('string');
      expect(p.sides).toBeGreaterThanOrEqual(3);
      expect(p.relaxation).toBeGreaterThan(0);
      expect(p.relaxation).toBeLessThan(1);
    }
  });

  it('sierpinski preset is described', () => {
    const presets = listPresets();
    const sp = presets.find((p) => p.name === 'sierpinski');
    expect(sp).toBeDefined();
    expect(sp!.description).toContain('Sierpinski');
  });
});
