import { describe, expect, it } from 'vitest';
import {
  TOOL_DESCRIPTIONS,
  tools,
  qdrantMemory,
  QDRANT_COLLECTION,
  QDRANT_VECTOR_SIZE,
  QDRANT_DEFAULT_URL,
  type Capability,
} from './index';

/**
 * Wiring de la capability `qdrant_memory` (iter-78 - cierra el pendiente que dejo iter-76).
 *
 * El registro del tool `qdrant_memory_sync` vive en `ai/llm.ts` dentro de `chatStream` (funcion no
 * exportada), asi que lo verificable aqui es el CONTRATO PUBLICO que ese registro consume:
 * descriptor de capability, namespace en `tools` y union `Capability`. El bloque de llm.ts queda
 * cubierto por el typecheck FULL (tsc core+web+runtime).
 */
describe('wiring qdrant_memory (iter-78)', () => {
  it('expone el descriptor de la capability en TOOL_DESCRIPTIONS', () => {
    const d = TOOL_DESCRIPTIONS.qdrant_memory;
    expect(d).toBeTruthy();
    expect(d).toMatch(/Qdrant/);
    expect(d).toMatch(/learning\/truth/);
    for (const accion of ['plan', 'sync', 'search', 'stats']) expect(d).toContain(accion);
  });

  it('publica el namespace qdrantMemory en tools con la API completa', () => {
    expect(tools.qdrantMemory).toBe(qdrantMemory);
    const api = tools.qdrantMemory as unknown as Record<string, unknown>;
    for (const fn of [
      'embedDense4',
      'pointIdFor',
      'buildQdrantPoint',
      'planMemorySync',
      'buildUpsertBody',
      'buildSearchBody',
      'createQdrantClient',
      'syncMemoryToQdrant',
      'memorySyncSummary',
    ]) {
      expect(typeof api[fn]).toBe('function');
    }
    expect(tools.qdrantMemory.QDRANT_COLLECTION).toBe(QDRANT_COLLECTION);
    expect(tools.qdrantMemory.QDRANT_VECTOR_SIZE).toBe(QDRANT_VECTOR_SIZE);
  });

  it("'qdrant_memory' es un Capability valido y tiene descriptor", () => {
    const cap: Capability = 'qdrant_memory';
    expect(cap).toBe('qdrant_memory');
    expect(Object.keys(TOOL_DESCRIPTIONS)).toContain(cap);
  });

  it('re-exporta el dominio sin colisionar con semantic-memory (guarda TS2308)', () => {
    // Un `export *` habria colisionado en TruthDoc/tokenize (qdrant-memory los re-exporta):
    // el export EXPLICITO mantiene ambos modulos publicados desde el barrel.
    expect(QDRANT_DEFAULT_URL).toMatch(/^http:\/\//);
    expect(qdrantMemory.pointIdFor('doc-a')).toBe(qdrantMemory.pointIdFor('doc-a'));
    expect(qdrantMemory.pointIdFor('doc-a')).not.toBe(qdrantMemory.pointIdFor('doc-b'));
    expect(qdrantMemory.embedDense4('area del circulo')).toHaveLength(QDRANT_VECTOR_SIZE);
  });
});
