import Link from 'next/link';
import { getMyInstitutionUsers } from '@/lib/api/institution';
import { InstitutionUsersList } from './users-list';

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('es-ES', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

export default async function InstitutionUsersPage() {
  const users = await getMyInstitutionUsers();
  const lastUpdate = users.length > 0
    ? formatDate(users[0].created_at)
    : formatDate(new Date().toISOString());

  return (
    <div className="pt-10 px-10 md:px-30 pb-16">

      {/* Breadcrumb */}
      <div className="mt-15 mb-10">
        <Link
          href="/institution"
          className="flex items-center gap-1.5 text-sm text-brand-label hover:text-brand-brown transition-colors w-fit"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
          Home
        </Link>
      </div>

      {/* Header */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-10 gap-4">
        <div>
          <h1 className="text-4xl text-brand">Usuarios</h1>
          <p className="text-sm text-brand-label mt-1">
            Ultima atualización: {lastUpdate}
          </p>
        </div>
      </div>

      <InstitutionUsersList users={users} />

    </div>
  );
}
