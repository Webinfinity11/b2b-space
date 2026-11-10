"use client";

import { useState } from "react";

/** Filters rows marked with data-search inside the element with id `targetId` (client-side, instant). */
export function ListSearch({ targetId, placeholder }: { targetId: string; placeholder: string }) {
  const [q, setQ] = useState("");
  return (
    <input
      type="search"
      value={q}
      placeholder={placeholder}
      aria-label={placeholder}
      onChange={(e) => {
        const v = e.target.value;
        setQ(v);
        const term = v.trim().toLowerCase();
        document.querySelectorAll<HTMLElement>(`#${targetId} [data-search]`).forEach((el) => {
          const li = el.closest("li") ?? el;
          li.hidden = Boolean(term) && !(el.dataset.search ?? "").toLowerCase().includes(term);
        });
      }}
      className="h-10 w-full rounded-[10px] border border-line bg-surface-2 px-3 text-sm text-ink placeholder:text-muted focus:border-accent/50 focus:outline-none sm:w-64"
    />
  );
}
