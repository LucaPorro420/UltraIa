import type { Metadata } from 'next';
import { CalendarDays } from 'lucide-react';
import { prisma, listBlogPosts } from '@ultraia/core';
import { optionalUser } from '@/lib/server/context';
import { MarketingHeader } from '@/components/marketing-header';

export const metadata: Metadata = {
  title: 'Blog · UltraIa',
  description: 'Artículos publicados automáticamente por la fábrica de contenido de UltraIa.',
};

export const revalidate = 300; // 5 min — el blog se regenera bajo demanda

function formatDate(d: Date): string {
  return new Intl.DateTimeFormat('es', { dateStyle: 'long' }).format(d);
}

export default async function BlogPage() {
  const user = await optionalUser();
  const posts = await listBlogPosts(prisma, 12);

  return (
    <main className="min-h-screen bg-canvas">
      <MarketingHeader user={user} />

      <section className="mx-auto max-w-4xl px-6 py-20">
        <p className="font-mono text-[11px] uppercase tracking-widest text-neutral-500">
          publicaciones automáticas
        </p>
        <h1 className="mt-2 font-display text-4xl font-bold tracking-tight sm:text-5xl">
          Blog <span className="gradient-neo-text">UltraIa</span>
        </h1>
        <p className="mt-4 max-w-2xl text-neutral-400">
          Artículos generados por la fábrica de contenido (idea → redacción → publicación) y
          publicados aquí como canal propio. Cada post conserva su paquete de publicación
          (caption, hashtags, media) listo para redes sociales.
        </p>

        {posts.length === 0 ? (
          <div className="glass-panel mt-12 rounded-2xl p-10 text-center">
            <p className="font-display text-lg text-neutral-300">Todavía no hay artículos publicados.</p>
            <p className="mt-2 text-sm text-neutral-500">
              Cuando la cola de publicaciones publique su primer paquete de texto, aparecerá aquí.
            </p>
          </div>
        ) : (
          <div className="mt-12 grid gap-5">
            {posts.map((post, i) => (
              <article
                key={post.id}
                className="card-glow-hover relative rounded-2xl border border-border-subtle bg-panel p-6 [animation:var(--animate-chat-enter)]"
                style={{ animationDelay: `${Math.min(i * 60, 420)}ms` }}
              >
                <div className="flex items-center gap-2 text-xs text-neutral-500">
                  <CalendarDays className="h-3.5 w-3.5" />
                  <time dateTime={post.publishedAt.toISOString()}>{formatDate(post.publishedAt)}</time>
                </div>
                <h2 className="mt-2 font-display text-xl font-semibold text-neutral-100">{post.tema}</h2>
                <p className="mt-1 font-mono text-[11px] uppercase tracking-widest text-neo-200">
                  {post.caption.split('\n')[0].slice(0, 80)}
                </p>
                <p className="mt-4 whitespace-pre-line text-sm leading-relaxed text-neutral-300">
                  {post.contenido.slice(0, 600)}
                  {post.contenido.length > 600 ? '…' : ''}
                </p>
                {post.media.length > 0 && (
                  <div className="mt-4 flex flex-wrap gap-3">
                    {post.media.map((m) => (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        key={m}
                        src={m}
                        alt={post.tema}
                        className="h-28 w-28 rounded-xl border border-border-subtle object-cover"
                        loading="lazy"
                      />
                    ))}
                  </div>
                )}
              </article>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}