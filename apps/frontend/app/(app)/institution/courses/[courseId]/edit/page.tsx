import { notFound } from 'next/navigation';
import { getMyCourse } from '@/lib/api/subject';
import { EditCourseForm } from './edit-course-form';

export default async function EditCoursePage({
  params,
}: {
  params: Promise<{ courseId: string }>;
}) {
  const { courseId } = await params;
  const course = await getMyCourse(courseId);

  if (!course) notFound();

  return <EditCourseForm course={course} />;
}
