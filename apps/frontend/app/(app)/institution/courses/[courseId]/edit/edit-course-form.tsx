'use client';

import { useActionState, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { updateCourseAction } from '@/app/actions/course';
import { FormField, inputClass } from '@/components/ui/form';
import { FeedbackModal, ModalSuccessIcon, ModalErrorIcon } from '@/components/ui/feedback-modal';
import type { CourseOption } from '@/lib/api/subject';

export function EditCourseForm({ course }: { course: CourseOption }) {
  const boundAction = updateCourseAction.bind(null, course.id);
  const [state, action, isPending] = useActionState(boundAction, { error: null });
  const [showModal, setShowModal] = useState(false);
  const router = useRouter();

  useEffect(() => {
    if (state.error || state.success) {
      setShowModal(true);
    }
  }, [state]);

  const isSuccess = !!state.success;

  return (
    <>
      <FeedbackModal
        open={showModal}
        onClose={() => setShowModal(false)}
        icon={isSuccess ? <ModalSuccessIcon /> : <ModalErrorIcon />}
        title={isSuccess ? '¡Curso actualizado!' : 'No pudimos guardar los cambios'}
        titleColor={isSuccess ? 'text-[#6EC090]' : 'text-[#D86262]'}
        description={
          isSuccess
            ? <>Los datos de <span className="font-medium text-brand-brown">&quot;{state.courseName}&quot;</span> han sido actualizados correctamente.</>
            : <>Ocurrió un problema al procesar la solicitud.<br />{state.error}</>
        }
        actions={
          isSuccess ? (
            <div className="flex gap-3">
              <button
                onClick={() => router.push('/institution/courses')}
                className="flex-1 px-4 py-3 rounded-xl text-sm font-medium border border-brand-border hover:bg-brand-border/30 transition-colors"
              >
                Ver cursos
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

      <div className="pt-10 px-10 md:px-30">
        <div className="mt-15 mb-10">
          <Link
            href="/institution/courses"
            className="flex items-center gap-1.5 text-sm text-brand-label hover:text-brand-brown transition-colors w-fit"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 18 9 12 15 6" />
            </svg>
            Cursos
          </Link>
        </div>

        <div className="mb-10">
          <h1 className="text-4xl text-brand">Editar curso</h1>
          <p className="text-sm text-brand-label mt-1">
            Actualizando <span className="font-medium">{course.name}</span>
          </p>
        </div>

        <hr className="border-brand-border mb-10" />

        <form action={action} autoComplete="off">
          <div className="max-w-lg flex flex-col gap-6">
            <FormField label="Nombre del curso" required>
              <input
                name="name"
                type="text"
                placeholder="Ej. Ingeniería de Sistemas"
                defaultValue={course.name}
                className={inputClass}
                required
                autoFocus
              />
            </FormField>

            <FormField label="Descripción">
              <textarea
                name="description"
                placeholder="Describe brevemente el contenido o enfoque del curso (opcional)"
                rows={3}
                defaultValue={course.description ?? ''}
                className={`${inputClass} resize-none`}
              />
            </FormField>

            <div className="flex items-center justify-end gap-3 pt-2">
              <Link
                href="/institution/courses"
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
        </form>
      </div>
    </>
  );
}
