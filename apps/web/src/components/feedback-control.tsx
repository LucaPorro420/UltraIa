'use client';

import { useState } from 'react';

export function FeedbackControl({
  conversationId,
  messageSeq,
}: {
  conversationId: string;
  messageSeq: number;
}) {
  const [rating, setRating] = useState<null | 'GOOD' | 'BAD'>(null);
  const [critique, setCritique] = useState('');
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);

  async function submit(r: 'GOOD' | 'BAD') {
    setBusy(true);
    try {
      const res = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          conversationId,
          messageSeq,
          rating: r,
          critique: critique.trim() || undefined,
        }),
      });
      if (res.ok) {
        setRating(r);
        setSaved(true);
      }
    } finally {
      setBusy(false);
    }
  }

  if (saved) {
    return (
      <p className="mt-2 text-xs text-neutral-500">
        Thanks — feedback recorded. This improves the agent.
      </p>
    );
  }

  return (
    <div className="mt-2 flex flex-col gap-2 border-t border-neutral-800 pt-2">
      <div className="flex items-center gap-2">
        <span className="text-[11px] uppercase tracking-wide text-neutral-500">Was this good?</span>
        <button
          type="button"
          disabled={busy}
          onClick={() => submit('GOOD')}
          className={`rounded px-2 py-0.5 text-xs ${
            rating === 'GOOD' ? 'bg-emerald-700 text-white' : 'bg-neutral-800 text-neutral-300 hover:bg-neutral-700'
          }`}
        >
          Good
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={() => submit('BAD')}
          className={`rounded px-2 py-0.5 text-xs ${
            rating === 'BAD' ? 'bg-red-700 text-white' : 'bg-neutral-800 text-neutral-300 hover:bg-neutral-700'
          }`}
        >
          Bad
        </button>
      </div>
      {rating === 'BAD' && (
        <div className="flex gap-2">
          <input
            value={critique}
            onChange={(e) => setCritique(e.target.value)}
            placeholder="What went wrong? (helps the improvement pipeline)"
            className="flex-1 rounded border border-neutral-700 bg-neutral-950 px-2 py-1.5 text-xs text-white outline-none focus:border-red-500"
          />
          <button
            type="button"
            disabled={busy}
            onClick={() => submit('BAD')}
            className="rounded bg-red-700 px-3 py-1.5 text-xs font-semibold text-white hover:bg-red-600 disabled:opacity-50"
          >
            Send
          </button>
        </div>
      )}
    </div>
  );
}
