'use client';

import { useState } from 'react';
import { setPublicAccessAction } from './actions';

export function PublicToggle({ agentId, isPublic }: { agentId: string; isPublic: boolean }) {
  const [enabled, setEnabled] = useState(isPublic);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function toggle() {
    setBusy(true);
    setError(null);
    const next = !enabled;
    const result = await setPublicAccessAction(agentId, next);
    setBusy(false);
    if (result.ok) {
      setEnabled(next);
    } else {
      setError(result.error ?? 'Update failed');
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-3">
        <button
          type="button"
          disabled={busy}
          onClick={toggle}
          aria-pressed={enabled}
          className={`relative h-6 w-11 rounded-full transition-all duration-200 ${enabled ? 'bg-violet-600 shadow-[0_0_14px_-2px_rgba(139,92,246,0.7)]' : 'bg-neutral-700'} disabled:opacity-50`}
        >
          <span
            className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all duration-200 ${enabled ? 'left-[22px]' : 'left-0.5'}`}
          />
        </button>
        <span className={`text-xs ${enabled ? 'text-violet-300' : 'text-neutral-300'}`}>
          Public access {enabled ? 'enabled' : 'disabled'}
        </span>
      </div>
      {error && <p className="text-xs text-red-400">{error}</p>}
    </div>
  );
}
