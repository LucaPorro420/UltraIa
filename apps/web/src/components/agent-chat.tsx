'use client';

import { useChat } from 'ai/react';
import { useEffect, useRef, useState } from 'react';
import { Plus, SendHorizontal } from 'lucide-react';
import { FeedbackControl } from './feedback-control';

type ConversationMeta = { id: string; title: string; createdAt: string };
type StoredMessage = { id: string; role: 'user' | 'assistant' | 'system'; content: string; sequence: number };

export function AgentChat({ agentId }: { agentId: string }) {
  const [conversations, setConversations] = useState<ConversationMeta[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const conversationRef = useRef<string | null>(null);
  const { messages, input, handleInputChange, handleSubmit, setMessages, isLoading, error } = useChat({
    api: '/api/chat',
  });

  async function loadConversations(id: string) {
    const res = await fetch(`/api/conversations?agentId=${encodeURIComponent(id)}`);
    if (res.ok) setConversations((await res.json()) as ConversationMeta[]);
  }

  useEffect(() => {
    loadConversations(agentId);
  }, [agentId]);

  async function selectConversation(id: string) {
    setLoadingHistory(true);
    setActiveId(id);
    conversationRef.current = id;
    try {
      const res = await fetch(`/api/conversations/${id}/messages`);
      if (res.ok) {
        const msgs = (await res.json()) as StoredMessage[];
        setMessages(msgs.map((m) => ({ id: m.id, role: m.role, content: m.content })));
      }
    } finally {
      setLoadingHistory(false);
    }
  }

  function startNew() {
    conversationRef.current = null;
    setActiveId(null);
    setMessages([]);
  }

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
    setActiveId(data.conversationId);
    loadConversations(agentId);
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
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={startNew}
          className={`rounded-full px-3 py-1 text-xs font-medium ${
            activeId === null
              ? 'bg-violet-700 text-white'
              : 'border border-neutral-700 text-neutral-300 transition-colors duration-200 hover:bg-neutral-800'
          }`}
        >
          <Plus className="h-3.5 w-3.5" /> New chat
        </button>
        {conversations.map((c) => (
          <button
            key={c.id}
            type="button"
            onClick={() => selectConversation(c.id)}
            title={c.title}
            className={`max-w-[12rem] truncate rounded-full px-3 py-1 text-xs font-medium ${
              activeId === c.id
                ? 'bg-violet-700 text-white'
                : 'border border-neutral-700 text-neutral-300 transition-colors duration-200 hover:bg-neutral-800'
            }`}
          >
            {c.title}
          </button>
        ))}
      </div>

      <div className="flex flex-col gap-3">
        {loadingHistory && <p className="text-xs text-neutral-500">Loading conversation…</p>}
        {messages.length === 0 && !loadingHistory && (
          <p className="rounded-xl border border-dashed border-neutral-700 px-4 py-8 text-center text-sm text-neutral-500">
            Start a conversation to test your agent.
          </p>
        )}
        {messages.map((m, i) => (
          <div
            key={m.id}
            style={{ animationDelay: `${Math.min(i * 30, 240)}ms` }}
            className={`chat-enter max-w-[85%] whitespace-pre-wrap rounded-2xl px-4 py-3 text-sm [animation:var(--animate-chat-enter)] ${
              m.role === 'user'
                ? 'self-end bg-violet-700/80 text-white'
                : 'self-start border border-neutral-800 bg-neutral-900 text-neutral-100'
            }`}
          >
            {m.content}
            {m.role === 'assistant' && isLoading && i === messages.length - 1 && (
              <span className="stream-caret" />
            )}
            {m.role === 'assistant' &&
              !isLoading &&
              activeId &&
              i === lastAssistantIndex && (
                <FeedbackControl conversationId={activeId} messageSeq={i + 1} />
              )}
          </div>
        ))}
        {isLoading && (
          <div className="self-start flex items-center gap-1.5 rounded-2xl border border-border-subtle bg-panel px-4 py-3.5">
            <span className="typing-dot" style={{ animationDelay: '0ms' }} />
            <span className="typing-dot" style={{ animationDelay: '150ms' }} />
            <span className="typing-dot" style={{ animationDelay: '300ms' }} />
            <span className="sr-only">Thinking…</span>
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
          <SendHorizontal className="h-4 w-4" /> Send
        </button>
      </form>
    </div>
  );
}
