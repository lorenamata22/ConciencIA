'use client';

import { useState } from 'react';
import { ObjectSelect } from '@/components/ui/form';
import type { SubjectItem } from '@/lib/api/subject';

// Tela de seleção de matéria antes de entrar no chat (Figma "señalar asignatura")
export function SubjectPicker({
  subjects,
  onConfirm,
}: {
  subjects: SubjectItem[];
  onConfirm: (subjectId: string) => void;
}) {
  const [selectedId, setSelectedId] = useState('');

  return (
    <div className="flex flex-1 flex-col items-center justify-center px-4">
      <h1 className="text-3xl font-semibold text-brand-brown mb-8 text-center">
        ¿Qué estudiamos hoy?
      </h1>

      <div className="w-full max-w-md">
        <ObjectSelect
          name="subject"
          placeholder="Elegir asignatura"
          options={subjects.map((subject) => ({
            id: subject.id,
            label: subject.name,
          }))}
          onChange={setSelectedId}
        />
      </div>

      <button
        type="button"
        disabled={!selectedId}
        onClick={() => onConfirm(selectedId)}
        className="mt-8 rounded-xl bg-primary px-8 py-3 text-sm font-medium text-primary-text transition-colors hover:bg-primary-hover disabled:opacity-60 disabled:cursor-not-allowed"
      >
        Confirmar
      </button>
    </div>
  );
}
