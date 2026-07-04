'use client';

import { useState, useMemo, useTransition } from 'react';
import Link from 'next/link';
import type { TaskListItem, TaskOption } from '@/lib/api/task';
import { FeedbackModal, ModalErrorIcon, ModalWarningIcon } from '@/components/ui/feedback-modal';

type ModalState =
  | { phase: 'idle' }
  | { phase: 'confirm'; taskId: string; taskName: string }
  | { phase: 'deleting'; taskId: string; taskName: string }
  | { phase: 'error' };

export function TasksList({
  tasks: initialTasks,
  subjects,
}: {
  tasks: TaskListItem[];
  subjects: TaskOption[];
}) {
  const [tasks, setTasks] = useState(initialTasks);
  const [search, setSearch] = useState('');
  const [subjectFilter, setSubjectFilter] = useState<string>('all');
  const [modal, setModal] = useState<ModalState>({ phase: 'idle' });
  const [, startTransition] = useTransition();

  // Se o professor leciona uma única matéria, o filtro vira apenas o rótulo dela
  const singleSubject = subjects.length === 1 ? subjects[0] : null;

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return tasks.filter((t) => {
      const matchesSubject = subjectFilter === 'all' || t.subject.id === subjectFilter;
      const matchesSearch = t.name.toLowerCase().includes(q);
      return matchesSubject && matchesSearch;
    });
  }, [tasks, search, subjectFilter]);

  function requestDelete(task: TaskListItem) {
    setModal({ phase: 'confirm', taskId: task.id, taskName: task.name });
  }

  function confirmDelete() {
    if (modal.phase !== 'confirm') return;
    const { taskId, taskName } = modal;
    setModal({ phase: 'deleting', taskId, taskName });
    startTransition(async () => {
      try {
        const res = await fetch(`/api/teacher/tasks/${taskId}`, { method: 'DELETE' });
        if (!res.ok) throw new Error();
        setTasks((prev) => prev.filter((t) => t.id !== taskId));
        setModal({ phase: 'idle' });
      } catch {
        setModal({ phase: 'error' });
      }
    });
  }

  const isDeleting = modal.phase === 'deleting';
  const isError = modal.phase === 'error';
  const taskName =
    modal.phase === 'confirm' || modal.phase === 'deleting' ? modal.taskName : '';

  return (
    <>
      <FeedbackModal
        open={modal.phase !== 'idle'}
        onClose={() => setModal({ phase: 'idle' })}
        closeDisabled={isDeleting}
        icon={isError ? <ModalErrorIcon /> : <ModalWarningIcon />}
        title={isError ? 'No se pudo eliminar la tarea' : '¿Eliminar tarea?'}
        titleColor="text-[#D86262]"
        description={
          isError ? (
            <>Ocurrió un problema al procesar la solicitud.<br />Por favor, inténtalo nuevamente.</>
          ) : (
            <>Estás a punto de eliminar <span className="font-medium text-brand-brown">{taskName}</span>.<br />Se eliminarán también las calificaciones asociadas. Esta acción es irreversible.</>
          )
        }
        actions={
          isError ? (
            <div className="flex justify-center">
              <button
                onClick={() => setModal({ phase: 'idle' })}
                className="px-4 py-3 rounded-xl text-sm font-medium bg-[#999DA3] text-white transition-colors"
              >
                Cerrar
              </button>
            </div>
          ) : (
            <div className="flex gap-3">
              <button
                onClick={() => setModal({ phase: 'idle' })}
                disabled={isDeleting}
                className="flex-1 px-4 py-3 rounded-xl text-sm font-medium border border-brand-border hover:bg-brand-border/30 transition-colors disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                onClick={confirmDelete}
                disabled={isDeleting}
                className="flex-1 px-4 py-3 rounded-xl text-sm font-medium bg-red-500 text-white hover:bg-red-600 transition-colors disabled:opacity-60"
              >
                {isDeleting ? 'Eliminando...' : 'Sí, eliminar'}
              </button>
            </div>
          )
        }
      />

      <div className="rounded-2xl px-10 card-shadow overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-4 px-6 py-5">
          <span className="text-sm font-semibold text-brand-brown">Tareas registradas</span>
          <div className="relative w-72">
            <div className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-brand-placeholder">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
            </div>
            <input
              type="text"
              placeholder="Buscar tarea..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-xl border border-brand-border pl-9 pr-4 py-2.5 text-sm text-brand-brown placeholder:text-brand-placeholder focus:outline-none focus:border-brand-border-focus transition-colors"
            />
          </div>
        </div>

        {/* Filtro por asignatura — só quando o professor tem mais de una */}
        {singleSubject ? (
          <div className="px-6 pb-4">
            <span className="inline-flex items-center px-3.5 py-1.5 rounded-full text-xs font-medium border border-primary bg-primary/30 text-primary">
              {singleSubject.name}
            </span>
          </div>
        ) : subjects.length > 1 ? (
          <div className="flex flex-wrap items-center gap-2 px-6 pb-4">
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
        ) : null}

        <div className="overflow-x-auto">
          <table className="w-full table-fixed min-w-[640px]">
            <thead>
              <tr>
                <th scope="col" className="pl-6 pr-4 pt-3 pb-8 text-xs font-semibold text-brand-label tracking-wide uppercase text-left w-2/5">Nombre</th>
                <th scope="col" className="px-4 pt-3 pb-8 text-xs font-semibold text-brand-label tracking-wide uppercase text-left">Clases asignadas</th>
                <th scope="col" className="pl-4 pr-6 pt-3 pb-8 text-xs font-semibold text-brand-label tracking-wide uppercase text-left w-28">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={3} className="px-6 py-12 text-center text-sm text-brand-placeholder border-t border-brand-border">
                    {search || subjectFilter !== 'all'
                      ? 'Ninguna tarea coincide con el filtro.'
                      : 'No hay tareas registradas todavía.'}
                  </td>
                </tr>
              ) : (
                filtered.map((task) => (
                  <tr key={task.id}>
                    <td className="pl-6 pr-4 py-4 border-t border-brand-border max-w-0">
                      <span className="block truncate text-sm font-medium text-brand-brown">{task.name}</span>
                    </td>
                    <td className="px-4 py-4 border-t border-brand-border">
                      <div className="flex flex-wrap items-center gap-2">
                        {task.classes.length === 0 ? (
                          <span className="text-sm text-brand-placeholder">—</span>
                        ) : (
                          task.classes.map((c) => (
                            <span
                              key={c.id}
                              className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium border border-primary text-primary"
                            >
                              {c.name}
                            </span>
                          ))
                        )}
                      </div>
                    </td>
                    <td className="pl-4 pr-6 py-4 border-t border-brand-border">
                      <div className="flex items-center gap-2">
                        <Link
                          href={`/teacher/tasks/${task.id}/edit`}
                          className="w-8 h-8 flex items-center justify-center rounded-lg border border-brand-border text-brand-label hover:bg-brand-border/30 transition-colors"
                          title="Editar tarea"
                        >
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                          </svg>
                        </Link>
                        <button
                          onClick={() => requestDelete(task)}
                          className="w-8 h-8 flex items-center justify-center rounded-lg border border-red-300 text-red-500 hover:bg-red-50 transition-colors"
                          title="Eliminar tarea"
                        >
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                          </svg>
                        </button>
                      </div>
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
