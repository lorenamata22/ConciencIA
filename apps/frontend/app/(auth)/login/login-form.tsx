'use client';

import { useActionState, useState } from 'react';
import { loginAction } from '@/app/actions/auth';

export function LoginForm() {
  const [state, action, isPending] = useActionState(loginAction, { error: null });
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);

  return (
    <form action={action} className="flex flex-col gap-5 w-full">
      {/* Campo Correo */}
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

      {/* Campo Contraseña */}
      <div className="flex flex-col gap-1.5">
        <div className="flex items-center justify-between">
          <label htmlFor="password" className="text-sm font-medium text-brand-label">
            Contraseña
          </label>
          <a
            href="/forgot-password"
            className="text-xs text-primaryq-text hover:text-primary-text-hover transition-colors"
          >
            Olvidé mi contraseña
          </a>
          
        </div>
        <div className="relative">
          <input
            id="password"
            name="password"
            type={showPassword ? 'text' : 'password'}
            autoComplete="current-password"
            required
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

      {/* Guardar sesión */}
      <label
        className="flex items-center gap-2.5 cursor-pointer select-none"
        onClick={() => setRememberMe((v) => !v)}
      >
        <input type="hidden" name="rememberMe" value={rememberMe ? 'true' : 'false'} />
        {/* Checkbox visual */}
        <div
          className={`
            w-5 h-5 rounded-md border-2 flex items-center justify-center flex-shrink-0 transition-colors
            ${rememberMe
              ? 'border-primary bg-primary'
              : 'bg-transparent border-brand-border'
            }
          `}
        >
          {rememberMe && (
            <svg className="w-3 h-3 text-primary-text" viewBox="0 0 12 10" fill="none">
              <path d="M1 5l3.5 3.5L11 1" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          )}
        </div>
        <span className="text-sm text-brand-label">Guardar mi sesión iniciada</span>
      </label>

      {/* Erro */}
      {state.error && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-4 py-2.5">
          {state.error}
        </p>
      )}

      {/* Botão Login */}
      <button
        type="submit"
        disabled={isPending}
        className="
          w-full rounded-full bg-primary text-primary-text
          py-3.5 text-sm font-semibold
          hover:bg-primary
          disabled:opacity-60 disabled:cursor-not-allowed
          transition-colors mt-1
        "
      >
        {isPending ? 'Entrando...' : 'Login'}
      </button>
    </form>
  );
}

/* Ícone olho aberto */
function EyeIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

/* Ícone olho fechado */
function EyeOffIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
      <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
      <line x1="1" y1="1" x2="23" y2="23" />
    </svg>
  );
}
