'use client';

import { useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import type { SubjectItem } from '@/lib/api/subject';
import type { AiFileItem, IngestionStatus } from '@/lib/api/file';
import {
  FeedbackModal,
  ModalErrorIcon,
  ModalWarningIcon,
} from '@/components/ui/feedback-modal';
import { RagCoverageModal } from './rag-coverage-modal';

type ModalState =
  | { phase: 'idle' }
  | { phase: 'confirm-delete'; id: string; name: string; busy: boolean }
  | { phase: 'uploading' }
  | { phase: 'error'; message: string };

// Limite de upload — mesmo valor configurado no backend (50MB)
const MAX_FILE_SIZE = 50 * 1024 * 1024;

// Só os tipos que o pipeline de ingestão RAG aceita (PDF/DOCX/PPTX)
const RAG_ACCEPT = '.pdf,.docx,.pptx';

// Rótulo e cor do pill de status da ingestão RAG
const STATUS_STYLES: Record<IngestionStatus, { label: string; className: string }> = {
  pending: { label: 'Pendiente', className: 'bg-brand-border/40 text-brand-label' },
  processing: { label: 'Procesando', className: 'bg-blue-100 text-blue-700' },
  completed: { label: 'Indexado', className: 'bg-green-100 text-green-700' },
  failed: { label: 'Error', className: 'bg-red-100 text-red-600' },
};

/* ── Ícones ───────────────────────────────────────────────────── */

function FolderIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
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

export function DocumentationBrowser({
  subjects,
  files,
  activeSubjectId,
  basePath,
  homeHref,
}: {
  subjects: SubjectItem[];
  files: AiFileItem[];
  // null = raiz (lista de pastas); 'all' = Todos; senão id da matéria
  activeSubjectId: string | null;
  basePath: string;
  homeHref: string;
}) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const [modal, setModal] = useState<ModalState>({ phase: 'idle' });
  const [coverageOpen, setCoverageOpen] = useState(false);

  const activeSubject =
    activeSubjectId && activeSubjectId !== 'all'
      ? (subjects.find((s) => s.id === activeSubjectId) ?? null)
      : null;

  const isRoot = activeSubjectId === null;
  // Upload só dentro de pasta de matéria — arquivo sem subject_id nunca
  // aparece na busca do RAG (o Chat filtra por subject_id)
  const canUpload = activeSubject !== null;

  const visibleFiles = isRoot
    ? []
    : activeSubjectId === 'all'
      ? files
      : files.filter((file) => file.subject_id === activeSubjectId);

  const subjectNameOf = (subjectId: string | null) =>
    subjects.find((s) => s.id === subjectId)?.name ?? null;

  // "Última actualización" do cabeçalho — data do upload mais recente
  const lastUpdate = files.reduce<string | null>(
    (latest, file) =>
      !latest || file.created_at > latest ? file.created_at : latest,
    null,
  );

  /* ── Ações ──────────────────────────────────────────────────── */

  function fail(message?: string) {
    setModal({
      phase: 'error',
      message: message || 'Ocurrió un problema al procesar la solicitud. Por favor, inténtalo nuevamente.',
    });
  }

  async function uploadFile(file: File) {
    if (!activeSubject) return;
    if (file.size > MAX_FILE_SIZE) {
      return fail('El archivo supera el límite de 50MB.');
    }
    setModal({ phase: 'uploading' });
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('subject_id', activeSubject.id);
      formData.append('document_type', 'supplementary');
      // Tudo que sobe por esta tela alimenta o RAG
      formData.append('is_ai_context', 'true');
      const res = await fetch('/api/files', { method: 'POST', body: formData });
      const json = await res.json();
      if (!res.ok) return fail(json.message);
      setModal({ phase: 'idle' });
      router.refresh();
    } catch {
      fail();
    }
  }

  async function deleteFile() {
    if (modal.phase !== 'confirm-delete') return;
    const { id, name } = modal;
    setModal({ phase: 'confirm-delete', id, name, busy: true });
    try {
      const res = await fetch(`/api/files/${id}`, { method: 'DELETE' });
      const json = await res.json();
      if (!res.ok) return fail(json.message);
      setModal({ phase: 'idle' });
      router.refresh();
    } catch {
      fail();
    }
  }

  const busy = modal.phase === 'confirm-delete' && modal.busy;

  /* ── Render ─────────────────────────────────────────────────── */

  return (
    <div className="pt-10 px-10 md:px-30 pb-16">
      {/* Overlay invisível para fechar menus abertos ao clicar fora */}
      {openMenu && (
        <div className="fixed inset-0 z-10" onClick={() => setOpenMenu(null)} aria-hidden="true" />
      )}

      <div className="mt-15 mb-10">
        <Link
          href={isRoot ? homeHref : basePath}
          className="flex items-center gap-1.5 text-sm text-brand-label hover:text-brand-brown transition-colors w-fit"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
          Home
        </Link>
      </div>

      <div className="flex items-start justify-between gap-4 mb-2">
        <h1 className="text-4xl text-brand">Documentación</h1>

        <div className="flex items-center gap-3 shrink-0">
          {/* Recarrega os dados para acompanhar pending → processing → completed */}
          <button
            type="button"
            onClick={() => router.refresh()}
            className="flex items-center gap-2 px-4 py-3 rounded-xl text-sm font-medium border border-brand-border text-brand-brown hover:bg-brand-border/30 transition-colors"
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 12a9 9 0 1 1-2.64-6.36" />
              <polyline points="21 3 21 9 15 9" />
            </svg>
            Actualizar
          </button>

          {/* Só dentro de uma matéria: a sonda é por matéria (§7.1) */}
          {activeSubject && (
            <button
              type="button"
              onClick={() => setCoverageOpen(true)}
              className="flex items-center gap-2 px-4 py-3 rounded-xl text-sm font-medium border border-brand-border text-brand-brown hover:bg-brand-border/30 transition-colors"
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 11l3 3L22 4" />
                <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
              </svg>
              Verificar cobertura
            </button>
          )}

          {canUpload && (
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-medium bg-primary hover:bg-primary-hover text-primary-text transition-colors"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
              </svg>
              Subir archivo
            </button>
          )}
        </div>
      </div>

      {lastUpdate && (
        <p className="text-sm text-brand-label mb-10">
          Última actualización:{' '}
          {new Date(lastUpdate).toLocaleDateString('es-ES', {
            day: 'numeric',
            month: 'long',
            year: 'numeric',
          })}
        </p>
      )}

      {/* Trilha: Todos > Matéria */}
      {!isRoot && (
        <nav className="flex flex-wrap items-center gap-2 text-sm text-brand-label mb-10">
          <span className="flex items-center gap-2">
            <FolderIcon />
            {activeSubject ? (
              <Link href={`${basePath}?subject=all`} className="hover:text-brand-brown transition-colors">
                Todos
              </Link>
            ) : (
              <span className="text-brand-brown font-medium">Todos</span>
            )}
          </span>
          {activeSubject && (
            <>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <polyline points="9 18 15 12 9 6" />
              </svg>
              <span className="flex items-center gap-2 text-brand-brown font-medium">
                <FolderIcon />
                {activeSubject.name}
              </span>
            </>
          )}
        </nav>
      )}

      {/* Input escondido para o upload — só tipos aceitos pelo RAG */}
      {canUpload && (
        <input
          ref={fileInputRef}
          type="file"
          accept={RAG_ACCEPT}
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            e.target.value = '';
            if (file) uploadFile(file);
          }}
        />
      )}

      {isRoot ? (
        /* ── Raiz: pastas (Todos + uma por matéria) ── */
        subjects.length === 0 ? (
          <div className="rounded-2xl card-shadow px-6 py-16 text-center text-sm text-brand-placeholder">
            No hay asignaturas todavía.
          </div>
        ) : (
          <div className="flex flex-col gap-1 max-w-2xl">
            {[{ id: 'all', name: 'Todos' }, ...subjects].map((folder) => (
              <Link
                key={folder.id}
                href={`${basePath}?subject=${folder.id}`}
                className="flex items-center gap-3 rounded-xl px-4 py-3.5 text-brand-brown hover:bg-brand-border/30 transition-colors"
              >
                <span className="text-brand-label shrink-0">
                  <FolderIcon />
                </span>
                <span className="truncate text-sm font-medium">{folder.name}</span>
              </Link>
            ))}
          </div>
        )
      ) : /* ── Dentro da pasta: arquivos ── */
      visibleFiles.length === 0 ? (
        <div className="rounded-2xl card-shadow px-6 py-16 text-center text-sm text-brand-placeholder">
          {canUpload
            ? 'Esta carpeta está vacía. Sube un archivo PDF, DOCX o PPTX para alimentar la IA.'
            : 'No hay archivos todavía.'}
        </div>
      ) : (
        <div className="flex flex-col gap-1 max-w-3xl">
          {visibleFiles.map((file) => {
            const status = STATUS_STYLES[file.ingestion_status];
            const subjectLabel =
              activeSubjectId === 'all' ? subjectNameOf(file.subject_id) : null;
            return (
              <div
                key={file.id}
                className="flex items-center gap-3 rounded-xl px-4 py-3 hover:bg-brand-border/25 transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <a
                    href={file.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm font-medium text-brand-brown underline underline-offset-4 decoration-brand-border hover:decoration-brand-brown transition-colors truncate block w-fit max-w-full"
                    title={file.name}
                  >
                    {file.name}
                  </a>
                  {subjectLabel && (
                    <span className="text-xs text-brand-placeholder">{subjectLabel}</span>
                  )}
                  {file.ingestion_status === 'failed' && file.ingestion_error && (
                    <p className="text-xs text-red-500 mt-0.5">{file.ingestion_error}</p>
                  )}
                </div>

                <span
                  className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium ${status.className}`}
                >
                  {status.label}
                </span>

                <div className="relative shrink-0">
                  <button
                    type="button"
                    onClick={() => setOpenMenu(openMenu === file.id ? null : file.id)}
                    className="w-8 h-8 flex items-center justify-center rounded-lg text-brand-label hover:text-brand-brown hover:bg-brand-border/40 transition-colors"
                    aria-label={`Acciones de ${file.name}`}
                  >
                    <KebabIcon />
                  </button>

                  {openMenu === file.id && (
                    <div className="absolute right-0 top-9 z-20 w-44 bg-white rounded-xl shadow-lg border border-brand-border py-1.5">
                      <a
                        href={file.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={() => setOpenMenu(null)}
                        className="block w-full text-left px-4 py-2 text-sm text-brand-brown hover:bg-brand-border/30 transition-colors"
                      >
                        Descargar
                      </a>
                      <button
                        type="button"
                        onClick={() => {
                          setOpenMenu(null);
                          setModal({ phase: 'confirm-delete', id: file.id, name: file.name, busy: false });
                        }}
                        className="w-full text-left px-4 py-2 text-sm text-red-500 hover:bg-red-50 transition-colors"
                      >
                        Eliminar
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Modais ── */}

      <FeedbackModal
        open={modal.phase === 'confirm-delete'}
        onClose={() => setModal({ phase: 'idle' })}
        closeDisabled={busy}
        icon={<ModalWarningIcon />}
        title="¿Eliminar archivo?"
        titleColor="text-[#D86262]"
        description={
          modal.phase === 'confirm-delete' ? (
            <>
              Estás a punto de eliminar{' '}
              <span className="font-medium text-brand-brown">{modal.name}</span>.
              También se eliminará su contenido indexado para la IA.
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
              onClick={deleteFile}
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

      {coverageOpen && activeSubject && (
        <RagCoverageModal
          subjectId={activeSubject.id}
          onClose={() => setCoverageOpen(false)}
        />
      )}
    </div>
  );
}
