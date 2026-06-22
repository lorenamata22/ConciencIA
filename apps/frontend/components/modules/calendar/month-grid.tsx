'use client';

import type { CalendarEvent } from '@/lib/api/event';
import { buildMonthMatrix, dayKey, dayWithinRange, WEEKDAY_LABELS } from '@/lib/utils/calendar';

const MAX_PILLS_PER_DAY = 3;

// Estilo da pílula conforme o público-alvo do evento
function pillClasses(audience: CalendarEvent['audience_type']): string {
  return audience === 'teacher'
    ? 'border-[#C9C8EC] text-[#8b89d6]'
    : 'border-[#85C9C3] text-[#4ba89f]';
}

function dotColor(audience: CalendarEvent['audience_type']): string {
  return audience === 'teacher' ? 'bg-[#C9C8EC]' : 'bg-[#85C9C3]';
}

export function MonthGrid({
  view,
  events,
  onEventClick,
}: {
  view: { year: number; month: number };
  events: CalendarEvent[];
  onEventClick: (event: CalendarEvent) => void;
}) {
  const weeks = buildMonthMatrix(view.year, view.month);

  // Agrupa os eventos por dia (cada evento aparece em todos os dias do seu intervalo)
  function eventsForDay(date: Date): CalendarEvent[] {
    return events.filter((e) => dayWithinRange(date, e.start_date, e.end_date));
  }

  return (
    <div className="overflow-x-auto">
      <div className="min-w-[760px] border border-brand-border rounded-xl overflow-hidden">
        {/* Cabeçalho dos dias da semana */}
        <div className="grid grid-cols-7 border-b border-brand-border bg-white">
          {WEEKDAY_LABELS.map((label) => (
            <div key={label} className="px-3 py-2.5 text-[11px] font-medium text-brand-label tracking-wide border-r border-brand-border last:border-r-0">
              {label}
            </div>
          ))}
        </div>

        {/* Semanas */}
        {weeks.map((week, wi) => (
          <div key={wi} className="grid grid-cols-7 border-b border-brand-border last:border-b-0">
            {week.map((cell) => {
              const dayEvents = eventsForDay(cell.date);
              const visible = dayEvents.slice(0, MAX_PILLS_PER_DAY);
              const extra = dayEvents.length - visible.length;
              return (
                <div
                  key={dayKey(cell.date)}
                  className={`h-28 p-1.5 border-r border-brand-border last:border-r-0 flex flex-col gap-1 ${
                    cell.inMonth ? 'bg-white' : 'bg-brand-border/20'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className={`text-xs ${cell.inMonth ? 'text-brand-brown' : 'text-brand-placeholder'}`}>
                      {cell.date.getDate()}
                    </span>
                    {extra > 0 && (
                      <span className="text-[10px] text-brand-label underline">{extra} más</span>
                    )}
                  </div>

                  <div className="flex flex-col gap-1 overflow-hidden">
                    {visible.map((event) => (
                      <button
                        key={event.id}
                        type="button"
                        onClick={() => onEventClick(event)}
                        className={`flex items-center gap-1.5 px-2 py-0.5 rounded-full border bg-white text-[11px] truncate transition-colors hover:bg-brand-border/20 ${pillClasses(event.audience_type)}`}
                      >
                        <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${dotColor(event.audience_type)}`} />
                        <span className="truncate">{event.title}</span>
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
