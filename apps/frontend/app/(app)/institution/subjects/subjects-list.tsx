'use client';

import { useState, useMemo, useTransition } from 'react';
import Link from 'next/link';
import type { SubjectItem } from '@/lib/api/subject';
import { FeedbackModal, ModalErrorIcon, ModalWarningIcon } from '@/components/ui/feedback-modal';

const PAGE_SIZE = 8;

type ModalState =
  | { phase: 'idle' }
  | { phase: 'confirm'; subjectId: string; subjectName: string }
  | { phase: 'deleting'; subjectId: string; subjectName: string }
  | { phase: 'error' };

function Pagination({ page, total, onPage }: { page: number; total: number; onPage: (p: number) => void }) {
  const pages = Math.ceil(total / PAGE_SIZE);
  if (pages <= 1) return null;

  const visible = Array.from({ length: pages }, (_, i) => i + 1).filter(
    (p) => p === 1 || p === pages || Math.abs(p - page) <= 1,
  );

  return (
    <div className="flex items-center gap-1">
      <button
        onClick={() => onPage(page - 1)}
        disabled={page === 1}
        className="w-9 h-9 flex items-center justify-center rounded-lg border border-brand-border text-brand-label hover:bg-brand-border/30 disabled:opacity-40 transition-colors"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6" /></svg>
      </button>
      {visible.map((p, i) => {
        const prev = visible[i - 1];
        return (
          <span key={p} className="flex items-center gap-1">
            {prev && p - prev > 1 && (
              <span className="w-9 h-9 flex items-center justify-center text-brand-label text-sm">…</span>
            )}
            <button
              onClick={() => onPage(p)}
              className={`w-9 h-9 rounded-lg border text-sm transition-colors ${
                p === page
                  ? 'border-brand-border-focus bg-[#999DA3] text-white font-medium'
                  : 'border-brand-border text-brand-label hover:bg-brand-border/30'
              }`}
            >
              {p}
            </button>
          </span>
        );
      })}
      <button
        onClick={() => onPage(page + 1)}
        disabled={page === pages}
        className="w-9 h-9 flex items-center justify-center rounded-lg border border-brand-border text-brand-label hover:bg-brand-border/30 disabled:opacity-40 transition-colors"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6" /></svg>
      </button>
    </div>
  );
}

export function SubjectsList({ subjects: initialSubjects }: { subjects: SubjectItem[] }) {
  const [subjects, setSubjects] = useState(initialSubjects);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [modal, setModal] = useState<ModalState>({ phase: 'idle' });
  const [, startTransition] = useTransition();

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return subjects.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        s.course.name.toLowerCase().includes(q),
    );
  }, [subjects, search]);

  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  function handleSearch(value: string) {
    setSearch(value);
    setPage(1);
  }

  function requestDelete(subject: SubjectItem) {
    setModal({ phase: 'confirm', subjectId: subject.id, subjectName: subject.name });
  }

  function confirmDelete() {
    if (modal.phase !== 'confirm') return;
    const { subjectId, subjectName } = modal;
    setModal({ phase: 'deleting', subjectId, subjectName });
    startTransition(async () => {
      try {
        const res = await fetch(`/api/institution/subjects/${subjectId}`, { method: 'DELETE' });
        if (!res.ok) throw new Error();
        setSubjects((prev) => prev.filter((s) => s.id !== subjectId));
        setModal({ phase: 'idle' });
      } catch {
        setModal({ phase: 'error' });
      }
    });
  }

  const isDeleting = modal.phase === 'deleting';
  const isError = modal.phase === 'error';
  const subjectName = modal.phase === 'confirm' || modal.phase === 'deleting' ? modal.subjectName : '';

  return (
    <>
      <FeedbackModal
        open={modal.phase !== 'idle'}
        onClose={() => setModal({ phase: 'idle' })}
        closeDisabled={isDeleting}
        icon={isError ? <ModalErrorIcon /> : <ModalWarningIcon />}
        title={isError ? 'No se pudo eliminar la asignatura' : '¿Eliminar asignatura?'}
        titleColor="text-[#D86262]"
        description={
          isError
            ? <>Ocurrió un problema al procesar la solicitud.<br />Por favor, inténtalo nuevamente.</>
            : <>Estás a punto de eliminar <span className="font-medium text-brand-brown">{subjectName}</span>.<br />Esta acción es irreversible.</>
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
        <div className="flex items-center justify-between px-6 py-5">
          <span className="text-sm font-semibold text-brand-brown">Asignaturas registradas</span>
          <div className="relative w-72">
            <div className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-brand-placeholder">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
            </div>
            <input
              type="text"
              placeholder="Buscar asignatura..."
              value={search}
              onChange={(e) => handleSearch(e.target.value)}
              className="w-full rounded-xl border border-brand-border pl-9 pr-4 py-2.5 text-sm text-brand-brown placeholder:text-brand-placeholder focus:outline-none focus:border-brand-border-focus transition-colors"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full table-fixed min-w-[640px]">
            <thead>
              <tr>
                <th scope="col" className="pl-6 pr-4 pt-3 pb-8 text-xs font-semibold text-brand-label tracking-wide uppercase text-left">Nombre</th>
                <th scope="col" className="px-4 pt-3 pb-8 text-xs font-semibold text-brand-label tracking-wide uppercase text-left ">Curso</th>
                <th scope="col" className="pl-4 pr-6 pt-3 pb-8 text-xs font-semibold text-brand-label tracking-wide uppercase text-left ">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {paginated.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center text-sm text-brand-placeholder border-t border-brand-border">
                    {search ? 'Ninguna asignatura coincide con la búsqueda.' : 'No hay asignaturas registradas.'}
                  </td>
                </tr>
              ) : (
                paginated.map((subject) => (
                  <tr key={subject.id}>
                    <td className="pl-6 pr-4 py-4 border-t border-brand-border max-w-0">
                      <span className="block truncate text-sm font-medium text-brand-brown">{subject.name}</span>
                    </td>
                    <td className="px-4 py-4 border-t border-brand-border max-w-0">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-amber-50 text-amber-700 truncate max-w-full">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0" />
                        <span className="truncate">{subject.course.name}</span>
                      </span>
                    </td>
                    <td className="pl-4 pr-6 py-4 border-t border-brand-border">
                      <div className="flex items-center gap-2">
                        <Link
                          href={`/institution/subjects/${subject.id}/edit`}
                          className="w-8 h-8 flex items-center justify-center rounded-lg border border-brand-border text-brand-label hover:bg-brand-border/30 transition-colors"
                          title="Editar asignatura"
                        >
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                          </svg>
                        </Link>
                        <button
                          onClick={() => requestDelete(subject)}
                          className="w-8 h-8 flex items-center justify-center rounded-lg border border-red-300 text-red-500 hover:bg-red-50 transition-colors"
                          title="Eliminar asignatura"
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

        <div className="flex items-center justify-between px-6 py-4 pt-10 border-t border-brand-border">
          <span className="text-sm text-brand-label">
            Mostrando {Math.min(paginated.length, PAGE_SIZE)} de {filtered.length} asignaturas
          </span>
          <Pagination page={page} total={filtered.length} onPage={setPage} />
        </div>
      </div>
    </>
  );
}
