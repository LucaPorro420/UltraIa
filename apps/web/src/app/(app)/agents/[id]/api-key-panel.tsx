'use client';

import { useEffect, useState } from 'react';

type ApiKeyInfo = {
  id: string;
  name: string;
  prefix: string;
  lastUsedAt: string | null;
  createdAt: string;
};

export function ApiKeyPanel({ agentId }: { agentId: string }) {
  const [key, setKey] = useState<string | null>(null);
  const [keys, setKeys] = useState<ApiKeyInfo[]>([]);
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function loadKeys(id: string) {
    const res = await fetch('/api/agents/' + id + '/apikeys');
    if (res.ok) setKeys((await res.json()) as ApiKeyInfo[]);
  }

  useEffect(() => {
    loadKeys(agentId);
  }, [agentId]);

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
      setName('');
      await loadKeys(agentId);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate key');
    } finally {
      setBusy(false);
    }
  }

  async function revoke(keyId: string) {
    const res = await fetch(`/api/agents/${agentId}/apikeys?keyId=${encodeURIComponent(keyId)}`, {
      method: 'DELETE',
    });
      if (res.ok) await loadKeys(agentId);
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
          className="flex-1 rounded-lg border border-neutral-700 bg-input-active px-2 py-1.5 text-xs text-white outline-none transition-colors duration-150 focus:border-violet-500"
        />
        <button
          type="button"
          disabled={busy}
          onClick={generate}
          className="rounded-lg bg-neutral-800 px-3 py-1.5 text-xs font-semibold text-neutral-200 shadow-[0_6px_18px_-10px_rgba(139,92,246,0.4)] transition-all duration-150 hover:bg-neutral-700 hover:shadow-[0_8px_22px_-10px_rgba(139,92,246,0.6)] disabled:opacity-50"
        >
          Generate API key
        </button>
      </div>
      {key && (
        <div className="rounded-lg border border-amber-700/60 bg-amber-950/30 p-3">
          <p className="text-xs font-semibold text-amber-300">Copy this key now — it is shown only once:</p>
          <code className="mt-1 block break-all rounded-lg bg-neutral-950 px-2 py-1.5 text-xs text-amber-100">{key}</code>
        </div>
      )}
      {keys.length > 0 && (
        <ul className="flex flex-col gap-2">
          {keys.map((k) => (
            <li key={k.id} className="card-glow-hover flex items-center justify-between gap-2 rounded-lg border border-border-subtle bg-input-active/70 px-3 py-2">
              <div className="min-w-0">
                <p className="truncate text-xs font-medium text-neutral-200">{k.name}</p>
                <p className="truncate text-[11px] text-neutral-500">
                  {k.prefix} · {k.lastUsedAt ? `used ${new Date(k.lastUsedAt).toLocaleString()}` : 'never used'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => revoke(k.id)}
                className="rounded-lg bg-red-700/90 px-2.5 py-1 text-[11px] font-semibold text-white transition-colors duration-150 hover:bg-red-600"
              >
                Revoke
              </button>
            </li>
          ))}
        </ul>
      )}
      {error && <p className="text-xs text-red-400">{error}</p>}
    </div>
  );
}
