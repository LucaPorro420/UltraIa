'use client';

import { useState } from 'react';
import { approveVersionAction, rejectVersionAction } from './actions';

export function VersionActions({
  versionId,
  agentId,
  isPending,
}: {
  versionId: string;
  agentId: string;
  isPending: boolean;
}) {
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function approve(force: boolean) {
    setBusy(true);
    setMessage(null);
    const result = await approveVersionAction(versionId, agentId, force);
    setBusy(false);
    if (!result.ok) {
      setMessage(result.error ?? 'Approval failed');
    } else if (result.approved) {
      setMessage('Approved and promoted to ACTIVE.');
    } else {
      setMessage(
        `${result.reason ?? 'Regression gate failed'}. The version was rejected. You can force-approve to override.`,
      );
    }
  }

  async function reject() {
    setBusy(true);
    setMessage(null);
    await rejectVersionAction(versionId, agentId);
    setBusy(false);
    setMessage('Version rejected.');
  }

  if (!isPending) return null;

  return (
    <div className="mt-2 flex flex-wrap items-center gap-2">
      <button
        type="button"
        disabled={busy}
        onClick={() => approve(false)}
        className="rounded bg-emerald-700 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-600 disabled:opacity-50"
      >
        Approve (eval-gated)
      </button>
      <button
        type="button"
        disabled={busy}
        onClick={() => approve(true)}
        className="rounded bg-emerald-900 px-3 py-1.5 text-xs font-semibold text-emerald-200 hover:bg-emerald-800 disabled:opacity-50"
      >
        Force approve
      </button>
      <button
        type="button"
        disabled={busy}
        onClick={reject}
        className="rounded bg-neutral-800 px-3 py-1.5 text-xs font-semibold text-neutral-300 hover:bg-neutral-700 disabled:opacity-50"
      >
        Reject
      </button>
      {message && <span className="text-xs text-neutral-400">{message}</span>}
    </div>
  );
}
