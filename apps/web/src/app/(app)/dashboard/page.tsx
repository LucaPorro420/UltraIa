import Link from 'next/link';
import { Bot } from 'lucide-react';
import { prisma } from '@ultraia/core';
import { requireUser } from '@/lib/server/context';
import { Badge } from '@/components/ui/badge';
import { EmptyState } from '@/components/ui/empty-state';
import { SkillPipeline } from '@/components/app-shell/skill-pipeline';
import { AssistantChat } from '@/components/assistant-chat';

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
          <h1 className="font-display text-[22px] font-bold">Your agents</h1>
          <p className="mt-1 text-sm text-neutral-400">
            Agents UltraIa generated for you. Each one improves from feedback and evaluations.
          </p>
        </div>
        <Link
          href="/agents/new"
          className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white transition-colors duration-150 hover:bg-primary/85"
        >
          + New agent
        </Link>
      </div>

      {/* General assistant — Claude/ChatGPT-style chat */}
      <section className="mt-8">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-display text-[15px] font-semibold text-neutral-200">Asistente</h2>
          <span className="font-mono text-[10px] uppercase tracking-widest text-neutral-500">
            chat general
          </span>
        </div>
        <AssistantChat />
      </section>

      {/* Agent-development pipeline: Plan → Build → Test → Review → Ship → Simplify */}
      <section className="mt-8 rounded-lg border border-border-subtle bg-panel/60 p-4">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-sm font-semibold text-neutral-200">Agent pipeline</h2>
          <span className="font-mono text-[10px] uppercase tracking-widest text-neutral-500">
            plan → ship → simplify
          </span>
        </div>
        <p className="mt-1 text-[13px] text-neutral-500">
          Every agent can run the full build loop. Describe a task in chat and UltraIa plans, builds,
          tests, reviews, ships and simplifies — each step callable as a skill.
        </p>
        <div className="mt-4">
          <SkillPipeline />
        </div>
      </section>

      {blueprints.length === 0 ? (
        <div className="mt-8">
          <EmptyState
            icon={<Bot className="h-8 w-8" />}
            title="No agents yet."
            description="Describe a task and UltraIa will design a purpose-built agent for it."
            action={
              <Link
                href="/agents/new"
                className="inline-block rounded-lg bg-primary px-5 py-2 text-sm font-semibold text-white transition-colors duration-150 hover:bg-primary/85"
              >
                Create your first agent
              </Link>
            }
          />
        </div>
      ) : (
        <ul className="mt-8 grid gap-4 md:grid-cols-2">
          {blueprints.map((bp, i) => {
            const active = bp.versions[0];
            const score = active?.evalRuns[0]?.avgScore;
            return (
              <li key={bp.id} style={{ animationDelay: `${Math.min(i * 60, 480)}ms` }}>
                <Link
                  href={`/agents/${bp.id}`}
                  className="block rounded-lg border border-border-subtle bg-panel p-5 transition-colors duration-150 [animation:var(--animate-chat-enter)] hover:border-border-muted hover:bg-panel-hover"
                >
                  <div className="flex items-center justify-between gap-2">
                    <h2 className="font-display text-sm font-semibold text-neutral-100">{bp.name}</h2>
                    <span className="flex shrink-0 items-center gap-1.5">
                      <Badge className="bg-panel-header font-mono text-[10px] uppercase tracking-widest text-neutral-400">
                        v{active?.versionNumber ?? '?'}
                      </Badge>
                      {typeof score === 'number' && (
                        <Badge
                          className={`font-mono text-[10px] uppercase tracking-widest ${
                            score >= 0.6 ? 'bg-emerald-900/60 text-emerald-300' : 'bg-amber-900/60 text-amber-300'
                          }`}
                        >
                          eval {score.toFixed(2)}
                        </Badge>
                      )}
                    </span>
                  </div>
                  <p className="mt-2 line-clamp-2 text-[13px] text-neutral-400">{bp.taskDescription}</p>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}