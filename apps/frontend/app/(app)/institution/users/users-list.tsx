'use client';

import { useState, useMemo, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import type { InstitutionUser } from '@/lib/api/institution';
import { FeedbackModal, ModalErrorIcon, ModalSuccessIcon, ModalWarningIcon } from '@/components/ui/feedback-modal';

const PAGE_SIZE = 8;

const USER_TYPE_CONFIG: Record<string, { label: string; dot: string; pill: string }> = {
  student:     { label: 'Estudiante',  dot: 'bg-teal-400',   pill: 'bg-teal-50 text-teal-700'    },
  teacher:     { label: 'Profesor',    dot: 'bg-purple-300', pill: 'bg-purple-50 text-purple-600' },
  institution: { label: 'Institución', dot: 'bg-amber-400',  pill: 'bg-amber-50 text-amber-700'  },
};

type ModalState =
  | { phase: 'idle' }
  | { phase: 'select-type' }
  | { phase: 'confirm'; userId: string; userName: string }
  | { phase: 'deleting'; userId: string; userName: string }
  | { phase: 'error' }
  | { phase: 'email-sent'; userName: string }
  | { phase: 'confirm-regenerate'; userId: string; userName: string; userType: string }
  | { phase: 'regenerated'; code: string; userName: string }
  | { phase: 'action-error'; message: string };

// Endpoints de acesso são separados por tipo de usuário
function accessBasePath(userType: string, userId: string) {
  const resource = userType === 'teacher' ? 'teachers' : 'students';
  return `/api/institution/${resource}/${userId}`;
}

function UserTypeBadge({ type }: { type: string }) {
  const config = USER_TYPE_CONFIG[type] ?? { label: type, dot: 'bg-gray-400', pill: 'bg-gray-100 text-gray-500' };
  return (
    <span className={`inline-flex justify-center items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium w-36 ${config.pill}`}>
      <span className={`w-2 h-2 rounded-full ${config.dot}`} />
      {config.label}
    </span>
  );
}

function CopyCodeBox({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);

  function handleCopy() {
    navigator.clipboard.writeText(code).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <span className="inline-flex items-center gap-3 rounded-xl border border-brand-border px-4 py-2.5">
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
    </span>
  );
}

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

function SelectTypeModal({ onClose }: { onClose: () => void }) {
  const router = useRouter();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md mx-4 px-10 py-10 relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-brand-label hover:text-brand-brown transition-colors"
          aria-label="Cerrar"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>

        <h2 className="text-xl font-semibold text-brand-brown mb-1">Nuevo usuario</h2>
        <p className="text-sm text-brand-label mb-8">
          Selecciona el tipo de usuario que deseas registrar.
        </p>

        <div className="flex flex-col gap-3">
          <button
            onClick={() => router.push('/institution/users/new/teacher')}
            className="flex items-center gap-4 px-5 py-4 rounded-xl border border-brand-border hover:border-brand-border-focus hover:bg-brand-border/10 transition-colors text-left group"
          >
            <div className="w-10 h-10 rounded-lg bg-purple-50 flex items-center justify-center shrink-0 group-hover:bg-purple-100 transition-colors">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#9B86BD" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                <path d="M16 3.13a4 4 0 0 1 0 7.75" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-semibold text-brand-brown">Profesor</p>
              <p className="text-xs text-brand-label mt-0.5">Docente con acceso a clases y asignaturas</p>
            </div>
            <svg className="ml-auto shrink-0 text-brand-label" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </button>

          <button
            onClick={() => router.push('/institution/users/new/student')}
            className="flex items-center gap-4 px-5 py-4 rounded-xl border border-brand-border hover:border-brand-border-focus hover:bg-brand-border/10 transition-colors text-left group"
          >
            <div className="w-10 h-10 rounded-lg bg-teal-50 flex items-center justify-center shrink-0 group-hover:bg-teal-100 transition-colors">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#6DBCB4" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                <circle cx="12" cy="7" r="4" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-semibold text-brand-brown">Estudiante</p>
              <p className="text-xs text-brand-label mt-0.5">Accede a clases y asignaturas asignadas</p>
            </div>
            <svg className="ml-auto shrink-0 text-brand-label" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}

export function InstitutionUsersList({
  users: initialUsers,
  showCreateButton = true,
}: {
  users: InstitutionUser[];
  showCreateButton?: boolean;
}) {
  const router = useRouter();
  const [users, setUsers] = useState(initialUsers);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [modal, setModal] = useState<ModalState>({ phase: 'idle' });
  const [actionBusy, setActionBusy] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return users.filter(
      (u) => u.name.toLowerCase().includes(q) || (u.email ?? '').toLowerCase().includes(q),
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

  function handleEdit(user: InstitutionUser) {
    if (user.user_type === 'teacher' || user.user_type === 'student') {
      router.push(`/institution/users/${user.id}/edit`);
    }
  }

  async function handleSendAccessEmail(user: InstitutionUser) {
    setActionBusy(user.id);
    try {
      const res = await fetch(`${accessBasePath(user.user_type, user.id)}/send-access-email`, {
        method: 'POST',
      });
      const json = await res.json();
      if (!res.ok) {
        setModal({ phase: 'action-error', message: json.message ?? 'No se pudo enviar el correo.' });
        return;
      }
      setModal({ phase: 'email-sent', userName: user.name });
    } catch {
      setModal({ phase: 'action-error', message: 'No se pudo enviar el correo. Inténtalo de nuevo.' });
    } finally {
      setActionBusy(null);
    }
  }

  async function confirmRegenerate() {
    if (modal.phase !== 'confirm-regenerate') return;
    const { userId, userName, userType } = modal;
    setActionBusy(userId);
    try {
      const res = await fetch(`${accessBasePath(userType, userId)}/regenerate-access-code`, {
        method: 'POST',
      });
      const json = await res.json();
      if (!res.ok) {
        setModal({ phase: 'action-error', message: json.message ?? 'No se pudo regenerar el código.' });
        return;
      }
      setModal({ phase: 'regenerated', code: json.data.accessCode, userName });
    } catch {
      setModal({ phase: 'action-error', message: 'No se pudo regenerar el código. Inténtalo de nuevo.' });
    } finally {
      setActionBusy(null);
    }
  }

  function confirmDelete() {
    if (modal.phase !== 'confirm') return;
    const { userId, userName } = modal;
    setModal({ phase: 'deleting', userId, userName });
    startTransition(async () => {
      try {
        const res = await fetch(`/api/institution/users/${userId}`, { method: 'DELETE' });
        if (!res.ok) throw new Error();
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
      {modal.phase === 'select-type' && (
        <SelectTypeModal onClose={() => setModal({ phase: 'idle' })} />
      )}

      <FeedbackModal
        open={modal.phase === 'confirm' || modal.phase === 'deleting' || modal.phase === 'error'}
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

      {/* Confirmação de regeneração de código */}
      <FeedbackModal
        open={modal.phase === 'confirm-regenerate'}
        onClose={() => setModal({ phase: 'idle' })}
        closeDisabled={actionBusy !== null}
        icon={<ModalWarningIcon />}
        title="¿Regenerar código de acceso?"
        description={
          <>Se generará un nuevo código para <span className="font-medium text-brand-brown">{modal.phase === 'confirm-regenerate' ? modal.userName : ''}</span>.<br />El código anterior dejará de funcionar.</>
        }
        actions={
          <div className="flex gap-3">
            <button
              onClick={() => setModal({ phase: 'idle' })}
              disabled={actionBusy !== null}
              className="flex-1 px-4 py-3 rounded-xl text-sm font-medium border border-brand-border hover:bg-brand-border/30 transition-colors disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              onClick={confirmRegenerate}
              disabled={actionBusy !== null}
              className="flex-1 px-4 py-3 rounded-xl text-sm font-medium bg-[#999DA3] text-white hover:bg-[#999DA3]/80 transition-colors disabled:opacity-60"
            >
              {actionBusy !== null ? 'Regenerando...' : 'Sí, regenerar'}
            </button>
          </div>
        }
      />

      {/* Novo código gerado */}
      <FeedbackModal
        open={modal.phase === 'regenerated'}
        onClose={() => setModal({ phase: 'idle' })}
        icon={<ModalSuccessIcon />}
        title="Código regenerado"
        description={
          modal.phase === 'regenerated' ? (
            <>
              Nuevo código de acceso para <span className="font-medium text-brand-brown">{modal.userName}</span>:
              <span className="block mt-4"><CopyCodeBox code={modal.code} /></span>
            </>
          ) : null
        }
        actions={
          <div className="flex justify-center">
            <button
              onClick={() => setModal({ phase: 'idle' })}
              className="px-4 py-3 rounded-xl text-sm font-medium bg-[#999DA3] text-white transition-colors"
            >
              Cerrar
            </button>
          </div>
        }
      />

      {/* Email reenviado */}
      <FeedbackModal
        open={modal.phase === 'email-sent'}
        onClose={() => setModal({ phase: 'idle' })}
        icon={<ModalSuccessIcon />}
        title="Correo enviado"
        description={
          <>El código de acceso fue enviado a <span className="font-medium text-brand-brown">{modal.phase === 'email-sent' ? modal.userName : ''}</span>.</>
        }
        actions={
          <div className="flex justify-center">
            <button
              onClick={() => setModal({ phase: 'idle' })}
              className="px-4 py-3 rounded-xl text-sm font-medium bg-[#999DA3] text-white transition-colors"
            >
              Cerrar
            </button>
          </div>
        }
      />

      {/* Erro em ações de código de acceso */}
      <FeedbackModal
        open={modal.phase === 'action-error'}
        onClose={() => setModal({ phase: 'idle' })}
        icon={<ModalErrorIcon />}
        title="No se pudo completar la acción"
        titleColor="text-[#D86262]"
        description={modal.phase === 'action-error' ? modal.message : ''}
        actions={
          <div className="flex justify-center">
            <button
              onClick={() => setModal({ phase: 'idle' })}
              className="px-4 py-3 rounded-xl text-sm font-medium bg-[#999DA3] text-white transition-colors"
            >
              Cerrar
            </button>
          </div>
        }
      />

      <div className="rounded-2xl px-10 card-shadow overflow-hidden">

        {/* Toolbar */}
        <div className="flex items-center justify-between px-6 py-5">
          <span className="text-sm font-semibold text-brand-brown">Usuarios registrados</span>
          <div className="flex items-center gap-3">
            <div className="relative w-64">
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
            {showCreateButton && (
              <button
                onClick={() => setModal({ phase: 'select-type' })}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium text-white bg-[#999DA3] hover:bg-[#999DA3]/80 transition-colors"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
                </svg>
                Nuevo usuario
              </button>
            )}
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
                        {user.pendingActivation && (
                          <span className="shrink-0 text-xs bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-md font-medium" title="El usuario aún no ha activado su cuenta">
                            Pendiente de activación
                          </span>
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
                      <div className="flex items-center gap-2">
                        {user.pendingActivation && (user.user_type === 'teacher' || user.user_type === 'student') && (
                          <>
                            <button
                              onClick={() => handleSendAccessEmail(user)}
                              disabled={actionBusy !== null}
                              className="w-8 h-8 flex items-center justify-center rounded-lg border border-brand-border text-brand-label hover:bg-brand-border/30 transition-colors disabled:opacity-40"
                              title="Reenviar correo con código de acceso"
                            >
                              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <line x1="22" y1="2" x2="11" y2="13" /><polygon points="22 2 15 22 11 13 2 9 22 2" />
                              </svg>
                            </button>
                            <button
                              onClick={() => setModal({ phase: 'confirm-regenerate', userId: user.id, userName: user.name, userType: user.user_type })}
                              disabled={actionBusy !== null}
                              className="w-8 h-8 flex items-center justify-center rounded-lg border border-brand-border text-brand-label hover:bg-brand-border/30 transition-colors disabled:opacity-40"
                              title="Regenerar código de acceso"
                            >
                              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <polyline points="23 4 23 10 17 10" />
                                <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
                              </svg>
                            </button>
                          </>
                        )}
                        {(user.user_type === 'teacher' || user.user_type === 'student') && (
                          <button
                            onClick={() => handleEdit(user)}
                            className="w-8 h-8 flex items-center justify-center rounded-lg border border-brand-border text-brand-label hover:bg-brand-border/30 transition-colors"
                            title="Editar usuario"
                          >
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                            </svg>
                          </button>
                        )}
                        <button
                          onClick={() => requestDelete(user)}
                          className="w-8 h-8 flex items-center justify-center rounded-lg border border-red-300 text-red-500 hover:bg-red-50 transition-colors"
                          title="Eliminar usuario"
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
