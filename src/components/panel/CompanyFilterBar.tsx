import Link from "next/link";
import { ka } from "@/i18n/ka";
import { CITIES } from "@/lib/cities";
import { PERIODS, type CompanyFilterValues } from "@/lib/company-filter";
import type { CategoryNode } from "@/lib/public";

const selectCls = "h-10 rounded-[10px] border border-line bg-surface px-3 text-sm text-ink focus:border-accent focus:outline-none";

/** GET filter for analytics: companies by industry, size, city, buyer/seller role and period. */
export function CompanyFilterBar({
  action,
  values,
  industries,
  extra,
}: {
  action: string;
  values: CompanyFilterValues;
  industries: CategoryNode[];
  extra?: React.ReactNode;
}) {
  const t = ka.analyticsFilter;
  const sel = (name: keyof CompanyFilterValues, label: string, options: { value: string; label: string }[]) => (
    <label className="grid gap-1 text-xs font-medium text-muted">
      {label}
      <select name={name} defaultValue={values[name] ?? ""} className={selectCls}>
        <option value="">{t.any}</option>
        {options.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
    </label>
  );
  const active = Object.values(values).some(Boolean);
  return (
    <form action={action} className="mb-6 rounded-[16px] border border-line bg-surface p-4">
      <p className="mb-3 text-sm font-semibold">{t.title}</p>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {sel("industry", t.industry, industries.flatMap((r) => [{ value: r.id, label: r.name }, ...r.children.map((c) => ({ value: c.id, label: `— ${c.name}` }))]))}
        {sel("size", t.size, Object.entries(ka.sgba.sizes).map(([value, label]) => ({ value, label })))}
        {sel("city", t.city, CITIES.map((c) => ({ value: c, label: c })))}
        {sel("role", t.role, Object.entries(ka.sgba.roles).map(([value, label]) => ({ value, label })))}
        {sel("period", t.period, PERIODS.map((p) => ({ value: p, label: t.days(p) })))}
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <button type="submit" className="h-9 rounded-full bg-accent px-5 text-sm font-semibold text-white hover:bg-accent-hover">{t.apply}</button>
        {active && <Link href={action} className="h-9 rounded-full px-4 text-sm leading-9 text-muted hover:text-ink">{t.reset}</Link>}
        {extra}
      </div>
    </form>
  );
}
