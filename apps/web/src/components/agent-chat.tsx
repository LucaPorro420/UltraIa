'use client';

import { useChat } from 'ai/react';
import { useEffect, useRef, useState } from 'react';
import { Plus, SendHorizontal, Sparkles, Square, RefreshCcw } from 'lucide-react';
import { FeedbackControl } from './feedback-control';

type ConversationMeta = { id: string; title: string; createdAt: string };
type StoredMessage = { id: string; role: 'user' | 'assistant' | 'system'; content: string; sequence: number };

export function AgentChat({
  agentId,
  extraBody,
}: {
  agentId: string;
  /** Campos adicionales enviados a /api/chat en cada turno (p. ej. { modo }). */
  extraBody?: Record<string, unknown>;
}) {
  const [conversations, setConversations] = useState<ConversationMeta[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const conversationRef = useRef<string | null>(null);
  const { messages, input, handleInputChange, handleSubmit, setMessages, isLoading, error, stop, reload } = useChat({
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
      handleSubmit(e, { body: { agentId, conversationId: id, ...extraBody } });
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
          className={`flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-all duration-150 ${
            activeId === null
              ? 'border-primary/60 bg-primary text-white shadow-[0_0_14px_-6px_rgba(139,92,246,0.6)]'
              : 'border-border-muted bg-panel text-neutral-300 hover:border-primary/50 hover:bg-panel-hover hover:text-neutral-100'
          }`}
        >
          <Plus className="h-3.5 w-3.5" /> New chat
        </button>
        {conversations.map((c, i) => (
          <button
            key={c.id}
            type="button"
            onClick={() => selectConversation(c.id)}
            title={c.title}
            style={{ animationDelay: `${Math.min(i * 40, 240)}ms` }}
            className={`max-w-[12rem] truncate rounded-full border px-3 py-1 text-xs font-medium transition-all duration-150 [animation:var(--animate-chat-enter)] ${
              activeId === c.id
                ? 'border-primary/60 bg-primary text-white shadow-[0_0_14px_-6px_rgba(139,92,246,0.6)]'
                : 'border-border-muted bg-panel text-neutral-300 hover:border-primary/50 hover:bg-panel-hover hover:text-neutral-100'
            }`}
          >
            {c.title}
          </button>
        ))}
      </div>

      <div className="flex flex-col gap-3">
        {loadingHistory && (
          <div className="flex items-center gap-2 text-xs text-neutral-500">
            <span className="shimmer h-2.5 w-28 rounded" /> Loading conversation…
          </div>
        )}
        {messages.length === 0 && !loadingHistory && (
          <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-border-muted bg-panel/40 px-4 py-10 text-center">
            <Sparkles className="h-5 w-5 text-neutral-600" />
            <p className="text-sm text-neutral-500">Start a conversation to test your agent.</p>
          </div>
        )}
        {messages.map((m, i) => (
          <div
            key={m.id}
            style={{ animationDelay: `${Math.min(i * 30, 240)}ms` }}
            className={`chat-enter max-w-[85%] whitespace-pre-wrap rounded-2xl px-4 py-3 text-sm [animation:var(--animate-chat-enter)] ${
              m.role === 'user'
                ? 'self-end bg-primary text-white shadow-[0_6px_24px_-10px_rgba(139,92,246,0.55)]'
                : 'self-start border border-border-subtle bg-panel text-neutral-100 shadow-[0_0_18px_-10px_rgba(139,92,246,0.25)]'
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
          <p className="rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-xs text-red-300">
            {error.message}
          </p>
        )}
      </div>

      <form onSubmit={onSubmit} className="flex gap-2">
        <input
          value={input}
          onChange={handleInputChange}
          placeholder="Ask your agent something…"
          className="flex-1 rounded-lg border border-border-muted bg-input-active px-3 py-2.5 text-sm text-neutral-100 outline-none transition-colors duration-150 placeholder:text-neutral-600 focus:border-border-active focus:ring-1 focus:ring-border-active"
        />
        {isLoading && (
          <button
            type="button"
            onClick={() => stop()}
            className="rounded-lg bg-panel px-4 py-2.5 text-sm font-semibold text-neutral-100 transition-colors duration-150 hover:bg-panel-hover"
          >
            <Square className="h-4 w-4" /> Stop
          </button>
        )}
        {error && (
          <button
            type="button"
            onClick={() => reload()}
            className="rounded-lg bg-panel px-4 py-2.5 text-sm font-semibold text-neutral-100 transition-colors duration-150 hover:bg-panel-hover"
          >
            <RefreshCcw className="h-4 w-4" /> Retry
          </button>
        )}
        {!isLoading && (
          <button
            type="submit"
            disabled={!input.trim()}
            className="rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-white transition-colors duration-150 hover:bg-primary/85 disabled:opacity-50"
          >
            <SendHorizontal className="h-4 w-4" /> Send
          </button>
        )}
      </form>
    </div>
  );
}
