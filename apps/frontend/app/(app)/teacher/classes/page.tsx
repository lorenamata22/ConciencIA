import Link from 'next/link';
import { getMyTeacherClasses, getTeacherClassDetail } from '@/lib/api/teacher';
import { getClassStudents } from '@/lib/api/classes';
import { StudentsTable } from './students-table';

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('es-ES', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

export default async function TeacherClassesPage({
  searchParams,
}: {
  searchParams: Promise<{ classId?: string }>;
}) {
  const { classId } = await searchParams;
  const classes = await getMyTeacherClasses();
  const activeClassId = classes.some((c) => c.id === classId) ? classId : classes[0]?.id;
  const [detail, roster] = activeClassId
    ? await Promise.all([getTeacherClassDetail(activeClassId), getClassStudents(activeClassId)])
    : [null, []];
  // Contador "En riesgo" derivado do roster já carregado — sem chamada extra.
  const atRiskCount = roster.filter((s) => s.status === 'at_risk').length;
  const lastUpdate = formatDate(new Date().toISOString());

  return (
    <div className="pt-10 px-10 md:px-30 pb-16">

      <div className="mt-15 mb-10">
        <Link
          href="/teacher"
          className="flex items-center gap-1.5 text-sm text-brand-label hover:text-brand-brown transition-colors w-fit"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
          Home
        </Link>
      </div>

      <div className="mb-10">
        <h1 className="text-4xl text-brand">Clases/Alumnos</h1>
        <p className="text-sm text-brand-label mt-1">Última actualización: {lastUpdate}</p>
      </div>

      {classes.length === 0 ? (
        <div className="rounded-2xl card-shadow p-10 text-center text-sm text-brand-placeholder">
          No tienes clases asignadas todavía.
        </div>
      ) : (
        <>
          <div className="flex flex-wrap items-center gap-3 mb-8">
            {classes.map((c) => {
              const active = c.id === activeClassId;
              return (
                <Link
                  key={c.id}
                  href={`/teacher/classes?classId=${c.id}`}
                  className={`flex flex-col items-center px-15 py-2.5 rounded-xl text-md font-medium border transition-colors ${
                    active
                      ? 'bg-primary/30 text-primary border-primary'
                      : 'border-primary text-primary hover:bg-brand-border/30'
                  }`}
                >
                  <span>{c.name}</span>
                </Link>
              );
            })}
          </div>

          <div className="flex flex-col gap-4 mb-10">
            {detail && detail.subjects.length === 0 && (
              <div className="rounded-2xl card-shadow p-6 text-sm text-brand-placeholder">
                No hay materias asignadas en esta clase.
              </div>
            )}
            {detail?.subjects.map((subject) => (
              <div key={subject.id} className="rounded-2xl card-shadow p-6 flex items-center gap-5">
                <div className="w-1.5 self-stretch bg-primary" />
                <div className="flex-1 min-w-0">
                  <p className="text-base font-medium text-brand-brown truncate">
                    {subject.name} - {detail.class.name}
                  </p>
                  <p className="text-sm text-brand-label mt-0.5">{detail.class.course.name} -  {detail.class.year}</p>
                </div>
                <div className="flex items-center gap-10 shrink-0">
                  <div className="text-center">
                    <p className="text-2xl text-brand">{subject.studentCount}</p>
                    <p className="text-xs text-brand-label mt-1">Alumnos</p>
                  </div>
                  <div className="divider" />
                  <div className="text-center">
                    <p className="text-2xl">{subject.averageGrade ?? '—'}</p>
                    <p className="text-xs text-brand-label mt-1">Nota media</p>
                  </div>
                  <div className="divider" />
                  <div className="text-center">
                    <p className="text-2xl font-semibold text-amber-600">{atRiskCount}</p>
                    <p className="text-xs text-brand-label mt-1">En riesgo</p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {activeClassId && <StudentsTable students={roster} classId={activeClassId} />}
        </>
      )}

    </div>
  );
}
