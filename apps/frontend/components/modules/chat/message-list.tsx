'use client';

import { useEffect, useRef, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import type { ChatMessage } from '@/lib/hooks/use-chat-stream';
import { createNote } from '@/lib/api/note';

type SaveState = 'idle' | 'saving' | 'saved';

// Mensagens do aluno em bolha cinza à direita (texto puro); respostas da IA
// à esquerda renderizadas como Markdown (títulos, listas, código, tabelas) —
// react-markdown gera componentes React, sem dangerouslySetInnerHTML.
// No hover de cada resposta da IA, um CTA salva a mensagem em "Mis Apuntes".
export function MessageList({
  messages,
  streaming,
  conversationId,
}: {
  messages: ChatMessage[];
  streaming: boolean;
  conversationId: string | null;
}) {
  const bottomRef = useRef<HTMLDivElement>(null);
  // Estado do salvamento por mensagem (id → estado)
  const [saveState, setSaveState] = useState<Record<string, SaveState>>({});

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSave = async (message: ChatMessage) => {
    if (!conversationId || saveState[message.id] === 'saving') return;
    setSaveState((prev) => ({ ...prev, [message.id]: 'saving' }));
    // Mensagens do histórico têm id real do banco; as recém-transmitidas usam
    // id local — só enviamos source_message_id quando é um id persistido
    const sourceMessageId = message.id.startsWith('local-')
      ? undefined
      : message.id;
    const res = await createNote({
      conversation_id: conversationId,
      content: message.content,
      source_message_id: sourceMessageId,
    });
    setSaveState((prev) => ({
      ...prev,
      [message.id]: res.data ? 'saved' : 'idle',
    }));
  };

  const lastMessageId = messages[messages.length - 1]?.id;

  return (
    <div className="flex flex-1 flex-col gap-6 overflow-y-auto py-6">
      {messages.map((message) =>
        message.role === 'user' ? (
          <div key={message.id} className="flex justify-end">
            <div className="max-w-[70%] rounded-2xl bg-brand-border/20 px-5 py-4 text-sm text-brand-teal whitespace-pre-wrap">
              {message.content}
            </div>
          </div>
        ) : (
          <div key={message.id} className="group max-w-[85%]">
            <div className="prose prose-sm leading-relaxed text-brand-teal prose-headings:text-brand-teal prose-strong:text-brand-teal prose-a:text-primary prose-code:rounded prose-code:bg-[#5F5E5C40]  prose-code:px-1.5 prose-code:py-0.5 prose-code:text-brand-teal prose-code:before:content-none prose-code:after:content-none prose-pre:rounded-xl prose-pre:bg-[#5F5E5C10] prose-li:marker:text-brand-placeholder prose-hr:border-brand-border">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {message.content}
              </ReactMarkdown>
              {streaming &&
                message.id === lastMessageId &&
                message.content.length === 0 && (
                  <span className="inline-block animate-pulse text-brand-placeholder">
                    …
                  </span>
                )}
            </div>
            {/* CTA só quando a resposta terminou (não em streaming ativo) */}
            {message.content.length > 0 &&
              !(streaming && message.id === lastMessageId) && (
                <button
                  type="button"
                  onClick={() => void handleSave(message)}
                  disabled={saveState[message.id] === 'saving'}
                  className={`mt-2 flex items-center gap-1.5 text-xs font-medium text-brand-placeholder transition-opacity hover:text-primary ${
                    saveState[message.id] === 'saved'
                      ? 'text-primary opacity-100'
                      : 'opacity-0 group-hover:opacity-100'
                  }`}
                >
                  <BookmarkIcon />
                  {saveState[message.id] === 'saving'
                    ? 'Guardando…'
                    : saveState[message.id] === 'saved'
                      ? 'Guardado en Mis Apuntes'
                      : 'Guardar en Mis Apuntes'}
                </button>
              )}
          </div>
        ),
      )}
      <div ref={bottomRef} />
    </div>
  );
}

function BookmarkIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
    </svg>
  );
}
