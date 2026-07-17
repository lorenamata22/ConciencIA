"use client";

import { useEffect, useRef, useState } from "react";
import type { SubjectItem } from "@/lib/api/subject";

export function InlineSubjectSelect({
  subjects,
  selectedId,
  onChange,
}: {
  subjects: SubjectItem[];
  selectedId: string;
  onChange: (id: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onMouseDown(event: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onMouseDown);
    return () => document.removeEventListener("mousedown", onMouseDown);
  }, []);

  const selectedName =
    subjects.find((subject) => subject.id === selectedId)?.name ?? "";

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        className="flex min-w-36 items-center justify-center gap-1.5 border-b border-brand-brown/40 pb-1 text-base text-brand-brown"
        aria-expanded={open}
      >
        <span>{selectedName}</span>
        <ChevronIcon open={open} />
      </button>

      {open && (
        <ul className="absolute left-1/2 top-full z-50 mt-2 max-h-72 w-56 -translate-x-1/2 overflow-y-auto rounded-2xl border border-brand-border bg-brand-bg py-2 shadow-lg">
          {subjects.map((subject) => (
            <li key={subject.id}>
              <button
                type="button"
                onClick={() => {
                  setOpen(false);
                  if (subject.id !== selectedId) onChange(subject.id);
                }}
                className="w-full px-5 py-2.5 text-left text-sm text-brand-brown transition-colors hover:bg-brand-border/30"
              >
                {subject.name}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function ChevronIcon({ open }: { open: boolean }) {
  return (
    <svg
      className={`transition-transform duration-200 ${open ? "rotate-180" : ""}`}
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <polyline points="6 9 12 15 18 9" />
    </svg>
  );
}
