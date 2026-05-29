'use client';

import { useState, useRef } from 'react';
import Link from 'next/link';
import { FormField, ObjectSelect, inputClass } from '@/components/ui/form';
import type { ClassItem } from '@/lib/api/class';

interface Props {
  classes: ClassItem[];
}

type View = 'form' | 'success';

function AccessCodeCard({ code, email }: { code: string; email: string }) {
  const [copied, setCopied] = useState(false);

  function handleCopy() {
    navigator.clipboard.writeText(code).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <div className="rounded-xl border border-brand-border p-5">
      <p className="text-xs font-medium text-brand-label mb-1">Código de Acceso</p>
      <div className="flex items-center justify-between gap-3">
        <span className="text-lg font-mono font-semibold text-brand-brown tracking-widest">{code}</span>
        <button
          type="button"
          onClick={handleCopy}
          className="flex items-center gap-1.5 text-sm text-brand-label hover:text-brand-brown transition-colors"
        >
          {copied ? (
            <>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
              Copiado
            </>
          ) : (
            <>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
              </svg>
              Copiar
            </>
          )}
        </button>
      </div>
      <p className="text-xs text-brand-placeholder mt-2">
        Comparte este código con <span className="font-medium">{email}</span> para que pueda acceder a la plataforma.
      </p>
    </div>
  );
}

export function CreateStudentForm({ classes }: Props) {
  const [view, setView] = useState<View>('form');
  const [accessCode, setAccessCode] = useState('');
  const [createdEmail, setCreatedEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [selectedClassId, setSelectedClassId] = useState('');
  const [isMinor, setIsMinor] = useState(false);

  const nameRef = useRef<HTMLInputElement>(null);
  const emailRef = useRef<HTMLInputElement>(null);
  const phoneRef = useRef<HTMLInputElement>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    const name = nameRef.current?.value.trim() ?? '';
    const email = emailRef.current?.value.trim() ?? '';
    const phone = phoneRef.current?.value.trim() ?? '';

    if (!name || !email) {
      setError('El nombre y el correo electrónico son obligatorios.');
      return;
    }

    if (!selectedClassId) {
      setError('Debes asignar una clase al estudiante.');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch('/api/institution/students', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          email,
          phone: phone || undefined,
          classId: selectedClassId,
          isMinor,
        }),
      });

      const json = await res.json();

      if (!res.ok) {
        setError(json.message ?? 'No se pudo registrar el estudiante. Inténtalo de nuevo.');
        return;
      }

      setAccessCode(json.data.accessCode);
      setCreatedEmail(email);
      setView('success');
    } catch {
      setError('No se pudo registrar el estudiante. Inténtalo de nuevo.');
    } finally {
      setSubmitting(false);
    }
  }

  function handleRegisterAnother() {
    setView('form');
    setAccessCode('');
    setCreatedEmail('');
    setError(null);
    setSelectedClassId('');
    setIsMinor(false);
    if (nameRef.current) nameRef.current.value = '';
    if (emailRef.current) emailRef.current.value = '';
    if (phoneRef.current) phoneRef.current.value = '';
  }

  if (view === 'success') {
    return (
      <div className="pt-10 px-10 md:px-30 pb-16">
        <div className="mt-15 mb-10">
          <Link
            href="/institution/users"
            className="flex items-center gap-1.5 text-sm text-brand-label hover:text-brand-brown transition-colors w-fit"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 18 9 12 15 6" />
            </svg>
            Home
          </Link>
        </div>

        <div className="max-w-xl">
          <div className="mb-6">
            <svg width="44" height="44" viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M17.93 0C8.03 0 0 8.02 0 17.93C0 27.84 8.03 35.86 17.93 35.86C27.83 35.86 35.87 27.84 35.87 17.93C35.87 8.02 27.84 0 17.93 0ZM30.73 11.77L15.73 26.78C15.36 27.15 14.87 27.33 14.38 27.33H14.34C13.86 27.33 13.37 27.14 13 26.77L5.14 18.91C4.4 18.17 4.4 16.97 5.14 16.22C5.88 15.48 7.09 15.48 7.83 16.22L14.36 22.76L28.04 9.09C28.78 8.34 29.99 8.34 30.73 9.09C31.47 9.83 31.47 11.03 30.73 11.77Z" fill="#6EC090" />
            </svg>
          </div>

          <h1 className="text-3xl text-brand mb-4">
            Registro del<br />estudiante completado
          </h1>

          <hr className="border-brand-border mb-5" />

          <p className="text-sm text-brand-label mb-2">
            El registro del estudiante se ha realizado correctamente.
          </p>
          <p className="text-sm text-brand-brown mb-6">
            Hemos generado un código único para que el estudiante<br />
            pueda acceder a la plataforma.
          </p>

          <AccessCodeCard code={accessCode} email={createdEmail} />

          <div className="flex gap-3 mt-8">
            <button
              type="button"
              disabled
              className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-medium border border-brand-border text-brand-label opacity-50 cursor-not-allowed"
              title="Funcionalidad de envío por correo próximamente disponible"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="22" y1="2" x2="11" y2="13" /><polygon points="22 2 15 22 11 13 2 9 22 2" />
              </svg>
              Enviar por correo
            </button>
            <button
              type="button"
              onClick={handleRegisterAnother}
              className="flex-1 px-4 py-3 rounded-xl text-sm font-medium border border-brand-border text-brand-brown hover:bg-brand-border/30 transition-colors"
            >
              Registrar otro usuario
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="pt-10 px-10 md:px-30 pb-16">
      <div className="mt-15 mb-10">
        <Link
          href="/institution/users"
          className="flex items-center gap-1.5 text-sm text-brand-label hover:text-brand-brown transition-colors w-fit"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
          Home
        </Link>
      </div>

      <div className="mb-10">
        <h1 className="text-4xl text-brand">Nuevo usuario / Estudiante</h1>
        <p className="text-sm text-brand-label mt-1">
          Administra usuarios dentro de la plataforma de la institución.
        </p>
      </div>

      <form onSubmit={handleSubmit} autoComplete="off">
        <div className="max-w-2xl flex flex-col gap-6">
          <FormField label="Nombre completo" required>
            <input
              ref={nameRef}
              type="text"
              placeholder="Ej. Maria López"
              className={inputClass}
              required
              autoFocus
            />
          </FormField>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormField label="Correo electrónico de contacto" required>
              <input
                ref={emailRef}
                type="email"
                placeholder="contacto@institución.edu"
                className={inputClass}
                required
              />
            </FormField>

            <FormField label="Teléfono">
              <input
                ref={phoneRef}
                type="tel"
                placeholder="+34 000 000 000"
                className={inputClass}
              />
            </FormField>
          </div>

          <FormField label="Asignar clase" required>
            <ObjectSelect
              name="classId"
              placeholder="Elegir clase"
              options={classes.map((c) => ({ id: c.id, label: `${c.name} — ${c.course.name}` }))}
              onChange={setSelectedClassId}
            />
          </FormField>

          <label className="flex items-center gap-2.5 cursor-pointer w-fit">
            <div
              onClick={() => setIsMinor((v) => !v)}
              className={`w-5 h-5 rounded border flex items-center justify-center transition-colors cursor-pointer ${
                isMinor ? 'bg-[#999DA3] border-[#999DA3]' : 'border-brand-border'
              }`}
            >
              {isMinor && (
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              )}
            </div>
            <span className="text-sm text-brand-brown">Es menor de edad</span>
          </label>

          {error && <p className="text-sm text-red-500">{error}</p>}

          <div className="flex justify-end pt-2">
            <button
              type="submit"
              disabled={submitting}
              className="flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-medium bg-[#999DA3] text-white hover:bg-[#999DA3]/90 cursor-pointer transition-colors disabled:opacity-60"
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
              </svg>
              {submitting ? 'Registrando...' : 'Registrar Estudiante'}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
