import { getMyCourses, getMySubjects } from '@/lib/api/subject';
import { getMyClasses } from '@/lib/api/class';
import { CreateTeacherForm } from './create-teacher-form';

export default async function NewTeacherPage() {
  const [courses, subjects, classes] = await Promise.all([
    getMyCourses(),
    getMySubjects(),
    getMyClasses(),
  ]);

  return <CreateTeacherForm courses={courses} subjects={subjects} classes={classes} />;
}
