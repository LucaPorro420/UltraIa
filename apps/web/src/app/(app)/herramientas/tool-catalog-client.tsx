'use client';

import { useCallback, useMemo, useState } from 'react';
import Link from 'next/link';

interface Localized { name: string; description: string; tags: string[]; }
interface Row {
  id: string;
  category: string;
  route: string;
  related: string[];
  i18n: Partial<Record<string, Localized>>;
}

export function ToolCatalogClient({ entries, locales, defaultLocale, categoryLabels, localeLabels }: {
  entries: Row[];
  locales: string[];
  defaultLocale: string;
  categoryLabels: Record<string, string>;
  localeLabels: Record<string, string>;
}) {
  const [locale, setLocale] = useState(defaultLocale);
  const [query, setQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('all');
  const isRtl = locale === 'ar';

  const categories = useMemo(() => Array.from(new Set(entries.map((e) => e.category))), [entries]);

  const display = useCallback((e: Row): { name: string; description: string; tags: string[]; fallback: boolean } => {
    const direct = e.i18n[locale];
    if (direct) return { ...direct, fallback: false };
    const es = e.i18n['es'];
    if (es) return { ...es, fallback: true };
    const en = e.i18n['en'];
    if (en) return { ...en, fallback: true };
    return { name: e.id, description: '', tags: [], fallback: true };
  }, [locale]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return entries.filter((e) => {
      if (activeCategory !== 'all' && e.category !== activeCategory) return false;
      if (!q) return true;
      const d = display(e);
      return (
        d.name.toLowerCase().includes(q) ||
        d.description.toLowerCase().includes(q) ||
        d.tags.join(' ').toLowerCase().includes(q)
      );
    });
  }, [entries, query, activeCategory, display]);

  return (
    <div className={isRtl ? 'mt-10 [direction:rtl]' : 'mt-10'}>
      <div className='flex flex-wrap items-center gap-3'>
        <select
          value={locale}
          onChange={(e) => setLocale(e.target.value)}
          className='rounded-md border border-border-subtle bg-panel px-3 py-2 text-sm text-neutral-200'
        >
          {locales.map((l) => (
            <option key={l} value={l}>{localeLabels[l] ?? l}</option>
          ))}
        </select>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder='Buscar herramienta...'
          className='flex-1 rounded-md border border-border-subtle bg-panel px-3 py-2 text-sm text-neutral-200 placeholder:text-neutral-600'
        />
        <span className='font-mono text-[11px] text-neutral-500'>{filtered.length} / {entries.length}</span>
      </div>

      <div className='mt-4 flex flex-wrap gap-2'>
        <Chip active={activeCategory === 'all'} onClick={() => setActiveCategory('all')}>Todas</Chip>
        {categories.map((c) => (
          <Chip key={c} active={activeCategory === c} onClick={() => setActiveCategory(c)}>
            {categoryLabels[c] ?? c}
          </Chip>
        ))}
      </div>

      <div className='mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3'>
        {filtered.map((e, i) => {
          const d = display(e);
          return (
            <Link
              key={e.id}
              href={e.route}
              className='card-glow-hover group flex flex-col rounded-xl border border-border-subtle bg-panel p-5 [animation:var(--animate-chat-enter)]'
              style={{ animationDelay: `${Math.min(i * 40, 400)}ms` }}
            >
              <div className='flex items-start justify-between gap-2'>
                <h3 className='font-display text-base font-semibold text-neutral-100'>{d.name}</h3>
                {d.fallback && (
                  <span className='rounded bg-input-active px-1.5 py-0.5 font-mono text-[9px] text-neutral-500'>ES</span>
                )}
              </div>
              <span className='mt-1 inline-block w-fit rounded-full border border-border-muted bg-input-active px-2 py-0.5 font-mono text-[10px] text-neo-200'>
                {categoryLabels[e.category] ?? e.category}
              </span>
              <p className='mt-2 line-clamp-4 flex-1 text-xs leading-relaxed text-neutral-400'>{d.description}</p>
              {d.tags.length > 0 && (
                <div className='mt-3 flex flex-wrap gap-1'>
                  {d.tags.map((t) => (
                    <span key={t} className='rounded-full bg-panel-hover px-2 py-0.5 font-mono text-[10px] text-neutral-400'>{t}</span>
                  ))}
                </div>
              )}
              <span className='mt-3 font-mono text-[10px] text-neutral-600 group-hover:text-neo-200'>Abrir →</span>
            </Link>
          );
        })}
      </div>

      {filtered.length === 0 && (
        <p className='mt-10 text-center text-sm text-neutral-500'>Sin resultados para tu busqueda.</p>
      )}
    </div>
  );
}

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type='button'
      onClick={onClick}
      className={`rounded-full border px-3 py-1 text-xs transition-colors duration-150 ${
        active ? 'border-primary/60 bg-panel-hover text-white' : 'border-border-subtle text-neutral-400 hover:text-neutral-100'
      }`}
    >
      {children}
    </button>
  );
}
