import { getStudentSubjects } from "@/lib/api/subject";
import { getUserName } from "@/lib/session";
import { formatFirstName } from "@/lib/utils/user";
import { StudentShell } from "@/components/modules/student/student-shell";

// Layout persistente da área do aluno: o header (seletor de modo + Pomodoro +
// ícones) fica montado em todas as telas /student/*, e o StudentShell é dono de
// modo + matéria. Não desmonta ao navegar entre as telas do aluno.
export default async function StudentLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [subjects, userName] = await Promise.all([
    getStudentSubjects(),
    getUserName(),
  ]);

  return (
    <StudentShell
      subjects={subjects}
      studentName={formatFirstName(userName ?? "Estudiante")}
    >
      {children}
    </StudentShell>
  );
}
