import Link from 'next/link';
import { Bot } from 'lucide-react';
import { prisma } from '@ultraia/core';
import { requireUser } from '@/lib/server/context';
import { Badge } from '@/components/ui/badge';

export default async function DashboardPage() {
  const user = await requireUser();
  const blueprints = await prisma.agentBlueprint.findMany({
    where: { workspaceId: user.workspaceId },
    orderBy: { createdAt: 'desc' },
    include: {
      versions: {
        where: { status: 'ACTIVE' },
        orderBy: { versionNumber: 'desc' },
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
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Your agents</h1>
          <p className="mt-1 text-sm text-neutral-400">
            Agents UltraIa generated for you. Each one improves from feedback and evaluations.
          </p>
        </div>
        <Link
          href="/agents/new"
          className="rounded-lg bg-violet-600 px-4 py-2 text-sm font-semibold text-white hover:bg-violet-500"
        >
          + New agent
        </Link>
      </div>

      {blueprints.length === 0 ? (
        <div className="mt-16 flex flex-col items-center rounded-2xl border border-dashed border-neutral-700 p-12 text-center">
          <Bot className="mb-4 h-10 w-10 text-neutral-600" />
          <p className="text-neutral-300">No agents yet.</p>
          <p className="mt-2 text-sm text-neutral-500">
            Describe a task and UltraIa will design a purpose-built agent for it.
          </p>
          <Link
            href="/agents/new"
            className="mt-6 inline-block rounded-lg bg-violet-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-violet-500"
          >
            Create your first agent
          </Link>
        </div>
      ) : (
        <ul className="mt-8 grid gap-4 md:grid-cols-2">
          {blueprints.map((bp) => {
            const active = bp.versions[0];
            const score = active?.evalRuns[0]?.avgScore;
            return (
              <li key={bp.id}>
                <Link
                  href={`/agents/${bp.id}`}
                  className="block rounded-2xl border border-neutral-800 bg-neutral-900/50 p-6 transition hover:border-violet-700"
                >
                  <div className="flex items-center justify-between">
                    <h2 className="font-semibold">{bp.name}</h2>
                    <Badge>v{active?.versionNumber ?? '?'}</Badge>
                    {typeof score === 'number' && (
                      <Badge
                        className={
                          score >= 0.6 ? 'bg-emerald-900/60 text-emerald-300' : 'bg-amber-900/60 text-amber-300'
                        }
                      >
                        eval {score.toFixed(2)}
                      </Badge>
                    )}
                  </div>
                  <p className="mt-2 line-clamp-2 text-sm text-neutral-400">{bp.taskDescription}</p>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
