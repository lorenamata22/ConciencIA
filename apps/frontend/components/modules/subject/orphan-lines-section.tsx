"use client";

import { useState } from "react";
import type { OrphanLine } from "@/lib/api/subjects";

// Seção colapsável (fechada por padrão). Lista o texto órfão cru para o usuário
// copiar e colar no tópico certo. Sem drag-and-drop, sem "atribuir a…".
export function OrphanLinesSection({ orphans }: { orphans: OrphanLine[] }) {
  const [open, setOpen] = useState(false);

  if (orphans.length === 0) return null;

  return (
    <section className="rounded-xl border border-brand-border">
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left text-sm text-brand-label"
      >
        <span>
          ⚠ {orphans.length}{" "}
          {orphans.length === 1
            ? "línea del documento no fue asignada a ningún tema"
            : "líneas del documento no fueron asignadas a ningún tema"}
        </span>
        <span aria-hidden="true">{open ? "▴" : "▾"}</span>
      </button>

      {open && (
        <ul className="max-h-64 space-y-1 overflow-y-auto border-t border-brand-border px-4 py-3 text-sm text-brand-brown">
          {orphans.map((orphan) => (
            <li key={orphan.line} className="flex gap-3">
              <span className="shrink-0 text-brand-placeholder tabular-nums">
                {orphan.line}
              </span>
              <span className="whitespace-pre-wrap">{orphan.text}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
