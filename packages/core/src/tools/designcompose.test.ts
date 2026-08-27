import { describe, expect, it } from 'vitest';

import {
  composeDesign2D,
  composeDesign3D,
  planDesignBatch,
} from './designcompose';

const PNG_SIGNATURE = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];

function isPng(bytes: Uint8Array): boolean {
  if (bytes.length < 8) return false;
  for (let i = 0; i < 8; i++) if (bytes[i] !== PNG_SIGNATURE[i]) return false;
  return true;
}

describe('designcompose — modelo de diseño 2D/3D', () => {
  it('composeDesign2D es determinista (misma semilla ⇒ mismos bytes)', () => {
    const a = composeDesign2D({ width: 64, height: 64, seed: 42, style: 'fractal' });
    const b = composeDesign2D({ width: 64, height: 64, seed: 42, style: 'fractal' });
    expect(a).toEqual(b);
    expect(isPng(a)).toBe(true);
  });

  it('composeDesign2D produce PNG válido para los 3 estilos', () => {
    for (const style of ['fractal', 'flow', 'rings'] as const) {
      const bytes = composeDesign2D({ width: 48, height: 48, seed: 7, style });
      expect(isPng(bytes)).toBe(true);
      expect(bytes.length).toBeGreaterThan(8);
    }
  });

  it('composeDesign2D tolera paleta inválida (fallback obsidian)', () => {
    const bytes = composeDesign2D({
      width: 32,
      height: 32,
      seed: 1,
      style: 'rings',
      palette: 'no-existe' as never,
    });
    expect(isPng(bytes)).toBe(true);
  });

  it('composeDesign2D acota dimensiones fuera de rango', () => {
    const bytes = composeDesign2D({ width: 99999, height: 99999, seed: 1 });
    expect(isPng(bytes)).toBe(true);
  });

  it('composeDesign3D produce PNG para supershape y mobius', () => {
    const s = composeDesign3D({ seed: 11, kind: 'supershape', width: 96, height: 96 });
    const m = composeDesign3D({ seed: 11, kind: 'mobius', width: 96, height: 96 });
    expect(isPng(s)).toBe(true);
    expect(isPng(m)).toBe(true);
  });

  it('composeDesign3D es determinista', () => {
    const a = composeDesign3D({ seed: 99, kind: 'supershape' });
    const b = composeDesign3D({ seed: 99, kind: 'supershape' });
    expect(a).toEqual(b);
  });

  it('planDesignBatch es idempotente y respeta el conteo', () => {
    const a = planDesignBatch({ count: 6, seed: 555 });
    const b = planDesignBatch({ count: 6, seed: 555 });
    expect(a).toEqual(b);
    expect(a).toHaveLength(6);
    expect(a[0].id).toBe('design-555-0');
    for (const spec of a) {
      expect(['2d', '3d']).toContain(spec.dimension);
      expect(['fractal', 'flow', 'rings', 'supershape', 'mobius']).toContain(spec.style);
    }
  });

  it('planDesignBatch mezcla dimensiones 2D y 3D', () => {
    const specs = planDesignBatch({ count: 20, seed: 123 });
    const dims = new Set(specs.map((s) => s.dimension));
    expect(dims.has('2d')).toBe(true);
    expect(dims.has('3d')).toBe(true);
  });
});
