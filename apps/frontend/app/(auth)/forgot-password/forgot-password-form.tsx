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
        <div className="my-5">
          <svg width="66" height="43" viewBox="0 0 66 43" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M4.6766 0C2.12974 0 0 2.05962 0 4.60465V38.3721C0 40.9171 2.12974 42.9767 4.6766 42.9767H61.3234C63.8703 42.9767 66 40.9171 66 38.3721V4.60465C66 2.05962 63.8703 0 61.3234 0H4.6766ZM5.46802 3.06977H60.532L34.343 26.4767C33.69 27.0604 32.31 27.0604 31.657 26.4767L5.46802 3.06977ZM3.06977 5.03634L22.2318 22.1599L3.06977 38.0363V5.03634ZM62.9302 5.03634V38.0363L43.7682 22.1599L62.9302 5.03634ZM24.5581 24.2463L29.6185 28.755C31.5376 30.4702 34.4624 30.4702 36.3815 28.755L41.4419 24.2463L60.3641 39.907H5.6359L24.5581 24.2463Z" fill="#5F5E5C"/>
          </svg>
        </div>
        <div className="flex flex-col gap-1">
          <p className="text-base font-semibold text-brand-brown">¡Enlace enviado! Comprueba tu correo para restablecer tu contraseña.</p>
        </div>
        <Link
          href="/login"
          className="text-primary hover:opacity-80 transition-opacity"
        >
          Volver al inicio de sesión
        </Link>
      </div>
    );
  }

  return (
    <form action={action} className="flex flex-col gap-5 w-full">

      <div
        role="alert"
        className={`flex items-start gap-3 rounded-xl px-4 py-5 mb-3 text-sm login-alert`}
      >
        <span className="mt-0.5 text-black-800 flex-shrink-0">
          <svg width="33" height="44" viewBox="0 0 33 44" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M32.9959 34.8953V37.9301C32.9959 41.2761 30.3037 44 26.9962 44H5.99973C2.69237 44 0 41.2763 0 37.9301V34.8953C0 34.0572 0.67047 33.3788 1.49888 33.3788C2.3273 33.3788 2.99777 34.0572 2.99777 34.8953V37.9301C2.99777 39.6041 4.34285 40.9649 5.99753 40.9649H26.994C28.6486 40.9649 29.9937 39.6041 29.9937 37.9301V34.8953C29.9937 34.0572 30.6642 33.3788 31.4926 33.3788C32.321 33.3788 32.9915 34.0572 32.9915 34.8953H32.9959ZM32.9959 22.7581V25.793C32.9959 26.631 32.3254 27.3094 31.497 27.3094C30.6686 27.3094 29.9981 26.6311 29.9981 25.793V22.7581C29.9981 21.0841 28.6531 19.7233 26.9984 19.7233H6.00194C4.34726 19.7233 3.00218 21.0841 3.00218 22.7581V25.793C3.00218 26.631 2.33171 27.3094 1.50329 27.3094C0.674879 27.3094 0.00440923 26.6311 0.00440923 25.793V22.7581C0.00440923 19.4121 2.69663 16.6882 6.00414 16.6882H6.75461V9.86159C6.75461 4.4247 11.1282 0 16.5022 0C21.8762 0 26.2498 4.4247 26.2498 9.86159V16.6882H27.0003C30.3076 16.6882 33 19.4119 33 22.7581H32.9959ZM9.75022 16.6882H23.2483V9.86159C23.2483 6.09655 20.2219 3.03495 16.5006 3.03495C12.7793 3.03495 9.75285 6.09677 9.75285 9.86159V16.6882H9.75022ZM27.7468 30.3442C27.7468 29.085 26.7421 28.0685 25.4974 28.0685C24.2528 28.0685 23.2481 29.085 23.2481 30.3442C23.2481 31.6033 24.2528 32.6198 25.4974 32.6198C26.7421 32.6198 27.7468 31.6033 27.7468 30.3442ZM18.7472 30.3442C18.7472 29.085 17.7425 28.0685 16.4979 28.0685C15.2532 28.0685 14.2485 29.085 14.2485 30.3442C14.2485 31.6033 15.2532 32.6198 16.4979 32.6198C17.7425 32.6198 18.7472 31.6033 18.7472 30.3442ZM9.7497 30.3442C9.7497 29.085 8.74497 28.0685 7.50035 28.0685C6.25573 28.0685 5.251 29.085 5.251 30.3442C5.251 31.6033 6.25573 32.6198 7.50035 32.6198C8.74497 32.6198 9.7497 31.6033 9.7497 30.3442Z" fill="black"/>
          </svg>
        </span>

        <div className="flex-1 px-3">
          <p>Introduce la dirección de correo electrónico vinculada a tu cuenta y te enviaremos un enlace para restablecer tu contraseña.</p>
        </div>
      </div>
      {state.error && <LoginError message={state.error} />}

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
