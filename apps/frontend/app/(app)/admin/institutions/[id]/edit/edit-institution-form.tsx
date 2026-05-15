'use client';

import { useActionState, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { updateInstitutionAction } from '@/app/actions/institution';
import { FormField, CustomSelect, inputClass } from '@/components/ui/form';
import { FeedbackModal, ModalSuccessIcon, ModalErrorIcon } from '@/components/ui/feedback-modal';
import type { InstitutionDetail } from '@/lib/api/institution';

const COUNTRIES = [
  'Argentina', 'Bolivia', 'Brasil', 'Chile', 'Colombia', 'Costa Rica',
  'Cuba', 'Ecuador', 'El Salvador', 'España', 'Guatemala', 'Honduras',
  'México', 'Nicaragua', 'Panamá', 'Paraguay', 'Perú', 'Portugal',
  'República Dominicana', 'Uruguay', 'Venezuela',
];

export function EditInstitutionForm({ institution }: { institution: InstitutionDetail }) {
  const boundAction = updateInstitutionAction.bind(null, institution.id);
  const [state, action, isPending] = useActionState(boundAction, { error: null });
  const [logoPreview, setLogoPreview] = useState<string | null>(institution.logo_url ?? null);
  const [showModal, setShowModal] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const logoFileRef = useRef<File | null>(null);
  const router = useRouter();

  useEffect(() => {
    if (state.error) { setShowModal(true); return; }
    if (!state.success || !state.institutionId) return;

    const file = logoFileRef.current;
    if (!file || file.size === 0) { setShowModal(true); return; }

    const fd = new FormData();
    fd.append('logo', file);
    fetch(`/api/institutions/${state.institutionId}/logo`, { method: 'PATCH', body: fd })
      .finally(() => setShowModal(true));
  }, [state.success, state.error, state.institutionId]);

  function handleLogoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    logoFileRef.current = file;
    setLogoPreview(URL.createObjectURL(file));
  }

  function handleDropZoneClick() {
    fileInputRef.current?.click();
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (!file) return;
    logoFileRef.current = file;
    setLogoPreview(URL.createObjectURL(file));
  }

  const isSuccess = !!state.success;

  return (
    <>
      <FeedbackModal
        open={showModal}
        onClose={() => setShowModal(false)}
        icon={isSuccess ? <ModalSuccessIcon /> : <ModalErrorIcon />}
        title={isSuccess ? '¡Institución actualizada con éxito!' : 'No pudimos guardar los cambios'}
        titleColor={isSuccess ? 'text-[#6EC090]' : 'text-[#D86262]'}
        description={
          isSuccess
            ? <>Los datos de &quot;{state.institutionName}&quot; han sido<br />actualizados correctamente.</>
            : <>Ocurrió un problema al procesar la información. Por favor, revisa los datos e inténtalo nuevamente. Error: {state.error}</>
        }
        actions={
          isSuccess ? (
            <div className="flex gap-3">
              <button
                onClick={() => router.push('/admin/institutions')}
                className="flex-1 px-4 py-3 rounded-xl text-sm font-medium border border-brand-border hover:bg-brand-border/30 transition-colors"
              >
                Ver todas las instituciones
              </button>
              <Link
                href={`/admin/institutions/${institution.id}`}
                className="flex-1 px-4 py-3 rounded-xl text-sm font-medium bg-[#999DA3] text-white transition-colors flex items-center justify-center"
              >
                Ver institución
              </Link>
            </div>
          ) : (
            <div className="flex justify-center">
              <button
                onClick={() => setShowModal(false)}
                className="px-4 py-3 rounded-xl text-sm font-medium bg-[#999DA3] text-white border border-brand-border transition-colors"
              >
                Intentar nuevamente
              </button>
            </div>
          )
        }
      />

      <div className="pt-10 px-10 md:px-30">

        {/* Tool Bar */}
        <div className="mt-15 mb-10">
          <Link
            href={`/admin/institutions/${institution.id}`}
            className="flex items-center gap-1.5 text-sm text-brand-label hover:text-brand-brown transition-colors"
          >
            <ChevronLeftIcon />
            {institution.name}
          </Link>
        </div>

        {/* Header */}
        <div className="mb-10">
          <h1 className="text-4xl font-bold text-brand-brown">Editar institución</h1>
          <p className="text-sm text-brand-label mt-1">
            Actualiza los datos de <span className="font-medium">{institution.name}</span>
          </p>
        </div>

        <hr className="border-brand-border mb-10" />

        <form action={action} autoComplete="off">
          <div className="flex flex-col md:flex-row gap-8 mb-5">

            {/* Logo upload */}
            <div className="flex-shrink-0">
              <div
                role="button"
                tabIndex={0}
                onClick={handleDropZoneClick}
                onKeyDown={(e) => e.key === 'Enter' && handleDropZoneClick()}
                onDrop={handleDrop}
                onDragOver={(e) => e.preventDefault()}
                className="w-52 h-64 rounded-2xl border border-brand-border flex flex-col items-center justify-center gap-3 cursor-pointer hover:border-brand-border-focus transition-colors p-4"
              >
                {logoPreview ? (
                  <img
                    src={logoPreview}
                    alt="Logo preview"
                    className="w-full h-32 object-contain rounded-lg"
                  />
                ) : (
                  <div className="flex flex-col items-center gap-1 text-brand-label">
                    <UploadIcon />
                    <span className="text-md font-strong my-2">Subir logotipo</span>
                    <p className="text-center text-sm"><b>Haz clic</b> o arrastra tu archivo aqui</p>
                  </div>
                )}
                <hr className="border-brand-border" />
                <ul className="text-xs text-brand-placeholder space-y-0.5 text-left w-full mt-1">
                  <li>• PNG, JPG, SVG o WebP</li>
                  <li>• Mínimo 60×60 px</li>
                  <li>• Máximo 1MB</li>
                  <li>• Proporción 1:1</li>
                </ul>
              </div>
              <input
                ref={fileInputRef}
                name="logo"
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
                  defaultValue={institution.name}
                  className={inputClass}
                  required
                />
              </FormField>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField label="Correo electrónico de contacto">
                  <input
                    name="email"
                    type="email"
                    value={institution.email ?? ''}
                    readOnly
                    disabled
                    className={`${inputClass} opacity-50 cursor-not-allowed bg-brand-border/20`}
                    title="El correo electrónico no puede ser modificado"
                  />
                </FormField>
                <FormField label="Teléfono">
                  <input
                    name="phone"
                    type="tel"
                    placeholder="+34 000 000 000"
                    defaultValue={institution.phone ?? ''}
                    className={inputClass}
                  />
                </FormField>
              </div>

              <FormField label="Representante de la institución" required>
                <input
                  name="representativeName"
                  type="text"
                  placeholder="María López"
                  defaultValue={institution.representative_name ?? ''}
                  className={inputClass}
                  required
                />
              </FormField>

              <FormField label="Dirección">
                <input
                  name="address"
                  type="text"
                  placeholder="Calle y número"
                  defaultValue={institution.address ?? ''}
                  className={inputClass}
                />
              </FormField>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <FormField label="Código postal">
                  <input
                    name="postalCode"
                    type="text"
                    placeholder="Ej. 080029"
                    defaultValue={institution.postal_code ?? ''}
                    className={inputClass}
                  />
                </FormField>
                <FormField label="País">
                  <CustomSelect
                    name="country"
                    placeholder="Seleccionar"
                    options={COUNTRIES}
                    defaultValue={institution.country ?? ''}
                  />
                </FormField>
                <FormField label="Ciudad">
                  <input
                    name="city"
                    type="text"
                    placeholder="Madrid"
                    defaultValue={institution.city ?? ''}
                    className={inputClass}
                  />
                </FormField>
              </div>

              {state.error && !showModal && (
                <p className="text-sm text-red-500">{state.error}</p>
              )}

              <p className="text-xs text-brand-placeholder -mt-2">
                * El correo electrónico es una credencial de acceso y no puede modificarse desde aquí.
              </p>

              <div className="flex items-center justify-end gap-3 pt-2">
                <Link
                  href={`/admin/institutions/${institution.id}`}
                  className="px-5 py-3 rounded-xl text-sm font-medium text-brand-label border border-brand-border hover:bg-brand-border/30 transition-colors"
                >
                  Cancelar
                </Link>
                <button
                  type="submit"
                  disabled={isPending}
                  className="px-5 py-3 rounded-xl text-sm font-medium bg-[#999DA3] text-white hover:bg-[#999DA3]/90 cursor-pointer transition-colors disabled:opacity-60"
                >
                  {isPending ? 'Guardando...' : 'Guardar cambios'}
                </button>
              </div>

            </div>
          </div>
        </form>
      </div>
    </>
  );
}

function UploadIcon() {
  return (
    <svg width="40" height="40" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="0.5" y="0.5" width="39" height="39" rx="4.5" fill="#FAF9F6"/>
      <rect x="0.5" y="0.5" width="39" height="39" rx="4.5" stroke="#999DA3"/>
      <path d="M14.6667 27.1667H25.3334C25.8195 27.1663 26.2856 26.9731 26.6293 26.6293C26.9731 26.2856 27.1664 25.8195 27.1667 25.3333V23.3333C27.1667 23.2007 27.114 23.0736 27.0203 22.9798C26.9265 22.886 26.7993 22.8333 26.6667 22.8333C26.5341 22.8333 26.4069 22.886 26.3132 22.9798C26.2194 23.0736 26.1667 23.2007 26.1667 23.3333V25.3333C26.1664 25.5542 26.0784 25.766 25.9222 25.9222C25.766 26.0784 25.5543 26.1663 25.3334 26.1667H14.6667C14.4458 26.1663 14.234 26.0784 14.0778 25.9222C13.9216 25.766 13.8337 25.5542 13.8334 25.3333V23.3333C13.8334 23.2007 13.7807 23.0736 13.6869 22.9798C13.5932 22.886 13.466 22.8333 13.3334 22.8333C13.2008 22.8333 13.0736 22.886 12.9798 22.9798C12.8861 23.0736 12.8334 23.2007 12.8334 23.3333V25.3333C12.8337 25.8195 13.027 26.2856 13.3707 26.6293C13.7145 26.9731 14.1806 27.1663 14.6667 27.1667Z" fill="#5F5E5C"/>
      <path d="M20.0001 23.1667C20.1327 23.1667 20.2598 23.114 20.3536 23.0202C20.4474 22.9265 20.5001 22.7993 20.5001 22.6667V14.4L23.6801 17.05C23.7823 17.1311 23.9122 17.1691 24.0421 17.1557C24.1719 17.1423 24.2914 17.0787 24.375 16.9784C24.4585 16.8781 24.4996 16.7492 24.4893 16.619C24.479 16.4889 24.4183 16.368 24.3201 16.282L20.3201 12.9487C20.2957 12.9311 20.2695 12.9161 20.2421 12.904C20.2226 12.8908 20.2021 12.8792 20.1807 12.8693C20.1249 12.847 20.0655 12.8351 20.0054 12.834L20.0001 12.8333H19.9947C19.9346 12.8344 19.8752 12.8464 19.8194 12.8687C19.798 12.8785 19.7775 12.8901 19.7581 12.9033C19.7306 12.9155 19.7044 12.9304 19.6801 12.948L15.6801 16.2813C15.5818 16.3673 15.5211 16.4882 15.5108 16.6184 15.5006 16.7485 15.5416 16.8775 15.6252 16.9778C15.7087 17.078 15.8282 17.1417 15.958 17.155C16.0879 17.1684 16.2178 17.1305 16.3201 17.0493L19.5001 14.4V22.6667C19.5001 22.7993 19.5527 22.9265 19.6465 23.0202C19.7403 23.114 19.8675 23.1667 20.0001 23.1667Z" fill="#5F5E5C"/>
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
