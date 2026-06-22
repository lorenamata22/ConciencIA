'use client';

import type { CalendarEvent } from '@/lib/api/event';
import { longDate, shortTime } from '@/lib/utils/calendar';

function AudienceBadge({ audience }: { audience: CalendarEvent['audience_type'] }) {
  const isTeacher = audience === 'teacher';
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full border text-xs ${
        isTeacher ? 'border-[#C9C8EC] text-[#8b89d6]' : 'border-[#85C9C3] text-[#4ba89f]'
      }`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${isTeacher ? 'bg-[#C9C8EC]' : 'bg-[#85C9C3]'}`} />
      {isTeacher ? 'Profesor' : 'Estudiante'}
    </span>
  );
}

export function EventDetailModal({
  event,
  canManage,
  onClose,
  onEdit,
  onDelete,
}: {
  event: CalendarEvent;
  canManage: boolean;
  onClose: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const start = new Date(event.start_date);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-xl mx-4 px-10 py-10 relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-brand-label hover:text-brand-brown transition-colors"
          aria-label="Cerrar"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>

        <div className="flex items-center gap-3 mb-5">
          <AudienceBadge audience={event.audience_type} />
          {canManage && (
            <div className="flex items-center gap-2">
              <button onClick={onEdit} aria-label="Editar" className="text-brand-label hover:text-brand-brown transition-colors">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                </svg>
              </button>
              <button onClick={onDelete} aria-label="Borrar" className="text-brand-label hover:text-[#D86262] transition-colors">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                </svg>
              </button>
            </div>
          )}
        </div>

        <h2 className="text-3xl text-brand-brown mb-5">{event.title}</h2>

        <div className="flex items-center gap-2 text-sm text-brand-brown mb-2">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className="text-brand-label">
            <rect x="3" y="4" width="18" height="18" rx="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" />
          </svg>
          {longDate(start)}
        </div>
        <div className="flex items-center gap-2 text-sm text-brand-brown">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className="text-brand-label">
            <circle cx="12" cy="12" r="9" /><polyline points="12 7 12 12 15 14" />
          </svg>
          {shortTime(start)}
        </div>

        {event.description && (
          <>
            <hr className="my-6 border-brand-border" />
            <p className="text-sm font-medium text-brand-brown mb-2">Observaciones</p>
            <p className="text-sm text-brand-label">{event.description}</p>
          </>
        )}
      </div>
    </div>
  );
}
