import { ExamPage } from "@/components/modules/exam/exam-page";
import { getStudentSubjects } from "@/lib/api/subject";
import { getUserName } from "@/lib/session";
import { formatFirstName } from "@/lib/utils/user";

export default async function StudentExamPage({
  searchParams,
}: {
  searchParams: Promise<{ subjectId?: string }>;
}) {
  const [subjects, userName, params] = await Promise.all([
    getStudentSubjects(),
    getUserName(),
    searchParams,
  ]);

  return (
    <ExamPage
      subjects={subjects}
      initialSubjectId={params.subjectId}
      studentName={formatFirstName(userName ?? "Estudiante")}
    />
  );
}
