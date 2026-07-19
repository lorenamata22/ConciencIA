'use client';

import { useCallback, useRef, useState } from 'react';
import { createSseParser } from '@/lib/utils/sse';
import { getConversation } from '@/lib/api/chat';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
}

// Estado do chat Modo Estudo: carrega a conversa da matéria (1 conversa
// contínua por matéria) e envia mensagens via POST + leitura de SSE com
// fetch/getReader — EventSource não serve porque o envio é POST com body.
export function useChatStream() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [streaming, setStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Evita corrida ao trocar de matéria durante um carregamento
  const loadSequence = useRef(0);

  const loadConversation = useCallback(
    async (subjectId: string, topicId: string) => {
    const sequence = ++loadSequence.current;
    setLoading(true);
    setError(null);
    setMessages([]);
    setConversationId(null);

    const data = await getConversation(subjectId, topicId);
    if (sequence !== loadSequence.current) return;

    if (data) {
      setConversationId(data.conversation.id);
      setMessages(
        data.messages.map((message) => ({
          id: message.id,
          role: message.role,
          content: message.content,
        })),
      );
    } else {
      setError('No se pudo cargar la conversación.');
    }
    setLoading(false);
    },
    [],
  );

  const send = useCallback(
    async (content: string) => {
      if (!conversationId || streaming) return;

      setError(null);
      setStreaming(true);

      const userMessage: ChatMessage = {
        id: `local-user-${Date.now()}`,
        role: 'user',
        content,
      };
      const assistantId = `local-assistant-${Date.now()}`;
      setMessages((prev) => [
        ...prev,
        userMessage,
        { id: assistantId, role: 'assistant', content: '' },
      ]);

      const appendToAssistant = (text: string) =>
        setMessages((prev) =>
          prev.map((message) =>
            message.id === assistantId
              ? { ...message, content: message.content + text }
              : message,
          ),
        );
      const removeEmptyAssistant = () =>
        setMessages((prev) =>
          prev.filter(
            (message) =>
              message.id !== assistantId || message.content.length > 0,
          ),
        );

      try {
        const res = await fetch('/api/chat/study/stream', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ conversation_id: conversationId, content }),
        });

        if (!res.body || !res.headers.get('Content-Type')?.includes('event-stream')) {
          const json = await res.json().catch(() => null);
          throw new Error(json?.message ?? 'Error al enviar el mensaje');
        }

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        const parser = createSseParser();

        for (;;) {
          const { done, value } = await reader.read();
          if (done) break;

          for (const event of parser.feed(decoder.decode(value, { stream: true }))) {
            if (event.event === 'chunk') {
              const payload = JSON.parse(event.data) as { text: string };
              appendToAssistant(payload.text);
            } else if (event.event === 'error') {
              const payload = JSON.parse(event.data) as { message: string };
              setError(payload.message);
            }
            // event 'done' encerra naturalmente — tokens não interessam à UI
          }
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Error inesperado');
      } finally {
        removeEmptyAssistant();
        setStreaming(false);
      }
    },
    [conversationId, streaming],
  );

  return { messages, loading, streaming, error, loadConversation, send };
}
