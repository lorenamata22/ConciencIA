'use client';

import { useActionState, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { updateSubjectAction } from '@/app/actions/subject';
import { FormField, inputClass } from '@/components/ui/form';
import { FeedbackModal, ModalSuccessIcon, ModalErrorIcon } from '@/components/ui/feedback-modal';
import type { SubjectItem, CourseOption, SubjectFile } from '@/lib/api/subject';

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

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function ProgramSection({
  currentFile,
  newFile,
  onChange,
}: {
  currentFile: SubjectFile | null;
  newFile: File | null;
  onChange: (f: File | null) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [replacing, setReplacing] = useState(false);

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    const dropped = e.dataTransfer.files?.[0];
    if (dropped) { onChange(dropped); setReplacing(false); }
  }

  // New file selected — show it regardless
  if (newFile) {
    return (
      <div className="w-full rounded-2xl border border-brand-border-focus px-6 py-5 flex items-start gap-4">
        <div className="shrink-0 w-10 h-10 rounded-lg border border-brand-border flex items-center justify-center text-brand-label">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <polyline points="14 2 14 8 20 8" />
          </svg>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-brand-brown truncate">{newFile.name}</p>
          <p className="text-xs text-brand-placeholder mt-0.5">{formatBytes(newFile.size)} · Nuevo archivo</p>
        </div>
        <button
          type="button"
          onClick={() => onChange(null)}
          className="shrink-0 text-brand-placeholder hover:text-red-500 transition-colors mt-0.5"
          title="Quitar archivo"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
        <input ref={inputRef} type="file" accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document" className="hidden" onChange={(e) => onChange(e.target.files?.[0] ?? null)} />
      </div>
    );
  }

  // Current file saved, not replacing
  if (currentFile && !replacing) {
    return (
      <div className="w-full rounded-2xl border border-brand-border px-6 py-5 flex items-start gap-4">
        <div className="shrink-0 w-10 h-10 rounded-lg border border-brand-border flex items-center justify-center text-brand-label">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <polyline points="14 2 14 8 20 8" />
          </svg>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs text-brand-placeholder mb-0.5">Archivo actual</p>
          <p className="text-sm font-medium text-brand-brown truncate">{currentFile.name}</p>
          <p className="text-xs text-brand-placeholder mt-0.5">{formatBytes(currentFile.size)}</p>
        </div>
        <button
          type="button"
          onClick={() => setReplacing(true)}
          className="shrink-0 px-3 py-1.5 rounded-lg border border-brand-border text-xs text-brand-label hover:bg-brand-border/30 transition-colors mt-0.5"
        >
          Cambiar
        </button>
      </div>
    );
  }

  // No current file, or user clicked "Cambiar" — show upload zone
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
        <p className="text-sm font-medium text-brand-brown">
          {replacing ? 'Seleccionar nuevo archivo' : 'Subir programa de asignatura'}
        </p>
        <p className="text-xs text-brand-placeholder mt-0.5">
          <span className="font-medium">Haz clic</span> o arrastra tu archivo aquí
        </p>
        <hr className="border-brand-border my-3" />
        <ul className="text-xs text-brand-placeholder space-y-0.5">
          <li>• PDF o DOCX</li>
          <li>• Máximo 5MB</li>
        </ul>
      </div>
      {replacing && (
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); setReplacing(false); }}
          className="shrink-0 text-brand-placeholder hover:text-brand-brown transition-colors mt-0.5"
          title="Cancelar"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      )}
      <input
        ref={inputRef}
        type="file"
        accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        className="hidden"
        onChange={(e) => { onChange(e.target.files?.[0] ?? null); setReplacing(false); }}
      />
    </div>
  );
}

export function EditSubjectForm({
  subject,
  courses,
}: {
  subject: SubjectItem;
  courses: CourseOption[];
}) {
  const boundAction = updateSubjectAction.bind(null, subject.id);
  const [state, action, isPending] = useActionState(boundAction, { error: null });
  const [showModal, setShowModal] = useState(false);
  const [newFile, setNewFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const router = useRouter();

  const currentFile = subject.files?.[0] ?? null;

  useEffect(() => {
    if (!state.error && !state.success) return;

    if (state.error) { setShowModal(true); return; }

    // Upload do novo arquivo, se selecionado
    if (newFile && state.subjectId) {
      setUploading(true);
      const fd = new FormData();
      fd.append('program', newFile);
      fetch(`/api/institution/subjects/${state.subjectId}/program`, { method: 'POST', body: fd })
        .finally(() => { setUploading(false); setShowModal(true); });
    } else {
      setShowModal(true);
    }
  }, [state.error, state.success, state.subjectId]);

  const isSuccess = !!state.success;
  const isBusy = isPending || uploading;

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

            <FormField label="Programa de asignatura">
              <ProgramSection
                currentFile={currentFile}
                newFile={newFile}
                onChange={setNewFile}
              />
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
                {isBusy ? (uploading ? 'Subiendo archivo...' : 'Guardando...') : 'Guardar cambios'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </>
  );
}
