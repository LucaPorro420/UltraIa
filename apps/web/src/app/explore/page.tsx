import Link from 'next/link';
import { SearchX } from 'lucide-react';
import { prisma } from '@ultraia/core';
import { Badge } from '@/components/ui/badge';
import { EmptyState } from '@/components/ui/empty-state';
import { MarketingHeader } from '@/components/marketing-header';
import { SiteFooter } from '@/components/site-footer';

export const metadata = { title: 'Explore public agents · UltraIa' };

export default async function ExplorePage() {
  const agents = await prisma.agentBlueprint.findMany({
    where: { isPublic: true },
    orderBy: { createdAt: 'desc' },
    take: 60,
    include: {
      versions: {
        where: { status: 'ACTIVE' },
        take: 1,
        include: {
          evalRuns: {
            where: { status: 'COMPLETED' },
            orderBy: { createdAt: 'desc' },
            take: 1,
            select: { avgScore: true },
          },
        },
      },
    },
  });

  return (
    <main className="min-h-screen bg-canvas">
      <MarketingHeader user={null} />

      <section className="neo-aura mx-auto max-w-5xl px-6 py-20">
        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="font-mono text-[11px] uppercase tracking-widest text-neutral-500">
              registry
            </p>
            <h1 className="mt-2 font-display text-3xl font-bold tracking-tight sm:text-4xl">
              Explore public agents
            </h1>
            <p className="mt-3 max-w-2xl text-sm text-neutral-400">
              Purpose-built AI agents designed by UltraIa and shared by their owners. Open one to try it.
            </p>
          </div>
          <span className="hidden shrink-0 rounded-full border border-border-muted bg-panel px-3 py-1 font-mono text-[11px] text-neutral-500 sm:block">
            {agents.length} public
          </span>
        </div>

        {agents.length === 0 ? (
          <div className="mt-12 [animation:var(--animate-chat-enter)]">
            <EmptyState
              icon={<SearchX className="h-8 w-8" />}
              title="No public agents yet"
              description="Create an agent and toggle public access to list it here."
            />
          </div>
        ) : (
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {agents.map((a, i) => {
              const score = a.versions[0]?.evalRuns[0]?.avgScore;
              return (
                <Link key={a.id} href={`/a/${a.id}`} className="block">
                  <div
                    className="card-glow-hover h-full rounded-xl border border-border-subtle bg-panel p-5 [animation:var(--animate-chat-enter)]"
                    style={{ animationDelay: `${Math.min(i * 60, 420)}ms` }}
                  >
                    <div className="text-sm font-semibold text-neutral-100">
                      {a.name || 'Untitled agent'}
                    </div>
                    <p className="mt-1 line-clamp-3 text-xs text-neutral-400">{a.taskDescription}</p>
                    {a.versions[0] && (
                      <span className="mt-3 flex flex-wrap items-center gap-2">
                        <Badge className="border border-border-muted bg-input-active font-mono text-neutral-300">
                          v{a.versions[0].versionNumber} · {a.versions[0].model}
                        </Badge>
                        {typeof score === 'number' && (
                          <Badge
                            className={`font-mono ${
                              score >= 0.6
                                ? 'border border-emerald-500/30 bg-emerald-950 text-emerald-300'
                                : 'border border-amber-500/30 bg-amber-950 text-amber-300'
                            }`}
                          >
                            eval {score.toFixed(2)}
                          </Badge>
                        )}
                      </span>
                    )}
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </section>
      <SiteFooter />
    </main>
  );
}