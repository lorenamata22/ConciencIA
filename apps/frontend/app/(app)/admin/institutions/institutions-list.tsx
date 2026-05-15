'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
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
    <span className={`inline-flex justify-center items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium w-40 ${config.pill}`}>
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

export function InstitutionsList({ institutions }: { institutions: Institution[] }) {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const router = useRouter();

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
    <div className="rounded-2xl px-10 card-shadow overflow-hidden">

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

      {/* Tabela com scroll lateral no mobile */}
      <div className="overflow-x-auto">
        <div className="min-w-[640px]">

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
            className="grid grid-cols-[2fr_2fr_1fr_auto] gap-4 items-center px-6 py-4 border-t border-brand-border cursor-pointer hover:bg-brand-border/10 transition-colors"
            onClick={() => router.push(`/admin/institutions/${inst.id}`)}
          >
            <span className="text-sm font-medium text-brand-brown truncate">{inst.name}</span>
            <span className="text-sm text-brand-label truncate">{inst.email ?? '—'}</span>
            <StatusBadge status={inst.status} />
            <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
              <Link
                href={`/admin/institutions/${inst.id}/edit`}
                className="w-9 h-9 flex items-center justify-center ps-1 rounded-lg border border-brand-border text-brand-label hover:bg-brand-border/30 transition-colors"
              >
                <svg width="20" height="20" viewBox="0 0 22 23" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M3.68868 20H13.3113C15.3474 19.9975 16.9974 18.3474 17 16.3113V8.47175C17 8.20613 16.7845 7.99062 16.5189 7.99062C16.2532 7.99062 16.0377 8.20613 16.0377 8.47175V16.3113C16.0365 17.8161 14.8161 19.0365 13.3113 19.0377H3.68868C2.18389 19.0365 0.963515 17.8161 0.962264 16.3113V6.68868C0.963517 5.18389 2.18389 3.96352 3.68868 3.96226H11.5282C11.7939 3.96226 12.0094 3.74676 12.0094 3.48113C12.0094 3.21551 11.7939 3 11.5282 3H3.68868C1.65262 3.00251 0.00256604 4.65262 0 6.68868V16.3113C0.00250574 18.3474 1.65262 19.9974 3.68868 20Z" fill="#5F5E5C"/>
                  <path d="M19.3563 0.654695C18.9432 0.235155 18.3791 5.66473e-06 17.7895 5.66473e-06H17.7829C17.192 -0.00133067 16.6238 0.233817 16.2054 0.651993L7.15106 9.70258C7.05481 9.79878 7 9.92971 7 10.066V12.4869C7 12.7702 7.22994 13 7.51334 13H9.93567C10.072 13 10.203 12.9452 10.2993 12.849L19.355 3.7998L19.3563 3.79847V3.79713C20.2146 2.926 20.2145 1.52582 19.3563 0.654695ZM9.72429 11.974H8.02653V10.2772L15.3591 2.95013L17.0555 4.64559L9.72429 11.974ZM18.6277 3.07425L17.7815 3.92L16.085 2.22453L16.9313 1.37745C17.1572 1.15165 17.4647 1.02474 17.7842 1.02608H17.7868C18.1023 1.02474 18.4045 1.15167 18.6264 1.37611C19.0903 1.84641 19.0916 2.60262 18.6277 3.07425Z" fill="#5F5E5C"/>
                </svg>
              </Link>
              <button className="w-9 h-9 flex items-center ps-0.5 justify-center rounded-lg border border-red-200 text-red-400 hover:bg-red-50 transition-colors">
                <svg width="13" height="13" viewBox="0 0 15 15" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M13.5967 0.555664C13.6718 0.48054 13.7834 0.484605 13.8496 0.550781C13.9126 0.614018 13.9165 0.730719 13.8447 0.802734L7.80176 6.84668L7.44824 7.2002L13.8447 13.5967C13.9199 13.6718 13.9158 13.7834 13.8496 13.8496C13.7864 13.9129 13.6688 13.9168 13.5967 13.8447L7.2002 7.44824L6.84668 7.80176L0.802734 13.8447C0.727689 13.9195 0.616916 13.9155 0.550781 13.8496C0.487524 13.7864 0.483594 13.6688 0.555664 13.5967L6.95215 7.2002L6.59863 6.84668L0.555664 0.802734C0.480569 0.72761 0.484613 0.616949 0.550781 0.550781C0.61403 0.487532 0.730661 0.483623 0.802734 0.555664L6.84668 6.59863L7.2002 6.95215L13.5967 0.555664Z" fill="#D86262" stroke="#D86262"/>
                </svg>
              </button>
            </div>
          </div>
        ))
      )}

        </div>
      </div>

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
