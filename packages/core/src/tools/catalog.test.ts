import { describe, it, expect } from 'vitest';
import { getToolCatalog, localizeEntry, CATALOG_LOCALES, type CatalogLocale } from './catalog';
import { TOOL_DESCRIPTIONS } from './index';

const VALID_CATEGORIES = ['ia-ml','diseno-ui','video-audio','codigo-dev','datos-backend','seguridad','nube-infra','automatizacion','contenido-cms','aprendizaje','productividad-equipo'];

describe('tool catalog', () => {
  it('exposes the 14 supported languages', () => {
    expect(CATALOG_LOCALES.length).toBe(14);
    expect(CATALOG_LOCALES).toContain('es');
    expect(CATALOG_LOCALES).toContain('zh');
  });

  it('covers 100% of the Capability union', () => {
    const ids = Object.keys(TOOL_DESCRIPTIONS);
    expect(ids.length).toBeGreaterThan(50);
    for (const id of ids) {
      const entry = getToolCatalog('es').find((t) => t.id === id);
      expect(entry, 'missing catalog entry for ' + id).toBeDefined();
      expect(VALID_CATEGORIES).toContain(entry!.category);
      expect(entry!.route.startsWith('/')).toBe(true);
      const loc = localizeEntry(entry!, 'es');
      expect(loc.name.length).toBeGreaterThan(0);
      expect(loc.description.length).toBeGreaterThan(0);
    }
  });

  it('provides english from TOOL_DESCRIPTIONS and falls back for missing locales', () => {
    const entry = getToolCatalog('es').find((t) => t.id === 'calculator')!;
    const en = localizeEntry(entry, 'en');
    expect(en.description).toBe(TOOL_DESCRIPTIONS.calculator);
    const fr = localizeEntry(entry, 'fr' as CatalogLocale);
    expect(fr.fallback).toBe(true);
    expect(fr.name.length).toBeGreaterThan(0);
  });
});
