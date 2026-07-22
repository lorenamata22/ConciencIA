"use client";

import { createContext, useContext } from "react";
import type { SubjectItem } from "@/lib/api/subject";
import type { LearningMode } from "./learning-header";

// Estado de aprendizado (modo + matéria) provido pelo StudentShell no layout de
// /student e consumido pelo corpo estudo/exame. Separado num arquivo próprio
// para o corpo importar sem ciclo com o shell.
export interface StudentLearningValue {
  subjects: SubjectItem[];
  studentName: string;
  mode: LearningMode;
  subjectId: string;
}

const StudentLearningContext = createContext<StudentLearningValue | null>(null);

export const StudentLearningProvider = StudentLearningContext.Provider;

export function useStudentLearning(): StudentLearningValue {
  const value = useContext(StudentLearningContext);
  if (!value) {
    throw new Error("useStudentLearning deve ser usado dentro de StudentShell");
  }
  return value;
}
