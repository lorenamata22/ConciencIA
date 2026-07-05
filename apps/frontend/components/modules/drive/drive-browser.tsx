'use client';

import { useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import type { DriveContents } from '@/lib/api/drive';
import {
  FeedbackModal,
  ModalErrorIcon,
  ModalWarningIcon,
} from '@/components/ui/feedback-modal';

type ItemKind = 'folder' | 'file';

type ModalState =
  | { phase: 'idle' }
  | { phase: 'create-folder'; busy: boolean }
  | { phase: 'rename'; kind: ItemKind; id: string; currentName: string; busy: boolean }
  | { phase: 'confirm-delete'; kind: ItemKind; id: string; name: string; busy: boolean }
  | { phase: 'uploading' }
  | { phase: 'error'; message: string };

// Limite de upload — mesmo valor configurado no backend (50MB)
const MAX_FILE_SIZE = 50 * 1024 * 1024;

/* ── Ícones ───────────────────────────────────────────────────── */

function FolderIcon() {
  return (
    <svg width="26" height="26" viewBox="0 0 24 24" fill="currentColor" stroke="none">
      <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
    </svg>
  );
}

function FileIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
    </svg>
  );
}

function KebabIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" stroke="none">
      <circle cx="12" cy="5" r="1.75" />
      <circle cx="12" cy="12" r="1.75" />
      <circle cx="12" cy="19" r="1.75" />
    </svg>
  );
}

/* ── Componente principal ─────────────────────────────────────── */

export function DriveBrowser({
  title,
  homeHref,
  basePath,
  contents,
  canWrite,
  canModifyAll,
  userId,
}: {
  title: string;
  homeHref: string;
  basePath: string;
  contents: DriveContents;
  canWrite: boolean;
  canModifyAll: boolean;
  userId: string;
}) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const [modal, setModal] = useState<ModalState>({ phase: 'idle' });
  const [nameInput, setNameInput] = useState('');

  const { folder, breadcrumb, folders, files } = contents;

  function folderHref(folderId: string | null) {
    return folderId ? `${basePath}?folderId=${folderId}` : basePath;
  }

  // Link do "< Volver": dentro de uma pasta sobe um nível; na raiz volta ao home do perfil
  const backHref = folder ? folderHref(folder.parentId) : homeHref;

  const canModify = (createdBy: string) => canModifyAll || createdBy === userId;

  const isEmpty = folders.length === 0 && files.length === 0;

  /* ── Ações ──────────────────────────────────────────────────── */

  function fail(message?: string) {
    setModal({
      phase: 'error',
      message: message || 'Ocurrió un problema al procesar la solicitud. Por favor, inténtalo nuevamente.',
    });
  }

  async function createFolder() {
    if (modal.phase !== 'create-folder' || !nameInput.trim()) return;
    setModal({ phase: 'create-folder', busy: true });
    try {
      const res = await fetch('/api/drive/folders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: nameInput.trim(), parentId: folder?.id }),
      });
      const json = await res.json();
      if (!res.ok) return fail(json.message);
      setModal({ phase: 'idle' });
      router.refresh();
    } catch {
      fail();
    }
  }

  async function renameItem() {
    if (modal.phase !== 'rename' || !nameInput.trim()) return;
    const { kind, id, currentName } = modal;
    setModal({ phase: 'rename', kind, id, currentName, busy: true });
    try {
      const res = await fetch(`/api/drive/${kind === 'folder' ? 'folders' : 'files'}/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: nameInput.trim() }),
      });
      const json = await res.json();
      if (!res.ok) return fail(json.message);
      setModal({ phase: 'idle' });
      router.refresh();
    } catch {
      fail();
    }
  }

  async function deleteItem() {
    if (modal.phase !== 'confirm-delete') return;
    const { kind, id, name } = modal;
    setModal({ phase: 'confirm-delete', kind, id, name, busy: true });
    try {
      const res = await fetch(`/api/drive/${kind === 'folder' ? 'folders' : 'files'}/${id}`, {
        method: 'DELETE',
      });
      const json = await res.json();
      if (!res.ok) return fail(json.message);
      setModal({ phase: 'idle' });
      router.refresh();
    } catch {
      fail();
    }
  }

  async function uploadFile(file: File) {
    if (file.size > MAX_FILE_SIZE) {
      return fail('El archivo supera el límite de 50MB.');
    }
    setModal({ phase: 'uploading' });
    try {
      const formData = new FormData();
      formData.append('file', file);
      if (folder) formData.append('folderId', folder.id);
      const res = await fetch('/api/drive/files', { method: 'POST', body: formData });
      const json = await res.json();
      if (!res.ok) return fail(json.message);
      setModal({ phase: 'idle' });
      router.refresh();
    } catch {
      fail();
    }
  }

  async function downloadFile(id: string) {
    try {
      const res = await fetch(`/api/drive/files/${id}/download`);
      const json = await res.json();
      if (!res.ok || !json.data?.url) return fail(json.message);
      window.open(json.data.url as string, '_blank', 'noopener');
    } catch {
      fail();
    }
  }

  /* ── Modais ─────────────────────────────────────────────────── */

  const busy =
    (modal.phase === 'create-folder' || modal.phase === 'rename' || modal.phase === 'confirm-delete') &&
    modal.busy;

  function openCreateFolder() {
    setNameInput('');
    setOpenMenu(null);
    setModal({ phase: 'create-folder', busy: false });
  }

  function openRename(kind: ItemKind, id: string, currentName: string) {
    setNameInput(currentName);
    setOpenMenu(null);
    setModal({ phase: 'rename', kind, id, currentName, busy: false });
  }

  function openDelete(kind: ItemKind, id: string, name: string) {
    setOpenMenu(null);
    setModal({ phase: 'confirm-delete', kind, id, name, busy: false });
  }

  function renderNameModal(kind: 'create-folder' | 'rename') {
    const isCreate = kind === 'create-folder';
    const onSubmit = isCreate ? createFolder : renameItem;
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
        <div className="bg-white rounded-2xl shadow-xl w-full max-w-md mx-4 px-8 py-8 relative">
          <button
            onClick={() => setModal({ phase: 'idle' })}
            disabled={busy}
            className="absolute top-4 right-4 text-brand-label hover:text-brand-brown transition-colors disabled:opacity-40"
            aria-label="Cerrar"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>

          <h2 className="font-semibold text-lg text-brand-brown mb-5">
            {isCreate ? 'Nueva carpeta' : 'Cambiar nombre'}
          </h2>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              onSubmit();
            }}
          >
            <input
              type="text"
              autoFocus
              maxLength={255}
              value={nameInput}
              onChange={(e) => setNameInput(e.target.value)}
              placeholder={isCreate ? 'Nombre de la carpeta' : 'Nuevo nombre'}
              className="w-full rounded-xl border border-brand-border px-4 py-3 text-sm text-brand-brown placeholder:text-brand-placeholder focus:outline-none focus:border-brand-border-focus transition-colors mb-6"
            />
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setModal({ phase: 'idle' })}
                disabled={busy}
                className="flex-1 px-4 py-3 rounded-xl text-sm font-medium border border-brand-border hover:bg-brand-border/30 transition-colors disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={busy || !nameInput.trim()}
                className="flex-1 px-4 py-3 rounded-xl text-sm font-medium bg-primary hover:bg-primary-hover text-primary-text transition-colors disabled:opacity-60"
              >
                {busy ? 'Guardando...' : isCreate ? 'Crear' : 'Guardar'}
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  /* ── Kebab ──────────────────────────────────────────────────── */

  function renderKebab(kind: ItemKind, item: { id: string; name: string; createdBy: string }) {
    const modifiable = canWrite && canModify(item.createdBy);
    const hasActions = modifiable || kind === 'file';
    if (!hasActions) return null;

    const menuId = `${kind}-${item.id}`;
    return (
      <div className="relative shrink-0">
        <button
          type="button"
          onClick={() => setOpenMenu(openMenu === menuId ? null : menuId)}
          className="w-8 h-8 flex items-center justify-center rounded-lg text-brand-label hover:text-brand-brown hover:bg-brand-border/40 transition-colors"
          aria-label={`Acciones de ${item.name}`}
        >
          <KebabIcon />
        </button>

        {openMenu === menuId && (
          <div className="absolute right-0 top-9 z-20 w-44 bg-white rounded-xl shadow-lg border border-brand-border py-1.5">
            {kind === 'file' && (
              <button
                type="button"
                onClick={() => {
                  setOpenMenu(null);
                  downloadFile(item.id);
                }}
                className="w-full text-left px-4 py-2 text-sm text-brand-brown hover:bg-brand-border/30 transition-colors"
              >
                Descargar
              </button>
            )}
            {modifiable && (
              <>
                <button
                  type="button"
                  onClick={() => openRename(kind, item.id, item.name)}
                  className="w-full text-left px-4 py-2 text-sm text-brand-brown hover:bg-brand-border/30 transition-colors"
                >
                  Cambiar nombre
                </button>
                <button
                  type="button"
                  onClick={() => openDelete(kind, item.id, item.name)}
                  className="w-full text-left px-4 py-2 text-sm text-red-500 hover:bg-red-50 transition-colors"
                >
                  Eliminar
                </button>
              </>
            )}
          </div>
        )}
      </div>
    );
  }

  /* ── Render ─────────────────────────────────────────────────── */

  return (
    <div className="pt-10 px-10 md:px-30 pb-16">
      {/* Overlay invisível para fechar menus abertos ao clicar fora */}
      {openMenu && (
        <div className="fixed inset-0 z-10" onClick={() => setOpenMenu(null)} aria-hidden="true" />
      )}

      <div className="mt-15 mb-10">
        <Link
          href={backHref}
          className="flex items-center gap-1.5 text-sm text-brand-label hover:text-brand-brown transition-colors w-fit"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
          Home
        </Link>
      </div>

      <div className="flex items-start justify-between gap-4 mb-6">
        <h1 className="text-4xl text-brand">{title}</h1>

        {canWrite && (
          <div className="relative shrink-0">
            <button
              type="button"
              onClick={() => setOpenMenu(openMenu === 'new' ? null : 'new')}
              className="flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-medium bg-primary hover:bg-primary-hover text-primary-text transition-colors"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
              </svg>
              Nuevo
            </button>

            {openMenu === 'new' && (
              <div className="absolute right-0 top-13 z-20 w-48 bg-white rounded-xl shadow-lg border border-brand-border py-1.5">
                <button
                  type="button"
                  onClick={openCreateFolder}
                  className="w-full text-left px-4 py-2 text-sm text-brand-brown hover:bg-brand-border/30 transition-colors"
                >
                  Nueva carpeta
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setOpenMenu(null);
                    fileInputRef.current?.click();
                  }}
                  className="w-full text-left px-4 py-2 text-sm text-brand-brown hover:bg-brand-border/30 transition-colors"
                >
                  Subir archivo
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Trilha de navegação dentro do drive */}
      {folder && (
        <nav className="flex flex-wrap items-center gap-1.5 text-sm text-brand-label mb-8">
          <Link href={basePath} className="hover:text-brand-brown transition-colors">
            {title}
          </Link>
          {breadcrumb.map((crumb, index) => (
            <span key={crumb.id} className="flex items-center gap-1.5">
              <span aria-hidden="true">/</span>
              {index === breadcrumb.length - 1 ? (
                <span className="text-brand-brown font-medium">{crumb.name}</span>
              ) : (
                <Link href={folderHref(crumb.id)} className="hover:text-brand-brown transition-colors">
                  {crumb.name}
                </Link>
              )}
            </span>
          ))}
        </nav>
      )}

      {/* Input escondido para o upload */}
      {canWrite && (
        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            e.target.value = '';
            if (file) uploadFile(file);
          }}
        />
      )}

      {isEmpty ? (
        <div className="rounded-2xl card-shadow px-6 py-16 text-center text-sm text-brand-placeholder">
          {folder ? 'Esta carpeta está vacía.' : 'No hay archivos todavía.'}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
          {folders.map((f) => (
            <div
              key={f.id}
              className="flex items-center gap-3 rounded-xl bg-brand-border/25 hover:bg-brand-border/40 transition-colors px-4 py-4"
            >
              <Link href={folderHref(f.id)} className="flex items-center gap-3 flex-1 min-w-0">
                <span className="text-brand-label shrink-0">
                  <FolderIcon />
                </span>
                <span className="truncate text-sm font-medium text-brand-brown" title={f.name}>
                  {f.name}
                </span>
              </Link>
              {renderKebab('folder', f)}
            </div>
          ))}

          {files.map((f) => (
            <div
              key={f.id}
              className="flex items-center gap-3 rounded-xl bg-brand-border/25 hover:bg-brand-border/40 transition-colors px-4 py-4"
            >
              <button
                type="button"
                onClick={() => downloadFile(f.id)}
                className="flex items-center gap-3 flex-1 min-w-0 text-left"
                title={f.name}
              >
                <span className="text-brand-label shrink-0">
                  <FileIcon />
                </span>
                <span className="truncate text-sm font-medium text-brand-brown">{f.name}</span>
              </button>
              {renderKebab('file', f)}
            </div>
          ))}
        </div>
      )}

      {/* ── Modais ── */}

      {(modal.phase === 'create-folder' || modal.phase === 'rename') &&
        renderNameModal(modal.phase)}

      <FeedbackModal
        open={modal.phase === 'confirm-delete'}
        onClose={() => setModal({ phase: 'idle' })}
        closeDisabled={busy}
        icon={<ModalWarningIcon />}
        title={
          modal.phase === 'confirm-delete' && modal.kind === 'folder'
            ? '¿Eliminar carpeta?'
            : '¿Eliminar archivo?'
        }
        titleColor="text-[#D86262]"
        description={
          modal.phase === 'confirm-delete' ? (
            <>
              Estás a punto de eliminar{' '}
              <span className="font-medium text-brand-brown">{modal.name}</span>.
              {modal.kind === 'folder' && (
                <> Se eliminará también todo su contenido.</>
              )}
              <br />
              Esta acción es irreversible.
            </>
          ) : null
        }
        actions={
          <div className="flex gap-3">
            <button
              onClick={() => setModal({ phase: 'idle' })}
              disabled={busy}
              className="flex-1 px-4 py-3 rounded-xl text-sm font-medium border border-brand-border hover:bg-brand-border/30 transition-colors disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              onClick={deleteItem}
              disabled={busy}
              className="flex-1 px-4 py-3 rounded-xl text-sm font-medium bg-red-500 text-white hover:bg-red-600 transition-colors disabled:opacity-60"
            >
              {busy ? 'Eliminando...' : 'Sí, eliminar'}
            </button>
          </div>
        }
      />

      <FeedbackModal
        open={modal.phase === 'uploading'}
        onClose={() => undefined}
        closeDisabled
        icon={
          <svg className="animate-spin text-primary" width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <path d="M21 12a9 9 0 1 1-6.219-8.56" />
          </svg>
        }
        title="Subiendo archivo..."
        description={<>Por favor, espera mientras se sube el archivo.</>}
        actions={null}
      />

      <FeedbackModal
        open={modal.phase === 'error'}
        onClose={() => setModal({ phase: 'idle' })}
        icon={<ModalErrorIcon />}
        title="Algo salió mal"
        titleColor="text-[#D86262]"
        description={modal.phase === 'error' ? <>{modal.message}</> : null}
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
    </div>
  );
}
