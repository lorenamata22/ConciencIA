import Link from 'next/link';
import { getMyClasses } from '@/lib/api/class';
import { ClassesList } from './classes-list';

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('es-ES', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

export default async function InstitutionClassesPage() {
  const classes = await getMyClasses();
  const lastUpdate = formatDate(new Date().toISOString());

  return (
    <div className="pt-10 px-10 md:px-30 pb-16">

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

      <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-10 gap-4">
        <div>
          <h1 className="text-4xl text-brand">Clases</h1>
          <p className="text-sm text-brand-label mt-1">Última actualización: {lastUpdate}</p>
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
            href="/institution/classes/new"
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium text-white bg-[#999DA3] hover:bg-[#999DA3]/80 transition-colors"
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            Crear clase
          </Link>
        </div>
      </div>

      <ClassesList classes={classes} />

    </div>
  );
}
