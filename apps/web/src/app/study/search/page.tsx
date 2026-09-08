import type { Metadata } from 'next';
import Link from 'next/link';
import { prisma } from '@ultraia/core';
import { buildSearchIndex } from '@ultraia/core';
import { Search } from 'lucide-react';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Búsqueda - UltraIa',
  description: 'Búsqueda offline-first en corpus de aprendizaje verificado',
};

export default async function SearchPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q } = await searchParams;
  const query = (q ?? '').trim();

  let results: Array<{ id: string; title: string; content: string; type: string; metadata?: any }> = [];
  let fallback: Array<{ id: string; title: string; content: string }> = [];

  if (query) {
    const docs = await prisma.searchIndex.findMany({
      where: {
        OR: [
          { title: { contains: query } },
          { content: { contains: query } },
        ],
      },
      orderBy: { updatedAt: 'desc' },
      take: 20,
    });
    results = docs.map((d) => ({ id: d.id, title: d.title, content: d.content.slice(0, 400), type: d.type, metadata: d.metadata }));

    if (results.length === 0) {
      const lessons = await prisma.learningLesson.findMany({
        where: {
          OR: [
            { title: { contains: query } },
            { content: { contains: query } },
          ],
          isPublished: true,
        },
        take: 20,
        select: { id: true, title: true, content: true },
      });
      fallback = lessons.map((l) => ({
        id: l.id,
        title: l.title,
        content: l.content.slice(0, 400),
      }));
    }
  } else {
    // show categories as entry
    const categories = await prisma.learningCourse.groupBy({
      by: ['category'],
      _count: { category: true },
    });
    fallback = categories.map((c) => ({
      id: c.category,
      title: c.category,
      content: `${c._count.category} cursos`,
    }));
  }

  const display = results.length > 0 ? results : fallback;

  return (
    <div className="mx-auto max-w-4xl px-6 py-8">
      <h1 className="font-display text-2xl font-bold text-white">Búsqueda</h1>
      <p className="mt-1 text-sm text-neutral-500">Offline-first · SearchIndex + fallback LearningLesson · buildSearchIndex trunc 200/4000</p>

      <form action="/study/search" method="GET" className="study-search mt-6 max-w-xl">
        <Search className="study-search-icon h-4 w-4" />
        <input
          name="q"
          defaultValue={query}
          placeholder="Buscar lecciones, glosario, documentos…"
          className="study-search-input"
          autoComplete="off"
        />
      </form>

      {query && (
        <p className="mt-3 font-mono text-xs text-neutral-500">
          {results.length > 0 ? `${results.length} resultados en SearchIndex` : `${fallback.length} resultados en lecciones`} para “{query}”
        </p>
      )}

      <div className="mt-6 space-y-3">
        {display.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border-muted bg-panel/50 p-8 text-center text-sm text-neutral-500">
            Sin resultados para “{query}”. Prueba con otro término.
          </div>
        ) : (
          display.map((r) => (
            <Link
              key={r.id + r.title}
              href={results.length > 0 ? `/study/search?q=${encodeURIComponent(query)}` : `/study/course/${r.id}`}
              className="glass-panel flex items-center gap-3 rounded-xl p-4 hover:bg-panel-hover"
            >
              <span className="study-search-result-icon">
                <Search className="h-4 w-4" />
              </span>
              <div className="min-w-0">
                <p className="study-search-result-title">{r.title}</p>
                <p className="study-search-result-meta">
                  <span className="truncate">{(r as any).type ?? 'lesson'} · {r.content.slice(0, 120)}</span>
                </p>
              </div>
            </Link>
          ))
        )}
      </div>

      {!query && (
        <div className="mt-8 rounded-xl border border-border-subtle bg-panel p-4">
          <h3 className="font-display text-sm font-semibold text-white">Tip</h3>
          <p className="mt-1 text-xs text-neutral-500">
            Usa <code className="font-mono">buildSearchIndex</code> para truncar title 200 / content 4000 antes de indexar. Fuente principal: <code>SearchIndex</code> ; fallback: <code>LearningLesson</code>.
          </p>
        </div>
      )}
    </div>
  );
}
