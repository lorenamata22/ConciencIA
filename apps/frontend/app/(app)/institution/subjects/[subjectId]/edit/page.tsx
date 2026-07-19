import { notFound } from 'next/navigation';
import { getMySubject, getMyCourses, getMySubjectStructure } from '@/lib/api/subject';
import { EditSubjectForm } from './edit-subject-form';

export default async function EditSubjectPage({
  params,
}: {
  params: Promise<{ subjectId: string }>;
}) {
  const { subjectId } = await params;
  const [subject, courses, structure] = await Promise.all([
    getMySubject(subjectId),
    getMyCourses(),
    getMySubjectStructure(subjectId),
  ]);

  if (!subject) notFound();

  return (
    <EditSubjectForm
      subject={subject}
      courses={courses}
      modules={structure?.modules ?? []}
    />
  );
}
