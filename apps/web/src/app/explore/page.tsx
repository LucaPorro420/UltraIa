import Link from 'next/link';
import { SearchX } from 'lucide-react';
import { prisma } from '@ultraia/core';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { MarketingHeader } from '@/components/marketing-header';

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
    <main className="mx-auto max-w-5xl px-6 py-16">
      <MarketingHeader user={null} />

      <h1 className="mt-10 text-3xl font-bold tracking-tight">Explore public agents</h1>
      <p className="mt-2 max-w-2xl text-sm text-neutral-400">
        Purpose-built AI agents designed by UltraIa and shared by their owners. Open one to try it.
      </p>

      {agents.length === 0 ? (
        <div className="mt-10 flex flex-col items-center rounded-xl border border-dashed border-neutral-800 bg-neutral-900/50 p-10 text-center">
          <SearchX className="mb-3 h-8 w-8 text-neutral-600" />
          <p className="text-sm text-neutral-400">
            No public agents yet. Create an agent and toggle public access to list it here.
          </p>
        </div>
      ) : (
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {agents.map((a) => {
            const score = a.versions[0]?.evalRuns[0]?.avgScore;
            return (
            <Link key={a.id} href={`/a/${a.id}`} className="block">
              <Card className="h-full p-5 transition-colors hover:border-neutral-600">
                <div className="text-sm font-semibold text-white">{a.name || 'Untitled agent'}</div>
                <p className="mt-1 line-clamp-3 text-xs text-neutral-400">{a.taskDescription}</p>
                {a.versions[0] && (
                  <span className="mt-3 flex flex-wrap items-center gap-2">
                    <Badge>v{a.versions[0].versionNumber} · {a.versions[0].model}</Badge>
                    {typeof score === 'number' && (
                      <Badge
                        className={
                          score >= 0.6
                            ? 'bg-emerald-900/60 text-emerald-300'
                            : 'bg-amber-900/60 text-amber-300'
                        }
                      >
                        eval {score.toFixed(2)}
                      </Badge>
                    )}
                  </span>
                )}
              </Card>
            </Link>
            );
          })}
        </div>
      )}
    </main>
  );
}
