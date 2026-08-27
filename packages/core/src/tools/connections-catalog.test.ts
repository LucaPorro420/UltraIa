import { describe, it, expect } from 'vitest';
import {
  buildConnectionCatalog,
  groupCatalogByCategory,
  CATEGORY_ORDER,
  CONNECTION_CATALOG_COUNT,
  CATEGORY_META,
} from './connections-catalog';

describe('connections-catalog', () => {
  it('tiene un catálogo no vacío y coherente', () => {
    expect(CONNECTION_CATALOG_COUNT).toBeGreaterThan(20);
    const cat = buildConnectionCatalog();
    expect(cat.length).toBe(CONNECTION_CATALOG_COUNT);
    // ids únicos
    const ids = new Set(cat.map((c) => c.id));
    expect(ids.size).toBe(cat.length);
  });

  it('los canales sociales usan el id == canal', () => {
    const cat = buildConnectionCatalog();
    const social = cat.filter((c) => c.channel);
    for (const s of social) expect(s.channel).toBe(s.id);
  });

  it('keyless sin clave => status keyless', () => {
    const cat = buildConnectionCatalog({ env: {} });
    const pollinations = cat.find((c) => c.id === 'pollinations')!;
    expect(pollinations.status).toBe('keyless');
  });

  it('env presente => connected; ausente => available', () => {
    const sin = buildConnectionCatalog({ env: {} });
    expect(sin.find((c) => c.id === 'openai')!.status).toBe('available');

    const con = buildConnectionCatalog({ env: { OPENAI_API_KEY: 'sk-x' } });
    expect(con.find((c) => c.id === 'openai')!.status).toBe('connected');
  });

  it('canal social conectado en DB => connected', () => {
    const cat = buildConnectionCatalog({ connectedChannels: ['reddit'], env: {} });
    expect(cat.find((c) => c.id === 'reddit')!.status).toBe('connected');
    // sin conectar sigue available
    expect(cat.find((c) => c.id === 'tiktok')!.status).toBe('available');
  });

  it('planned siempre => planned', () => {
    const cat = buildConnectionCatalog({ env: { ANTHROPIC_API_KEY: 'x' } });
    expect(cat.find((c) => c.id === 'anthropic')!.status).toBe('planned');
  });

  it('agrupa por categoría respetando CATEGORY_ORDER y solo las presentes', () => {
    const groups = groupCatalogByCategory(buildConnectionCatalog());
    expect(groups.length).toBeGreaterThan(5);
    // el orden de salida respeta CATEGORY_ORDER
    const cats = groups.map((g) => g.category);
    const idxOf = (c: string) => CATEGORY_ORDER.indexOf(c as any);
    for (let i = 1; i < cats.length; i++) expect(idxOf(cats[i])).toBeGreaterThan(idxOf(cats[i - 1]));
    // cada grupo tiene meta
    for (const g of groups) expect(CATEGORY_META[g.category].label).toBeTruthy();
  });
});
