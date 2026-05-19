import { notFound } from 'next/navigation';
import { getMySubject, getMyCourses } from '@/lib/api/subject';
import { EditSubjectForm } from './edit-subject-form';

export default async function EditSubjectPage({
  params,
}: {
  params: Promise<{ subjectId: string }>;
}) {
  const { subjectId } = await params;
  const [subject, courses] = await Promise.all([getMySubject(subjectId), getMyCourses()]);

  if (!subject) notFound();

  return <EditSubjectForm subject={subject} courses={courses} />;
}
