'use client';

import { useState } from 'react';
import { runEvalsAction } from './actions';

export function EvalRunner({ versionId, agentId }: { versionId: string; agentId: string }) {
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function run() {
    setBusy(true);
    setMessage(null);
    const result = await runEvalsAction(versionId, agentId);
    setBusy(false);
    setMessage(result.ok ? 'Evaluation run completed.' : (result.error ?? 'Eval run failed'));
  }

  return (
    <div className="flex items-center gap-3">
      <button
        type="button"
        disabled={busy}
        onClick={run}
        className="rounded-lg bg-violet-600 px-4 py-2 text-xs font-semibold text-white shadow-[0_8px_24px_-12px_rgba(139,92,246,0.6)] transition-all duration-150 hover:bg-violet-500 hover:shadow-[0_10px_32px_-12px_rgba(139,92,246,0.8)] disabled:opacity-50"
      >
        {busy ? 'Running evals…' : 'Run evaluations'}
      </button>
      {message && <span className="text-xs text-neutral-400">{message}</span>}
    </div>
  );
}
