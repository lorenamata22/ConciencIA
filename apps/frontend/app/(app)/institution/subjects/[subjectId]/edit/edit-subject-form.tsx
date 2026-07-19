'use client';

import { useActionState, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { updateSubjectAction } from '@/app/actions/subject';
import { FormField, inputClass } from '@/components/ui/form';
import { FeedbackModal, ModalSuccessIcon, ModalErrorIcon } from '@/components/ui/feedback-modal';
import type { SubjectItem, CourseOption } from '@/lib/api/subject';
import type { StoredModule } from '@/lib/api/subjects';
import { SubjectProgramSection } from '@/components/modules/subject/subject-program-section';

function CourseSelect({
  courses,
  defaultCourseId,
}: {
  courses: CourseOption[];
  defaultCourseId: string;
}) {
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<CourseOption>(
    () => courses.find((c) => c.id === defaultCourseId) ?? courses[0],
  );
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onMouseDown(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', onMouseDown);
    return () => document.removeEventListener('mousedown', onMouseDown);
  }, []);

  return (
    <div ref={ref} className="relative">
      <input type="hidden" name="courseId" value={selected?.id ?? ''} />
      <button
        type="button"
        onClick={() => setOpen((p) => !p)}
        className={`w-full rounded-xl border px-4 py-3 text-sm text-left transition-colors focus:outline-none flex items-center justify-between gap-2 ${
          open ? 'border-brand-border-focus' : 'border-brand-border'
        } text-brand-brown`}
      >
        <span className="truncate">{selected?.name ?? 'Seleccionar curso'}</span>
        <span className={`shrink-0 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </span>
      </button>
      {open && (
        <ul className="absolute z-50 w-full rounded-xl border border-brand-border bg-brand-bg shadow-lg max-h-56 overflow-y-auto top-full mt-1">
          {courses.map((c) => (
            <li
              key={c.id}
              onMouseDown={() => { setSelected(c); setOpen(false); }}
              className={`px-4 py-2.5 text-sm cursor-pointer transition-colors hover:bg-brand-border/30 ${
                selected?.id === c.id ? 'font-medium text-brand-brown' : 'text-brand-brown'
              }`}
            >
              {c.name}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function EditSubjectForm({
  subject,
  courses,
  modules,
}: {
  subject: SubjectItem;
  courses: CourseOption[];
  modules: StoredModule[];
}) {
  const boundAction = updateSubjectAction.bind(null, subject.id);
  const [state, action, isPending] = useActionState(boundAction, { error: null });
  const [showModal, setShowModal] = useState(false);
  const router = useRouter();

  useEffect(() => {
    if (state.error || state.success) setShowModal(true);
  }, [state.error, state.success]);

  const isSuccess = !!state.success;
  const isBusy = isPending;

  return (
    <>
      <FeedbackModal
        open={showModal}
        onClose={() => setShowModal(false)}
        icon={isSuccess ? <ModalSuccessIcon /> : <ModalErrorIcon />}
        title={isSuccess ? '¡Asignatura actualizada!' : 'No pudimos guardar los cambios'}
        titleColor={isSuccess ? 'text-[#6EC090]' : 'text-[#D86262]'}
        description={
          isSuccess
            ? <>Los datos de <span className="font-medium text-brand-brown">&quot;{state.subjectName}&quot;</span> han sido actualizados correctamente.</>
            : <>Ocurrió un problema al procesar la solicitud.<br />{state.error}</>
        }
        actions={
          isSuccess ? (
            <div className="flex gap-3">
              <button
                onClick={() => router.push('/institution/subjects')}
                className="flex-1 px-4 py-3 rounded-xl text-sm font-medium bg-[#999DA3] text-white hover:bg-[#999DA3]/90 transition-colors"
              >
                Ver asignaturas
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
            href="/institution/subjects"
            className="flex items-center gap-1.5 text-sm text-brand-label hover:text-brand-brown transition-colors w-fit"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 18 9 12 15 6" />
            </svg>
            Asignaturas
          </Link>
        </div>

        <div className="mb-10">
          <h1 className="text-4xl text-brand">Editar asignatura</h1>
          <p className="text-sm text-brand-label mt-1">
            Actualizando <span className="font-medium">{subject.name}</span>
          </p>
        </div>

        <hr className="border-brand-border mb-10" />

        <form action={action} autoComplete="off">
          <div className="max-w-2xl flex flex-col gap-6">
            <FormField label="Nombre" required>
              <input
                name="name"
                type="text"
                placeholder="Ej. Matemáticas"
                defaultValue={subject.name}
                className={inputClass}
                required
                autoFocus
              />
            </FormField>

            <FormField label="Curso">
              <CourseSelect courses={courses} defaultCourseId={subject.course.id} />
            </FormField>

            <div className="flex items-center justify-end gap-3 pt-2">
              <Link
                href="/institution/subjects"
                className="px-5 py-3 rounded-xl text-sm font-medium text-brand-label border border-brand-border hover:bg-brand-border/30 transition-colors"
              >
                Cancelar
              </Link>
              <button
                type="submit"
                disabled={isBusy}
                className="px-5 py-3 rounded-xl text-sm font-medium bg-[#999DA3] text-white hover:bg-[#999DA3]/90 cursor-pointer transition-colors disabled:opacity-60"
              >
                {isBusy ? 'Guardando...' : 'Guardar cambios'}
              </button>
            </div>
          </div>
        </form>

        {/* Programa: fluxo próprio (edição manual ou novo upload), fora do
            form de nome/curso — cada um salva de forma independente */}
        <div className="mt-14">
          <h2 className="text-2xl text-brand">Programa de asignatura</h2>
          <p className="text-sm text-brand-label mt-1 mb-6">
            Administra los módulos y temas generados a partir del programa.
          </p>

          <SubjectProgramSection
            subjectId={subject.id}
            subjectName={subject.name}
            modules={modules}
          />
        </div>
      </div>
    </>
  );
}
