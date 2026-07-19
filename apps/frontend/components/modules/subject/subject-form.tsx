"use client";

import { FormField, ObjectSelect, inputClass } from "@/components/ui/form";
import type { CourseOption } from "@/lib/api/subject";
import { ProgramUpload } from "./program-upload";

// Tela 1: Curso + Nombre + upload do programa. "Siguiente" dispara o parse.
export function SubjectForm({
  courses,
  name,
  courseId,
  file,
  error,
  submitting,
  onNameChange,
  onCourseChange,
  onSelectFile,
  onClearFile,
  onError,
  onSubmit,
}: {
  courses: CourseOption[];
  name: string;
  courseId: string;
  file: File | null;
  error: string | null;
  submitting: boolean;
  onNameChange: (name: string) => void;
  onCourseChange: (courseId: string) => void;
  onSelectFile: (file: File) => void;
  onClearFile: () => void;
  onError: (message: string) => void;
  onSubmit: () => void;
}) {
  const canSubmit = name.trim() !== "" && courseId !== "" && file !== null;

  return (
    <form
      autoComplete="off"
      onSubmit={(event) => {
        event.preventDefault();
        if (canSubmit && !submitting) onSubmit();
      }}
    >
      <div className="flex max-w-2xl flex-col gap-6">
        <FormField label="Nombre" required>
          <input
            type="text"
            value={name}
            onChange={(event) => onNameChange(event.target.value)}
            placeholder="Ej. Matemáticas"
            aria-label="Nombre"
            className={inputClass}
            autoFocus
          />
        </FormField>

        <FormField label="Curso" required>
          <ObjectSelect
            name="course_id"
            placeholder="Seleccionar curso"
            options={courses.map((course) => ({
              id: course.id,
              label: course.name,
            }))}
            defaultValue={courseId}
            onChange={onCourseChange}
          />
        </FormField>

        <ProgramUpload
          file={file}
          onSelect={onSelectFile}
          onClear={onClearFile}
          onError={onError}
        />

        {error && (
          <p
            role="alert"
            className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600"
          >
            {error}
          </p>
        )}

        <div className="flex justify-end pt-2">
          <button
            type="submit"
            disabled={!canSubmit || submitting}
            className="rounded-xl bg-[#999DA3] px-6 py-3 text-sm font-medium text-white transition-colors hover:bg-[#999DA3]/90 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {submitting ? "Analizando el programa..." : "Siguiente"}
          </button>
        </div>
      </div>
    </form>
  );
}
