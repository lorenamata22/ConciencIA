'use client';

import { useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import type { ChatMessage } from '@/lib/hooks/use-chat-stream';

// Mensagens do aluno em bolha cinza à direita (texto puro); respostas da IA
// à esquerda renderizadas como Markdown (títulos, listas, código, tabelas) —
// react-markdown gera componentes React, sem dangerouslySetInnerHTML
export function MessageList({
  messages,
  streaming,
}: {
  messages: ChatMessage[];
  streaming: boolean;
}) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

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
          <div
            key={message.id}
            className="prose prose-sm max-w-[85%] leading-relaxed text-brand-teal prose-headings:text-brand-teal prose-strong:text-brand-teal prose-a:text-primary prose-code:rounded prose-code:bg-[#5F5E5C40]  prose-code:px-1.5 prose-code:py-0.5 prose-code:text-brand-teal prose-code:before:content-none prose-code:after:content-none prose-pre:rounded-xl prose-pre:bg-[#5F5E5C10] prose-li:marker:text-brand-placeholder prose-hr:border-brand-border"
          >
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {message.content}
            </ReactMarkdown>
            {streaming &&
              message.id === messages[messages.length - 1]?.id &&
              message.content.length === 0 && (
                <span className="inline-block animate-pulse text-brand-placeholder">
                  …
                </span>
              )}
          </div>
        ),
      )}
      <div ref={bottomRef} />
    </div>
  );
}
