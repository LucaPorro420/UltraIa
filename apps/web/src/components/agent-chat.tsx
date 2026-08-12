'use client';

import { useChat } from 'ai/react';
import { useRef, useState } from 'react';
import { FeedbackControl } from './feedback-control';

export function AgentChat({ agentId }: { agentId: string }) {
  const [conversationId, setConversationId] = useState<string | null>(null);
  const conversationRef = useRef<string | null>(null);
  const { messages, input, handleInputChange, handleSubmit, isLoading, error } = useChat({
    api: '/api/chat',
  });

  async function ensureConversation(): Promise<string> {
    if (conversationRef.current) return conversationRef.current;
    const res = await fetch('/api/conversations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ agentId }),
    });
    if (!res.ok) throw new Error('Could not start conversation');
    const data = (await res.json()) as { conversationId: string };
    conversationRef.current = data.conversationId;
    setConversationId(data.conversationId);
    return data.conversationId;
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (isLoading || !input.trim()) return;
    try {
      const id = await ensureConversation();
      handleSubmit(e, { body: { agentId, conversationId: id } });
    } catch {
      alert('Failed to start conversation. Please try again.');
    }
  }

  const lastAssistantIndex = [...messages]
    .map((m, i) => ({ m, i }))
    .filter(({ m }) => m.role === 'assistant')
    .at(-1)?.i;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3">
        {messages.length === 0 && (
          <p className="rounded-xl border border-dashed border-neutral-700 px-4 py-8 text-center text-sm text-neutral-500">
            Start a conversation to test your agent.
          </p>
        )}
        {messages.map((m, i) => (
          <div
            key={m.id}
            className={`max-w-[85%] whitespace-pre-wrap rounded-2xl px-4 py-3 text-sm ${
              m.role === 'user'
                ? 'self-end bg-violet-700/80 text-white'
                : 'self-start border border-neutral-800 bg-neutral-900 text-neutral-100'
            }`}
          >
            {m.content}
            {m.role === 'assistant' &&
              !isLoading &&
              conversationId &&
              i === lastAssistantIndex && (
                <FeedbackControl conversationId={conversationId} messageSeq={i + 1} />
              )}
          </div>
        ))}
        {isLoading && (
          <div className="self-start rounded-2xl border border-neutral-800 bg-neutral-900 px-4 py-3 text-sm text-neutral-400">
            Thinking…
          </div>
        )}
        {error && (
          <p className="rounded-lg border border-red-800 bg-red-950/50 px-3 py-2 text-xs text-red-300">
            {error.message}
          </p>
        )}
      </div>
      <form onSubmit={onSubmit} className="flex gap-2">
        <input
          value={input}
          onChange={handleInputChange}
          placeholder="Ask your agent something…"
          className="flex-1 rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-2.5 text-sm text-white outline-none focus:border-violet-500"
        />
        <button
          type="submit"
          disabled={isLoading || !input.trim()}
          className="rounded-lg bg-violet-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-violet-500 disabled:opacity-50"
        >
          Send
        </button>
      </form>
    </div>
  );
}
