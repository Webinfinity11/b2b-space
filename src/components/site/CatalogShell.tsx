/* eslint-disable @next/next/no-img-element -- decorative design photos */
import type { ReactNode } from "react";

/** Public catalog page frame in the workspace style: title with accent dot + photo strip. */
export function CatalogShell({ title, text, children, tiles = [1, 4, 7] }: { title: string; text: string; children: ReactNode; tiles?: number[] }) {
  return (
    <>
      <div className="mb-6 grid items-end gap-5 lg:grid-cols-[minmax(0,1fr)_auto]">
        <div className="min-w-0">
          <p className="mb-3 inline-flex items-center gap-2 rounded-full border border-line px-3 py-1 text-[11px] text-secondary">
            <span aria-hidden="true" className="size-1.5 rounded-full bg-accent" /> B2B WORKSPACE
          </p>
          <h1 className="text-[28px] font-semibold tracking-tight sm:text-[32px]">
            {title}
            <span className="text-accent">.</span>
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-secondary">{text}</p>
        </div>
        <div className="hidden gap-2 lg:flex" aria-hidden="true">
          {tiles.map((t) => (
            <img key={t} src={`/images/tile-${t}.jpg`} alt="" className="h-20 w-28 rounded-[12px] border border-line object-cover saturate-[.85]" />
          ))}
        </div>
      </div>
      {children}
    </>
  );
}
