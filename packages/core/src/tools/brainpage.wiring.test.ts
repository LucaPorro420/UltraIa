import { describe, expect, it } from 'vitest';
import { TOOL_DESCRIPTIONS, tools, type Capability } from './index';
import * as brainpage from './brainpage';

/**
 * Wiring de la capability `brainpage` (iter-81 - port de los principios de brain.md).
 *
 * El registro del tool `brainpage_manage` vive en `ai/llm.ts` dentro de `chatStream` (funcion no
 * exportada), asi que lo verificable aqui es el CONTRATO PUBLICO que ese registro consume:
 * descriptor de capability, namespace en `tools` y union `Capability`. El bloque de llm.ts queda
 * cubierto por el typecheck FULL (tsc core+web+runtime).
 */
describe('wiring brainpage (iter-81)', () => {
  it('expone el descriptor de la capability en TOOL_DESCRIPTIONS', () => {
    const d = (TOOL_DESCRIPTIONS as Record<string, string>).brainpage;
    expect(d).toBeTruthy();
    expect(d).toMatch(/brain/i);
    expect(d).toMatch(/memor/i);
    for (const accion of ['init', 'create', 'read', 'update', 'append', 'list', 'reindex', 'lint']) {
      expect(d).toContain(accion);
    }
  });

  it('publica el namespace brainpage en tools con la API completa', () => {
    expect((tools as Record<string, unknown>).brainpage).toBe(brainpage);
    const api = brainpage as unknown as Record<string, unknown>;
    for (const fn of [
      'normalizeId',
      'resolveBrainRoot',
      'initBrain',
      'createPage',
      'readPage',
      'updateTruth',
      'appendTimeline',
      'listPages',
      'reindex',
      'lintLinks',
      'serializePage',
      'parsePage',
    ]) {
      expect(typeof api[fn]).toBe('function');
    }
  });

  it("'brainpage' es un Capability valido y tiene descriptor", () => {
    const cap: Capability = 'brainpage';
    expect(cap).toBe('brainpage');
    expect(Object.keys(TOOL_DESCRIPTIONS)).toContain(cap);
  });
});
