'use client';

import { useState, useMemo, useTransition } from 'react';
import type { StudentTaskGrade } from '@/lib/api/task';

// Exibe sempre com uma casa decimal (ex. "9.5"); "—" quando ainda não há nota
function formatGrade(value: string | null): string {
  if (value === null || value === '') return '—';
  const num = Number(value);
  return Number.isNaN(num) ? value : num.toFixed(1);
}

type EditState =
  | { phase: 'idle' }
  | { phase: 'editing'; taskId: string; title: string; value: string }
  | { phase: 'saving'; taskId: string; title: string; value: string }
  | { phase: 'error'; taskId: string; title: string; value: string; message: string };

export function TeacherTasksTable({
  subjects,
  grades: initialGrades,
  classId,
  studentId,
}: {
  subjects: { id: string; name: string }[];
  grades: StudentTaskGrade[];
  classId: string;
  studentId: string;
}) {
  const [grades, setGrades] = useState(initialGrades);
  const [subjectFilter, setSubjectFilter] = useState<string>('all');
  const [edit, setEdit] = useState<EditState>({ phase: 'idle' });
  const [, startTransition] = useTransition();

  const filtered = useMemo(
    () =>
      subjectFilter === 'all'
        ? grades
        : grades.filter((g) => g.subjectId === subjectFilter),
    [grades, subjectFilter],
  );

  function openEdit(g: StudentTaskGrade) {
    setEdit({ phase: 'editing', taskId: g.taskId, title: g.title, value: g.grade ?? '' });
  }

  function save() {
    if (edit.phase !== 'editing') return;
    const { taskId, title, value } = edit;
    setEdit({ phase: 'saving', taskId, title, value });
    startTransition(async () => {
      try {
        const res = await fetch(
          `/api/teacher/tasks/${taskId}/students/${studentId}/grade`,
          {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ value }),
          },
        );
        const json = await res.json();
        if (!res.ok) {
          setEdit({
            phase: 'error',
            taskId,
            title,
            value,
            message: json.message ?? 'No se pudo guardar la calificación.',
          });
          return;
        }
        const saved: string = json.data?.value ?? value;
        setGrades((prev) =>
          prev.map((g) => (g.taskId === taskId ? { ...g, grade: saved } : g)),
        );
        setEdit({ phase: 'idle' });
      } catch {
        setEdit({
          phase: 'error',
          taskId,
          title,
          value,
          message: 'Ocurrió un problema al procesar la solicitud.',
        });
      }
    });
  }

  const isSaving = edit.phase === 'saving';

  return (
    <>
      {edit.phase !== 'idle' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md mx-4 px-8 py-8 relative">
            <button
              onClick={() => !isSaving && setEdit({ phase: 'idle' })}
              disabled={isSaving}
              className="absolute top-4 right-4 text-brand-label hover:text-brand-brown transition-colors disabled:opacity-40"
              aria-label="Cerrar"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>

            <h2 className="font-semibold text-lg text-brand-brown mb-1">Editar calificación</h2>
            <p className="text-sm text-brand-label mb-6">{edit.title}</p>

            <label className="text-sm font-medium text-brand-label">Calificación (0 – 10)</label>
            <input
              type="text"
              inputMode="decimal"
              autoFocus
              value={edit.value}
              onChange={(e) =>
                setEdit((prev) =>
                  prev.phase === 'idle'
                    ? prev
                    : { phase: 'editing', taskId: prev.taskId, title: prev.title, value: e.target.value },
                )
              }
              onKeyDown={(e) => {
                if (e.key === 'Enter') save();
              }}
              placeholder="Ej. 9.5"
              className="mt-1.5 w-full rounded-xl border border-brand-border px-4 py-3 text-sm text-brand-brown placeholder:text-brand-placeholder focus:outline-none focus:border-brand-border-focus transition-colors"
            />

            {edit.phase === 'error' && (
              <p className="mt-2 text-sm text-[#D86262]">{edit.message}</p>
            )}

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setEdit({ phase: 'idle' })}
                disabled={isSaving}
                className="flex-1 px-4 py-3 rounded-xl text-sm font-medium border border-brand-border hover:bg-brand-border/30 transition-colors disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                onClick={save}
                disabled={isSaving || edit.value.trim() === ''}
                className="flex-1 px-4 py-3 rounded-xl text-sm font-medium bg-primary hover:bg-primary-hover text-primary-text transition-colors disabled:opacity-60"
              >
                {isSaving ? 'Guardando...' : 'Guardar'}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="rounded-2xl px-10 card-shadow overflow-hidden">
        <div className="flex items-center justify-between px-6 py-5">
          <span className="text-sm font-semibold text-brand-brown">Tareas</span>
          {subjects.length > 1 && (
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() => setSubjectFilter('all')}
                className={`px-3.5 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                  subjectFilter === 'all'
                    ? 'bg-primary/30 text-primary border-primary'
                    : 'border-brand-border text-brand-label hover:bg-brand-border/30'
                }`}
              >
                Todas
              </button>
              {subjects.map((s) => (
                <button
                  key={s.id}
                  onClick={() => setSubjectFilter(s.id)}
                  className={`px-3.5 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                    subjectFilter === s.id
                      ? 'bg-primary/30 text-primary border-primary'
                      : 'border-brand-border text-brand-label hover:bg-brand-border/30'
                  }`}
                >
                  {s.name}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full table-fixed min-w-[560px]">
            <thead>
              <tr>
                <th scope="col" className="pl-6 pr-4 pt-3 pb-8 text-xs font-semibold text-brand-label tracking-wide uppercase text-left">Tareas</th>
                <th scope="col" className="px-4 pt-3 pb-8 text-xs font-semibold text-brand-label tracking-wide uppercase text-left">Calificación</th>
                <th scope="col" className="pl-4 pr-6 pt-3 pb-8 text-xs font-semibold text-brand-label tracking-wide uppercase text-left">Editar</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={3} className="px-6 py-12 text-center text-sm text-brand-placeholder border-t border-brand-border">
                    No hay tareas registradas todavía.
                  </td>
                </tr>
              ) : (
                filtered.map((task) => (
                  <tr key={task.taskId}>
                    <td className="pl-6 pr-4 py-4 border-t border-brand-border max-w-0">
                      <span className="block truncate text-sm text-brand-brown">{task.title}</span>
                    </td>
                    <td className="px-4 py-4 border-t border-brand-border">
                      <span className="text-sm text-brand-label">{formatGrade(task.grade)}</span>
                    </td>
                    <td className="pl-4 pr-6 py-4 border-t border-brand-border">
                      <button
                        onClick={() => openEdit(task)}
                        className="w-8 h-8 flex items-center justify-center rounded-lg border border-brand-border text-brand-label hover:bg-brand-border/30 transition-colors"
                        title="Editar calificación"
                      >
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                          <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                        </svg>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
