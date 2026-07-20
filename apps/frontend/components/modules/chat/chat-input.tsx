'use client';

import { useState } from 'react';

// Input do chat (Figma): rounded-xl com ícone de lápis à esquerda
export function ChatInput({
  onSend,
  disabled,
}: {
  onSend: (content: string) => void;
  disabled: boolean;
}) {
  const [value, setValue] = useState('');

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const content = value.trim();
    if (!content || disabled) return;
    onSend(content);
    setValue('');
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex items-center gap-3 rounded-2xl border border-brand-border bg-white px-5 py-4 shadow-sm"
    >
      <span className="shrink-0 text-brand-placeholder">
        <svg width="17" height="16" viewBox="0 0 17 16" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M8.25 15.0176H15.75" stroke="#5F5E5C" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M12 1.26777C12.3315 0.936246 12.7812 0.75 13.25 0.75C13.4821 0.75 13.712 0.795725 13.9265 0.884563C14.141 0.973402 14.3358 1.10361 14.5 1.26777C14.6642 1.43192 14.7944 1.6268 14.8832 1.84127C14.972 2.05575 15.0178 2.28562 15.0178 2.51777C15.0178 2.74991 14.972 2.97979 14.8832 3.19426C14.7944 3.40874 14.6642 3.60361 14.5 3.76777L4.08333 14.1844L0.75 15.0178L1.58333 11.6844L12 1.26777Z" stroke="#5F5E5C" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </span>
      <input
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="Pregunta lo que quieras"
        disabled={disabled}
        className="flex-1 bg-transparent text-sm text-brand-brown placeholder:text-brand-placeholder focus:outline-none disabled:opacity-60"
      />
    </form>
  );
}
