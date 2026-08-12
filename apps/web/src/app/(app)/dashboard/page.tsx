import Link from 'next/link';
import { prisma } from '@ultraia/core';
import { requireUser } from '@/lib/server/context';

export default async function DashboardPage() {
  const user = await requireUser();
  const blueprints = await prisma.agentBlueprint.findMany({
    where: { workspaceId: user.workspaceId },
    orderBy: { createdAt: 'desc' },
    include: {
      versions: { where: { status: 'ACTIVE' }, orderBy: { versionNumber: 'desc' } },
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
        <div className="mt-16 rounded-2xl border border-dashed border-neutral-700 p-12 text-center">
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
            return (
              <li key={bp.id}>
                <Link
                  href={`/agents/${bp.id}`}
                  className="block rounded-2xl border border-neutral-800 bg-neutral-900/50 p-6 transition hover:border-violet-700"
                >
                  <div className="flex items-center justify-between">
                    <h2 className="font-semibold">{bp.name}</h2>
                    <span className="rounded-full bg-neutral-800 px-2.5 py-0.5 text-xs text-neutral-300">
                      v{active?.versionNumber ?? '?'}
                    </span>
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
