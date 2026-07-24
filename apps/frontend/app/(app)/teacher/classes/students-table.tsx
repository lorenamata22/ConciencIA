'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import type { ClassStudent } from '@/lib/api/classes';
import { getInitials } from '@/lib/utils/user';
import { AlertStatusBadge } from '@/components/modules/alerts/alert-status-badge';

const PAGE_SIZE = 8;

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

export function StudentsTable({ students, classId }: { students: ClassStudent[]; classId: string }) {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return students.filter(
      (s) => s.name.toLowerCase().includes(q) || s.email.toLowerCase().includes(q),
    );
  }, [students, search]);

  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  function handleSearch(value: string) {
    setSearch(value);
    setPage(1);
  }

  return (
    <div className="rounded-2xl px-10 card-shadow overflow-hidden">
      <div className="flex items-center justify-between px-6 py-5">
        <span className="text-sm font-semibold text-brand-brown">Alumnos</span>
        <div className="relative w-72">
          <div className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-brand-placeholder">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
          </div>
          <input
            type="text"
            placeholder="Buscar alumno..."
            value={search}
            onChange={(e) => handleSearch(e.target.value)}
            className="w-full rounded-xl border border-brand-border pl-9 pr-4 py-2.5 text-sm text-brand-brown placeholder:text-brand-placeholder focus:outline-none focus:border-brand-border-focus transition-colors"
          />
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full table-fixed min-w-[560px]">
          <thead>
            <tr>
              <th scope="col" className="pl-6 pr-4 pt-3 pb-8 text-xs font-semibold text-brand-label tracking-wide uppercase text-left">Nombre</th>
              <th scope="col" className="px-4 pt-3 pb-8 text-xs font-semibold text-brand-label tracking-wide uppercase text-left">Nota media</th>
              {/*
                TODO: Coluna ASISTENCIA — bloqueada.
                Não existe entidade de presença/chamada no modelo de dados
                (nem no PRD, nem na Technical Specification, nem no schema Prisma).
                Exibir esta coluna exige um módulo novo: cadastro de aula dada,
                marcação de presença por aluno e tela de chamada do professor.
                Escopo comercial pendente — não implementar sem definição.

                ⚠️ NÃO confundir com `guidance_need` do teste cognitivo.
                `guidance_need` mede quanta orientação estruturada o aluno precisa
                (LOW/MEDIUM/HIGH) e serve para adaptar o prompt do Modo Estudo.
                Não tem relação com presença — os significados são opostos:
                guidance_need alto = aluno que precisa de mais apoio;
                asistencia alta = aluno presente e engajado.

                <th>ASISTENCIA</th>
              */}
              <th scope="col" className="pl-4 pr-6 pt-3 pb-8 text-xs font-semibold text-brand-label tracking-wide uppercase text-left">Estado</th>
            </tr>
          </thead>
          <tbody>
            {paginated.length === 0 ? (
              <tr>
                <td colSpan={3} className="px-6 py-12 text-center text-sm text-brand-placeholder border-t border-brand-border">
                  {search ? 'Ningún alumno coincide con la búsqueda.' : 'No hay alumnos en esta clase.'}
                </td>
              </tr>
            ) : (
              paginated.map((student) => (
                <tr
                  key={student.id}
                  onClick={() => router.push(`/teacher/classes/${classId}/students/${student.id}`)}
                  className="cursor-pointer hover:bg-brand-border/15 transition-colors"
                >
                  <td className="pl-6 pr-4 py-4 border-t border-brand-border max-w-0">
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="shrink-0 w-9 h-9 rounded-full bg-[#8ACFC9] text-white flex items-center justify-center text-xs font-semibold">
                        {getInitials(student.name)}
                      </span>
                      <div className="min-w-0">
                        <span className="block truncate text-sm font-medium text-brand-brown">{student.name}</span>
                        <span className="block truncate text-xs text-brand-placeholder mt-0.5">{student.email}</span>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-4 border-t border-brand-border">
                    <span className="text-sm text-brand-brown">{student.average_grade ?? '—'}</span>
                  </td>
                  {/* Coluna ASISTENCIA comentada — ver <thead> */}
                  <td className="pl-4 pr-6 py-4 border-t border-brand-border">
                    <AlertStatusBadge status={student.status} />
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between px-6 py-4 pt-10 border-t border-brand-border">
        <span className="text-sm text-brand-label">
          Mostrando {Math.min(paginated.length, PAGE_SIZE)} de {filtered.length} alumnos
        </span>
        <Pagination page={page} total={filtered.length} onPage={setPage} />
      </div>
    </div>
  );
}
