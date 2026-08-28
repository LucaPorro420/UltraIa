import type { Metadata } from 'next';
import { ExternalLink, Play } from 'lucide-react';
import { optionalUser } from '@/lib/server/context';
import { MarketingHeader } from '@/components/marketing-header';
import { SiteFooter } from '@/components/site-footer';
import { StatCard } from '@/components/ui/stat-card';
import { RECURSOS_IA } from '@/data/recursos-ia';

export const metadata: Metadata = {
  title: 'Recursos IA · UltraIa',
  description:
    'Los 7 canales de YouTube para aprender IA, con su enfoque y los workflows que enseña cada uno.',
};

export default async function RecursosPage() {
  const user = await optionalUser();
  const totalWorkflows = RECURSOS_IA.reduce((n, r) => n + r.workflows.length, 0);
  return (
    <main className="min-h-screen bg-canvas">
      <MarketingHeader user={user} />

      <section className="neo-aura mx-auto max-w-5xl px-6 py-20">
        <p className="font-mono text-[11px] uppercase tracking-widest text-neutral-500">
          learning hub
        </p>
        <h1 className="mt-2 font-display text-4xl font-bold tracking-tight sm:text-5xl">
          7 canales de YouTube para <span className="gradient-neo-text">dominar la IA</span>
        </h1>
        <p className="mt-4 max-w-2xl text-neutral-400">
          Curaduría práctica: cada canal con su enfoque y los workflows que enseña, para construir
          sistemas con IA y no solo ver demos.
        </p>

        <div className="mt-8 grid max-w-lg grid-cols-2 gap-3">
          <StatCard label="canales" value={RECURSOS_IA.length} hint="curados a mano" />
          <StatCard label="workflows" value={totalWorkflows} hint="patrones enseñados" />
        </div>

        <div className="mt-12 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {RECURSOS_IA.map((r, i) => (
            <article
              key={r.canal}
              className="group card-glow-hover relative flex flex-col rounded-2xl border border-border-subtle bg-panel p-6 [animation:var(--animate-chat-enter)]"
              style={{ animationDelay: `${Math.min(i * 60, 420)}ms` }}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="font-display text-lg font-semibold text-neutral-100">
                    {r.nombre}
                  </h2>
                  <p className="mt-0.5 font-mono text-xs text-neo-200">{r.canal}</p>
                </div>
                <Play className="h-5 w-5 shrink-0 text-neutral-600 transition-colors duration-200 group-hover:text-neo-200" />
              </div>

              <p className="mt-3 flex-1 text-sm leading-relaxed text-neutral-400">{r.enfoque}</p>

              {r.subs && (
                <p className="mt-2 font-mono text-[11px] text-neutral-500">
                  {r.subs} suscriptores
                </p>
              )}

              <div className="mt-4 flex flex-wrap gap-1.5">
                {r.workflows.map((w) => (
                  <span
                    key={w}
                    className="rounded-full border border-border-muted bg-input-active px-2.5 py-1 font-mono text-[11px] text-neutral-300"
                  >
                    {w}
                  </span>
                ))}
              </div>

              <div className="mt-5 flex items-center gap-4 border-t border-border-subtle pt-4 text-xs">
                <a
                  href={r.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 font-medium text-neo-200 transition-colors duration-200 hover:text-neo-100"
                >
                  Canal <ExternalLink className="h-3.5 w-3.5" />
                </a>
                {r.sitio && (
                  <a
                    href={r.sitio}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-neutral-400 transition-colors duration-200 hover:text-neutral-200"
                  >
                    Sitio <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                )}
              </div>
            </article>
          ))}
        </div>
      </section>
      <SiteFooter />
    </main>
  );
}