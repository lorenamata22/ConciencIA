"use client";

import { useState } from "react";

export function Accordion({
  summary,
  children,
  className = "",
}: {
  summary: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  const [open, setOpen] = useState(false);

  return (
    <article
      className={`overflow-hidden rounded-2xl border border-brand-border bg-white ${className}`}
    >
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        aria-expanded={open}
        className="flex min-h-[52px] w-full items-center gap-5 px-7 py-3 text-left text-base text-brand-label"
      >
        {summary}
        <span aria-hidden="true" className="ml-auto text-xl text-brand-label">
          {open ? "−" : "▾"}
        </span>
      </button>
      {open && children}
    </article>
  );
}
