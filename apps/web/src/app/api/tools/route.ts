import { NextRequest, NextResponse } from 'next/server';
import { getToolCatalog, CATALOG_LOCALES, localizeEntry, type CatalogLocale } from '@ultraia/core';

export const dynamic = 'force-dynamic';

export function GET(req: NextRequest) {
  const requested = req.nextUrl.searchParams.get('lang') ?? 'es';
  const locale: CatalogLocale = (CATALOG_LOCALES as readonly string[]).includes(requested)
    ? (requested as CatalogLocale)
    : 'es';
  const tools = getToolCatalog(locale).map((t) => {
    const loc = localizeEntry(t, locale);
    return {
      id: t.id,
      category: t.category,
      route: t.route,
      related: t.related,
      consolidates: t.consolidates,
      name: loc.name,
      description: loc.description,
      tags: loc.tags,
      fallback: loc.fallback,
    };
  });
  return NextResponse.json({ locale, count: tools.length, tools });
}
