'use client';

import { useActionState, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { updateClassAction } from '@/app/actions/class';
import { FormField, inputClass } from '@/components/ui/form';
import { FeedbackModal, ModalSuccessIcon, ModalErrorIcon } from '@/components/ui/feedback-modal';
import type { CourseOption, SubjectItem } from '@/lib/api/subject';
import type { ClassItem } from '@/lib/api/class';

const PERIOD_OPTIONS = [
  'Matutino (8:00-12:30)',
  'Vespertino (12:30-18:00)',
  'Noturno (18:00-22:30)',
  'Integral',
];

function CourseSelect({
  courses,
  defaultCourseId,
  onSelect,
}: {
  courses: CourseOption[];
  defaultCourseId: string;
  onSelect: (courseId: string) => void;
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

  function handleSelect(c: CourseOption) {
    setSelected(c);
    setOpen(false);
    onSelect(c.id);
  }

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
              onMouseDown={() => handleSelect(c)}
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

function PeriodSelect({ defaultValue }: { defaultValue: string }) {
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState(defaultValue);
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
      <input type="hidden" name="period" value={selected} />
      <button
        type="button"
        onClick={() => setOpen((p) => !p)}
        className={`w-full rounded-xl border px-4 py-3 text-sm text-left transition-colors focus:outline-none flex items-center justify-between gap-2 ${
          open ? 'border-brand-border-focus' : 'border-brand-border'
        } text-brand-brown`}
      >
        <span className="truncate">{selected || 'Seleccionar turno'}</span>
        <span className={`shrink-0 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </span>
      </button>
      {open && (
        <ul className="absolute z-50 w-full rounded-xl border border-brand-border bg-brand-bg shadow-lg top-full mt-1">
          {PERIOD_OPTIONS.map((opt) => (
            <li
              key={opt}
              onMouseDown={() => { setSelected(opt); setOpen(false); }}
              className={`px-4 py-2.5 text-sm cursor-pointer transition-colors hover:bg-brand-border/30 ${
                selected === opt ? 'font-medium text-brand-brown' : 'text-brand-brown'
              }`}
            >
              {opt}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function SubjectsPreview({ subjects }: { subjects: SubjectItem[] }) {
  if (subjects.length === 0) {
    return (
      <p className="text-sm text-brand-placeholder py-2">
        Este curso no tiene asignaturas registradas.
      </p>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-x-6 gap-y-3">
      {subjects.map((s) => (
        <div key={s.id} className="flex items-center gap-2.5">
          <div className="w-4 h-4 rounded border border-brand-border-focus bg-[#999DA3]/20 flex items-center justify-center shrink-0">
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#999DA3" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </div>
          <span className="text-sm text-brand-brown truncate">{s.name}</span>
        </div>
      ))}
    </div>
  );
}

export function EditClassForm({
  classItem,
  courses,
  subjects,
}: {
  classItem: ClassItem;
  courses: CourseOption[];
  subjects: SubjectItem[];
}) {
  const boundAction = updateClassAction.bind(null, classItem.id);
  const [state, action, isPending] = useActionState(boundAction, { error: null });
  const [showModal, setShowModal] = useState(false);
  const [selectedCourseId, setSelectedCourseId] = useState(classItem.course.id);
  const router = useRouter();

  useEffect(() => {
    if (state.error || state.success) setShowModal(true);
  }, [state.error, state.success]);

  const courseSubjects = subjects.filter((s) => s.course.id === selectedCourseId);
  const isSuccess = !!state.success;

  return (
    <>
      <FeedbackModal
        open={showModal}
        onClose={() => setShowModal(false)}
        icon={isSuccess ? <ModalSuccessIcon /> : <ModalErrorIcon />}
        title={isSuccess ? '¡Clase actualizada!' : 'No pudimos guardar los cambios'}
        titleColor={isSuccess ? 'text-[#6EC090]' : 'text-[#D86262]'}
        description={
          isSuccess
            ? <>Los datos de <span className="font-medium text-brand-brown">&quot;{state.className}&quot;</span> han sido actualizados correctamente.</>
            : <>Ocurrió un problema al procesar la solicitud.<br />{state.error}</>
        }
        actions={
          isSuccess ? (
            <div className="flex gap-3">
              <button
                onClick={() => router.push('/institution/classes')}
                className="flex-1 px-4 py-3 rounded-xl text-sm font-medium bg-[#999DA3] text-white hover:bg-[#999DA3]/90 transition-colors"
              >
                Ver clases
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
            href="/institution/classes"
            className="flex items-center gap-1.5 text-sm text-brand-label hover:text-brand-brown transition-colors w-fit"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 18 9 12 15 6" />
            </svg>
            Clases
          </Link>
        </div>

        <div className="mb-10">
          <h1 className="text-4xl text-brand">Editar clase</h1>
          <p className="text-sm text-brand-label mt-1">
            Actualizando <span className="font-medium">{classItem.name}</span>
            <span className="ml-2 font-mono text-xs bg-brand-border/50 px-1.5 py-0.5 rounded">{classItem.license_code}</span>
          </p>
        </div>

        <hr className="border-brand-border mb-10" />

        <form action={action} autoComplete="off">
          <div className="max-w-2xl flex flex-col gap-6">
            <FormField label="ID de Clase" required>
              <input
                name="name"
                type="text"
                placeholder="Ej. Clase A101"
                defaultValue={classItem.name}
                className={inputClass}
                required
                autoFocus
              />
            </FormField>

            <FormField label="Curso" required>
              <CourseSelect
                courses={courses}
                defaultCourseId={classItem.course.id}
                onSelect={setSelectedCourseId}
              />
            </FormField>

            <FormField label="Turno" required>
              <PeriodSelect defaultValue={classItem.period} />
            </FormField>

            <div className="flex flex-col gap-3">
              <label className="text-sm font-medium text-brand-label">
                Asignaturas del curso
              </label>
              <SubjectsPreview subjects={courseSubjects} />
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <Link
                href="/institution/classes"
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
