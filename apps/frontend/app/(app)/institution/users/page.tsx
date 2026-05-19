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
        <div className="flex items-center gap-3">
          <button className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium text-brand-label border border-brand-border hover:bg-brand-border/30 transition-colors">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" />
            </svg>
            Exportar datos
          </button>
          <Link
            href="/institution/users/new"
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium text-white bg-[#999DA3] hover:bg-[#999DA3]/80 transition-colors"
          >
            <svg width="18" height="18" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M9.69824 0.100388V0.101364L9.7002 0.100388L10.1934 0.112106C15.2634 0.369313 19.2998 4.56739 19.2998 9.7C19.2998 12.2535 18.3001 14.5742 16.6719 16.2947C16.6706 16.2964 16.6707 16.2987 16.6699 16.2996C16.6669 16.3031 16.6638 16.3057 16.6631 16.3064L16.6621 16.3055C16.6494 16.3209 16.6359 16.3351 16.6211 16.3484L16.6221 16.3494C14.8746 18.1672 12.4183 19.2996 9.7002 19.2996C4.40131 19.2994 0.100586 14.998 0.100586 9.7C0.100586 4.40223 4.4005 0.10314 9.69727 0.101364V0.100388H9.69824ZM9.7002 10.3367C6.45384 10.3369 3.80863 12.7646 3.45898 15.9119C5.05341 17.5138 7.2589 18.5065 9.7002 18.5066C12.1426 18.5066 14.3498 17.5127 15.9443 15.909C15.5936 12.7633 12.9458 10.3367 9.7002 10.3367ZM9.7002 0.893356C4.83352 0.893854 0.894531 4.8334 0.894531 9.7C0.894531 11.756 1.59933 13.6452 2.77832 15.1434C3.31913 12.5809 5.24076 10.5365 7.73145 9.81914C6.51419 9.1306 5.69059 7.82425 5.69043 6.32793C5.69043 4.11674 7.48883 2.31532 9.7002 2.31523C11.9116 2.31523 13.7119 4.1166 13.7119 6.32793C13.7118 7.82457 12.8868 9.13072 11.6689 9.81914C14.1602 10.5355 16.0824 12.5793 16.624 15.1414C17.8027 13.644 18.5068 11.7559 18.5068 9.7C18.5068 4.83309 14.5673 0.893356 9.7002 0.893356ZM9.7002 3.10918C7.92025 3.10937 6.48535 4.54778 6.48535 6.32793C6.48558 8.10776 7.92022 9.54258 9.7002 9.54277C11.4804 9.54277 12.9177 8.10786 12.918 6.32793C12.918 4.54767 11.4804 3.10918 9.7002 3.10918Z" fill="white"/>
            </svg>
            Nuevo usuario
          </Link>
        </div>
      </div>

      <InstitutionUsersList users={users} />

    </div>
  );
}
