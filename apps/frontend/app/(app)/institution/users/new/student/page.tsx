import { getMyClasses } from '@/lib/api/class';
import { CreateStudentForm } from './create-student-form';

export default async function NewStudentPage() {
  const classes = await getMyClasses();
  return <CreateStudentForm classes={classes} />;
}
