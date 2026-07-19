"use client";

import { useRef } from "react";
import { PROGRAM_ACCEPT_ATTR, validateProgramFile } from "./subject.constants";

// Dropzone com validação de tipo e tamanho NO CLIENT antes de qualquer upload:
// arquivo inválido nunca chega à API (sem round-trip).
export function ProgramUpload({
  file,
  onSelect,
  onClear,
  onError,
}: {
  file: File | null;
  onSelect: (file: File) => void;
  onClear: () => void;
  onError: (message: string) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  function handleFile(candidate: File | null | undefined) {
    if (!candidate) return;
    const error = validateProgramFile(candidate);
    if (error) {
      onError(error);
      return;
    }
    onSelect(candidate);
  }

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => inputRef.current?.click()}
      onKeyDown={(event) => event.key === "Enter" && inputRef.current?.click()}
      onDrop={(event) => {
        event.preventDefault();
        handleFile(event.dataTransfer.files?.[0]);
      }}
      onDragOver={(event) => event.preventDefault()}
      className="flex w-full cursor-pointer items-start gap-4 rounded-2xl border border-brand-border px-6 py-5 transition-colors hover:border-brand-border-focus"
    >
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-brand-border text-brand-label">
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
          <polyline points="17 8 12 3 7 8" />
          <line x1="12" y1="3" x2="12" y2="15" />
        </svg>
      </div>
      <div className="min-w-0 flex-1">
        {file ? (
          <div className="flex items-center gap-2">
            <span className="truncate text-sm font-medium text-brand-brown">
              {file.name}
            </span>
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                onClear();
              }}
              aria-label="Quitar archivo"
              className="shrink-0 text-brand-placeholder transition-colors hover:text-red-500"
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>
        ) : (
          <>
            <p className="text-sm font-medium text-brand-brown">
              Subir programa de asignatura
            </p>
            <p className="mt-0.5 text-xs text-brand-placeholder">
              <span className="font-medium">Haz clic</span> o arrastra tu archivo
              aquí
            </p>
          </>
        )}
        <hr className="my-3 border-brand-border" />
        <ul className="space-y-0.5 text-xs text-brand-placeholder">
          <li>• PDF o DOCX</li>
          <li>• Máximo 1MB</li>
        </ul>
      </div>
      <input
        ref={inputRef}
        type="file"
        accept={PROGRAM_ACCEPT_ATTR}
        className="hidden"
        aria-label="Programa de asignatura"
        onChange={(event) => handleFile(event.target.files?.[0])}
      />
    </div>
  );
}
