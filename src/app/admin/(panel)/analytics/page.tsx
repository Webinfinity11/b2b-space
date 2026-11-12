import type { Metadata } from "next";
import { ka } from "@/i18n/ka";
import { industryAnalytics } from "@/lib/admin-analytics";
import { requireAdmin } from "@/lib/authz";
import { readCompanyFilter } from "@/lib/company-filter";
import { formatAmount } from "@/lib/money";
import { getCategoryTree } from "@/lib/public";
import { KpiCard, PageHeader, SectionTitle } from "@/components/ui/Card";
import { Icon } from "@/components/ui/Icon";
import { CompanyFilterBar } from "@/components/panel/CompanyFilterBar";

export const metadata: Metadata = { title: ka.analyticsFilter.adminTitle };

/** Platform analytics: companies filtered by industry, size, city, role and period; numbers per industry; CSV export. */
export default async function AdminAnalyticsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  await requireAdmin();
  const sp = await searchParams;
  const f = readCompanyFilter(sp);
  const [{ rows, total }, industries] = await Promise.all([industryAnalytics(f), getCategoryTree("INDUSTRY")]);
  const t = ka.analyticsFilter;
  const qs = new URLSearchParams(Object.entries(f.values).filter(([, v]) => v) as [string, string][]).toString();

  return (
    <>
      <PageHeader title={t.adminTitle} text={t.adminText} />
      <CompanyFilterBar
        action="/admin/analytics"
        values={f.values}
        industries={industries}
        extra={
          <a href={`/api/admin/analytics${qs ? `?${qs}` : ""}`} className="ml-auto inline-flex h-9 items-center gap-2 rounded-full border border-line px-4 text-sm font-medium text-accent-strong hover:border-accent">
            <Icon name="file" size={16} /> {t.export}
          </a>
        }
      />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard featured label={t.companies} value={total.companies} hint={`${t.members}: ${total.members}`} icon={<Icon name="building" size={18} />} tone="blue" />
        <KpiCard label={`${t.offers} / ${t.requests}`} value={`${total.offers} / ${total.requests}`} icon={<Icon name="tag" size={18} />} tone="violet" />
        <KpiCard label={t.turnover} value={formatAmount(total.turnover, "GEL")} icon={<Icon name="trend" size={18} />} tone="green" />
        <KpiCard label={t.commission} value={formatAmount(total.commission, "GEL")} icon={<Icon name="coins" size={18} />} tone="yellow" />
      </div>

      <section className="mt-6 rounded-[16px] border border-line bg-surface p-6">
        <SectionTitle title={t.perIndustry} />
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-sm">
            <thead>
              <tr className="border-b border-line text-left text-xs text-muted">
                <th className="py-2 pr-3 font-medium">{t.industryCol}</th>
                <th className="py-2 pr-3 text-right font-medium">{t.companies}</th>
                <th className="py-2 pr-3 text-right font-medium">{t.members}</th>
                <th className="py-2 pr-3 text-right font-medium">{t.offers}</th>
                <th className="py-2 pr-3 text-right font-medium">{t.requests}</th>
                <th className="py-2 pr-3 text-right font-medium">{t.turnover}</th>
                <th className="py-2 text-right font-medium">{t.commission}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {rows.map((r) => (
                <tr key={r.name}>
                  <td className="py-2.5 pr-3 font-medium">{r.name}</td>
                  <td className="py-2.5 pr-3 text-right tabular-nums">{r.companies}</td>
                  <td className="py-2.5 pr-3 text-right tabular-nums">{r.members}</td>
                  <td className="py-2.5 pr-3 text-right tabular-nums">{r.offers}</td>
                  <td className="py-2.5 pr-3 text-right tabular-nums">{r.requests}</td>
                  <td className="py-2.5 pr-3 text-right tabular-nums">{formatAmount(r.turnover, "GEL")}</td>
                  <td className="py-2.5 text-right tabular-nums">{formatAmount(r.commission, "GEL")}</td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-muted">{t.byIndustryEmpty}</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}
