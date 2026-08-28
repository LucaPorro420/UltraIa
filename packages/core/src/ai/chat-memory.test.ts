import { describe, it, expect, afterEach } from 'vitest';
import { ChatSessionMemory, extractEntities } from './chat-memory';
import { rmSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

const TMP = join(tmpdir(), `ultraia-chatmem-${Date.now()}-${Math.random().toString(36).slice(2)}`);

describe('extractEntities', () => {
  it('captures quoted phrases and Capitalized words, ignoring stopwords', () => {
    const ents = extractEntities('Analicé el proyecto "OpenRouter" con Gemini y ChatGPT.');
    expect(ents).toContain('OpenRouter');
    expect(ents).toContain('Gemini');
    expect(ents).toContain('ChatGPT');
    // pronouns/nouns like 'El'/'La' are filtered; the key entities survive
    expect(ents).not.toContain('El');
  });
});

describe('ChatSessionMemory graph (graphity)', () => {
  it('builds a deterministic graph with nodes and edges from the conversation', () => {
    const m = new ChatSessionMemory();
    m.addTurn('user', 'Usa OpenRouter y Gemini para el agente.');
    m.addTurn('assistant', 'Listo, configuro OpenRouter con Gemini como respaldo.');
    const g1 = m.buildGraph();
    const g2 = m.buildGraph();
    expect(g1.nodes.length).toBeGreaterThan(0);
    expect(g1.edges.length).toBeGreaterThan(0);
    expect(JSON.stringify(g1)).toBe(JSON.stringify(g2)); // deterministic
    // OpenRouter appears in both turns -> degree > 0
    const open = g1.nodes.find((n) => n.label === 'OpenRouter');
    expect(open).toBeDefined();
    expect((open as any).degree).toBeGreaterThan(0);
  });
});

describe('ChatSessionMemory context block (consistency across model/mode switch)', () => {
  it('produces a stable block carrying the prior topic and entities', () => {
    const m = new ChatSessionMemory();
    m.addTurn('user', 'Quiero usar OpenRouter con el orquestador para fallover.');
    m.addTurn('assistant', 'Entendido, configuro el orquestador con OpenRouter.');
    const b1 = m.getContextBlock();
    const b2 = m.getContextBlock();
    expect(b1.block).toBe(b2.block); // stable
    expect(b1.block).toContain('OpenRouter');
    expect(b1.block).toContain('orquestador');
    expect(b1.summary).toContain('OpenRouter');
  });

  it('the block preserves prior context when fed into a fresh session (no loss of consistency)', () => {
    const a = new ChatSessionMemory();
    a.addTurn('user', 'Tema: integrar Graphiti como memoria extendible del chat.');
    const block = a.getContextBlock().block;

    // simulated model/mode switch: a brand-new session that only knows the injected block
    const b = new ChatSessionMemory();
    b.addTurn('system', block);
    b.addTurn('user', 'Continúa con lo anterior.');
    // The new session's context block must still expose the original topic/entity.
    expect(b.getContextBlock().block).toContain('Graphiti');
    expect(b.getContextBlock().block).toContain('memoria extendible');
  });
});

describe('ChatSessionMemory persistence', () => {
  afterEach(() => {
    if (existsSync(TMP)) rmSync(TMP, { recursive: true, force: true });
  });

  it('save + load round-trips turns and graph', () => {
    const m = new ChatSessionMemory({ rootDir: TMP });
    m.addTurn('user', 'Recuerda: usar OpenRouter y Gemini.');
    m.addTurn('assistant', 'Anotado, OpenRouter con Gemini de respaldo.');
    m.save();
    expect(ChatSessionMemory.exists(m.sessionId, { rootDir: TMP })).toBe(true);

    const loaded = ChatSessionMemory.load(m.sessionId, { rootDir: TMP });
    expect(loaded.getTurns().length).toBe(2);
    expect(loaded.getContextBlock().block).toContain('OpenRouter');
    expect(loaded.buildGraph().nodes.length).toBeGreaterThan(0);
  });
});
