import { notFound } from 'next/navigation';
import { getMyTeacher } from '@/lib/api/teacher';
import { getMyStudent } from '@/lib/api/student';
import { getMyCourses, getMySubjects } from '@/lib/api/subject';
import { getMyClasses } from '@/lib/api/class';
import { EditTeacherForm } from './edit-teacher-form';
import { EditStudentForm } from './edit-student-form';

interface Props {
  params: Promise<{ userId: string }>;
}

export default async function EditUserPage({ params }: Props) {
  const { userId } = await params;

  const [teacher, student, courses, subjects, classes] = await Promise.all([
    getMyTeacher(userId),
    getMyStudent(userId),
    getMyCourses(),
    getMySubjects(),
    getMyClasses(),
  ]);

  if (teacher) {
    return (
      <EditTeacherForm
        teacher={teacher}
        courses={courses}
        subjects={subjects}
        classes={classes}
      />
    );
  }

  if (student) {
    return <EditStudentForm student={student} classes={classes} />;
  }

  notFound();
}
