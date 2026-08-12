'use client';

import { useState } from 'react';

export function ApiKeyPanel({ agentId }: { agentId: string }) {
  const [key, setKey] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function generate() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch('/api/agents/' + agentId + '/apikeys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ agentId, name: name.trim() || 'default' }),
      });
      if (!res.ok) throw new Error((await res.text()) || 'Failed');
      const data = (await res.json()) as { key: string };
      setKey(data.key);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate key');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <p className="text-xs text-neutral-500">
        Call this agent from your own systems: <code className="text-neutral-300">POST /api/v1/agents/{'{agentId}'}/chat</code> with header{' '}
        <code className="text-neutral-300">x-api-key</code> and JSON body <code className="text-neutral-300">{'{ "message": "..." }'}</code>.
      </p>
      <div className="flex gap-2">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Key name (e.g. production)"
          className="flex-1 rounded border border-neutral-700 bg-neutral-900 px-2 py-1.5 text-xs text-white outline-none focus:border-violet-500"
        />
        <button
          type="button"
          disabled={busy}
          onClick={generate}
          className="rounded bg-neutral-800 px-3 py-1.5 text-xs font-semibold text-neutral-200 hover:bg-neutral-700 disabled:opacity-50"
        >
          Generate API key
        </button>
      </div>
      {key && (
        <div className="rounded border border-amber-700/60 bg-amber-950/30 p-3">
          <p className="text-xs font-semibold text-amber-300">Copy this key now — it is shown only once:</p>
          <code className="mt-1 block break-all rounded bg-neutral-950 px-2 py-1.5 text-xs text-amber-100">{key}</code>
        </div>
      )}
      {error && <p className="text-xs text-red-400">{error}</p>}
    </div>
  );
}
