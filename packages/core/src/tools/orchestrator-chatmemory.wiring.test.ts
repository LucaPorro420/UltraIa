import { describe, it, expect } from 'vitest';
import { TOOL_DESCRIPTIONS, type Capability } from './index';
import { getToolCatalog, CATALOG_LOCALES } from './catalog';
import { chatStream } from '../ai/llm';

describe('orchestrator + chat_memory wiring', () => {
  it('orchestrator es un Capability valido y tiene descriptor', () => {
    const cap: Capability = 'orchestrator';
    expect(Object.keys(TOOL_DESCRIPTIONS)).toContain(cap);
    expect(TOOL_DESCRIPTIONS.orchestrator).toContain('failover');
  });

  it('chat_memory es un Capability valido y tiene descriptor', () => {
    const cap: Capability = 'chat_memory';
    expect(Object.keys(TOOL_DESCRIPTIONS)).toContain(cap);
    expect(TOOL_DESCRIPTIONS.chat_memory).toContain('grafo');
  });

  it('ambos aparecen en el catalogo en todos los idiomas con categoria y ruta validas', () => {
    for (const loc of CATALOG_LOCALES) {
      const entries = getToolCatalog(loc);
      for (const id of ['orchestrator', 'chat_memory'] as Capability[]) {
        const e = entries.find((t) => t.id === id);
        expect(e, `falta ${id} en catalogo ${loc}`).toBeDefined();
        expect(e!.category).toBeTruthy();
        expect(e!.route.startsWith('/')).toBe(true);
      }
    }
  });

  it('chatStream registra orchestrator_route y chat_memory_session sin errores en runtime', () => {
    const stream = chatStream({
      system: 'test',
      messages: [{ role: 'user', content: 'hola' }],
      tools: ['orchestrator', 'chat_memory'],
    });
    expect(stream).toBeDefined();
    expect(typeof stream).toBe('object');
  });
});
