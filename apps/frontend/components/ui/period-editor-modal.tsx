'use client';

import { useEffect, useState } from 'react';
import { FormField, inputClass } from './form';

export function PeriodEditorModal({
  open,
  onClose,
  options,
  onSave,
}: {
  open: boolean;
  onClose: () => void;
  options: string[];
  onSave: (newOptions: string[]) => void;
}) {
  const [items, setItems] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setItems(options.length > 0 ? [...options] : ['']);
      setError(null);
    }
  }, [open, options]);

  function addItem() {
    setItems((prev) => [...prev, '']);
  }

  function updateItem(index: number, value: string) {
    setItems((prev) => prev.map((item, i) => (i === index ? value : item)));
  }

  function removeItem(index: number) {
    setItems((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleSave() {
    const cleaned = items.map((s) => s.trim()).filter(Boolean);
    if (cleaned.length === 0) {
      setError('Debe haber al menos un turno.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const res = await fetch('/api/institution/period-options', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ labels: cleaned }),
      });
      if (!res.ok) throw new Error();
      onSave(cleaned);
      onClose();
    } catch {
      setError('No se pudo guardar. Inténtalo nuevamente.');
    } finally {
      setSaving(false);
    }
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-xl mx-4 px-10 py-10 relative">
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

        <h2 className="font-semibold text-lg text-brand-brown mb-1">Editar turnos</h2>
        <p className="text-sm text-brand-label mb-6">
          Configura los turnos disponibles para tu institución.
        </p>

        <div className="flex flex-col gap-3 mb-4">
          {items.map((item, i) => (
            <FormField key={i} label={`Turno ${i + 1}`}>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={item}
                  onChange={(e) => updateItem(i, e.target.value)}
                  placeholder="Ej. Matutino (8:00-12:30)"
                  className={inputClass}
                  disabled={saving}
                />
                <button
                  type="button"
                  onClick={() => removeItem(i)}
                  disabled={saving || items.length === 1}
                  className="shrink-0 w-9 h-9 flex items-center justify-center rounded-lg border border-red-200 text-red-400 hover:bg-red-50 transition-colors disabled:opacity-30"
                  title="Eliminar"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              </div>
            </FormField>
          ))}
        </div>

        <button
          type="button"
          onClick={addItem}
          disabled={saving}
          className="flex items-center gap-1.5 text-sm text-brand-label hover:text-brand-brown transition-colors mb-6 disabled:opacity-40"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          Añadir turno
        </button>

        {error && (
          <p className="text-sm text-red-500 mb-4">{error}</p>
        )}

        <div className="flex gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="flex-1 px-4 py-3 rounded-xl text-sm font-medium border border-brand-border hover:bg-brand-border/30 transition-colors disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="flex-1 px-4 py-3 rounded-xl text-sm font-medium bg-[#999DA3] text-white hover:bg-[#999DA3]/90 transition-colors disabled:opacity-60"
          >
            {saving ? 'Guardando...' : 'Guardar cambios'}
          </button>
        </div>
      </div>
    </div>
  );
}
