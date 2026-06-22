'use client';

import { useEffect, useRef, useState } from 'react';
import { buildMonthMatrix, dayKey, longDate, monthTitle, WEEKDAY_LABELS } from '@/lib/utils/calendar';

// Campo de data com popover de calendário. Valor controlado no formato YYYY-MM-DD.
export function DatePicker({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
}) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Mês exibido no popover — inicia no valor selecionado ou no mês atual
  const initial = value ? new Date(`${value}T00:00:00`) : new Date();
  const [view, setView] = useState({ year: initial.getFullYear(), month: initial.getMonth() });

  useEffect(() => {
    function onMouseDown(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', onMouseDown);
    return () => document.removeEventListener('mousedown', onMouseDown);
  }, []);

  function handleToggle() {
    if (!open && value) {
      const d = new Date(`${value}T00:00:00`);
      setView({ year: d.getFullYear(), month: d.getMonth() });
    }
    setOpen((prev) => !prev);
  }

  function shiftMonth(delta: number) {
    setView((prev) => {
      const d = new Date(prev.year, prev.month + delta, 1);
      return { year: d.getFullYear(), month: d.getMonth() };
    });
  }

  function selectDay(date: Date) {
    onChange(dayKey(date));
    setOpen(false);
  }

  const weeks = buildMonthMatrix(view.year, view.month);
  const displayLabel = value ? longDate(new Date(`${value}T00:00:00`)) : '';

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={handleToggle}
        className={`w-full rounded-xl border px-4 py-3 text-sm text-left transition-colors focus:outline-none flex items-center justify-between gap-2 ${
          open ? 'border-brand-border-focus' : 'border-brand-border'
        } ${value ? 'text-brand-brown' : 'text-brand-placeholder'}`}
      >
        <span className="truncate">{displayLabel || placeholder}</span>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 text-brand-label">
          <rect x="3" y="4" width="18" height="18" rx="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" />
        </svg>
      </button>

      {open && (
        <div className="absolute z-50 mt-1 w-72 rounded-xl border border-brand-border bg-brand-bg shadow-lg p-3">
          <div className="flex items-center justify-between mb-2">
            <button type="button" onClick={() => shiftMonth(-1)} className="w-7 h-7 flex items-center justify-center rounded-lg border border-brand-border text-brand-label hover:bg-brand-border/30 transition-colors">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6" /></svg>
            </button>
            <span className="text-sm font-medium text-brand-brown">{monthTitle(view.year, view.month)}</span>
            <button type="button" onClick={() => shiftMonth(1)} className="w-7 h-7 flex items-center justify-center rounded-lg border border-brand-border text-brand-label hover:bg-brand-border/30 transition-colors">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6" /></svg>
            </button>
          </div>

          <div className="grid grid-cols-7 gap-0.5 mb-1">
            {WEEKDAY_LABELS.map((label) => (
              <span key={label} className="text-[10px] text-brand-label text-center py-1">{label.charAt(0)}</span>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-0.5">
            {weeks.flat().map((cell) => {
              const selected = value === dayKey(cell.date);
              return (
                <button
                  key={dayKey(cell.date)}
                  type="button"
                  onClick={() => selectDay(cell.date)}
                  className={`h-8 rounded-lg text-xs transition-colors ${
                    selected
                      ? 'bg-primary text-primary-text font-medium'
                      : cell.inMonth
                        ? 'text-brand-brown hover:bg-brand-border/40'
                        : 'text-brand-placeholder hover:bg-brand-border/30'
                  }`}
                >
                  {cell.date.getDate()}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
