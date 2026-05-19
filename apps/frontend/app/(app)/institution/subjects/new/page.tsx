import { getMyCourses } from '@/lib/api/subject';
import { CreateSubjectForm } from './create-subject-form';

export default async function NewSubjectPage() {
  const courses = await getMyCourses();
  return <CreateSubjectForm courses={courses} />;
}
