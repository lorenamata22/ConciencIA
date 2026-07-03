'use client';

import { useState } from 'react';
import type { AudienceType, CalendarEvent, SelectableClass } from '@/lib/api/event';
import { FormField, MultiSelect, inputClass } from '@/components/ui/form';
import { DatePicker } from '@/components/ui/date-picker';
import { TimePicker } from '@/components/ui/time-picker';
import { dayKey } from '@/lib/utils/calendar';

// Decompõe um ISO em data (YYYY-MM-DD) e hora (HH:mm) locais para preencher o form
function splitIso(iso: string): { date: string; time: string } {
  const d = new Date(iso);
  const time = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  return { date: dayKey(d), time };
}

export function EventFormModal({
  role,
  event,
  classes,
  onClose,
  onSaved,
}: {
  role: string;
  event: CalendarEvent | null;
  classes: SelectableClass[];
  onClose: () => void;
  onSaved: (event: CalendarEvent) => void;
}) {
  const isEdit = !!event;
  const canChooseAudience = role === 'institution' || role === 'super_admin';

  const initialStart = event ? splitIso(event.start_date) : { date: '', time: '' };
  const initialEnd = event ? splitIso(event.end_date) : { date: '', time: '' };

  const [audience, setAudience] = useState<AudienceType>(event?.audience_type ?? 'student');
  const [title, setTitle] = useState(event?.title ?? '');
  const [startDate, setStartDate] = useState(initialStart.date);
  const [endDate, setEndDate] = useState(initialEnd.date);
  const [time, setTime] = useState(initialStart.time);
  const [description, setDescription] = useState(event?.description ?? '');
  const [classIds, setClassIds] = useState<string[]>(
    event?.eventClasses.map((ec) => ec.class_id) ?? [],
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function toIso(date: string): string {
    return new Date(`${date}T${time || '00:00'}:00`).toISOString();
  }

  async function handleSave() {
    if (!title.trim()) return setError('Ingresa un nombre para el evento.');
    if (!startDate) return setError('Selecciona la fecha de inicio.');
    if (audience === 'student' && classIds.length === 0) {
      return setError('Selecciona al menos una clase.');
    }

    const effectiveEnd = endDate || startDate;
    const payload = {
      audience_type: audience,
      title: title.trim(),
      description: description.trim() || undefined,
      start_date: toIso(startDate),
      end_date: toIso(effectiveEnd),
      class_ids: audience === 'student' ? classIds : [],
    };

    setSaving(true);
    setError(null);
    try {
      const res = await fetch(isEdit ? `/api/events/${event!.id}` : '/api/events', {
        method: isEdit ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message);
      onSaved(json.data as CalendarEvent);
    } catch (e) {
      setError(e instanceof Error && e.message ? e.message : 'No se pudo guardar.');
    } finally {
      setSaving(false);
    }
  }

  const classOptions = classes.map((c) => ({ id: c.id, label: `${c.name} · ${c.course.name}` }));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-xl mx-4 px-10 py-10 relative max-h-[90vh] overflow-y-auto">
        <button
          onClick={onClose}
          disabled={saving}
          className="absolute top-4 right-4 text-brand-label hover:text-brand-brown transition-colors disabled:opacity-40"
          aria-label="Cerrar"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>

        {canChooseAudience && (
          <>
            <p className="text-sm font-medium text-brand-label mb-3">Seleccionar categoria del Evento/Tarea:</p>
            <div className="flex items-center gap-3 mb-6">
              <button
                type="button"
                onClick={() => setAudience('student')}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-sm transition-colors ${
                  audience === 'student' ? 'border-[#85C9C3] text-[#4ba89f]' : 'border-brand-border text-brand-label'
                }`}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-[#85C9C3]" /> Estudiante
              </button>
              <button
                type="button"
                onClick={() => setAudience('teacher')}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-sm transition-colors ${
                  audience === 'teacher' ? 'border-[#C9C8EC] text-[#8b89d6]' : 'border-brand-border text-brand-label'
                }`}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-[#C9C8EC]" /> Profesor
              </button>
            </div>
          </>
        )}

        <div className="flex flex-col gap-5">
          <FormField label="Nombre del Evento/Tarea" required>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ej. Exámenes Finales"
              className={inputClass}
              disabled={saving}
            />
          </FormField>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormField label="Empieza en" required>
              <DatePicker value={startDate} onChange={setStartDate} placeholder="Seleccionar fecha" />
            </FormField>
            <FormField label="Termina en">
              <DatePicker value={endDate} onChange={setEndDate} placeholder="Seleccionar fecha" />
            </FormField>
          </div>

          <FormField label="Hora">
            <TimePicker value={time} onChange={setTime} placeholder="Seleccionar hora" />
          </FormField>

          {audience === 'student' && (
            <FormField label="Clases" required>
              <MultiSelect
                name="class_ids"
                placeholder="Seleccionar clases"
                options={classOptions}
                defaultValues={classIds}
                onChange={setClassIds}
              />
            </FormField>
          )}

          <FormField label="Observaciones">
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Ej. Enviar documentación a admin@colegiosanmartin.com"
              rows={3}
              className={`${inputClass} resize-none`}
              disabled={saving}
            />
          </FormField>
        </div>

        {error && <p className="text-sm text-red-500 mt-4">{error}</p>}

        <div className="flex justify-end mt-6">
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="px-8 py-3 rounded-lg text-sm font-medium bg-primary text-primary-text hover:bg-primary-hover transition-colors transition-colors disabled:opacity-60"
          >
            {saving ? 'Guardando...' : 'Guardar'}
          </button>
        </div>
      </div>
    </div>
  );
}
