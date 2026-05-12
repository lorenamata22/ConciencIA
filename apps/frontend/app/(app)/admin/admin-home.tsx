import Link from 'next/link';
import { getInstitutionStats } from '@/lib/api/institution';

interface StatCardProps {
  icon: React.ReactNode;
  label: string;
  value: number | string;
  footer: React.ReactNode;
}

function StatCard({ icon, label, value, footer }: StatCardProps) {
  return (
    <div className="bg-white rounded-2xl border border-brand-border p-6 flex flex-col gap-8">
      <div className="flex items-center gap-2.5 text-brand-label">
        {icon}
        <span className="text-sm font-medium">{label}</span>
      </div>
      <div className="flex flex-col gap-3">
        <span className="text-5xl font-bold text-brand-brown">{value}</span>
        <div className="text-sm">{footer}</div>
      </div>
    </div>
  );
}

export async function AdminHome() {
  const stats = await getInstitutionStats();
  const activePercent = stats.total > 0
    ? Math.round((stats.active / stats.total) * 100)
    : 0;

  return (
    <div className="p-10">

      {/* Tool Bar */}
      <div className="flex flex-col md:flex-row items-start md:itens-center justify-between mb-10">
        
      </div>

      {/* Header */}
      <div className="flex flex-col md:flex-row items-start md:itens-center justify-between mb-10">
        <div className="flex flex-col gap-1">
          <h1 className="text-4xl font-bold text-brand-brown">
            Gestión de Instituciones
          </h1>
          <p className="text-sm text-brand-label mt-1">
            Crea y administra instituciones educativas dentro de la plataforma
          </p>
        </div>
        <Link
          href="/admin/institutions/new"
          className="flex items-center gap-2 bg-primary text-primary-text text-sm font-medium px-5 py-3 mt-5 md:mt-0 rounded-xl hover:bg-primary-hover transition-colors"
        >
          <PlusIcon />
          Nueva institución
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard
          icon={<BuildingIcon />}
          label="Total instituciones"
          value={stats.total}
          footer={
            <span className="text-green-600">{stats.newThisMonth} nuevas este mes</span>
          }
        />
        <StatCard
          icon={<CheckCircleIcon />}
          label="Instituciones activas"
          value={stats.active}
          footer={
            <span className="text-green-600">{activePercent}% del total</span>
          }
        />
        <StatCard
          icon={<ClockIcon />}
          label="Pendientes de revisión"
          value={stats.pending}
          footer={
            <Link
              href="/admin/institutions?status=pending"
              className="text-brand-placeholder underline hover:text-brand-label transition-colors"
            >
              Revisar lista de instituciones
            </Link>
          }
        />
      </div>

    </div>
  );
}

function PlusIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  );
}

function BuildingIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="7" width="20" height="14" rx="2" />
      <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
    </svg>
  );
}

function CheckCircleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="9 11 12 14 22 4" />
      <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
    </svg>
  );
}

function ClockIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  );
}
