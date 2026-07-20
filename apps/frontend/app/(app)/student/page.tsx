import { getStudentSubjects } from "@/lib/api/subject";
import { getUserName } from "@/lib/session";
import { formatFirstName } from "@/lib/utils/user";
import { StudentLearningScreen } from "@/components/modules/student/student-learning-screen";

// Aprendizado do aluno — estudo e exame sob o mesmo header persistente (item
// "Chat" da sidebar aponta para /student). ?mode=exam entra direto no exame
// (usado pelo redirect de /student/exam); o padrão é o Modo Estudo.
export default async function StudentLearningPage({
  searchParams,
}: {
  searchParams: Promise<{ subjectId?: string; mode?: string }>;
}) {
  const [subjects, userName, params] = await Promise.all([
    getStudentSubjects(),
    getUserName(),
    searchParams,
  ]);

  return (
    <div className="h-full">
      <StudentLearningScreen
        subjects={subjects}
        initialSubjectId={params.subjectId}
        initialMode={params.mode === "exam" ? "exam" : "study"}
        studentName={formatFirstName(userName ?? "Estudiante")}
      />
    </div>
  );
}
