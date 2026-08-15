import { describe, expect, it } from 'vitest';
import { ContextSelector } from './context';
import { MemoryManager } from './memory';
import type { ContextItem } from './context';

function item(id: string, text: string, score: number): ContextItem {
  return { id, text, score };
}

describe('ContextSelector', () => {
  it('selects highest-score items until the budget is exhausted', () => {
    const selector = new ContextSelector({ budgetChars: 110 });
    const items = [
      item('low', 'x'.repeat(60), 0.2),
      item('high', 'y'.repeat(60), 0.9),
      item('mid', 'z'.repeat(40), 0.5),
    ];
    const result = selector.select(items);
    expect(result.selected.map((i) => i.id)).toEqual(['high', 'mid']);
    expect(result.dropped).toBe(1);
    expect(result.usedChars).toBeLessThanOrEqual(110);
  });

  it('caps the number of items', () => {
    const selector = new ContextSelector({ budgetChars: 10_000, maxItems: 2 });
    const items = [item('a', 'aa', 1), item('b', 'bb', 1), item('c', 'cc', 1)];
    expect(selector.select(items).selected).toHaveLength(2);
  });

  it('keeps at least the top item even if it exceeds the budget', () => {
    const selector = new ContextSelector({ budgetChars: 10 });
    const result = selector.select([item('big', 'x'.repeat(200), 1)]);
    expect(result.selected).toHaveLength(1);
  });

  it('joins selected items into text', () => {
    const selector = new ContextSelector({ budgetChars: 1000 });
    const result = selector.select([item('a', 'one', 1), item('b', 'two', 1)]);
    expect(result.text).toBe('one\n\ntwo');
  });

  it('selects from memory with scoring and budget', () => {
    const memory = new MemoryManager();
    memory.store({ type: 'ERROR', source: 'v', content: 'ffmpeg crashed with SIGSEGV', importance: 0.9 });
    memory.store({ type: 'DECISION', source: 'a', content: 'use tauri 2', importance: 0.8 });
    memory.store({ type: 'TASK', source: 't', content: 'irrelevant note', importance: 0.2 });
    const selector = new ContextSelector({ budgetChars: 500, maxItems: 10 });
    const result = selector.selectFromMemory(memory, { query: 'ffmpeg', importanceMin: 0.3 });
    expect(result.selected).toHaveLength(1);
    expect(result.selected[0].content).toBe('ffmpeg crashed with SIGSEGV');
    expect(result.text).toContain('[ERROR]');
  });

  it('drops entries below the budget cutoff', () => {
    const memory = new MemoryManager();
    memory.store({ type: 'DECISION', source: 'a', content: 'keep', importance: 0.8 });
    memory.store({ type: 'TASK', source: 'a', content: 'drop me', importance: 0.1 });
    const selector = new ContextSelector({ budgetChars: 10_000 });
    // Default importanceMin (0.3) filters low-value entries before selection.
    const filtered = selector.selectFromMemory(memory, {});
    expect(filtered.selected.map((e) => e.content)).toEqual(['keep']);
    expect(filtered.dropped).toBe(0);
    // With the filter off, a tight budget drops the leftover.
    const tight = selector.selectFromMemory(memory, { importanceMin: 0, budgetChars: 20 });
    expect(tight.selected.map((e) => e.content)).toEqual(['keep']);
    expect(tight.dropped).toBe(1);
  });
});