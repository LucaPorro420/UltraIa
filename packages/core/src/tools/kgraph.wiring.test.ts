import { describe, expect, it } from 'vitest';
import { TOOL_DESCRIPTIONS, tools, type Capability } from './index';
import * as kgraph from './kgraph';

/**
 * Wiring de la capability `kgraph` (iter-80 - port de los principios de graphify).
 *
 * El registro del tool `kgraph_build` vive en `ai/llm.ts` dentro de `chatStream` (funcion no
 * exportada), asi que lo verificable aqui es el CONTRATO PUBLICO que ese registro consume:
 * descriptor de capability, namespace en `tools` y union `Capability`. El bloque de llm.ts queda
 * cubierto por el typecheck FULL (tsc core+web+runtime).
 */
describe('wiring kgraph (iter-80)', () => {
  it('expone el descriptor de la capability en TOOL_DESCRIPTIONS', () => {
    const d = (TOOL_DESCRIPTIONS as Record<string, string>).kgraph;
    expect(d).toBeTruthy();
    expect(d).toMatch(/knowledge graph/i);
    expect(d).toMatch(/graphify/i);
    for (const accion of ['build', 'report', 'svg', 'analyze']) expect(d).toContain(accion);
  });

  it('publica el namespace kgraph en tools con la API completa', () => {
    expect((tools as Record<string, unknown>).kgraph).toBe(kgraph);
    const api = kgraph as unknown as Record<string, unknown>;
    for (const fn of [
      'slug',
      'fileKind',
      'buildGraph',
      'analyzeGraph',
      'buildGraphJson',
      'buildGraphReport',
      'buildGraphSvg',
    ]) {
      expect(typeof api[fn]).toBe('function');
    }
  });

  it("'kgraph' es un Capability valido y tiene descriptor", () => {
    const cap: Capability = 'kgraph';
    expect(cap).toBe('kgraph');
    expect(Object.keys(TOOL_DESCRIPTIONS)).toContain(cap);
  });
});
