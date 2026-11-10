import type { ReactNode } from "react";

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`rounded-card border border-line bg-card shadow-card ${className}`}>{children}</div>;
}

export function CardHeader({ title, text, action }: { title: ReactNode; text?: ReactNode; action?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3 border-b border-line px-5 py-4">
      <div>
        <h2 className="text-[15px] font-semibold text-ink">{title}</h2>
        {text && <p className="mt-0.5 text-sm text-muted">{text}</p>}
      </div>
      {action}
    </div>
  );
}

export function CardBody({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`p-5 ${className}`}>{children}</div>;
}

export function PageHeader({ title, text, action, eyebrow }: { title: ReactNode; text?: ReactNode; action?: ReactNode; eyebrow?: ReactNode }) {
  return (
    <div className="mb-7 flex flex-wrap items-center justify-between gap-x-6 gap-y-4">
      <div className="min-w-0">
        {eyebrow && <div className="mb-1.5 text-xs font-bold text-muted">{eyebrow}</div>}
        <h1 className="text-[27px] font-bold leading-[1.35] tracking-[-0.8px] text-ink sm:text-[33px]">{title}</h1>
        {text && <p className="mt-1.5 text-sm leading-relaxed text-secondary">{text}</p>}
      </div>
      {action && <div className="flex flex-wrap items-center gap-3">{action}</div>}
    </div>
  );
}

/**
 * KPI tile (dashboard design): label + blue line icon, big number, footnote.
 * `dark`/`featured` = the highlighted first tile (light-blue gradient with a blue accent bar).
 */
export function KpiCard({ label, value, hint, icon, dark, featured }: { label: ReactNode; value: ReactNode; hint?: ReactNode; icon?: ReactNode; tone?: string; dark?: boolean; featured?: boolean }) {
  const hi = dark || featured;
  return (
    <div className={`relative flex min-h-[150px] flex-col justify-center rounded-card border border-line px-6 pb-5 pt-6 ${hi ? "bg-gradient-to-r from-blue-soft to-blue-soft-2" : "bg-surface"}`}>
      {hi && <span className="absolute left-6 top-3.5 h-[5px] w-10 rounded-full bg-accent" />}
      <div className="mb-3 flex items-center justify-between gap-3">
        <div className="text-sm leading-snug text-ink">{label}</div>
        {icon && <span className="text-accent [&_svg]:size-6">{icon}</span>}
      </div>
      <div className="whitespace-nowrap text-[30px] font-bold leading-none tracking-[-1px] text-ink tabular-nums xl:text-[35px]">{value}</div>
      {hint && <div className="mt-3 text-xs text-secondary">{hint}</div>}
    </div>
  );
}

/** Eyebrow + title used at the top of a section. */
export function SectionTitle({ eyebrow, title, action }: { eyebrow?: ReactNode; title: ReactNode; action?: ReactNode }) {
  return (
    <div className="mb-5 flex items-end justify-between gap-5">
      <div>
        {eyebrow && <div className="mb-0.5 text-xs text-muted">{eyebrow}</div>}
        <h2 className="text-[20px] font-bold leading-normal tracking-[-0.4px] text-ink sm:text-[24px]">{title}</h2>
      </div>
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

export function StatCard({ label, value, hint }: { label: ReactNode; value: ReactNode; hint?: ReactNode }) {
  return (
    <div className="card-glass rounded-card p-5">
      <div className="text-xs font-medium text-secondary">{label}</div>
      <div className="mt-2 text-[26px] font-bold tracking-tight text-ink tabular-nums">{value}</div>
      {hint && <div className="mt-1 text-xs text-muted">{hint}</div>}
    </div>
  );
}
