import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getInstitutionById, getInstitutionUsers } from '@/lib/api/institution';
import { UsersList } from './users-list';

export default async function InstitutionUsersPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [institution, users] = await Promise.all([
    getInstitutionById(id),
    getInstitutionUsers(id),
  ]);

  if (!institution) notFound();

  return (
    <div className="pt-10 px-10 md:px-30">

      {/* Toolbar */}
      <div className="mt-15 mb-10">
        <Link
          href={`/admin/institutions/${id}`}
          className="flex items-center gap-1.5 text-sm text-brand-label hover:text-brand-brown transition-colors w-fit"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
          {institution.name}
        </Link>
      </div>

      {/* Header */}
      <div className="mb-10">
        <h1 className="text-4xl text-brand">Usuarios</h1>
        <p className="text-sm text-brand-label mt-1">
          Todos los usuarios registrados en <span className="font-medium">{institution.name}</span>
        </p>
      </div>

      <UsersList users={users} institutionId={id} />

    </div>
  );
}
