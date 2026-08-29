/**
 * useChat.ts — Hook para chat streaming en la app móvil.
 * Patrón: retrieve → stream → store (mem0 integration via backend).
 */
import { useState, useCallback, useRef } from 'react';
import { api, resolveBaseUrl, getToken } from '@/api/client';

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface UseChatOpts {
  agentId: string;
  conversationId: string;
}

export function useChat({ agentId, conversationId }: UseChatOpts) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [streaming, setStreaming] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  const sendMessage = useCallback(
    async (text: string, modo?: string) => {
      if (!text.trim() || loading) return;

      const userMsg: ChatMessage = { role: 'user', content: text };
      const allMessages = [...messages, userMsg];
      setMessages(allMessages);
      setLoading(true);
      setStreaming(true);

      // Abort controller for cancellation
      abortRef.current = new AbortController();

      try {
        const token = await getToken();
        const baseUrl = resolveBaseUrl();

        const response = await fetch(`${baseUrl}/api/chat`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { 'x-ultraia-session': token } : {}),
          },
          body: JSON.stringify({
            agentId,
            conversationId,
            messages: allMessages,
            modo,
          }),
          signal: abortRef.current.signal,
        });

        if (!response.ok) {
          throw new Error(`Chat error: ${response.status}`);
        }

        // Stream the response
        const reader = response.body?.getReader();
        const decoder = new TextDecoder();
        let assistantContent = '';

        // Add empty assistant message
        setMessages((prev) => [...prev, { role: 'assistant', content: '' }]);

        while (reader) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value, { stream: true });

          // Parse data stream format (Vercel AI SDK)
          const lines = chunk.split('\n');
          for (const line of lines) {
            if (line.startsWith('0:')) {
              // Text chunk
              try {
                const text = JSON.parse(line.slice(2));
                assistantContent += text;
                setMessages((prev) => {
                  const updated = [...prev];
                  const last = updated[updated.length - 1];
                  if (last?.role === 'assistant') {
                    last.content = assistantContent;
                  }
                  return updated;
                });
              } catch {
                // Skip malformed chunks
              }
            }
          }
        }
      } catch (err) {
        if ((err as Error).name === 'AbortError') {
          // User cancelled
          return;
        }
        console.error('Chat error:', err);
        // Remove empty assistant message on error
        setMessages((prev) => {
          const last = prev[prev.length - 1];
          if (last?.role === 'assistant' && !last.content) {
            return prev.slice(0, -1);
          }
          return prev;
        });
      } finally {
        setLoading(false);
        setStreaming(false);
        abortRef.current = null;
      }
    },
    [agentId, conversationId, messages, loading],
  );

  const cancel = useCallback(() => {
    abortRef.current?.abort();
  }, []);

  const clear = useCallback(() => {
    setMessages([]);
  }, []);

  return { messages, loading, streaming, sendMessage, cancel, clear };
}
