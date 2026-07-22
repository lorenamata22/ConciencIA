"use client";

import { useEffect, useState, type ReactNode } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type { SubjectItem } from "@/lib/api/subject";
import { LearningHeader, type LearningMode } from "./learning-header";
import { StudentLearningProvider } from "./student-context";

// Shell persistente da área do aluno: vive no layout de /student (não desmonta
// ao navegar entre as telas do aluno), renderiza o header sempre visível e é
// dono de modo + matéria, expostos via contexto para o corpo estudo/exame.
export function StudentShell({
  subjects,
  studentName,
  children,
}: {
  subjects: SubjectItem[];
  studentName: string;
  children: ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();

  const defaultSubjectId = subjects[0]?.id ?? "";
  const paramMode = searchParams.get("mode");
  const paramSubject = searchParams.get("subjectId");
  const paramSubjectValid = Boolean(
    paramSubject && subjects.some((subject) => subject.id === paramSubject),
  );

  const [mode, setMode] = useState<LearningMode>(
    paramMode === "exam" ? "exam" : "study",
  );
  const [subjectId, setSubjectId] = useState(
    paramSubjectValid ? (paramSubject as string) : defaultSubjectId,
  );

  // Adota modo/matéria só quando VÊM na URL (deep-link ou push de outra tela do
  // aluno). Param ausente não reseta — o link "Chat" da sidebar é /student sem
  // query e deve preservar o estado atual.
  useEffect(() => {
    if (paramMode === "exam" || paramMode === "study") setMode(paramMode);
    if (paramSubjectValid) setSubjectId(paramSubject as string);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paramMode, paramSubject]);

  const isLearningScreen = pathname === "/student";

  function handleModeChange(next: LearningMode) {
    // No /student a troca é in-place (instantânea); fora dele, navega para a
    // tela de aprendizado já no modo escolhido.
    if (isLearningScreen) {
      setMode(next);
      return;
    }
    const query = new URLSearchParams({ mode: next });
    if (subjectId) query.set("subjectId", subjectId);
    router.push(`/student?${query.toString()}`);
  }

  return (
    <StudentLearningProvider
      value={{ subjects, studentName, mode, subjectId }}
    >
      <div className="flex h-full flex-col">
        {/* Padding horizontal só no header — corpos com wrapper próprio (ex.:
            DriveBrowser em Archivos) trazem o seu, evitando padding duplo. */}
        <div className="px-10 pt-10 md:px-30">
          <LearningHeader
            mode={mode}
            onModeChange={handleModeChange}
            subjects={subjects}
            subjectId={subjectId}
            onSubjectChange={setSubjectId}
            showSubjectSelect={isLearningScreen}
          />
        </div>
        {/* Região de conteúdo rola por dentro → o header fica sempre visível.
            O chat preenche a altura (input fixo); telas longas (Archivos)
            rolam aqui. */}
        <div className="min-h-0 flex-1 overflow-y-auto">{children}</div>
      </div>
    </StudentLearningProvider>
  );
}
