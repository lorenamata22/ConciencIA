import { getMyCourses, getMySubjects } from '@/lib/api/subject';
import { getMyPeriodOptions } from '@/lib/api/period-option';
import { CreateClassForm } from './create-class-form';

export default async function NewClassPage() {
  const [courses, subjects, periodOptions] = await Promise.all([
    getMyCourses(),
    getMySubjects(),
    getMyPeriodOptions(),
  ]);

  return (
    <CreateClassForm
      courses={courses}
      subjects={subjects}
      initialPeriodOptions={periodOptions}
    />
  );
}
