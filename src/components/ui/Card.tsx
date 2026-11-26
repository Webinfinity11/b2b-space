import type { ReactNode } from "react";

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`ui-card rounded-[13px] border border-line bg-card ${className}`}>{children}</div>;
}

export function CardHeader({ title, text, action }: { title: ReactNode; text?: ReactNode; action?: ReactNode }) {
  return (
    <div className="ui-card-head flex flex-wrap items-start justify-between gap-3 border-b border-line px-4 py-3">
      <div>
        <h2 className="text-[13px] font-bold text-ink">{title}</h2>
        {text && <p className="mt-0.5 text-xs text-muted">{text}</p>}
      </div>
      {action}
    </div>
  );
}

export function CardBody({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`ui-card-body p-4 ${className}`}>{children}</div>;
}

export function PageHeader({ title, text, action }: { title: ReactNode; text?: ReactNode; action?: ReactNode; eyebrow?: ReactNode }) {
  return (
    <div className="mb-5 flex flex-wrap items-center justify-between gap-x-6 gap-y-3">
      <div className="min-w-0">
        <h1 className="text-[22px] font-extrabold leading-[1.35] tracking-[-0.4px] text-ink sm:text-[26px]">{title}</h1>
        {/* Members see only data-bearing subtitles (counts); admins also get the explanatory ones. */}
        {typeof text === "string" && <p className={`mt-0.5 text-[13px] leading-relaxed text-muted ${/\d/.test(text) ? "" : "hidden [.admin_&]:block"}`}>{text}</p>}
      </div>
      {action && <div className="flex flex-wrap items-center gap-2.5">{action}</div>}
    </div>
  );
}

/**
 * KPI tile (dashboard design): label + blue line icon, big number, footnote.
 * `dark`/`featured` = the highlighted first tile (light-blue gradient with a blue accent bar).
 */
export function KpiCard({ label, value, hint, icon }: { label: ReactNode; value: ReactNode; hint?: ReactNode; icon?: ReactNode; tone?: string; dark?: boolean; featured?: boolean }) {
  return (
    <div className="flex min-h-[104px] flex-col rounded-[13px] border border-line bg-surface p-3.5">
      <div className="flex items-center gap-2.5 text-xs font-bold text-ink">
        {icon && <span className="grid size-7 shrink-0 place-items-center rounded-lg bg-blue-soft text-accent [&_svg]:size-[15px]">{icon}</span>}
        <span className="min-w-0 truncate">{label}</span>
      </div>
      <div className="mt-2.5 truncate text-[22px] font-extrabold leading-none tracking-[-0.5px] text-ink tabular-nums">{value}</div>
      {hint && <div className="mt-1.5 truncate text-[11px] text-muted">{hint}</div>}
    </div>
  );
}

/** Eyebrow + title used at the top of a section. */
export function SectionTitle({ title, action }: { eyebrow?: ReactNode; title: ReactNode; action?: ReactNode }) {
  return (
    <div className="mb-3 flex items-center justify-between gap-5">
      <h2 className="text-[16px] font-bold leading-normal tracking-[-0.2px] text-ink">{title}</h2>
      {action}
    </div>
  );
}

export function EmptyState({ text, action }: { text: ReactNode; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center gap-4 rounded-card border border-dashed border-line bg-card px-6 py-12 text-center">
      <svg width="40" height="40" viewBox="0 0 40 40" aria-hidden="true" className="text-ink">
        <rect x="6" y="6" width="12" height="12" rx="2" fill="currentColor" opacity="0.5" />
        <rect x="22" y="6" width="12" height="12" rx="2" fill="none" stroke="currentColor" strokeWidth="2" />
        <rect x="6" y="22" width="12" height="12" rx="2" fill="none" stroke="currentColor" strokeWidth="2" />
        <rect x="22" y="22" width="12" height="12" rx="2" fill="currentColor" opacity="0.5" />
      </svg>
      <p className="max-w-md text-sm text-muted">{text}</p>
      {action}
    </div>
  );
}

/** Flat metric cell; place several inside <StatGrid> so they share hairline dividers. */
export function StatCard({ label, value, hint }: { label: ReactNode; value: ReactNode; hint?: ReactNode }) {
  return (
    <div className="bg-card px-5 py-4">
      <div className="text-xs text-muted">{label}</div>
      <div className="mt-1.5 text-2xl font-semibold tracking-tight text-ink tabular-nums">{value}</div>
      {hint && <div className="mt-0.5 text-xs text-muted">{hint}</div>}
    </div>
  );
}

export function StatGrid({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`grid grid-cols-2 gap-px overflow-hidden rounded-[6px] border border-line bg-line lg:grid-cols-4 ${className}`}>{children}</div>;
}
