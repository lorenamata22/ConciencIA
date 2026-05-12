'use client';

import { useActionState, useRef, useState } from 'react';
import Link from 'next/link';
import { createInstitutionAction } from '@/app/actions/institution';

const COUNTRIES = [
  'Argentina', 'Bolivia', 'Brasil', 'Chile', 'Colombia', 'Costa Rica',
  'Cuba', 'Ecuador', 'El Salvador', 'España', 'Guatemala', 'Honduras',
  'México', 'Nicaragua', 'Panamá', 'Paraguay', 'Perú', 'Portugal',
  'República Dominicana', 'Uruguay', 'Venezuela',
];

function FormField({
  label,
  children,
  required,
}: {
  label: string;
  children: React.ReactNode;
  required?: boolean;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-sm font-medium text-brand-label">
        {label}
        {required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      {children}
    </div>
  );
}

const inputClass =
  'w-full rounded-xl border border-brand-border px-4 py-3 text-sm text-brand-brown placeholder:text-brand-placeholder focus:outline-none focus:border-brand-border-focus transition-colors';

const selectClass =
  'w-full rounded-xl border border-brand-border px-4 py-3 text-sm text-brand-brown focus:outline-none focus:border-brand-border-focus transition-colors appearance-none';

export function NewInstitutionForm() {
  const [state, action, isPending] = useActionState(createInstitutionAction, { error: null });
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function handleLogoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    setLogoPreview(url);
  }

  function handleDropZoneClick() {
    fileInputRef.current?.click();
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    setLogoPreview(url);
  }

  return (
    <div className="pt-10 px-30 max-w-5xl">

      {/* Tool Bar */}
      <div className="mt-15 mb-10">
        <Link
          href="/admin"
          className="flex items-center gap-1.5 text-sm text-brand-label hover:text-brand-brown transition-colors"
        >
          <ChevronLeftIcon />
          Home
        </Link>
      </div>

      {/* Header */}
      <div className="mb-10">
        <h1 className="text-4xl font-bold text-brand-brown">Nueva institución</h1>
        <p className="text-sm text-brand-label mt-1">
          Crea y administra instituciones educativas dentro de la plataforma
        </p>
      </div>

      <hr className="border-brand-border mb-10" />

      <form action={action}>
        <div className="flex flex-col md:flex-row gap-8">

          {/* Logo upload */}
          <div className="flex-shrink-0">
            <div
              role="button"
              tabIndex={0}
              onClick={handleDropZoneClick}
              onKeyDown={(e) => e.key === 'Enter' && handleDropZoneClick()}
              onDrop={handleDrop}
              onDragOver={(e) => e.preventDefault()}
              className="w-52 h-64 rounded-2xl border-2 border border-brand-border flex flex-col items-center justify-center gap-3 cursor-pointer hover:border-brand-border-focus transition-colors p-4"
            >
              {logoPreview ? (
                <img
                  src={logoPreview}
                  alt="Logo preview"
                  className="w-full h-32 object-contain rounded-lg"
                />
              ) : (
                <div className="flex flex-col items-center gap-2 text-brand-label">
                  <UploadIcon />
                  <span className="text-sm font-medium text-brand-brown">Subir logotipo</span>
                </div>
              )}
              <ul className="text-xs text-brand-placeholder space-y-0.5 text-left w-full mt-1">
                <li>• PNG, JPG, SVG o WebP</li>
                <li>• Mínimo 60×60 px</li>
                <li>• Máximo 1MB</li>
                <li>• Proporción 1:1</li>
              </ul>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/png,image/jpeg,image/svg+xml,image/webp"
              className="hidden"
              onChange={handleLogoChange}
            />
          </div>

          {/* Fields */}
          <div className="flex-1 flex flex-col gap-5">

            <FormField label="Nombre de la institución" required>
              <input
                name="name"
                type="text"
                placeholder="Ej. Colegio San Martín"
                className={inputClass}
                required
              />
            </FormField>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField label="Correo electrónico de contacto" required>
                <input
                  name="email"
                  type="email"
                  placeholder="contacto@institución.edu"
                  className={inputClass}
                  required
                />
              </FormField>
              <FormField label="Teléfono">
                <input
                  name="phone"
                  type="tel"
                  placeholder="+34 000 000 000"
                  className={inputClass}
                />
              </FormField>
            </div>

            <FormField label="Representante de la institución" required>
              <input
                name="representativeName"
                type="text"
                placeholder="María López"
                className={inputClass}
                required
              />
            </FormField>

            <FormField label="Contraseña de acceso" required>
              <input
                name="password"
                type="password"
                placeholder="Mínimo 6 caracteres"
                className={inputClass}
                required
                minLength={6}
              />
            </FormField>

            <FormField label="Dirección">
              <input
                name="address"
                type="text"
                placeholder="Calle y número"
                className={inputClass}
              />
            </FormField>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <FormField label="Código postal">
                <input
                  name="postalCode"
                  type="text"
                  placeholder="Ej. 080029"
                  className={inputClass}
                />
              </FormField>
              <FormField label="País">
                <div className="relative">
                  <select name="country" className={selectClass} defaultValue="">
                    <option value="" disabled>Seleccionar</option>
                    {COUNTRIES.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                  <ChevronDownIcon />
                </div>
              </FormField>
              <FormField label="Ciudad">
                <input
                  name="city"
                  type="text"
                  placeholder="Madrid"
                  className={inputClass}
                />
              </FormField>
            </div>

            {state.error && (
              <p className="text-sm text-red-500 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
                {state.error}
              </p>
            )}

            <div className="flex items-center justify-end gap-3 pt-2">
              <Link
                href="/admin"
                className="px-5 py-3 rounded-xl text-sm font-medium text-brand-label border border-brand-border hover:bg-brand-border/30 transition-colors"
              >
                Cancelar
              </Link>
              <button
                type="submit"
                disabled={isPending}
                className="px-5 py-3 rounded-xl text-sm font-medium bg-primary text-primary-text hover:bg-primary-hover transition-colors disabled:opacity-60"
              >
                {isPending ? 'Creando...' : 'Crear institución'}
              </button>
            </div>

          </div>
        </div>
      </form>
    </div>
  );
}

function UploadIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="16 16 12 12 8 16" />
      <line x1="12" y1="12" x2="12" y2="21" />
      <path d="M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3" />
    </svg>
  );
}

function ChevronLeftIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="15 18 9 12 15 6" />
    </svg>
  );
}

function ChevronDownIcon() {
  return (
    <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="6 9 12 15 18 9" />
      </svg>
    </div>
  );
}
