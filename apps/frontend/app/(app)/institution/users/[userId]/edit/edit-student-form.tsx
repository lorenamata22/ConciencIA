'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { FormField, ObjectSelect, inputClass } from '@/components/ui/form';
import { FeedbackModal, ModalSuccessIcon, ModalErrorIcon } from '@/components/ui/feedback-modal';
import type { ClassItem } from '@/lib/api/class';
import type { StudentItem } from '@/lib/api/student';

interface Props {
  student: StudentItem;
  classes: ClassItem[];
}

export function EditStudentForm({ student, classes }: Props) {
  const router = useRouter();
  const [showModal, setShowModal] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const [name, setName] = useState(student.name);
  const [phone, setPhone] = useState(student.phone ?? '');
  const [isMinor, setIsMinor] = useState(student.isMinor);
  const [selectedClassId, setSelectedClassId] = useState(student.class?.id ?? '');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!name.trim()) return;

    if (!selectedClassId) {
      setErrorMsg('Debes asignar una clase al estudiante.');
      setIsSuccess(false);
      setShowModal(true);
      return;
    }

    setSubmitting(true);

    try {
      const res = await fetch(`/api/institution/students/${student.userId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          phone: phone.trim() || undefined,
          classId: selectedClassId,
          isMinor,
        }),
      });

      const json = await res.json();

      if (!res.ok) {
        setErrorMsg(json.message ?? 'No se pudo guardar los cambios.');
        setIsSuccess(false);
        setShowModal(true);
        return;
      }

      setIsSuccess(true);
      setShowModal(true);
    } catch {
      setErrorMsg('No se pudo guardar los cambios. Inténtalo de nuevo.');
      setIsSuccess(false);
      setShowModal(true);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <FeedbackModal
        open={showModal}
        onClose={() => { setShowModal(false); if (isSuccess) router.push('/institution/users'); }}
        icon={isSuccess ? <ModalSuccessIcon /> : <ModalErrorIcon />}
        title={isSuccess ? '¡Estudiante actualizado!' : 'No pudimos guardar los cambios'}
        titleColor={isSuccess ? 'text-[#6EC090]' : 'text-[#D86262]'}
        description={
          isSuccess
            ? <>Los datos de <span className="font-medium text-brand-brown">{name}</span> han sido actualizados correctamente.</>
            : <>Ocurrió un problema al procesar la solicitud.<br />{errorMsg}</>
        }
        actions={
          isSuccess ? (
            <div className="flex gap-3">
              <button
                onClick={() => router.push('/institution/users')}
                className="flex-1 px-4 py-3 rounded-xl text-sm font-medium bg-[#999DA3] text-white hover:bg-[#999DA3]/90 transition-colors"
              >
                Ver usuarios
              </button>
            </div>
          ) : (
            <div className="flex justify-center">
              <button
                onClick={() => setShowModal(false)}
                className="px-4 py-3 rounded-xl text-sm font-medium bg-[#999DA3] text-white transition-colors"
              >
                Intentar nuevamente
              </button>
            </div>
          )
        }
      />

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
          <h1 className="text-4xl text-brand">Editar usuario / Estudiante</h1>
          <p className="text-sm text-brand-label mt-1">
            Administra usuarios dentro de la plataforma de la institución.
          </p>
        </div>

        <form onSubmit={handleSubmit} autoComplete="off">
          <div className="max-w-2xl flex flex-col gap-6">
            <FormField label="Nombre completo" required>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ej. Maria López"
                className={inputClass}
                required
              />
            </FormField>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField label="Correo electrónico de contacto">
                <input
                  type="email"
                  value={student.email}
                  readOnly
                  className={`${inputClass} opacity-60 cursor-not-allowed`}
                />
              </FormField>

              <FormField label="Teléfono">
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
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
                defaultValue={selectedClassId}
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

            <div className="flex items-center justify-end gap-3 pt-2">
              <Link
                href="/institution/users"
                className="px-5 py-3 rounded-xl text-sm font-medium text-brand-label border border-brand-border hover:bg-brand-border/30 transition-colors"
              >
                Atrás
              </Link>
              <button
                type="submit"
                disabled={submitting}
                className="px-5 py-3 rounded-xl text-sm font-medium bg-[#999DA3] text-white hover:bg-[#999DA3]/90 cursor-pointer transition-colors disabled:opacity-60"
              >
                {submitting ? 'Guardando...' : 'Guardar cambios'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </>
  );
}
