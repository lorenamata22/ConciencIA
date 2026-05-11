'use client';

import { useActionState } from 'react';
import Link from 'next/link';
import { forgotPasswordAction } from '@/app/actions/auth';
import { LoginError } from '@/components/ui/login-error';

export function ForgotPasswordForm() {
  const [state, action, isPending] = useActionState(forgotPasswordAction, {
    error: null,
    success: false,
  });

  if (state.success) {
    return (
      <div className="flex flex-col items-center gap-6 text-center">
        <div className="w-14 h-14 rounded-full bg-primary/20 flex items-center justify-center">
          <MailIcon />
        </div>
        <div className="flex flex-col gap-1">
          <p className="text-base font-semibold text-brand-brown">Revisa tu correo</p>
          <p className="text-sm text-brand-placeholder">
            Si ese correo está registrado, recibirás un enlace para restablecer tu contraseña.
          </p>
        </div>
        <Link
          href="/login"
          className="text-sm text-primary underline hover:opacity-80 transition-opacity"
        >
          Volver al inicio de sesión
        </Link>
      </div>
    );
  }

  return (
    <form action={action} className="flex flex-col gap-5 w-full">
      {state.error && <LoginError message={state.error} />}

      <p className="text-sm text-brand-placeholder">
        Ingresa tu correo y te enviaremos un enlace para restablecer tu contraseña.
      </p>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="email" className="text-sm font-medium text-brand-label">
          Correo
        </label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          placeholder="johndoe@email.com"
          className="
            w-full rounded-xl border border-brand-border bg-brand-bg
            px-4 py-3 text-sm text-brand-brown
            placeholder:text-brand-placeholder
            outline-none
            focus:border-brand-border-focus focus:ring-1 focus:ring-brand-teal/20
            transition-colors
          "
        />
      </div>

      <button
        type="submit"
        disabled={isPending}
        className="
          w-full rounded-full bg-primary text-primary-text
          py-3.5 text-sm font-semibold
          hover:bg-primary-hover
          disabled:opacity-60 disabled:cursor-not-allowed
          transition-colors mt-1
        "
      >
        {isPending ? 'Enviando...' : 'Enviar enlace'}
      </button>

      <Link
        href="/login"
        className="text-center text-sm text-brand-placeholder hover:text-brand-label transition-colors"
      >
        Volver al inicio de sesión
      </Link>
    </form>
  );
}

function MailIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className="text-primary">
      <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
      <polyline points="22,6 12,13 2,6" />
    </svg>
  );
}
