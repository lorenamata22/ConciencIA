'use client';

import { useEffect, useRef, useState } from 'react';

export const inputClass =
  'w-full rounded-xl border border-brand-border px-4 py-3 text-sm text-brand-brown placeholder:text-brand-placeholder focus:outline-none focus:border-brand-border-focus transition-colors';

export function FormField({
  label,
  children,
  required,
}: {
  label: string;
  children: React.ReactNode;
  required?: boolean;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-sm font-medium text-brand-label">
        {label}
        {required && <span className="ml-0.5">*</span>}
      </label>
      {children}
    </div>
  );
}

const DROPDOWN_MAX_HEIGHT = 224; // max-h-56 = 224px

export function CustomSelect({
  name,
  placeholder,
  options,
  defaultValue,
}: {
  name: string;
  placeholder: string;
  options: string[];
  defaultValue?: string;
}) {
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState(defaultValue ?? '');
  const [openUpward, setOpenUpward] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

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
    if (!open && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom;
      const spaceAbove = rect.top;
      setOpenUpward(spaceBelow < DROPDOWN_MAX_HEIGHT && spaceAbove > spaceBelow);
    }
    setOpen((prev) => !prev);
  }

  function handleSelect(opt: string) {
    setSelected(opt);
    setOpen(false);
  }

  return (
    <div ref={containerRef} className="relative">
      <input type="hidden" name={name} value={selected} />

      <button
        ref={buttonRef}
        type="button"
        onClick={handleToggle}
        className={`w-full rounded-xl border px-4 py-3 text-sm text-left transition-colors focus:outline-none flex items-center justify-between gap-2 ${
          open ? 'border-brand-border-focus' : 'border-brand-border'
        } ${selected ? 'text-brand-brown' : 'text-brand-placeholder'}`}
      >
        <span className="truncate">{selected || placeholder}</span>
        <span className={`shrink-0 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </span>
      </button>

      {open && (
        <ul
          className={`absolute z-50 w-full rounded-xl border border-brand-border bg-brand-bg shadow-lg max-h-56 overflow-y-auto ${
            openUpward ? 'bottom-full mb-1' : 'top-full mt-1'
          }`}
        >
          {options.map((opt) => (
            <li
              key={opt}
              onMouseDown={() => handleSelect(opt)}
              className={`px-4 py-2.5 text-sm cursor-pointer transition-colors hover:bg-brand-border/30 ${
                selected === opt ? 'font-medium text-brand-brown' : 'text-brand-brown'
              }`}
            >
              {opt}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function ObjectSelect({
  name,
  placeholder,
  options,
  defaultValue,
  onChange,
}: {
  name: string;
  placeholder: string;
  options: { id: string; label: string }[];
  defaultValue?: string;
  onChange?: (id: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState(defaultValue ?? '');
  const [openUpward, setOpenUpward] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

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
    if (!open && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom;
      setOpenUpward(spaceBelow < DROPDOWN_MAX_HEIGHT && rect.top > spaceBelow);
    }
    setOpen((prev) => !prev);
  }

  function handleSelect(id: string) {
    setSelected(id);
    setOpen(false);
    onChange?.(id);
  }

  const selectedLabel = options.find((o) => o.id === selected)?.label;

  return (
    <div ref={containerRef} className="relative">
      <input type="hidden" name={name} value={selected} />

      <button
        ref={buttonRef}
        type="button"
        onClick={handleToggle}
        className={`w-full rounded-xl border px-4 py-3 text-sm text-left transition-colors focus:outline-none flex items-center justify-between gap-2 ${
          open ? 'border-brand-border-focus' : 'border-brand-border'
        } ${selected ? 'text-brand-brown' : 'text-brand-placeholder'}`}
      >
        <span className="truncate">{selectedLabel ?? placeholder}</span>
        <span className={`shrink-0 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </span>
      </button>

      {open && (
        <ul
          className={`absolute z-50 w-full rounded-xl border border-brand-border bg-brand-bg shadow-lg max-h-56 overflow-y-auto ${
            openUpward ? 'bottom-full mb-1' : 'top-full mt-1'
          }`}
        >
          {options.length === 0 ? (
            <li className="px-4 py-2.5 text-sm text-brand-placeholder">
              No hay opciones disponibles.
            </li>
          ) : (
            options.map((opt) => (
              <li
                key={opt.id}
                onMouseDown={() => handleSelect(opt.id)}
                className={`px-4 py-2.5 text-sm cursor-pointer transition-colors hover:bg-brand-border/30 ${
                  selected === opt.id ? 'font-medium text-brand-brown' : 'text-brand-brown'
                }`}
              >
                {opt.label}
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  );
}

export function MultiSelect({
  name,
  placeholder,
  options,
  defaultValues = [],
  onChange,
}: {
  name: string;
  placeholder: string;
  options: { id: string; label: string }[];
  defaultValues?: string[];
  onChange?: (ids: string[]) => void;
}) {
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<string[]>(defaultValues);
  const [openUpward, setOpenUpward] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

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
    if (!open && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom;
      setOpenUpward(spaceBelow < DROPDOWN_MAX_HEIGHT && rect.top > spaceBelow);
    }
    setOpen((prev) => !prev);
  }

  function toggleOption(id: string) {
    const next = selected.includes(id) ? selected.filter((s) => s !== id) : [...selected, id];
    setSelected(next);
    onChange?.(next);
  }

  const selectedLabels = options.filter((o) => selected.includes(o.id)).map((o) => o.label);
  const displayText =
    selectedLabels.length === 0
      ? placeholder
      : selectedLabels.length === 1
        ? selectedLabels[0]
        : `${selectedLabels.length} seleccionados`;

  return (
    <div ref={containerRef} className="relative">
      <input type="hidden" name={name} value={JSON.stringify(selected)} />

      <button
        ref={buttonRef}
        type="button"
        onClick={handleToggle}
        className={`w-full rounded-xl border px-4 py-3 text-sm text-left transition-colors focus:outline-none flex items-center justify-between gap-2 ${
          open ? 'border-brand-border-focus' : 'border-brand-border'
        } ${selected.length > 0 ? 'text-brand-brown' : 'text-brand-placeholder'}`}
      >
        <span className="truncate">{displayText}</span>
        <span className={`shrink-0 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </span>
      </button>

      {open && (
        <ul
          className={`absolute z-50 w-full rounded-xl border border-brand-border bg-brand-bg shadow-lg max-h-56 overflow-y-auto ${
            openUpward ? 'bottom-full mb-1' : 'top-full mt-1'
          }`}
        >
          {options.length === 0 ? (
            <li className="px-4 py-2.5 text-sm text-brand-placeholder">
              No hay opciones disponibles.
            </li>
          ) : (
            options.map((opt) => {
              const isSelected = selected.includes(opt.id);
              return (
                <li
                  key={opt.id}
                  onMouseDown={(e) => { e.preventDefault(); toggleOption(opt.id); }}
                  className="px-4 py-2.5 text-sm cursor-pointer transition-colors hover:bg-brand-border/30 flex items-center gap-2.5"
                >
                  <div
                    className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-colors ${
                      isSelected ? 'bg-[#999DA3] border-[#999DA3]' : 'border-brand-border'
                    }`}
                  >
                    {isSelected && (
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    )}
                  </div>
                  <span className={isSelected ? 'font-medium text-brand-brown' : 'text-brand-brown'}>
                    {opt.label}
                  </span>
                </li>
              );
            })
          )}
        </ul>
      )}
    </div>
  );
}
