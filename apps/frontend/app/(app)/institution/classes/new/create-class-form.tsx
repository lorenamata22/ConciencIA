'use client';

import { useActionState, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClassAction } from '@/app/actions/class';
import { FormField, inputClass } from '@/components/ui/form';
import { PeriodEditorModal } from '@/components/ui/period-editor-modal';
import type { CourseOption, SubjectItem } from '@/lib/api/subject';

function AccessCodeCard({ code }: { code: string }) {
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
        Comparte este código con los estudiantes para que puedan registrarse en esta clase.
      </p>
    </div>
  );
}

function CourseSelect({
  courses,
  onSelect,
}: {
  courses: CourseOption[];
  onSelect: (courseId: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<CourseOption | null>(null);
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
        } ${selected ? 'text-brand-brown' : 'text-brand-placeholder'}`}
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
          {courses.length === 0 ? (
            <li className="px-4 py-2.5 text-sm text-brand-placeholder">No hay cursos registrados.</li>
          ) : (
            courses.map((c) => (
              <li
                key={c.id}
                onMouseDown={() => handleSelect(c)}
                className={`px-4 py-2.5 text-sm cursor-pointer transition-colors hover:bg-brand-border/30 ${
                  selected?.id === c.id ? 'font-medium text-brand-brown' : 'text-brand-brown'
                }`}
              >
                {c.name}
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  );
}

function PeriodSelect({ options }: { options: string[] }) {
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState('');
  const ref = useRef<HTMLDivElement>(null);

  // Se a opção selecionada for removida pelo editor, limpa a seleção
  useEffect(() => {
    if (selected && !options.includes(selected)) setSelected('');
  }, [options, selected]);

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
        } ${selected ? 'text-brand-brown' : 'text-brand-placeholder'}`}
      >
        <span className="truncate">{selected || 'Seleccionar turno'}</span>
        <span className={`shrink-0 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </span>
      </button>
      {open && (
        <ul className="absolute z-50 w-full rounded-xl border border-brand-border bg-brand-bg shadow-lg top-full mt-1 max-h-56 overflow-y-auto">
          {options.length === 0 ? (
            <li className="px-4 py-2.5 text-sm text-brand-placeholder">No hay turnos configurados.</li>
          ) : (
            options.map((opt) => (
              <li
                key={opt}
                onMouseDown={() => { setSelected(opt); setOpen(false); }}
                className={`px-4 py-2.5 text-sm cursor-pointer transition-colors hover:bg-brand-border/30 ${
                  selected === opt ? 'font-medium text-brand-brown' : 'text-brand-brown'
                }`}
              >
                {opt}
              </li>
            ))
          )}
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

export function CreateClassForm({
  courses,
  subjects,
  initialPeriodOptions,
}: {
  courses: CourseOption[];
  subjects: SubjectItem[];
  initialPeriodOptions: string[];
}) {
  const [state, action, isPending] = useActionState(createClassAction, { error: null });
  const [view, setView] = useState<'form' | 'success'>('form');
  const [formKey, setFormKey] = useState(0);
  const [showPeriodEditor, setShowPeriodEditor] = useState(false);
  const [periodOptions, setPeriodOptions] = useState(initialPeriodOptions);
  const [selectedCourseId, setSelectedCourseId] = useState('');
  const router = useRouter();

  // O state muda de referência a cada submit; reagimos ao resultado da action
  useEffect(() => {
    if (state.success) setView('success');
    else if (state.error) setView('form');
  }, [state]);

  const courseSubjects = selectedCourseId
    ? subjects.filter((s) => s.course.id === selectedCourseId)
    : [];

  function handleRegisterAnother() {
    setView('form');
    setSelectedCourseId('');
    setFormKey((k) => k + 1); // remonta o form para limpar os campos e selects internos
    router.refresh();
  }

  if (view === 'success') {
    return (
      <div className="pt-10 px-10 md:px-30 pb-16">
        <div className="mt-15 mb-10">
          <Link
            href="/institution/classes"
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
            Registro de la<br />clase completado
          </h1>

          <hr className="border-brand-border mb-5" />

          <p className="text-sm text-brand-label mb-2">
            La clase <span className="font-medium text-brand-brown">&quot;{state.className}&quot;</span> se ha registrado correctamente.
          </p>
          <p className="text-sm text-brand-brown mb-6">
            Hemos generado un código único de licencia para que los<br />
            estudiantes puedan registrarse y vincularse a esta clase.
          </p>

          {state.licenseCode && <AccessCodeCard code={state.licenseCode} />}

          <div className="flex gap-3 mt-8">
            <button
              type="button"
              onClick={() => router.push('/institution/classes')}
              className="flex-1 px-4 py-3 rounded-xl text-sm font-medium border border-brand-border text-brand-brown hover:bg-brand-border/30 transition-colors"
            >
              Ver clases
            </button>
            <button
              type="button"
              onClick={handleRegisterAnother}
              className="flex-1 px-4 py-3 rounded-xl text-sm font-medium border border-brand-border text-brand-brown hover:bg-brand-border/30 transition-colors"
            >
              Registrar otra clase
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <PeriodEditorModal
        open={showPeriodEditor}
        onClose={() => setShowPeriodEditor(false)}
        options={periodOptions}
        onSave={setPeriodOptions}
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
            Home
          </Link>
        </div>

        <div className="mb-10">
          <h1 className="text-4xl text-brand">Nueva clase</h1>
          <p className="text-sm text-brand-label mt-1">
            Crea y administra clases dentro de la plataforma de la institución.
          </p>
        </div>

        <form key={formKey} action={action} autoComplete="off">
          <div className="max-w-2xl flex flex-col gap-6">
            <FormField label="ID de Clase" required>
              <input
                name="name"
                type="text"
                placeholder="Ej. Clase A101"
                className={inputClass}
                required
                autoFocus
              />
            </FormField>

            <FormField label="Curso" required>
              <CourseSelect courses={courses} onSelect={setSelectedCourseId} />
            </FormField>

            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-brand-label">
                  Turno<span className="ml-0.5">*</span>
                </label>
                <button
                  type="button"
                  onClick={() => setShowPeriodEditor(true)}
                  className="flex items-center gap-1 text-xs text-brand-label hover:text-brand-brown transition-colors"
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                  </svg>
                  Editar
                </button>
              </div>
              <PeriodSelect options={periodOptions} />
            </div>

            {selectedCourseId && (
              <div className="flex flex-col gap-3">
                <label className="text-sm font-medium text-brand-label">
                  Asignaturas del curso
                </label>
                <SubjectsPreview subjects={courseSubjects} />
              </div>
            )}

            {state.error && (
              <p className="text-sm text-red-500">{state.error}</p>
            )}

            <div className="flex justify-end pt-4">
              <button
                type="submit"
                disabled={isPending}
                className="flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-medium bg-[#999DA3] text-white hover:bg-[#999DA3]/90 cursor-pointer transition-colors disabled:opacity-60"
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
                </svg>
                {isPending ? 'Registrando...' : 'Registrar clase'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </>
  );
}
