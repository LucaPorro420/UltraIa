'use client';

import Link from 'next/link';
import { Check, BookOpen } from 'lucide-react';
import { useEbookLibrary } from './library';

export function LibraryButton({ id, price }: { id: string; price: number }) {
  const { isOwned, add, ready } = useEbookLibrary();
  const owned = ready && isOwned(id);

  if (owned) {
    return (
      <div className="flex flex-wrap items-center gap-3">
        <span className="inline-flex items-center gap-2 rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-4 py-2.5 text-sm font-medium text-emerald-300">
          <Check className="h-4 w-4" /> En tu biblioteca
        </span>
        <Link
          href="/ebooks/library"
          className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-white shadow-[0_0_18px_-8px_var(--color-primary)] transition-all duration-200 hover:bg-primary/85"
        >
          <BookOpen className="h-4 w-4" /> Abrir
        </Link>
      </div>
    );
  }

  return (
    <button
      onClick={() => add(id)}
      className="inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-white shadow-[0_0_18px_-8px_var(--color-primary)] transition-all duration-200 hover:bg-primary/85 hover:shadow-[0_0_28px_-6px_var(--color-primary)]"
    >
      Comprar demo · ${price}
    </button>
  );
}
