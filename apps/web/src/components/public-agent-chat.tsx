'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

type Msg = { role: 'user' | 'assistant'; content: string };

export function PublicAgentChat({ agentId }: { agentId: string }) {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    const text = input.trim();
    if (!text || loading) return;
    setError(null);
    const optimistic = [...messages, { role: 'user' as const, content: text }];
    setMessages(optimistic);
    setInput('');
    setLoading(true);
    try {
      const res = await fetch(`/api/v1/agents/${agentId}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error((data && data.error) || `Request failed (${res.status})`);
      setMessages([...optimistic, { role: 'assistant' as const, content: data.text }]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
      setMessages(optimistic);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex min-h-[120px] flex-col gap-3">
        {messages.length === 0 && (
          <p className="text-xs text-neutral-500">Send a message to talk to this agent.</p>
        )}
        {messages.map((m, i) => (
          <div
            key={i}
            className={m.role === 'user' ? 'self-end max-w-[85%] rounded-lg bg-violet-600 px-3 py-2 text-sm text-white' : 'self-start max-w-[85%] rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm text-neutral-200'}
          >
            {m.content}
          </div>
        ))}
        {loading && <p className="self-start text-xs text-neutral-500">Thinking…</p>}
      </div>

      {error && (
        <p className="rounded-lg border border-red-800 bg-red-950/50 px-3 py-2 text-xs text-red-300">{error}</p>
      )}

      <form onSubmit={send} className="flex items-center gap-2">
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Type a message…"
          disabled={loading}
          className="flex-1"
          aria-label="Message"
        />
        <Button type="submit" disabled={loading || !input.trim()}>
          Send
        </Button>
      </form>
    </div>
  );
}
