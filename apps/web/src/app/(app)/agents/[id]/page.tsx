import Link from 'next/link';
import { getFeedbackStats, listVersions, prisma } from '@ultraia/core';
import { requireUser } from '@/lib/server/context';
import { AgentChat } from '@/components/agent-chat';
import { ApiKeyPanel } from './api-key-panel';
import { EvalInputForm } from './eval-input-form';
import { EvalRunner } from './eval-runner';
import { ImproveButton } from './improve-button';
import { VersionActions } from './version-actions';

const STATUS_STYLES: Record<string, string> = {
  ACTIVE: 'bg-emerald-900/60 text-emerald-300',
  PENDING: 'bg-amber-900/60 text-amber-300',
  REJECTED: 'bg-red-900/60 text-red-300',
  SUPERSEDED: 'bg-neutral-800 text-neutral-400',
};

export default async function AgentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUser();

  const blueprint = await prisma.agentBlueprint.findFirst({
    where: { id, workspace: { ownerId: user.id } },
  });
  if (!blueprint) {
    return (
      <div>
        <p className="text-neutral-400">Agent not found.</p>
        <Link href="/dashboard" className="mt-4 inline-block text-sm text-violet-400 hover:underline">
          Back to dashboard
        </Link>
      </div>
    );
  }

  const versions = await listVersions(prisma, id);
  const active = versions.find((v) => v.status === 'ACTIVE');
  const stats = await getFeedbackStats(prisma, id);
  const evalInputs = JSON.parse(blueprint.evalInputs || '[]') as string[];
  const lastRun = active?.evalRuns[0] ?? null;

  return (
    <div className="flex flex-col gap-8">
      <div>
        <Link href="/dashboard" className="text-sm text-neutral-500 hover:text-white">
          ← Dashboard
        </Link>
        <h1 className="mt-2 text-2xl font-bold">{blueprint.name}</h1>
        <p className="mt-1 max-w-3xl text-sm text-neutral-400">{blueprint.taskDescription}</p>
        <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-neutral-500">
          {active && (
            <>
              <span className="rounded-full bg-neutral-800 px-2.5 py-0.5 text-neutral-300">
                v{active.versionNumber} · {active.model}
              </span>
              <span>Tools: {(JSON.parse(active.tools) as string[]).join(', ') || 'none'}</span>
            </>
          )}
          <span>
            Feedback: {stats.good} good / {stats.bad} bad
          </span>
        </div>
      </div>

      <section className="grid gap-6 lg:grid-cols-5">
        <div className="lg:col-span-3">
          <div className="rounded-2xl border border-neutral-800 bg-neutral-900/50 p-5">
            <h2 className="mb-4 text-sm font-semibold text-neutral-300">Try it</h2>
            <AgentChat agentId={id} />
          </div>
        </div>

        <div className="flex flex-col gap-6 lg:col-span-2">
          <div className="rounded-2xl border border-neutral-800 bg-neutral-900/50 p-5">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-neutral-300">Learn from feedback</h2>
              <ImproveButton agentId={id} />
            </div>
            <p className="mt-2 text-xs text-neutral-500">
              Reviews recent BAD feedback and failed evaluations, then proposes a new system prompt.
              Approval runs the regression gate before promoting.
            </p>
          </div>

          <div className="rounded-2xl border border-neutral-800 bg-neutral-900/50 p-5">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-sm font-semibold text-neutral-300">Evaluations</h2>
              {active && <EvalRunner versionId={active.id} agentId={id} />}
            </div>
            {lastRun ? (
              <div className="mt-3 text-xs text-neutral-400">
                <p>
                  Last run: avg score{' '}
                  <span className="font-semibold text-neutral-200">{lastRun.avgScore.toFixed(2)}</span> · pass rate{' '}
                  <span className="font-semibold text-neutral-200">
                    {Math.round(lastRun.passRate * 100)}%
                  </span>{' '}
                  ({lastRun.cases.length} cases)
                </p>
                <ul className="mt-2 space-y-1">
                  {lastRun.cases.slice(0, 4).map((c) => (
                    <li key={c.id} className="flex items-center justify-between gap-2">
                      <span className="truncate">{c.input}</span>
                      <span
                        className={
                          c.verdict === 'PASS' ? 'text-emerald-400' : 'text-red-400'
                        }
                      >
                        {c.score.toFixed(2)}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            ) : (
              <p className="mt-3 text-xs text-neutral-500">No evaluation runs yet.</p>
            )}
            <div className="mt-4 border-t border-neutral-800 pt-3">
              <p className="mb-2 text-xs text-neutral-500">
                Regression set ({evalInputs.length} inputs):
              </p>
              <ul className="mb-3 space-y-1 text-xs text-neutral-400">
                {evalInputs.slice(0, 5).map((input, i) => (
                  <li key={i} className="truncate">
                    • {input}
                  </li>
                ))}
              </ul>
              <EvalInputForm agentId={id} />
            </div>
          </div>

          <div className="rounded-2xl border border-neutral-800 bg-neutral-900/50 p-5">
            <h2 className="text-sm font-semibold text-neutral-300">API access</h2>
            <div className="mt-3">
              <ApiKeyPanel agentId={id} />
            </div>
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-neutral-800 bg-neutral-900/50 p-5">
        <h2 className="text-sm font-semibold text-neutral-300">Version history</h2>
        <ul className="mt-4 flex flex-col gap-3">
          {versions.map((v) => (
            <li key={v.id} className="rounded-xl border border-neutral-800 p-4">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-semibold">v{v.versionNumber}</span>
                <span className={`rounded-full px-2.5 py-0.5 text-xs ${STATUS_STYLES[v.status] ?? 'bg-neutral-800 text-neutral-400'}`}>
                  {v.status}
                </span>
                <span className="text-xs text-neutral-500">
                  {v.createdAt.toLocaleString()} · {v.model}
                </span>
                {v.evalRuns[0] && (
                  <span className="text-xs text-neutral-400">
                    last eval: {v.evalRuns[0].avgScore.toFixed(2)}
                  </span>
                )}
              </div>
              {v.changeSummary && <p className="mt-2 text-xs text-neutral-400">{v.changeSummary}</p>}
              <details className="mt-2">
                <summary className="cursor-pointer text-xs text-neutral-500 hover:text-neutral-300">
                  System prompt
                </summary>
                <pre className="mt-2 max-h-48 overflow-auto whitespace-pre-wrap rounded bg-neutral-950 p-3 text-xs text-neutral-300">
                  {v.systemPrompt}
                </pre>
              </details>
              <VersionActions versionId={v.id} agentId={id} isPending={v.status === 'PENDING'} />
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
