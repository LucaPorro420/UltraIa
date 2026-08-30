'use client';

import { useChat } from 'ai/react';
import dynamic from 'next/dynamic';
import { useEffect, useRef, useState } from 'react';
import { Check, Copy, RefreshCcw, SendHorizontal, Sparkles, Square } from 'lucide-react';
import { cn } from '@/lib/utils';

// Lazy-load react-markdown (~30KB gzipped) — only needed when messages exist
const ReactMarkdown = dynamic(() => import('react-markdown'), {
  ssr: false,
  loading: () => <span className="text-neutral-400">...</span>,
});

const SUGGESTIONS = [
  'Busca en la web: noticias de IA de esta semana',
  'Planifica un agente que automatice mis reportes',
  'Genera una imagen: un dragón cibernético al atardecer',
  'Explica y calcula: (12 * 8 + 4^3) / 2',
];

function autoResize(el: HTMLTextAreaElement) {
  el.style.height = 'auto';
  el.style.height = `${Math.min(el.scrollHeight, 200)}px`;
}

export function AssistantChat() {
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { messages, input, setInput, handleInputChange, handleSubmit, isLoading, error, setMessages, stop, reload } =
    useChat({
      api: '/api/chat/general',
    });

  function applySuggestion(text: string) {
    if (isLoading) return;
    setInput(text);
    textareaRef.current?.focus();
  }

  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages, isLoading]);

  function onKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      e.currentTarget.form?.requestSubmit();
    }
  }

  async function copy(id: string, content: string) {
    await navigator.clipboard.writeText(content);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1500);
  }

  return (
    <div className="flex h-[600px] flex-col overflow-hidden rounded-xl border border-border-subtle bg-panel shadow-[0_8px_40px_-18px_rgba(139,92,246,0.25)]">
      <header className="flex items-center justify-between border-b border-border-subtle bg-panel-header/60 px-5 py-3">
        <div className="flex items-center gap-2">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/15">
            <Sparkles className="h-4 w-4 text-primary" />
          </span>
          <div>
            <h2 className="font-display text-sm font-semibold text-neutral-100">Asistente UltraIa</h2>
            <p className="text-[11px] text-neutral-500">General · web, imágenes, código, agentes</p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setMessages([])}
          className="flex items-center gap-1.5 rounded-lg border border-border-muted px-2.5 py-1.5 text-[11px] font-medium text-neutral-400 transition-colors duration-150 hover:border-primary/50 hover:text-neutral-100"
        >
          <RefreshCcw className="h-3 w-3" /> Nuevo chat
        </button>
      </header>

      <div ref={scrollRef} className="flex-1 overflow-y-auto px-5 py-5">
        {messages.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center gap-6 text-center">
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/15 [box-shadow:0_0_40px_-10px_rgba(139,92,246,0.5)]">
              <Sparkles className="h-6 w-6 text-primary" />
            </span>
            <div>
              <p className="font-display text-lg font-bold text-neutral-100">¿Qué quieres hacer hoy?</p>
              <p className="mt-1 max-w-sm text-[13px] text-neutral-500">
                Investiga en la web, genera imágenes, escribe código o planifica un agente con el
                pipeline completo.
              </p>
            </div>
            <div className="grid w-full max-w-lg gap-2 sm:grid-cols-2">
              {SUGGESTIONS.map((s, i) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => applySuggestion(s)}
                  disabled={isLoading}
                  style={{ animationDelay: `${Math.min(i * 60, 240)}ms` }}
                  className="rounded-lg border border-border-muted bg-panel-header/40 px-3 py-2.5 text-left text-[12px] text-neutral-400 transition-all duration-150 [animation:var(--animate-chat-enter)] hover:border-primary/40 hover:text-neutral-100"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-5">
            {messages.map((m) => (
              <div
                key={m.id}
                className={cn(
                  'chat-enter flex gap-3 [animation:var(--animate-chat-enter)]',
                  m.role === 'user' && 'justify-end',
                )}
              >
                {m.role === 'assistant' && (
                  <span className="mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-primary/15">
                    <Sparkles className="h-3.5 w-3.5 text-primary" />
                  </span>
                )}
                <div
                  className={cn(
                    'max-w-[85%]',
                    m.role === 'user' &&
                      'rounded-2xl rounded-br-sm bg-primary px-4 py-2.5 text-sm text-white shadow-[0_6px_24px_-10px_rgba(139,92,246,0.55)]',
                  )}
                >
                  {m.role === 'assistant' ? (
                    <div className="md-body text-[13.5px] leading-relaxed text-neutral-200">
                      <ReactMarkdown>{m.content}</ReactMarkdown>
                      {isLoading && m.id === messages[messages.length - 1]?.id && <span className="stream-caret" />}
                    </div>
                  ) : (
                    <p className="whitespace-pre-wrap">{m.content}</p>
                  )}
                  {m.role === 'assistant' && !isLoading && (
                    <button
                      type="button"
                      onClick={() => copy(m.id, m.content)}
                      className="mt-2 flex items-center gap-1 text-[11px] text-neutral-500 transition-colors duration-150 hover:text-neutral-200"
                    >
                      {copiedId === m.id ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
                      {copiedId === m.id ? 'Copiado' : 'Copiar'}
                    </button>
                  )}
                </div>
              </div>
            ))}
            {isLoading && messages.length > 0 && messages[messages.length - 1]?.role === 'user' && (
              <div className="flex items-center gap-1.5 pl-10">
                <span className="typing-dot" style={{ animationDelay: '0ms' }} />
                <span className="typing-dot" style={{ animationDelay: '150ms' }} />
                <span className="typing-dot" style={{ animationDelay: '300ms' }} />
                <span className="sr-only">Thinking…</span>
              </div>
            )}
          </div>
        )}
        {error && (
          <p className="mt-3 rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-xs text-red-300">
            {error.message}
          </p>
        )}
      </div>

      <form
        onSubmit={handleSubmit}
        className="border-t border-border-subtle bg-panel-header/40 p-4"
      >
        <div className="flex items-end gap-2 rounded-xl border border-border-muted bg-input-active px-3 py-2 transition-colors duration-150 focus-within:border-primary/50 focus-within:ring-1 focus-within:ring-primary/30">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => {
              handleInputChange(e);
              autoResize(e.target);
            }}
            onKeyDown={onKeyDown}
            rows={1}
            placeholder="Escribe un mensaje… (Enter para enviar)"
            className="max-h-[200px] flex-1 resize-none bg-transparent py-1.5 text-sm text-neutral-100 outline-none placeholder:text-neutral-600"
          />
          {isLoading && (
            <button
              type="button"
              onClick={() => stop()}
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-panel text-white transition-all duration-150 hover:bg-panel/85"
              aria-label="Detener"
            >
              <Square className="h-4 w-4" />
            </button>
          )}
          {error && (
            <button
              type="button"
              onClick={() => reload()}
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-panel text-white transition-all duration-150 hover:bg-panel/85"
              aria-label="Reintentar"
            >
              <RefreshCcw className="h-4 w-4" />
            </button>
          )}
          {!isLoading && (
            <button
              type="submit"
              disabled={!input.trim()}
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary text-white transition-all duration-150 hover:bg-primary/85 disabled:opacity-40"
            >
              <SendHorizontal className="h-4 w-4" />
            </button>
          )}
        </div>
        <p className="mt-2 text-center text-[10px] text-neutral-600">
          Enter para enviar · Shift+Enter para nueva línea · Streaming con el modelo configurado
        </p>
      </form>
    </div>
  );
}