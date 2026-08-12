'use client';

import { useState } from 'react';
import { proposeImprovementAction } from './actions';

export function ImproveButton({ agentId }: { agentId: string }) {
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function propose() {
    setBusy(true);
    setMessage(null);
    const result = await proposeImprovementAction(agentId);
    setBusy(false);
    setMessage(
      result.ok
        ? 'Improvement proposed — review and approve it in the version history below.'
        : (result.error ?? 'Proposal failed'),
    );
  }

  return (
    <div className="flex items-center gap-3">
      <button
        type="button"
        disabled={busy}
        onClick={propose}
        className="rounded-lg bg-violet-700 px-4 py-2 text-xs font-semibold text-white hover:bg-violet-600 disabled:opacity-50"
      >
        {busy ? 'Analyzing feedback…' : 'Propose improvement'}
      </button>
      {message && <span className="text-xs text-neutral-400">{message}</span>}
    </div>
  );
}
