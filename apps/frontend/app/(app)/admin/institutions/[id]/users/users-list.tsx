'use client';

import { useState, useMemo, useTransition } from 'react';
import type { InstitutionUser } from '@/lib/api/institution';
import { deleteInstitutionUser } from '@/lib/api/institution-client';
import { FeedbackModal, ModalErrorIcon, ModalWarningIcon } from '@/components/ui/feedback-modal';

const PAGE_SIZE = 6;

const USER_TYPE_CONFIG: Record<string, { label: string; dot: string; pill: string }> = {
  student:     { label: 'Estudiante',  dot: 'bg-teal-400',   pill: 'bg-teal-50 text-teal-700'    },
  teacher:     { label: 'Profesor',    dot: 'bg-purple-300', pill: 'bg-purple-50 text-purple-600' },
  institution: { label: 'Institución', dot: 'bg-amber-400',  pill: 'bg-amber-50 text-amber-700'  },
};

type ModalState =
  | { phase: 'idle' }
  | { phase: 'confirm'; userId: string; userName: string }
  | { phase: 'deleting'; userId: string; userName: string }
  | { phase: 'error' };

function UserTypeBadge({ type }: { type: string }) {
  const config = USER_TYPE_CONFIG[type] ?? { label: type, dot: 'bg-gray-400', pill: 'bg-gray-100 text-gray-500' };
  return (
    <span className={`inline-flex justify-center items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium w-36 ${config.pill}`}>
      <span className={`w-2 h-2 rounded-full ${config.dot}`} />
      {config.label}
    </span>
  );
}

function Pagination({
  page,
  total,
  onPage,
}: {
  page: number;
  total: number;
  onPage: (p: number) => void;
}) {
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

export function UsersList({ users: initialUsers, institutionId }: { users: InstitutionUser[]; institutionId: string }) {
  const [users, setUsers] = useState(initialUsers);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [modal, setModal] = useState<ModalState>({ phase: 'idle' });
  const [, startTransition] = useTransition();

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return users.filter(
      (u) =>
        u.name.toLowerCase().includes(q) ||
        (u.email ?? '').toLowerCase().includes(q),
    );
  }, [users, search]);

  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  function handleSearch(value: string) {
    setSearch(value);
    setPage(1);
  }

  function requestDelete(user: InstitutionUser) {
    setModal({ phase: 'confirm', userId: user.id, userName: user.name });
  }

  function confirmDelete() {
    if (modal.phase !== 'confirm') return;
    const { userId, userName } = modal;
    setModal({ phase: 'deleting', userId, userName });
    startTransition(async () => {
      try {
        await deleteInstitutionUser(institutionId, userId);
        setUsers((prev) => prev.filter((u) => u.id !== userId));
        setModal({ phase: 'idle' });
      } catch {
        setModal({ phase: 'error' });
      }
    });
  }

  const isDeleting = modal.phase === 'deleting';
  const isError = modal.phase === 'error';
  const userName = modal.phase === 'confirm' || modal.phase === 'deleting' ? modal.userName : '';

  return (
    <>
      <FeedbackModal
        open={modal.phase !== 'idle'}
        onClose={() => setModal({ phase: 'idle' })}
        closeDisabled={isDeleting}
        icon={isError ? <ModalErrorIcon /> : <ModalWarningIcon />}
        title={isError ? 'No se pudo eliminar el usuario' : '¿Eliminar usuario?'}
        titleColor="text-[#D86262]"
        description={
          isError
            ? <>Ocurrió un problema al procesar la solicitud.<br />Por favor, inténtalo nuevamente.</>
            : <>Estás a punto de eliminar a <span className="font-medium text-brand-brown">{userName}</span>.<br />Esta acción es irreversible.</>
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

        {/* Toolbar da tabela */}
        <div className="flex items-center justify-between px-6 py-5">
          <span className="text-sm font-semibold text-brand-brown">Usuarios registrados</span>
          <div className="relative w-72">
            <div className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-brand-placeholder">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
            </div>
            <input
              type="text"
              placeholder="Buscar usuario..."
              value={search}
              onChange={(e) => handleSearch(e.target.value)}
              className="w-full rounded-xl border border-brand-border pl-9 pr-4 py-2.5 text-sm text-brand-brown placeholder:text-brand-placeholder focus:outline-none focus:border-brand-border-focus transition-colors"
            />
          </div>
        </div>

        {/* Tabela */}
        <div className="overflow-x-auto">
          <table className="w-full table-fixed min-w-[640px]">
            <thead>
              <tr>
                <th scope="col" className="pl-6 pr-4 pt-3 pb-8 text-xs font-semibold text-brand-label tracking-wide uppercase text-left">Nombre</th>
                <th scope="col" className="px-4 pt-3 pb-8 text-xs font-semibold text-brand-label tracking-wide uppercase text-left">Correo electrónico</th>
                <th scope="col" className="px-4 pt-3 pb-8 text-xs font-semibold text-brand-label tracking-wide uppercase text-left">Función</th>
                <th scope="col" className="pl-4 pr-6 pt-3 pb-8 text-xs font-semibold text-brand-label tracking-wide uppercase text-left">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {paginated.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center text-sm text-brand-placeholder border-t border-brand-border">
                    {search ? 'Ningún usuario coincide con la búsqueda.' : 'No hay usuarios registrados.'}
                  </td>
                </tr>
              ) : (
                paginated.map((user) => (
                  <tr key={user.id}>
                    <td className="pl-6 pr-4 py-4 border-t border-brand-border max-w-0">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="block truncate text-sm font-medium text-brand-brown">{user.name}</span>
                        {user.is_minor && (
                          <span className="shrink-0 text-xs bg-orange-100 text-orange-600 px-1.5 py-0.5 rounded-md font-medium">Menor</span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-4 border-t border-brand-border max-w-0">
                      <span className="block truncate text-sm text-brand-label">{user.email ?? '—'}</span>
                    </td>
                    <td className="px-4 py-4 border-t border-brand-border">
                      <UserTypeBadge type={user.user_type} />
                    </td>
                    <td className="pl-4 pr-6 py-4 border-t border-brand-border">
                      <button
                        onClick={() => requestDelete(user)}
                        className="w-8 h-8 flex items-center justify-center rounded-lg border border-red-300 text-red-500 hover:bg-red-50 transition-colors"
                        title="Eliminar usuario"
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                        </svg>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 pt-10 border-t border-brand-border">
          <span className="text-sm text-brand-label">
            Mostrando {Math.min(paginated.length, PAGE_SIZE)} de {filtered.length} usuarios
          </span>
          <Pagination page={page} total={filtered.length} onPage={setPage} />
        </div>
      </div>
    </>
  );
}
