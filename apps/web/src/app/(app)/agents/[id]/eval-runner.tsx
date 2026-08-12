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
        className="rounded-lg bg-neutral-800 px-4 py-2 text-xs font-semibold text-neutral-200 hover:bg-neutral-700 disabled:opacity-50"
      >
        {busy ? 'Running evals…' : 'Run evaluations'}
      </button>
      {message && <span className="text-xs text-neutral-400">{message}</span>}
    </div>
  );
}
