import Link from 'next/link';
import { getInstitutions } from '@/lib/api/institution';
import { InstitutionsList } from './institutions-list';

function formatLastUpdate() {
  return new Date().toLocaleString('es-ES', {
    day: '2-digit',
    month: 'long',
    hour: '2-digit',
    minute: '2-digit',
  }).replace(',', ' a las') + 'h';
}

export default async function InstitutionsPage() {
  const institutions = await getInstitutions();

  return (
    <div className="pt-10 px-10 md:px-30">

      {/* Toolbar */}
      <div className="mt-15 mb-10">
        <Link
          href="/admin"
          className="flex items-center gap-1.5 text-sm text-brand-label hover:text-brand-brown transition-colors w-fit"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
          Home
        </Link>
      </div>

      {/* Header */}
      <div className="flex items-start justify-between mb-10">
        <div>
          <h1 className="text-4xl font-bold text-brand-brown">Instituciones</h1>
          <p className="text-sm text-brand-label mt-1">
            Última actualización: {formatLastUpdate()}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button className="flex items-center gap-2 px-5 py-3 rounded-xl text-sm font-medium text-brand-label border border-brand-border hover:bg-brand-border/30 transition-colors">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
            Exportar datos
          </button>
          <Link
            href="/admin/institutions/new"
            className="flex items-center gap-2 px-5 py-3 rounded-xl text-sm font-medium bg-brand-brown text-white hover:bg-brand-brown/90 transition-colors"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            Nueva institución
          </Link>
        </div>
      </div>

      <InstitutionsList institutions={institutions} />

    </div>
  );
}
