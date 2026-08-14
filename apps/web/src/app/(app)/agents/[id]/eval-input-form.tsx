'use client';

import { useState } from 'react';
import { addEvalInputAction } from './actions';

export function EvalInputForm({ agentId }: { agentId: string }) {
  const [input, setInput] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMessage(null);
    const result = await addEvalInputAction(agentId, input);
    setBusy(false);
    setInput('');
    setMessage(result.ok ? 'Added.' : (result.error ?? 'Failed'));
  }

  return (
    <form onSubmit={submit} className="flex gap-2">
      <input
        value={input}
        onChange={(e) => setInput(e.target.value)}
        placeholder="Add an eval input for the regression set"
        className="flex-1 rounded-lg border border-neutral-700 bg-input-active px-2 py-1.5 text-xs text-white outline-none transition-colors duration-150 focus:border-violet-500"
      />
      <button
        type="submit"
        disabled={busy || !input.trim()}
        className="rounded-lg bg-neutral-800 px-3 py-1.5 text-xs font-semibold text-neutral-200 transition-all duration-150 hover:bg-violet-600 hover:text-white hover:shadow-[0_8px_22px_-10px_rgba(139,92,246,0.6)] disabled:opacity-50"
      >
        Add
      </button>
      {message && <span className="self-center text-xs text-neutral-400">{message}</span>}
    </form>
  );
}
