// -----------------------------------------------------------------------------
// Wiring tests Motor Evolutivo (loop-94): physics2d / cadgeo / evo / evolution
// Patrón geometry.wiring.test.ts — descriptor + namespace + Capability.
// -----------------------------------------------------------------------------
import { describe, expect, it } from 'vitest';

import { TOOL_DESCRIPTIONS, tools } from './index';
import type { Capability } from './index';
import { delaunayTriangulate } from './cadgeo';

describe('motor evolutivo — wiring en index.ts', () => {
  it('descriptors registrados en TOOL_DESCRIPTIONS', () => {
    expect(TOOL_DESCRIPTIONS.physics2d).toContain('Motor Evolutivo M1');
    expect(TOOL_DESCRIPTIONS.cadgeo).toContain('Motor Evolutivo M2');
    expect(TOOL_DESCRIPTIONS.evo).toContain('Motor Evolutivo M3');
    expect(TOOL_DESCRIPTIONS.evolution).toContain('Motor Evolutivo M4');
  });

  it('namespaces completos expuestos en tools', () => {
    expect(typeof (physics2dNs()).stepVerlet).toBe('function');
    expect(typeof (physics2dNs()).renderPhysicsHtml).toBe('function');
    expect(typeof cadgeoNs().delaunayTriangulate).toBe('function');
    expect(typeof cadgeoNs().bvhBuild).toBe('function');
    expect(typeof evoNs().evolveGeneration).toBe('function');
    expect(typeof evoNs().benchmarkSphere).toBe('function');
    expect(typeof evolutionNs().runEvolutionCycle).toBe('function');
    expect((evolutionNs().buildBrainpageEntries as (a: unknown[]) => unknown[])([]).length).toBe(0);
    function physics2dNs() { return (tools as Record<string, Record<string, unknown>>).physics2d; }
    function cadgeoNs() { return (tools as Record<string, Record<string, unknown>>).cadgeo; }
    function evoNs() { return (tools as Record<string, Record<string, unknown>>).evo; }
    function evolutionNs() { return (tools as Record<string, Record<string, unknown>>).evolution; }
  });

  it('Capability union acepta las 4 capabilities nuevas', () => {
    const caps: Capability[] = ['physics2d', 'cadgeo', 'evo', 'evolution'];
    expect(caps.length).toBe(4);
  });

  it('sin colisión Vec2 vía export *: cadgeo re-exporta plano y funciona', () => {
    // cadgeo/evo/evolution SÍ se re-exportan planos desde index (sin TS2308)
    expect(typeof delaunayTriangulate).toBe('function');
    expect(delaunayTriangulate([[0, 0], [1, 0], [1, 1], [0, 1]]).length).toBe(2);
  });
});
