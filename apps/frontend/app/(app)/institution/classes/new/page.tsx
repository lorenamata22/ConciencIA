import { getMyCourses, getMySubjects } from '@/lib/api/subject';
import { CreateClassForm } from './create-class-form';

export default async function NewClassPage() {
  const [courses, subjects] = await Promise.all([getMyCourses(), getMySubjects()]);

  return <CreateClassForm courses={courses} subjects={subjects} />;
}
