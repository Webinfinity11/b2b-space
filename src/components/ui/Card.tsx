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

export function PageHeader({ title, text, action }: { title: ReactNode; text?: ReactNode; action?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div className="min-w-0">
        <h1 className="text-[26px] font-semibold tracking-tight text-ink">
          {title}
          <span className="text-accent">.</span>
        </h1>
        {text && <p className="mt-1 text-sm text-muted">{text}</p>}
      </div>
      {action && <div className="flex flex-wrap gap-2">{action}</div>}
    </div>
  );
}

export function EmptyState({ text, action }: { text: ReactNode; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center gap-4 rounded-card border border-dashed border-line bg-card px-6 py-12 text-center">
      <svg width="40" height="40" viewBox="0 0 40 40" aria-hidden="true" className="text-accent">
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
