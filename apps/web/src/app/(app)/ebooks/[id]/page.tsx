import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, ArrowRight, BookOpen, Layers, Play } from 'lucide-react';
import { getEbook, EBOOKS, formatPrice } from '@/data/ebooks';
import { LibraryButton } from '@/components/ebooks/library-button';

export function generateStaticParams() {
  return EBOOKS.map((e) => ({ id: e.id }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const ebook = getEbook(id);
  if (!ebook) return { title: 'Ebook · UltraIa' };
  return { title: `${ebook.title} · UltraIa`, description: ebook.description };
}

export default async function EbookDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const ebook = getEbook(id);
  if (!ebook) notFound();

  return (
    <section className="neo-aura mx-auto max-w-5xl px-6 py-16">
      <Link
        href="/ebooks"
        className="inline-flex items-center gap-1.5 text-sm text-neutral-400 transition-colors duration-200 hover:text-white"
      >
        <ArrowLeft className="h-4 w-4" /> Catálogo
      </Link>

      <div className="mt-8 grid gap-10 lg:grid-cols-[1.1fr_0.9fr]">
        <div>
          <div
            className={`flex h-52 items-center justify-center rounded-2xl bg-gradient-to-br ${ebook.cover}`}
          >
            <span className="text-7xl drop-shadow-lg">{ebook.emoji}</span>
          </div>
          <h1 className="mt-6 font-display text-3xl font-bold tracking-tight sm:text-4xl">
            {ebook.title}
          </h1>
          <p className="mt-1 font-mono text-sm text-neo-200">{ebook.tagline}</p>
          <p className="mt-4 text-neutral-400">{ebook.longDescription}</p>

          <h2 className="mt-8 font-display text-lg font-semibold text-neutral-100">
            Temario
          </h2>
          <ol className="mt-4 space-y-2">
            {ebook.outline.map((chapter, i) => (
              <li
                key={chapter}
                className="flex items-start gap-3 rounded-lg border border-border-subtle bg-panel px-4 py-3 text-sm text-neutral-300"
              >
                <span className="mt-0.5 font-mono text-xs text-neutral-500">
                  {String(i + 1).padStart(2, '0')}
                </span>
                {chapter}
              </li>
            ))}
          </ol>
        </div>

        <aside className="lg:sticky lg:top-8 lg:self-start">
          <div className="rounded-2xl border border-border-subtle bg-panel p-6">
            <div className="flex items-end justify-between">
              <span className="font-display text-3xl font-bold text-neo-200">
                {formatPrice(ebook.price)}
              </span>
              <span className="text-sm text-neutral-500 line-through">
                {formatPrice(ebook.originalPrice)}
              </span>
            </div>

            <dl className="mt-5 space-y-2 text-sm">
              <div className="flex items-center gap-2 text-neutral-300">
                <Layers className="h-4 w-4 text-neutral-500" /> {ebook.chapters} capítulos
              </div>
              <div className="flex items-center gap-2 text-neutral-300">
                <Play className="h-4 w-4 text-neutral-500" /> {ebook.videos} videos
              </div>
              <div className="flex items-center gap-2 text-neutral-300">
                <BookOpen className="h-4 w-4 text-neutral-500" /> {ebook.pages} páginas
              </div>
            </dl>

            <div className="mt-6">
              <LibraryButton id={ebook.id} price={ebook.price} />
            </div>

            <p className="mt-3 text-xs text-neutral-500">
              Compra demo: se guarda en este navegador (localStorage). El pago real con Stripe
              llegará en una siguiente iteración.
            </p>

            <div className="mt-5 flex flex-wrap gap-1.5 border-t border-border-subtle pt-5">
              {ebook.topics.map((t) => (
                <span
                  key={t}
                  className="rounded-full border border-border-muted bg-input-active px-2.5 py-1 font-mono text-[11px] text-neutral-300"
                >
                  {t}
                </span>
              ))}
            </div>
          </div>

          <Link
            href="/ebooks/playground"
            className="mt-4 flex items-center justify-center gap-2 rounded-xl border border-border-subtle bg-panel px-4 py-3 text-sm font-medium text-neutral-200 transition-colors duration-200 hover:text-white"
          >
            Abrir Playground 3D <ArrowRight className="h-4 w-4" />
          </Link>
        </aside>
      </div>
    </section>
  );
}
