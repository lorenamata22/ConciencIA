'use client';

import { useActionState, useEffect, useState } from 'react';
import Link from 'next/link';
import {
  validateCodeAction,
  completeRegistrationAction,
} from '@/app/actions/auth';
import type { ValidateCodeData } from '@/lib/api/auth';
import { LoginError } from '@/components/ui/login-error';

const fieldClass = `
  w-full rounded-xl border border-brand-border bg-brand-bg
  px-4 py-3 text-sm text-brand-brown
  placeholder:text-brand-placeholder
  outline-none
  focus:border-brand-border-focus focus:ring-1 focus:ring-brand-teal/20
  transition-colors
  disabled:opacity-60 disabled:cursor-not-allowed
`;

function PasswordInput({
  id,
  name,
  autoComplete,
}: {
  id: string;
  name: string;
  autoComplete: string;
}) {
  const [show, setShow] = useState(false);

  return (
    <div className="relative">
      <input
        id={id}
        name={name}
        type={show ? 'text' : 'password'}
        autoComplete={autoComplete}
        required
        minLength={8}
        className={`${fieldClass} pr-11`}
      />
      <button
        type="button"
        onClick={() => setShow((v) => !v)}
        className="absolute right-3 top-1/2 -translate-y-1/2 text-brand-placeholder hover:text-brand-label transition-colors"
        aria-label={show ? 'Ocultar contraseña' : 'Mostrar contraseña'}
      >
        {show ? <EyeOffIcon /> : <EyeIcon />}
      </button>
    </div>
  );
}

export function RegistrationFlow({ initialCode }: { initialCode: string }) {
  const [code, setCode] = useState(initialCode);
  // Com código na URL a validação dispara no mount — já inicia em loading
  const [validating, setValidating] = useState(Boolean(initialCode));
  const [codeError, setCodeError] = useState<string | null>(null);
  const [validated, setValidated] = useState<ValidateCodeData | null>(null);

  const [state, action, isPending] = useActionState(completeRegistrationAction, {
    error: null,
  });

  async function handleValidate(value: string) {
    setValidating(true);
    setCodeError(null);
    const result = await validateCodeAction(value);
    if (result.error || !result.data) {
      setCodeError(result.error ?? 'Código inválido o expirado.');
    } else {
      setValidated(result.data);
    }
    setValidating(false);
  }

  // Código vindo do link do email — valida automaticamente
  useEffect(() => {
    if (initialCode) {
      handleValidate(initialCode);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ── Etapa 1: código ─────────────────────────────── */
  if (!validated) {
    return (
      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleValidate(code);
        }}
        className="flex flex-col gap-5 w-full"
      >
        <div className="text-center mb-1">
          <h1 className="text-2xl font-semibold text-brand-brown">Crear cuenta</h1>
          <p className="text-sm text-brand-label mt-1.5">
            Introduce el código de tu clase o el código de acceso que recibiste.
          </p>
        </div>

        {codeError && <LoginError message={codeError} />}

        <div className="flex flex-col gap-1.5">
          <label htmlFor="code" className="text-sm font-medium text-brand-label">
            Código
          </label>
          <input
            id="code"
            type="text"
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            required
            autoFocus
            placeholder="Ej. ABCD2345"
            className={`${fieldClass} font-mono tracking-widest uppercase`}
          />
        </div>

        <button
          type="submit"
          disabled={validating}
          className="
            w-full rounded-full bg-primary text-primary-text
            py-3.5 text-sm font-semibold
            hover:bg-primary
            disabled:opacity-60 disabled:cursor-not-allowed
            transition-colors mt-1
          "
        >
          {validating ? 'Validando...' : 'Validar código'}
        </button>

        <p className="text-center text-sm text-brand-label">
          ¿Ya tienes una cuenta?{' '}
          <Link href="/login" className="font-medium text-brand-brown hover:underline">
            Inicia sesión
          </Link>
        </p>
      </form>
    );
  }

  /* ── Etapa 2: confirmação + formulário ───────────── */
  const isActivation = validated.codeType === 'access';
  const classInfo = [validated.courseName, validated.className]
    .filter(Boolean)
    .join(' — ');

  return (
    <form action={action} className="flex flex-col gap-5 w-full">
      <div className="text-center mb-1">
        <h1 className="text-2xl font-semibold text-brand-brown">Completa tu registro</h1>
      </div>

      {/* Confirmação da instituição/turma identificada pelo código */}
      <div className="rounded-xl border border-brand-border px-4 py-3.5">
        <p className="text-sm font-semibold text-brand-brown">{validated.institutionName}</p>
        {classInfo && <p className="text-xs text-brand-label mt-0.5">{classInfo}</p>}
        <button
          type="button"
          onClick={() => {
            setValidated(null);
            setCode('');
            setCodeError(null);
          }}
          className="text-xs text-brand-label hover:text-brand-brown underline mt-1.5 transition-colors"
        >
          Usar otro código
        </button>
      </div>

      {state.error && <LoginError message={state.error} />}

      <input type="hidden" name="code" value={code} />
      <input type="hidden" name="codeType" value={validated.codeType} />

      <div className="flex flex-col gap-1.5">
        <label htmlFor="name" className="text-sm font-medium text-brand-label">
          Nombre completo
        </label>
        <input
          id="name"
          name="name"
          type="text"
          autoComplete="name"
          required
          defaultValue={validated.prefill?.name ?? ''}
          placeholder="Ej. Maria López"
          className={fieldClass}
        />
      </div>

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
          disabled={isActivation}
          defaultValue={validated.prefill?.email ?? ''}
          placeholder="johndoe@email.com"
          className={fieldClass}
        />
        {isActivation && (
          <p className="text-xs text-brand-placeholder">
            El correo fue definido por tu institución y no se puede cambiar.
          </p>
        )}
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="birthDate" className="text-sm font-medium text-brand-label">
          Fecha de nacimiento
        </label>
        <input
          id="birthDate"
          name="birthDate"
          type="date"
          required
          max={new Date().toISOString().split('T')[0]}
          className={fieldClass}
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="password" className="text-sm font-medium text-brand-label">
          Contraseña
        </label>
        <PasswordInput id="password" name="password" autoComplete="new-password" />
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="confirmPassword" className="text-sm font-medium text-brand-label">
          Confirmar contraseña
        </label>
        <PasswordInput id="confirmPassword" name="confirmPassword" autoComplete="new-password" />
      </div>

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
        {isPending ? 'Registrando...' : 'Crear cuenta'}
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
