import { describe, expect, it } from 'vitest';

import { geometry, TOOL_DESCRIPTIONS, tools } from './index';
import type { Capability } from './index';

describe('geometry — wiring', () => {
  it('descriptor registrado en TOOL_DESCRIPTIONS', () => {
    expect(TOOL_DESCRIPTIONS.geometry).toContain('Procedural geometry library');
    expect(TOOL_DESCRIPTIONS.geometry).toContain('glTF 2.0');
  });

  it('namespace completo expuesto en tools', () => {
    for (const fn of [
      'superShapeRadius',
      'superShape2D',
      'superShape3D',
      'mobiusSurface',
      'transformMesh',
      'mergeMeshes',
      'meshStats',
      'validateGeoMesh',
      'meshToObjText',
      'meshToGltf',
    ]) {
      expect(typeof (geometry as Record<string, unknown>)[fn]).toBe('function');
    }
  });

  it('Capability union acepta geometry y el flujo completo funciona', () => {
    const caps: Capability[] = ['geometry'];
    expect(caps).toContain('geometry');
    const mesh = geometry.superShape3D({ m: 4, n1: 0.4, n2: 0.4, n3: 4 }, { m: 0, n1: 1, n2: 1, n3: 1 });
    const gltf = JSON.parse(geometry.meshToGltf(mesh)) as { asset: { version: string } };
    expect(gltf.asset.version).toBe('2.0');
  });

  it('sin colisión de símbolos geom (WIP ajeno) vía export *', () => {
    const keys = Object.keys(geometry);
    expect(keys).not.toContain('vec2');
    expect(Object.keys(tools)).toContain('geometry');
  });
});
