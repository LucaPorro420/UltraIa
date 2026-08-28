import Link from 'next/link';
import { notFound } from 'next/navigation';
import { prisma } from '@ultraia/core';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { MarketingHeader } from '@/components/marketing-header';
import { SiteFooter } from '@/components/site-footer';
import { PublicAgentChat } from '@/components/public-agent-chat';

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const blueprint = await prisma.agentBlueprint.findFirst({
    where: { id, isPublic: true },
    select: { name: true },
  });
  return { title: blueprint ? `${blueprint.name || 'Agent'} · UltraIa` : 'Agent · UltraIa' };
}

export default async function PublicAgentPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const blueprint = await prisma.agentBlueprint.findFirst({
    where: { id, isPublic: true },
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
  if (!blueprint) notFound();

  const active = blueprint.versions[0];
  const tools = active ? (JSON.parse(active.tools) as string[]) : [];
  const guardrails = active ? (JSON.parse(active.guardrails) as string[]) : [];
  const score = active?.evalRuns[0]?.avgScore;

  return (
    <>
      <MarketingHeader user={null} />
      <main className="mx-auto max-w-3xl px-6 py-12">
      <Link href="/explore" className="text-sm text-neutral-500 hover:text-white">
        ← Explore
      </Link>

      <h1 className="mt-3 text-2xl font-bold">{blueprint.name || 'Untitled agent'}</h1>
      <p className="mt-2 text-sm text-neutral-400">{blueprint.taskDescription}</p>

      <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-neutral-500">
        {active && (
          <Badge className="bg-neutral-800 text-neutral-300">v{active.versionNumber} · {active.model}</Badge>
        )}
        {typeof score === 'number' && (
          <Badge
            className={
              score >= 0.6 ? 'bg-emerald-900/60 text-emerald-300' : 'bg-amber-900/60 text-amber-300'
            }
          >
            eval {score.toFixed(2)}
          </Badge>
        )}
        {tools.map((t) => (
          <Badge key={t} className="bg-violet-900/50 text-violet-200">tool: {t}</Badge>
        ))}
      </div>

      {guardrails.length > 0 && (
        <div className="mt-4 rounded-xl border border-neutral-800 bg-neutral-900/50 p-4">
          <h2 className="text-xs font-semibold text-neutral-300">Guardrails</h2>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-xs text-neutral-400">
            {guardrails.map((g, i) => (
              <li key={i}>{g}</li>
            ))}
          </ul>
        </div>
      )}

      <Card className="mt-6 p-5">
        <h2 className="mb-4 text-sm font-semibold text-neutral-300">Try this agent</h2>
        <PublicAgentChat agentId={id} />
      </Card>
    </main>

    <SiteFooter />
    </>
  );
}
