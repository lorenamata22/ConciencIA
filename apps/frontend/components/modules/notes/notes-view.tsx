'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import type { SubjectItem } from '@/lib/api/subject';
import {
  deleteNote,
  getNote,
  getNotes,
  getTrashedNotes,
  restoreNote,
  updateNote,
  type NoteCard,
  type NoteDetail,
} from '@/lib/api/note';
import { NoteEditor } from './note-editor';

// Filtro ativo na coluna esquerda
type Filter =
  | { type: 'all' }
  | { type: 'subject'; id: string; name: string }
  | { type: 'trash' };

type SaveState = 'idle' | 'saving' | 'saved';

const AUTOSAVE_DELAY = 800;
const WEEKDAY_THRESHOLD_MS = 7 * 24 * 60 * 60 * 1000;

// ── Datas ──────────────────────────────────────────────────────────────
// Card: dia da semana quando recente (< 7 dias), senão data numérica curta
function formatCardDate(iso: string): string {
  const date = new Date(iso);
  const now = new Date();
  // Mesmo dia do calendário → "Hoy"
  const isToday =
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate();
  if (isToday) return 'Hoy';

  const diff = now.getTime() - date.getTime();
  if (diff >= 0 && diff < WEEKDAY_THRESHOLD_MS) {
    const weekday = date.toLocaleDateString('es-ES', { weekday: 'long' });
    return weekday.charAt(0).toUpperCase() + weekday.slice(1);
  }
  const d = date.getDate();
  const m = date.getMonth() + 1;
  const yy = String(date.getFullYear()).slice(-2);
  return `${d}/${m}/${yy}`;
}

// Detalhe: "10 de junio de 2026 a las 10:39"
function formatDetailDate(iso: string): string {
  const date = new Date(iso);
  const day = date.toLocaleDateString('es-ES', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
  const time = date.toLocaleTimeString('es-ES', {
    hour: '2-digit',
    minute: '2-digit',
  });
  return `${day} a las ${time}`;
}

// ── Ícones (SVG inline, mesmo estilo do sidebar) ───────────────────────
function FolderIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
    </svg>
  );
}

function TrashIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M3 6h18" />
      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
      <path d="M10 11v6M14 11v6" />
    </svg>
  );
}

// Mesmas classes de prose do chat (message-list) — mantém a formatação
// Markdown da resposta da IA idêntica nos dois lugares
const NOTE_PROSE =
  'prose prose-sm max-w-none leading-relaxed text-brand-teal prose-headings:text-brand-teal prose-strong:text-brand-teal prose-a:text-primary prose-code:rounded prose-code:bg-[#5F5E5C40] prose-code:px-1.5 prose-code:py-0.5 prose-code:text-brand-teal prose-code:before:content-none prose-code:after:content-none prose-pre:rounded-xl prose-pre:bg-[#5F5E5C10] prose-li:marker:text-brand-placeholder prose-hr:border-brand-border';

// Conteúdo da nota renderizado como Markdown (visualização)
function NoteMarkdown({ content }: { content: string }) {
  return (
    <div className={NOTE_PROSE}>
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
    </div>
  );
}

// ── Textarea auto-crescente (edição inline, sem cara de form) ──────────
function AutoGrowTextarea({
  value,
  onChange,
  onBlur,
  autoFocus,
  className,
  placeholder,
  readOnly,
}: {
  value: string;
  onChange?: (v: string) => void;
  onBlur?: () => void;
  autoFocus?: boolean;
  className?: string;
  placeholder?: string;
  readOnly?: boolean;
}) {
  const ref = useRef<HTMLTextAreaElement>(null);

  // Ajusta a altura ao conteúdo — cresce como um documento
  const resize = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${el.scrollHeight}px`;
  }, []);

  useEffect(() => {
    resize();
  }, [value, resize]);

  return (
    <textarea
      ref={ref}
      value={value}
      readOnly={readOnly}
      placeholder={placeholder}
      autoFocus={autoFocus}
      onBlur={onBlur}
      onChange={(e) => {
        onChange?.(e.target.value);
        resize();
      }}
      rows={1}
      className={`w-full resize-none overflow-hidden bg-transparent outline-none placeholder:text-brand-placeholder ${className ?? ''}`}
    />
  );
}

export function NotesView({ subjects }: { subjects: SubjectItem[] }) {
  const [filter, setFilter] = useState<Filter>({ type: 'all' });
  const [cards, setCards] = useState<NoteCard[]>([]);
  // Inicia carregando: o mount já busca o filtro "Todos"
  const [loadingCards, setLoadingCards] = useState(true);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<NoteDetail | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  // Título editável inline (texto puro); o conteúdo é gerido pelo NoteEditor
  const [draftTitle, setDraftTitle] = useState('');
  const [saveState, setSaveState] = useState<SaveState>('idle');
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const isTrash = filter.type === 'trash';

  // Troca de filtro (event handler): limpa o estado de forma síncrona e deixa
  // o effect abaixo disparar a busca — mantém o setState fora do corpo do effect
  const selectFilter = (next: Filter) => {
    setFilter(next);
    setLoadingCards(true);
    setCards([]);
    setSelectedId(null);
    setDetail(null);
  };

  // Busca os cards do filtro — setState só dentro do callback assíncrono
  useEffect(() => {
    let active = true;
    const request =
      filter.type === 'trash'
        ? getTrashedNotes()
        : getNotes(filter.type === 'subject' ? filter.id : undefined);
    request.then((list) => {
      if (!active) return;
      setLoadingCards(false);
      setCards(list);
      if (list.length > 0) {
        setLoadingDetail(true);
        setSelectedId(list[0].id);
      } else {
        setSelectedId(null);
        setDetail(null);
      }
    });
    return () => {
      active = false;
    };
  }, [filter]);

  // Carrega o detalhe da nota selecionada — setState só no callback assíncrono
  useEffect(() => {
    if (!selectedId) return;
    let active = true;
    getNote(selectedId).then((note) => {
      if (!active) return;
      setDetail(note);
      setDraftTitle(note?.title ?? '');
      setSaveState('idle');
      setLoadingDetail(false);
    });
    return () => {
      active = false;
    };
  }, [selectedId]);

  // Seleção de um card (event handler): mostra o loading do detalhe.
  // Se a nota já está aberta, não faz nada — reatribuir o mesmo id não
  // dispara o effect e deixaria o loading preso em "Cargando…".
  const selectNote = (id: string) => {
    if (id === selectedId) return;
    setLoadingDetail(true);
    setSelectedId(id);
  };

  // Persiste título/conteúdo com debounce e reflete no card da lista
  const scheduleSave = useCallback(
    (id: string, patch: { title?: string; content?: string }) => {
      setSaveState('saving');
      if (saveTimer.current) clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(async () => {
        const res = await updateNote(id, patch);
        if (res.data) {
          setSaveState('saved');
          setCards((prev) =>
            prev.map((card) =>
              card.id === id
                ? {
                    ...card,
                    title: res.data!.title,
                    preview: res.data!.content.slice(0, 120),
                    updated_at: res.data!.updated_at,
                  }
                : card,
            ),
          );
        } else {
          setSaveState('idle');
        }
      }, AUTOSAVE_DELAY);
    },
    [],
  );

  const onTitleChange = (v: string) => {
    setDraftTitle(v);
    if (detail) scheduleSave(detail.id, { title: v });
  };
  // markdown vindo do NoteEditor — ignora se igual ao carregado (emissão
  // inicial / normalização) para não salvar só por abrir a nota
  const onContentChange = (markdown: string) => {
    if (!detail || markdown === detail.content) return;
    scheduleSave(detail.id, { content: markdown });
  };

  const handleDelete = async () => {
    if (!detail) return;
    const id = detail.id;
    await deleteNote(id);
    setCards((prev) => prev.filter((c) => c.id !== id));
    setSelectedId(null);
    setDetail(null);
  };

  const handleRestore = async () => {
    if (!detail) return;
    const id = detail.id;
    await restoreNote(id);
    setCards((prev) => prev.filter((c) => c.id !== id));
    setSelectedId(null);
    setDetail(null);
  };

  return (
    <div className="flex h-full min-h-0 px-10 pb-10 md:px-30 ">
      {/* ── Coluna 1: matérias ─────────────────────────────────────── */}
      <nav className="flex w-56 shrink-0 flex-col gap-1 overflow-y-auto py-2 pr-4">
        <SidebarItem
          label="Todos"
          icon={<FolderIcon />}
          active={filter.type === 'all'}
          onClick={() => selectFilter({ type: 'all' })}
        />
        {subjects.map((subject) => (
          <SidebarItem
            key={subject.id}
            label={subject.name}
            icon={<FolderIcon />}
            active={filter.type === 'subject' && filter.id === subject.id}
            onClick={() =>
              selectFilter({
                type: 'subject',
                id: subject.id,
                name: subject.name,
              })
            }
          />
        ))}
        <SidebarItem
            label="Borrados recientes"
            icon={<TrashIcon />}
            active={filter.type === 'trash'}
            onClick={() => selectFilter({ type: 'trash' })}
          />
      </nav>

      {/* ── Coluna 2: cards ────────────────────────────────────────── */}
      <div className="w-80 shrink-0 overflow-y-auto border-l border-brand-border/60 py-2 pl-6 pr-4">
        {loadingCards ? (
          <p className="px-2 py-4 text-sm text-brand-placeholder">Cargando…</p>
        ) : cards.length === 0 ? (
          <p className="px-2 py-4 text-sm text-brand-placeholder">
            {isTrash
              ? 'No hay apuntes borrados.'
              : 'Aún no tienes apuntes aquí.'}
          </p>
        ) : (
          <ul className="flex flex-col">
            {cards.map((card) => (
              <li key={card.id}>
                <button
                  type="button"
                  onClick={() => selectNote(card.id)}
                  className={`w-full py-4 text-left transition-colors ${
                    selectedId === card.id ? 'opacity-100' : 'opacity-80 hover:opacity-100'
                  }`}
                >
                  <p className="truncate text-[15px] font-medium text-brand-teal">
                    {card.title}
                  </p>
                  <div className="mt-1 flex items-baseline gap-3">
                    <span className="shrink-0 text-xs font-medium text-brand-teal">
                      {formatCardDate(
                        isTrash
                          ? (card.deleted_at ?? card.updated_at)
                          : card.updated_at,
                      )}
                    </span>
                    <span className="truncate text-xs text-brand-placeholder">
                      {card.preview}
                    </span>
                  </div>
                  <div className="mt-2 flex items-center gap-1.5 text-brand-placeholder">
                    <FolderIcon className="h-3.5 w-3.5" />
                    <span className="truncate text-xs">
                      {card.subject_name ?? '—'}
                    </span>
                  </div>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* ── Coluna 3: detalhe / edição ─────────────────────────────── */}
      <div className="min-w-0 flex-1 overflow-y-auto border-l border-brand-border/60 py-2 pl-8">
        {loadingDetail ? (
          <p className="text-sm text-brand-placeholder">Cargando…</p>
        ) : !detail ? (
          <p className="text-sm text-brand-placeholder">
            Selecciona un apunte para verlo.
          </p>
        ) : (
          <article className="max-w-2xl">
            <header className="flex items-start justify-between gap-4">
              <p className="text-sm text-brand-placeholder">
                <span className="font-semibold text-brand-teal">
                  {detail.subject?.name ?? '—'}
                </span>{' '}
                · {formatDetailDate(detail.updated_at)}
              </p>
              <div className="flex items-center gap-3">
                {!isTrash && (
                  <span className="text-xs text-brand-placeholder">
                    {saveState === 'saving'
                      ? 'Guardando…'
                      : saveState === 'saved'
                        ? 'Guardado'
                        : ''}
                  </span>
                )}
                {isTrash ? (
                  <button
                    type="button"
                    onClick={handleRestore}
                    className="rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-text hover:bg-primary-hover"
                  >
                    Restaurar
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleDelete}
                    title="Eliminar apunte"
                    className="text-brand-placeholder transition-colors hover:text-brand-teal"
                  >
                    <TrashIcon />
                  </button>
                )}
              </div>
            </header>

            {isTrash ? (
              <>
                <h1 className="mt-6 text-3xl font-semibold text-brand-teal">
                  {detail.title}
                </h1>
                <div className="mt-6">
                  <NoteMarkdown content={detail.content} />
                </div>
              </>
            ) : (
              <>
                <AutoGrowTextarea
                  value={draftTitle}
                  onChange={onTitleChange}
                  placeholder="Título del apunte"
                  className="mt-6 text-3xl font-semibold text-brand-teal"
                />
                {/* Editor WYSIWYG markdown — sempre formatado, sem alternância.
                    key={detail.id} remonta o editor ao trocar de nota. */}
                <div className="mt-4">
                  <NoteEditor
                    key={detail.id}
                    defaultValue={detail.content}
                    editorClass={`${NOTE_PROSE} min-h-[300px] cursor-text`}
                    onChange={onContentChange}
                  />
                </div>
              </>
            )}
          </article>
        )}
      </div>
    </div>
  );
}

function SidebarItem({
  label,
  icon,
  active,
  onClick,
}: {
  label: string;
  icon: React.ReactNode;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center gap-3 rounded-lg px-3 py-2 text-left text-sm transition-colors ${
        active
          ? 'bg-primary/15 font-medium text-brand-teal'
          : 'text-brand-teal hover:bg-primary/10'
      }`}
    >
      <span className="shrink-0 text-brand-placeholder">{icon}</span>
      <span className="truncate">{label}</span>
    </button>
  );
}
