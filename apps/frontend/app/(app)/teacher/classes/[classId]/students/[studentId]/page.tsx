import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getTeacherClassDetail } from '@/lib/api/teacher';
import { getInitials } from '@/lib/utils/user';
import { TeacherTasksTable } from './teacher-tasks-table';

export default async function TeacherStudentDetailPage({
  params,
}: {
  params: Promise<{ classId: string; studentId: string }>;
}) {
  const { classId, studentId } = await params;
  const detail = await getTeacherClassDetail(classId);
  const student = detail?.students.find((s) => s.id === studentId);

  if (!detail || !student) notFound();

  return (
    <div className="pt-10 px-10 md:px-30 pb-16">

      <div className="mt-15 mb-10">
        <Link
          href={`/teacher/classes?classId=${classId}`}
          className="flex items-center gap-1.5 text-sm text-brand-label hover:text-brand-brown transition-colors w-fit"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
          Clases/Alumnos
        </Link>
      </div>

      <div className="flex items-center gap-4 mb-10">
        <span className="shrink-0 w-14 h-14 rounded-full bg-[#8ACFC9] text-white flex items-center justify-center text-lg font-semibold">
          {getInitials(student.name)}
        </span>
        <div>
          <h1 className="text-4xl text-brand">{student.name}</h1>
          <p className="text-sm text-brand-label mt-1">{student.email}</p>
        </div>
      </div>

      <div className="flex flex-col gap-4 mb-10">
        {detail.subjects.length === 0 && (
          <div className="rounded-2xl card-shadow p-6 text-sm text-brand-placeholder">
            No hay materias asignadas en esta clase.
          </div>
        )}
        {detail.subjects.map((subject) => (
          <div key={subject.id} className="rounded-2xl card-shadow p-6 flex items-center gap-5">
            <div className="w-1.5 self-stretch bg-primary" />
            <div className="flex-1 min-w-0">
              <p className="text-base font-medium text-brand-brown truncate">
                {subject.name} - {detail.class.name}
              </p>
              <p className="text-sm text-brand-label mt-0.5">
                {detail.class.course.name} · {detail.class.year} &nbsp;&nbsp; {detail.class.period}
              </p>
            </div>
            <div className="flex items-center gap-10 shrink-0">
              <div className="text-center">
                <p className="text-2xl text-brand">—</p>
                <p className="text-xs text-brand-label mt-1">Tareas entregues</p>
              </div>
              <div className="divider" />
              <div className="text-center">
                <p className="text-2xl text-brand">—</p>
                <p className="text-xs text-brand-label mt-1">Nota media</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      <TeacherTasksTable subjects={detail.subjects} tasks={[]} />

    </div>
  );
}
