'use client';

import { useActionState, useState } from 'react';
import Link from 'next/link';
import { resetPasswordAction } from '@/app/actions/auth';
import { LoginError } from '@/components/ui/login-error';

interface Props {
  token: string;
}

export function ResetPasswordForm({ token }: Props) {
  const [state, action, isPending] = useActionState(resetPasswordAction, {
    error: null,
    success: false,
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  if (state.success) {
    return (
      <div className="flex flex-col items-center gap-6 text-center">
        <div className="w-14 h-14 rounded-full bg-primary/20 flex items-center justify-center">
          <CheckIcon />
        </div>
        <div className="flex flex-col gap-1">
          <p className="text-base font-semibold text-brand-brown">Contraseña actualizada</p>
          <p className="text-sm text-brand-placeholder">
            Tu contraseña fue restablecida con éxito. Ya puedes iniciar sesión.
          </p>
        </div>
        <Link
          href="/login"
          className="
            w-full rounded-full bg-primary text-primary-text text-center
            py-3.5 text-sm font-semibold
            hover:bg-primary-hover transition-colors
          "
        >
          Ir al inicio de sesión
        </Link>
      </div>
    );
  }

  return (
    <form action={action} className="flex flex-col gap-5 w-full">
      {state.error && <LoginError message={state.error} />}

      {/* Token oculto */}
      <input type="hidden" name="token" value={token} />

      {/* Nova senha */}
      <div className="flex flex-col gap-1.5">
        <label htmlFor="newPassword" className="text-sm font-medium text-brand-label">
          Nueva contraseña
        </label>
        <div className="relative">
          <input
            id="newPassword"
            name="newPassword"
            type={showPassword ? 'text' : 'password'}
            autoComplete="new-password"
            required
            minLength={8}
            placeholder="Mínimo 8 caracteres"
            className="
              w-full rounded-xl border border-brand-border bg-brand-bg
              px-4 py-3 pr-11 text-sm text-brand-brown
              placeholder:text-brand-placeholder
              outline-none
              focus:border-brand-border-focus focus:ring-1 focus:ring-brand-teal/20
              transition-colors
            "
          />
          <button
            type="button"
            onClick={() => setShowPassword((v) => !v)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-brand-placeholder hover:text-brand-label transition-colors"
            aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
          >
            {showPassword ? <EyeOffIcon /> : <EyeIcon />}
          </button>
        </div>
      </div>

      {/* Confirmar senha */}
      <div className="flex flex-col gap-1.5">
        <label htmlFor="confirmPassword" className="text-sm font-medium text-brand-label">
          Confirmar contraseña
        </label>
        <div className="relative">
          <input
            id="confirmPassword"
            name="confirmPassword"
            type={showConfirm ? 'text' : 'password'}
            autoComplete="new-password"
            required
            minLength={8}
            placeholder="Repite tu nueva contraseña"
            className="
              w-full rounded-xl border border-brand-border bg-brand-bg
              px-4 py-3 pr-11 text-sm text-brand-brown
              placeholder:text-brand-placeholder
              outline-none
              focus:border-brand-border-focus focus:ring-1 focus:ring-brand-teal/20
              transition-colors
            "
          />
          <button
            type="button"
            onClick={() => setShowConfirm((v) => !v)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-brand-placeholder hover:text-brand-label transition-colors"
            aria-label={showConfirm ? 'Ocultar contraseña' : 'Mostrar contraseña'}
          >
            {showConfirm ? <EyeOffIcon /> : <EyeIcon />}
          </button>
        </div>
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
        {isPending ? 'Guardando...' : 'Restablecer contraseña'}
      </button>
    </form>
  );
}

function EyeIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function EyeOffIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
      <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
      <line x1="1" y1="1" x2="23" y2="23" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-primary">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}
