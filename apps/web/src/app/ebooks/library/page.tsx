'use client';

import Link from 'next/link';
import { BookOpen, ArrowLeft } from 'lucide-react';
import { MarketingHeader } from '@/components/marketing-header';
import { useEbookLibrary } from '@/components/ebooks/library';
import { EBOOKS, formatPrice } from '@/data/ebooks';

export default function LibraryPage() {
  const { owned, ready } = useEbookLibrary();
  const items = EBOOKS.filter((e) => owned.includes(e.id));

  return (
    <main className="min-h-screen bg-canvas">
      <MarketingHeader user={null} />

      <section className="neo-aura mx-auto max-w-5xl px-6 py-16">
        <Link
          href="/ebooks"
          className="inline-flex items-center gap-1.5 text-sm text-neutral-400 transition-colors duration-200 hover:text-white"
        >
          <ArrowLeft className="h-4 w-4" /> Catálogo
        </Link>

        <h1 className="mt-6 font-display text-4xl font-bold tracking-tight sm:text-5xl">
          Mi <span className="gradient-neo-text">biblioteca</span>
        </h1>
        <p className="mt-4 max-w-2xl text-neutral-400">
          Libros que has añadido (compra demo, guardada en este navegador).
        </p>

        {!ready ? null : items.length === 0 ? (
          <div className="mt-12 rounded-2xl border border-dashed border-border-subtle bg-panel/50 p-12 text-center">
            <BookOpen className="mx-auto h-10 w-10 text-neutral-600" />
            <p className="mt-4 text-neutral-400">Tu biblioteca está vacía.</p>
            <Link
              href="/ebooks"
              className="mt-4 inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-white shadow-[0_0_18px_-8px_var(--color-primary)] transition-all duration-200 hover:bg-primary/85"
            >
              Explorar ebooks
            </Link>
          </div>
        ) : (
          <div className="mt-12 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {items.map((e) => (
              <article
                key={e.id}
                className="flex flex-col overflow-hidden rounded-2xl border border-border-subtle bg-panel"
              >
                <div
                  className={`flex h-32 items-center justify-center bg-gradient-to-br ${e.cover}`}
                >
                  <span className="text-5xl">{e.emoji}</span>
                </div>
                <div className="flex flex-1 flex-col p-5">
                  <h2 className="font-display text-lg font-semibold text-neutral-100">
                    {e.title}
                  </h2>
                  <p className="mt-1 text-sm text-neutral-400">{formatPrice(e.price)}</p>
                  <Link
                    href={`/ebooks/${e.id}`}
                    className="mt-4 inline-flex items-center justify-center gap-2 rounded-lg border border-border-subtle bg-input-active px-3 py-2 text-sm font-medium text-neutral-200 transition-colors duration-200 hover:text-white"
                  >
                    <BookOpen className="h-4 w-4" /> Ver detalles
                  </Link>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
