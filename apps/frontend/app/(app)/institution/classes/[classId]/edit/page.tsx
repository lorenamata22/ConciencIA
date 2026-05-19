import { notFound } from 'next/navigation';
import { getMyClass } from '@/lib/api/class';
import { getMyCourses, getMySubjects } from '@/lib/api/subject';
import { EditClassForm } from './edit-class-form';

export default async function EditClassPage({
  params,
}: {
  params: Promise<{ classId: string }>;
}) {
  const { classId } = await params;
  const [classItem, courses, subjects] = await Promise.all([
    getMyClass(classId),
    getMyCourses(),
    getMySubjects(),
  ]);

  if (!classItem) notFound();

  return <EditClassForm classItem={classItem} courses={courses} subjects={subjects} />;
}
