import type { ReactNode } from "react";
import { ResponsiveTable } from "./ResponsiveTable";

export function Table({ head, children }: { head: ReactNode[]; children: ReactNode }) {
  return (
    <ResponsiveTable>
    <div className="overflow-x-auto rounded-card border border-line bg-surface shadow-card max-md:overflow-visible max-md:border-0 max-md:bg-transparent max-md:shadow-none">
      <table className="w-full text-sm md:min-w-[640px]">
        <thead className="border-b border-line bg-canvas/60">
          <tr>
            {head.map((h, i) => (
              <th key={i} className="px-4 py-2.5 text-left text-xs font-medium text-muted">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-line">{children}</tbody>
      </table>
    </div>
    </ResponsiveTable>
  );
}

export function Td({ children, className = "" }: { children?: ReactNode; className?: string }) {
  return <td className={`px-4 py-3 align-top ${className}`}>{children}</td>;
}

/** Simple GET filter bar for admin lists. */
export function FilterLinks({ base, param, current, options }: { base: string; param: string; current?: string; options: { value: string; label: string }[] }) {
  return (
    <div className="mb-4 flex flex-wrap gap-2">
      {options.map((o) => {
        const active = (current ?? "") === o.value;
        const href = o.value ? `${base}?${param}=${o.value}` : base;
        return (
          <a
            key={o.value}
            href={href}
            className={`rounded-lg border px-3 py-1.5 text-sm ${active ? "border-accent bg-accent text-navy" : "border-line bg-surface text-ink hover:border-accent/40"}`}
          >
            {o.label}
          </a>
        );
      })}
    </div>
  );
}
