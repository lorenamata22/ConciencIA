import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getMyClass, getClassUsers } from '@/lib/api/class';
import { InstitutionUsersList } from '../../../users/users-list';

export default async function ClassUsersPage({
  params,
}: {
  params: Promise<{ classId: string }>;
}) {
  const { classId } = await params;
  const [classItem, users] = await Promise.all([
    getMyClass(classId),
    getClassUsers(classId),
  ]);

  if (!classItem) notFound();

  return (
    <div className="pt-10 px-10 md:px-30 pb-16">

      {/* Breadcrumb */}
      <div className="mt-15 mb-10">
        <Link
          href="/institution/classes"
          className="flex items-center gap-1.5 text-sm text-brand-label hover:text-brand-brown transition-colors w-fit"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
          Clases
        </Link>
      </div>

      {/* Header */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-10 gap-4">
        <h1 className="text-4xl text-brand flex flex-wrap items-center gap-2">
          <Link href="/institution/classes" className="text-brand-label hover:text-brand transition-colors">
            Clases
          </Link>
          <span className="text-brand-label">/</span>
          <span className="text-brand-label">{classItem.name}</span>
          <span className="text-brand-label">/</span>
          <span>Usuarios</span>
        </h1>
      </div>

      <InstitutionUsersList users={users} showCreateButton={false} />

    </div>
  );
}
