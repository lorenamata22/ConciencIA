'use client';

import { useActionState, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createSubjectAction } from '@/app/actions/subject';
import { FormField, inputClass } from '@/components/ui/form';
import { FeedbackModal, ModalSuccessIcon, ModalErrorIcon } from '@/components/ui/feedback-modal';
import type { CourseOption } from '@/lib/api/subject';

function CourseSelect({ courses }: { courses: CourseOption[] }) {
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
                onMouseDown={() => { setSelected(c); setOpen(false); }}
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

function UploadZone({
  file,
  onChange,
}: {
  file: File | null;
  onChange: (f: File | null) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    const dropped = e.dataTransfer.files?.[0];
    if (dropped) onChange(dropped);
  }

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => inputRef.current?.click()}
      onKeyDown={(e) => e.key === 'Enter' && inputRef.current?.click()}
      onDrop={handleDrop}
      onDragOver={(e) => e.preventDefault()}
      className="w-full rounded-2xl border border-brand-border px-6 py-5 flex items-start gap-4 cursor-pointer hover:border-brand-border-focus transition-colors"
    >
      <div className="shrink-0 w-10 h-10 rounded-lg border border-brand-border flex items-center justify-center text-brand-label">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
          <polyline points="17 8 12 3 7 8" />
          <line x1="12" y1="3" x2="12" y2="15" />
        </svg>
      </div>
      <div className="flex-1 min-w-0">
        {file ? (
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-brand-brown truncate">{file.name}</span>
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); onChange(null); }}
              className="shrink-0 text-brand-placeholder hover:text-red-500 transition-colors"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>
        ) : (
          <>
            <p className="text-sm font-medium text-brand-brown">Subir programa de asignatura</p>
            <p className="text-xs text-brand-placeholder mt-0.5">
              <span className="font-medium">Haz clic</span> o arrastra tu archivo aquí
            </p>
          </>
        )}
        <hr className="border-brand-border my-3" />
        <ul className="text-xs text-brand-placeholder space-y-0.5">
          <li>• PDF o DOCX</li>
          <li>• Máximo 1MB</li>
        </ul>
      </div>
      <input
        ref={inputRef}
        type="file"
        accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        className="hidden"
        onChange={(e) => onChange(e.target.files?.[0] ?? null)}
      />
    </div>
  );
}

export function CreateSubjectForm({ courses }: { courses: CourseOption[] }) {
  const [state, action, isPending] = useActionState(createSubjectAction, { error: null });
  const [showModal, setShowModal] = useState(false);
  const [programFile, setProgramFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const router = useRouter();

  useEffect(() => {
    if (!state.error && !state.success) return;

    if (state.error) {
      setShowModal(true);
      return;
    }

    if (!state.subjectId) { setShowModal(true); return; }

    if (!programFile) { setShowModal(true); return; }

    setUploading(true);
    const fd = new FormData();
    fd.append('program', programFile);
    fetch(`/api/institution/subjects/${state.subjectId}/program`, { method: 'POST', body: fd })
      .finally(() => { setUploading(false); setShowModal(true); });
  }, [state.error, state.success, state.subjectId]);

  const isSuccess = !!state.success;
  const isBusy = isPending || uploading;

  return (
    <>
      <FeedbackModal
        open={showModal}
        onClose={() => setShowModal(false)}
        icon={isSuccess ? <ModalSuccessIcon /> : <ModalErrorIcon />}
        title={isSuccess ? '¡Asignatura registrada!' : 'No pudimos registrar la asignatura'}
        titleColor={isSuccess ? 'text-[#6EC090]' : 'text-[#D86262]'}
        description={
          isSuccess
            ? <>La asignatura <span className="font-medium text-brand-brown">&quot;{state.subjectName}&quot;</span> ha sido creada correctamente.</>
            : <>Ocurrió un problema al procesar la solicitud.<br />{state.error}</>
        }
        actions={
          isSuccess ? (
            <div className="flex gap-3">
              <button
                onClick={() => { setShowModal(false); setProgramFile(null); router.refresh(); }}
                className="flex-1 px-4 py-3 rounded-xl text-sm font-medium border border-brand-border hover:bg-brand-border/30 transition-colors"
              >
                Registrar otra
              </button>
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
            Home
          </Link>
        </div>

        <div className="mb-10">
          <h1 className="text-4xl text-brand">Nueva Asignatura</h1>
          <p className="text-sm text-brand-label mt-1">
            Crea y administra asignaturas dentro de la plataforma de la institución.
          </p>
        </div>

        <form action={action} autoComplete="off">
          <div className="max-w-2xl flex flex-col gap-6">
            <FormField label="Nombre" required>
              <input
                name="name"
                type="text"
                placeholder="Ej. Matemáticas"
                className={inputClass}
                required
                autoFocus
              />
            </FormField>

            <FormField label="Curso" required>
              <CourseSelect courses={courses} />
            </FormField>

            <UploadZone file={programFile} onChange={setProgramFile} />

            <div className="flex justify-end pt-4">
              <button
                type="submit"
                disabled={isBusy}
                className="flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-medium bg-[#999DA3] text-white hover:bg-[#999DA3]/90 cursor-pointer transition-colors disabled:opacity-60"
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
                </svg>
                {isBusy ? (uploading ? 'Subiendo archivo...' : 'Registrando...') : 'Registrar asignatura'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </>
  );
}
