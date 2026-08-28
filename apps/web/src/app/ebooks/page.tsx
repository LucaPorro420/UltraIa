import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { optionalUser } from '@/lib/server/context';
import { MarketingHeader } from '@/components/marketing-header';
import { SiteFooter } from '@/components/site-footer';
import { EBOOKS, formatPrice } from '@/data/ebooks';

export const metadata: Metadata = {
  title: 'Ebooks 3D · UltraIa',
  description:
    'Tres libros completos de desarrollo 3D: Three.js Avanzado, Unity Profesional y Generación Procedural Planetaria.',
};

export default async function EbooksPage() {
  const user = await optionalUser();
  return (
    <main className="min-h-screen bg-canvas">
      <MarketingHeader user={user} />

      <section className="neo-aura mx-auto max-w-6xl px-6 py-20">
        <p className="font-mono text-[11px] uppercase tracking-widest text-neutral-500">
          learning · 3d
        </p>
        <h1 className="mt-2 font-display text-4xl font-bold tracking-tight sm:text-5xl">
          Ebooks de <span className="gradient-neo-text">Desarrollo 3D</span>
        </h1>
        <p className="mt-4 max-w-2xl text-neutral-400">
          Tres libros completos con código, videos y un playground 3D interactivo. Desde Three.js
          hasta generación procedural planetaria.
        </p>

        <div className="mt-4 flex flex-wrap gap-3">
          <Link
            href="/ebooks/playground"
            className="inline-flex items-center gap-2 rounded-lg border border-border-subtle bg-panel px-4 py-2 text-sm font-medium text-neutral-200 transition-colors duration-200 hover:text-white"
          >
            Probar Playground 3D <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        <div className="mt-12 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {EBOOKS.map((e, i) => (
            <Link
              key={e.id}
              href={`/ebooks/${e.id}`}
              className="group card-glow-hover relative flex flex-col overflow-hidden rounded-2xl border border-border-subtle bg-panel [animation:var(--animate-chat-enter)]"
              style={{ animationDelay: `${Math.min(i * 60, 420)}ms` }}
            >
              <div
                className={`flex h-40 items-center justify-center bg-gradient-to-br ${e.cover}`}
              >
                <span className="text-6xl drop-shadow-lg">{e.emoji}</span>
              </div>
              <div className="flex flex-1 flex-col p-6">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-mono text-[11px] uppercase tracking-wide text-neutral-500">
                    {e.category}
                  </span>
                  <span className="rounded-full border border-border-muted px-2 py-0.5 font-mono text-[10px] text-neutral-400">
                    {e.level}
                  </span>
                </div>
                <h2 className="mt-2 font-display text-xl font-semibold text-neutral-100">
                  {e.title}
                </h2>
                <p className="mt-2 flex-1 text-sm leading-relaxed text-neutral-400">
                  {e.description}
                </p>
                <div className="mt-4 flex items-center gap-3 text-xs text-neutral-500">
                  <span>{e.chapters} capítulos</span>
                  <span>·</span>
                  <span>{e.videos} videos</span>
                </div>
                <div className="mt-5 flex items-center justify-between border-t border-border-subtle pt-4">
                  <span className="font-display text-2xl font-bold text-neo-200">
                    {formatPrice(e.price)}
                  </span>
                  <span className="inline-flex items-center gap-1 text-sm text-neutral-300 transition-colors duration-200 group-hover:text-white">
                    Ver detalles <ArrowRight className="h-4 w-4" />
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </section>

      <SiteFooter />
    </main>
  );
}
