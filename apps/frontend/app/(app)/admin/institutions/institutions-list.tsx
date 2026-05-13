'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import type { Institution } from '@/lib/api/institution';

const PAGE_SIZE = 6;

const STATUS_CONFIG: Record<string, { label: string; dot: string; pill: string }> = {
  active:   { label: 'Activa',    dot: 'bg-green-500',  pill: 'bg-green-100 text-green-700' },
  inactive: { label: 'Inactiva',  dot: 'bg-gray-400',   pill: 'bg-gray-100 text-gray-500'  },
  pending:  { label: 'Pendiente', dot: 'bg-yellow-400', pill: 'bg-yellow-100 text-yellow-700' },
};

function StatusBadge({ status }: { status: string }) {
  const config = STATUS_CONFIG[status] ?? STATUS_CONFIG.inactive;
  return (
    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium ${config.pill}`}>
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
        className="w-9 h-9 flex items-center justify-center rounded-xl border border-brand-border text-brand-label hover:bg-brand-border/30 disabled:opacity-40 transition-colors"
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
              className={`w-9 h-9 rounded-xl border text-sm transition-colors ${
                p === page
                  ? 'border-brand-border-focus bg-brand-brown text-white font-medium'
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
        className="w-9 h-9 flex items-center justify-center rounded-xl border border-brand-border text-brand-label hover:bg-brand-border/30 disabled:opacity-40 transition-colors"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6" /></svg>
      </button>
    </div>
  );
}

export function InstitutionsList({ institutions }: { institutions: Institution[] }) {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return institutions.filter(
      (i) =>
        i.name.toLowerCase().includes(q) ||
        (i.email ?? '').toLowerCase().includes(q),
    );
  }, [institutions, search]);

  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  function handleSearch(value: string) {
    setSearch(value);
    setPage(1);
  }

  return (
    <div className="rounded-2xl px-10 shadow-xl overflow-hidden">

      {/* Toolbar da tabela */}
      <div className="flex items-center justify-between px-6 py-5">
        <span className="text-sm font-semibold text-brand-brown">Instituciones registradas</span>
        <div className="relative w-72">
          <div className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-brand-placeholder">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
          </div>
          <input
            type="text"
            placeholder="Buscar institución..."
            value={search}
            onChange={(e) => handleSearch(e.target.value)}
            className="w-full rounded-xl border border-brand-border pl-9 pr-4 py-2.5 text-sm text-brand-brown placeholder:text-brand-placeholder focus:outline-none focus:border-brand-border-focus transition-colors"
          />
        </div>
      </div>

      {/* Cabeçalho da tabela */}
      <div className="grid grid-cols-[2fr_2fr_1fr_auto] gap-4 px-6 py-3 mb-5">
        <span className="text-xs font-semibold text-brand-label tracking-wide uppercase">Nombre</span>
        <span className="text-xs font-semibold text-brand-label tracking-wide uppercase">Correo electrónico</span>
        <span className="text-xs font-semibold text-brand-label tracking-wide uppercase">Estado</span>
        <span className="text-xs font-semibold text-brand-label tracking-wide uppercase">Acciones</span>
      </div>

      {/* Linhas */}
      {paginated.length === 0 ? (
        <div className="px-6 py-12 text-center text-sm text-brand-placeholder border-t border-brand-border">
          {search ? 'Ninguna institución coincide con la búsqueda.' : 'No hay instituciones registradas.'}
        </div>
      ) : (
        paginated.map((inst) => (
          <div
            key={inst.id}
            className="grid grid-cols-[2fr_2fr_1fr_auto] gap-4 items-center px-6 py-4 border-t border-brand-border"
          >
            <span className="text-sm font-medium text-brand-brown truncate">{inst.name}</span>
            <span className="text-sm text-brand-label truncate">{inst.email ?? '—'}</span>
            <StatusBadge status={inst.status} />
            <div className="flex items-center gap-2">
              <Link
                href={`/admin/institutions/${inst.id}/edit`}
                className="w-9 h-9 flex items-center justify-center rounded-xl border border-brand-border text-brand-label hover:bg-brand-border/30 transition-colors"
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                </svg>
              </Link>
              <button className="w-9 h-9 flex items-center justify-center rounded-xl border border-red-200 text-red-400 hover:bg-red-50 transition-colors">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>
          </div>
        ))
      )}

      {/* Footer com paginação */}
      <div className="flex items-center justify-between px-6 py-4 pt-10 border-t border-brand-border">
        <span className="text-sm text-brand-label">
          Mostrando {Math.min(paginated.length, PAGE_SIZE)} de {filtered.length} instituciones
        </span>
        <Pagination page={page} total={filtered.length} onPage={setPage} />
      </div>
    </div>
  );
}
