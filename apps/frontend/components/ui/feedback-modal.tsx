'use client';

import React from 'react';

export function FeedbackModal({
  open,
  onClose,
  closeDisabled,
  icon,
  title,
  titleColor = 'text-brand-brown',
  description,
  actions,
}: {
  open: boolean;
  onClose: () => void;
  closeDisabled?: boolean;
  icon: React.ReactNode;
  title: string;
  titleColor?: string;
  description: React.ReactNode;
  actions: React.ReactNode;
}) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-xl mx-4 px-10 py-10 relative">
        <button
          onClick={onClose}
          disabled={closeDisabled}
          className="absolute top-4 right-4 text-brand-label hover:text-brand-brown transition-colors disabled:opacity-40"
          aria-label="Cerrar"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>

        <div className="flex justify-center mb-5">
          {icon}
        </div>

        <h2 className={`text-center font-semibold text-lg mb-3 ${titleColor}`}>
          {title}
        </h2>

        <p className="text-center text-sm mb-8">
          {description}
        </p>

        {actions}
      </div>
    </div>
  );
}

export function ModalSuccessIcon() {
  return (
    <svg width="36" height="36" viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M17.93 0C8.03 0 0 8.02 0 17.93C0 27.84 8.03 35.86 17.93 35.86C27.83 35.86 35.87 27.84 35.87 17.93C35.87 8.02 27.84 0 17.93 0ZM30.73 11.77L15.73 26.78C15.36 27.15 14.87 27.33 14.38 27.33H14.34C13.86 27.33 13.37 27.14 13 26.77L5.14 18.91C4.4 18.17 4.4 16.97 5.14 16.22C5.88 15.48 7.09 15.48 7.83 16.22L14.36 22.76L28.04 9.09C28.78 8.34 29.99 8.34 30.73 9.09C31.47 9.83 31.47 11.03 30.73 11.77Z" fill="#6EC090"/>
    </svg>
  );
}

export function ModalErrorIcon() {
  return (
    <svg width="36" height="36" viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M17.93 0C8.02 0 0 8.03 0 17.93C0 27.83 8.03 35.86 17.93 35.86C27.83 35.86 35.86 27.84 35.86 17.93C35.86 8.02 27.83 0 17.93 0ZM26.77 24.09C27.51 24.83 27.51 26.03 26.77 26.78C26.4 27.15 25.91 27.33 25.43 27.33C24.95 27.33 24.45 27.15 24.08 26.78L17.93 20.62L11.77 26.78C11.4 27.15 10.91 27.33 10.43 27.33C9.95 27.33 9.45 27.15 9.08 26.78C8.34 26.03 8.34 24.83 9.08 24.09L15.24 17.93L9.08 11.77C8.34 11.03 8.34 9.83 9.08 9.09C9.82 8.34 11.03 8.34 11.77 9.09L17.93 15.24L24.08 9.09C24.82 8.34 26.03 8.34 26.77 9.09C27.51 9.83 27.51 11.03 26.77 11.77L20.61 17.93L26.77 24.09Z" fill="#D86262"/>
    </svg>
  );
}

export function ModalWarningIcon() {
  return (
    <svg width="36" height="36" viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="18" cy="18" r="18" fill="#FEE2E2"/>
      <path d="M18 10V20" stroke="#D86262" strokeWidth="2.5" strokeLinecap="round"/>
      <circle cx="18" cy="25" r="1.5" fill="#D86262"/>
    </svg>
  );
}
