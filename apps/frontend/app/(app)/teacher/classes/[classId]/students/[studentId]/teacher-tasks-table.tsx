'use client';

import { useState, useMemo } from 'react';

// Módulo de tarefas ainda não implementado no backend — tipo local até existir uma API real
export interface TeacherStudentTask {
  id: string;
  subjectId: string;
  title: string;
  grade: number | null;
}

export function TeacherTasksTable({
  subjects,
  tasks,
}: {
  subjects: { id: string; name: string }[];
  tasks: TeacherStudentTask[];
}) {
  const [subjectFilter, setSubjectFilter] = useState<string>('all');

  const filtered = useMemo(
    () => (subjectFilter === 'all' ? tasks : tasks.filter((t) => t.subjectId === subjectFilter)),
    [tasks, subjectFilter],
  );

  return (
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
                <tr key={task.id}>
                  <td className="pl-6 pr-4 py-4 border-t border-brand-border max-w-0">
                    <span className="block truncate text-sm text-brand-brown">{task.title}</span>
                  </td>
                  <td className="px-4 py-4 border-t border-brand-border">
                    <span className="text-sm text-brand-label">{task.grade ?? '—'}</span>
                  </td>
                  <td className="pl-4 pr-6 py-4 border-t border-brand-border">
                    <button
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
  );
}
