import type { MemoryEntry } from './types';
import type { MemoryManager } from './memory';

export interface ContextItem {
  id: string;
  /** Free-form text of the item. */
  text: string;
  /** Relevance score (higher first). */
  score: number;
  /** Optional structured payload kept out of the final string. */
  meta?: Record<string, unknown>;
}

export interface ContextSelectorOptions {
  /** Hard cap in characters for the assembled context. Default 8000. */
  budgetChars?: number;
  /** Soft cap on items. Default 25. */
  maxItems?: number;
}

/**
 * Context budget: assembles ONLY the pieces that fit the budget, sorted by
 * relevance. Nothing about "send everything" — the host decides what to feed
 * the LLM from the selected items.
 */
export class ContextSelector {
  private readonly budgetChars: number;
  private readonly maxItems: number;

  constructor(options: ContextSelectorOptions = {}) {
    this.budgetChars = options.budgetChars ?? 8000;
    this.maxItems = options.maxItems ?? 25;
  }

  /**
   * Picks items that fit within the budget, highest score first.
   * Returns the selected items (and the assembled string + budget stats).
   */
  select(items: ContextItem[]): { selected: ContextItem[]; text: string; usedChars: number; dropped: number } {
    const sorted = [...items].sort((a, b) => b.score - a.score);
    const selected: ContextItem[] = [];
    let used = 0;
    for (const item of sorted) {
      if (selected.length >= this.maxItems) break;
      const cost = item.text.length + 2;
      if (used + cost > this.budgetChars && selected.length > 0) break;
      selected.push(item);
      used += cost;
    }
    return {
      selected,
      text: selected.map((i) => i.text).join('\n\n'),
      usedChars: used,
      dropped: items.length - selected.length,
    };
  }

  /** Convenience: selects memory entries into the budget using MemoryManager scoring. */
  selectFromMemory(
    memory: MemoryManager,
    opts: { query?: string; types?: MemoryEntry['type'][]; importanceMin?: number; budgetChars?: number } = {},
  ): { selected: MemoryEntry[]; text: string; usedChars: number; dropped: number } {
    const importanceMin = opts.importanceMin ?? 0.3;
    const queryTokens = opts.query?.toLowerCase().split(/\s+/).filter(Boolean) ?? [];
    const candidates = memory
      .list()
      .filter((e) => (opts.types ? opts.types.includes(e.type) : true))
      .filter((e) => e.importance >= importanceMin)
      .filter((e) => {
        if (queryTokens.length === 0) return true;
        const haystack = `${e.content} ${e.source} ${e.type}`.toLowerCase();
        return queryTokens.some((token) => haystack.includes(token));
      })
      .map((e) => ({
        id: e.id,
        text: `[${e.type}] ${e.content}`,
        score: memory.score(e, opts.query),
        meta: { type: e.type, importance: e.importance, source: e.source },
      }));
    const budget = new ContextSelector({ budgetChars: opts.budgetChars ?? this.budgetChars, maxItems: this.maxItems });
    const result = budget.select(candidates);
    const selectedIds = new Set(result.selected.map((s) => s.id));
    return {
      selected: memory.list().filter((e) => selectedIds.has(e.id)),
      text: result.text,
      usedChars: result.usedChars,
      dropped: result.dropped,
    };
  }
}