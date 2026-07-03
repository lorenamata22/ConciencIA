'use client';

import { useState, useTransition } from 'react';
import type { CalendarEvent, SelectableClass } from '@/lib/api/event';
import { monthTitle } from '@/lib/utils/calendar';
import { FeedbackModal, ModalErrorIcon, ModalWarningIcon } from '@/components/ui/feedback-modal';
import { MonthGrid } from './month-grid';
import { EventDetailModal } from './event-detail-modal';
import { EventFormModal } from './event-form-modal';

type Modal =
  | { type: 'none' }
  | { type: 'detail'; event: CalendarEvent }
  | { type: 'form'; event: CalendarEvent | null }
  | { type: 'delete'; event: CalendarEvent }
  | { type: 'deleteError' };

export function CalendarClient({
  role,
  userId,
  initialEvents,
  classes,
  embedded = false,
}: {
  role: string;
  userId: string;
  initialEvents: CalendarEvent[];
  classes: SelectableClass[];
  // Quando embutido em outra página (ex: dashboard), esconde o label "Calendario"
  // e remove o padding próprio do wrapper, já fornecido pelo container pai
  embedded?: boolean;
}) {
  const now = new Date();
  const [view, setView] = useState({ year: now.getFullYear(), month: now.getMonth() });
  const [events, setEvents] = useState(initialEvents);
  const [modal, setModal] = useState<Modal>({ type: 'none' });
  const [, startTransition] = useTransition();

  const canCreate = role !== 'student';

  function canManage(event: CalendarEvent): boolean {
    return role === 'institution' || role === 'super_admin' || event.created_by === userId;
  }

  function shiftMonth(delta: number) {
    setView((prev) => {
      const d = new Date(prev.year, prev.month + delta, 1);
      return { year: d.getFullYear(), month: d.getMonth() };
    });
  }

  // Insere ou substitui o evento salvo na lista local
  function handleSaved(saved: CalendarEvent) {
    setEvents((prev) => {
      const exists = prev.some((e) => e.id === saved.id);
      return exists ? prev.map((e) => (e.id === saved.id ? saved : e)) : [...prev, saved];
    });
    setModal({ type: 'none' });
  }

  function confirmDelete() {
    if (modal.type !== 'delete') return;
    const { event } = modal;
    startTransition(async () => {
      try {
        const res = await fetch(`/api/events/${event.id}`, { method: 'DELETE' });
        if (!res.ok) throw new Error();
        setEvents((prev) => prev.filter((e) => e.id !== event.id));
        setModal({ type: 'none' });
      } catch {
        setModal({ type: 'deleteError' });
      }
    });
  }

  return (
    <div className={embedded ? '' : 'pt-10 px-6 md:px-12 pb-16'}>
      {!embedded && (
        <p className="text-xs tracking-widest text-brand-label uppercase mb-10 mt-10">Calendario</p>
      )}

      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-8">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <button onClick={() => shiftMonth(-1)} className="w-9 h-9 flex items-center justify-center rounded-lg border border-brand-border text-brand-label hover:bg-brand-border/30 transition-colors" aria-label="Mes anterior">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6" /></svg>
            </button>
            <button onClick={() => shiftMonth(1)} className="w-9 h-9 flex items-center justify-center rounded-lg border border-brand-border text-brand-label hover:bg-brand-border/30 transition-colors" aria-label="Mes siguiente">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6" /></svg>
            </button>
          </div>
          <h1 className="text-3xl text-brand-brown">{monthTitle(view.year, view.month)}</h1>
        </div>

        {canCreate && (
          <button
            onClick={() => setModal({ type: 'form', event: null })}
            className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium bg-primary text-primary-text hover:bg-primary-hover transition-colors"
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            Nuevo Evento/Tarea
          </button>
        )}
      </div>

      <MonthGrid view={view} events={events} onEventClick={(event) => setModal({ type: 'detail', event })} />

      {modal.type === 'detail' && (
        <EventDetailModal
          event={modal.event}
          canManage={canManage(modal.event)}
          onClose={() => setModal({ type: 'none' })}
          onEdit={() => setModal({ type: 'form', event: modal.event })}
          onDelete={() => setModal({ type: 'delete', event: modal.event })}
        />
      )}

      {modal.type === 'form' && (
        <EventFormModal
          role={role}
          event={modal.event}
          classes={classes}
          onClose={() => setModal({ type: 'none' })}
          onSaved={handleSaved}
        />
      )}

      <FeedbackModal
        open={modal.type === 'delete' || modal.type === 'deleteError'}
        onClose={() => setModal({ type: 'none' })}
        icon={modal.type === 'deleteError' ? <ModalErrorIcon /> : <ModalWarningIcon />}
        title={
          modal.type === 'delete'
            ? `¿Borrar "${modal.event.title}"?`
            : 'No se pudo borrar el evento'
        }
        titleColor="text-[#D86262]"
        description={modal.type === 'delete' ? 'Esta acción no se puede revertir.' : 'Inténtalo nuevamente.'}
        actions={
          modal.type === 'delete' ? (
            <div className="flex gap-3">
              <button
                onClick={() => setModal({ type: 'none' })}
                className="flex-1 px-4 py-3 rounded-xl text-sm font-medium border border-brand-border hover:bg-brand-border/30 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={confirmDelete}
                className="flex-1 px-4 py-3 rounded-xl text-sm font-medium bg-[#999DA3] text-white hover:bg-[#999DA3]/90 transition-colors flex items-center justify-center gap-2"
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                </svg>
                Borrar
              </button>
            </div>
          ) : null
        }
      />
    </div>
  );
}
