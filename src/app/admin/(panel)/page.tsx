import Link from "next/link";
import { ka } from "@/i18n/ka";
import { requireAdmin } from "@/lib/authz";
import { db } from "@/lib/db";
import { formatDateTime, formatMoney } from "@/lib/format";
import { companyName } from "@/lib/public";
import { bucket, dayLabel, daysFrom, trendOf, windowStart } from "@/lib/trend";
import { Card, CardBody, CardHeader, PageHeader } from "@/components/ui/Card";
import { Icon, type IconName } from "@/components/ui/Icon";
import { ActivityChart } from "@/components/panel/ActivityChart";
import { KpiTile } from "@/components/panel/KpiTile";
import { OfferStatusBadge, VerificationBadge } from "@/components/panel/StatusBadges";
import { ActionForm, Field, Input, SubmitButton } from "@/components/ui/Form";
import { loadDemoDataAction, removeDemoDataAction } from "@/actions/admin";

const LIVE = ["PUBLISHED", "ACCEPTING_RESPONSES", "NEGOTIATING"] as const;

export default async function AdminOverviewPage() {
  await requireAdmin();
  const since = windowStart(30);
  const since60 = windowStart(60);
  const [users, companies, pending, offers, requests, invoiceCount, byCurrency, queue, latestOffers, hUsers, hCompanies, hOffers, hRequests, hInvoices] = await Promise.all([
    db.user.count(),
    db.company.count(),
    db.company.count({ where: { verificationStatus: { in: ["PENDING", "IN_REVIEW"] } } }),
    db.offer.count({ where: { type: "OFFER", status: { in: [...LIVE] } } }),
    db.offer.count({ where: { type: "REQUEST", status: { in: [...LIVE] } } }),
    db.invoice.count({ where: { status: { not: "DRAFT" } } }),
    db.invoice.groupBy({
      by: ["currency"],
      where: { status: { notIn: ["DRAFT", "CANCELLED"] } },
      _sum: { total: true, paidAmount: true },
      _count: true,
    }),
    db.company.findMany({
      where: { verificationStatus: "IN_REVIEW" },
      orderBy: { updatedAt: "asc" },
      take: 6,
      select: { id: true, legalName: true, tradeName: true, verificationStatus: true, updatedAt: true },
    }),
    db.offer.findMany({
      orderBy: { createdAt: "desc" },
      take: 6,
      select: {
        id: true, title: true, type: true, status: true, createdAt: true,
        company: { select: { legalName: true, tradeName: true } },
        author: { select: { firstName: true, lastName: true } },
        badge: { select: { name: true } },
      },
    }),
    db.user.findMany({ where: { createdAt: { gte: since60 } }, select: { createdAt: true } }),
    db.company.findMany({ where: { createdAt: { gte: since60 } }, select: { createdAt: true } }),
    db.offer.findMany({ where: { type: "OFFER", createdAt: { gte: since60 } }, select: { createdAt: true } }),
    db.offer.findMany({ where: { type: "REQUEST", createdAt: { gte: since60 } }, select: { createdAt: true } }),
    db.invoice.findMany({ where: { status: { not: "DRAFT" }, issuedAt: { gte: since60 } }, select: { issuedAt: true } }),
  ]);

  const t = (rows: { createdAt?: Date; issuedAt?: Date }[]) => trendOf(bucket(rows.map((r) => ({ at: r.createdAt ?? r.issuedAt ?? null })), since60, 60));
  const kpis: { id: string; label: string; value: number; icon: IconName; hint?: string; t: ReturnType<typeof t> }[] = [
    { id: "a0", label: ka.admin.stats.users, value: users, icon: "users", t: t(hUsers) },
    { id: "a1", label: ka.admin.stats.companies, value: companies, icon: "building", hint: pending ? `${ka.admin.stats.pending}: ${pending}` : undefined, t: t(hCompanies) },
    { id: "a2", label: ka.admin.stats.activeOffers, value: offers, icon: "tag", t: t(hOffers) },
    { id: "a3", label: ka.admin.stats.activeRequests, value: requests, icon: "box", t: t(hRequests) },
    { id: "a4", label: ka.admin.stats.invoices, value: invoiceCount, icon: "invoice", t: t(hInvoices) },
  ];
  const quick: { href: string; label: string; icon: IconName }[] = [
    { href: "/admin/registrations", label: ka.sgba.approvalsTitle, icon: "inbox" },
    { href: "/admin/companies", label: ka.admin.companies, icon: "building" },
    { href: "/admin/offers", label: ka.admin.offers, icon: "tag" },
    { href: "/admin/badges", label: ka.sgba.badgesTitle, icon: "star" },
    { href: "/admin/commissions", label: ka.sgba.commissionsAdmin, icon: "check" },
    { href: "/admin/finance", label: ka.admin.finance, icon: "chart" },
  ];
  const d = ka.sgba.dash;
  const panel = "rounded-[13px] border border-line bg-surface p-4";
  const head = (title: string, href?: string) => (
    <div className="mb-3 flex items-center justify-between gap-2">
      <h3 className="text-[13px] font-bold text-ink">{title}</h3>
      {href && (
        <Link href={href} className="inline-flex items-center gap-1 whitespace-nowrap text-xs font-bold text-accent hover:text-accent-hover">
          {ka.home.viewAll} <Icon name="arrow" size={13} />
        </Link>
      )}
    </div>
  );

  return (
    <>
      <PageHeader title={ka.admin.overview} text={ka.admin.overviewText} />

      <section className="grid grid-cols-2 gap-2.5 lg:grid-cols-6 2xl:grid-cols-5">
        {kpis.map((k, i) => (
          <KpiTile key={k.id} tone={(["blue", "green", "violet", "amber", "pink"] as const)[i]} {...k} className={`2xl:col-span-1 ${i < 3 ? "lg:col-span-2" : "lg:col-span-3"} ${i === 4 ? "col-span-2" : ""}`} />
        ))}
      </section>

      <section className="mt-3 grid gap-3 lg:grid-cols-[1.5fr_1.5fr]">
        <div className={panel}>
          <div className="mb-3 flex items-center justify-between gap-2">
            <h3 className="text-[13px] font-bold text-ink">{d.adminChartTitle}</h3>
            <span className="rounded-[7px] border border-line px-2.5 py-1 text-[11px] text-secondary">{d.period}</span>
          </div>
          <ActivityChart
            days={daysFrom(since, 30).map(dayLabel)}
            series={[
              { label: ka.admin.stats.users, values: bucket(hUsers.map((r) => ({ at: r.createdAt })), since, 30), color: "var(--color-accent)" },
              { label: ka.admin.stats.companies, values: bucket(hCompanies.map((r) => ({ at: r.createdAt })), since, 30), color: "var(--color-success)" },
              { label: ka.admin.stats.activeOffers, values: bucket(hOffers.map((r) => ({ at: r.createdAt })), since, 30), color: "var(--color-warning)" },
            ]}
            empty={d.chartEmpty}
          />
        </div>

        <div className={panel}>
          {head(ka.admin.offers, "/admin/offers")}
          {latestOffers.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted">{ka.sgba.noOffers}</p>
          ) : (
            <ul className="divide-y divide-line">
              {latestOffers.map((o) => (
                <li key={o.id}>
                  <Link href={`/admin/offers/${o.id}`} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 py-2 hover:bg-canvas sm:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)_150px]">
                    <span className="min-w-0">
                      <span className="block truncate text-xs font-bold text-ink">{o.title}</span>
                      <span className="block truncate text-[11px] text-muted">
                        {ka.enums.offerType[o.type]}
                        {o.badge ? ` · ${o.badge.name}` : ""} · {formatDateTime(o.createdAt)}
                      </span>
                    </span>
                    <span className="hidden truncate text-xs text-secondary sm:block">{o.company ? companyName(o.company) : `${o.author.firstName} ${o.author.lastName}`}</span>
                    <OfferStatusBadge status={o.status} />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      <section className="mt-3 grid gap-3 lg:grid-cols-3">
        <div className={panel}>
          {head(ka.admin.queue, "/admin/companies?status=IN_REVIEW")}
          {queue.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted">{ka.admin.queueEmpty}</p>
          ) : (
            <ul className="divide-y divide-line">
              {queue.map((c) => (
                <li key={c.id} className="flex items-center justify-between gap-3 py-2">
                  <div className="min-w-0">
                    <Link href={`/admin/companies/${c.id}`} className="block truncate text-xs font-bold text-ink hover:underline">{companyName(c)}</Link>
                    <p className="text-[11px] text-muted">{formatDateTime(c.updatedAt)}</p>
                  </div>
                  <VerificationBadge status={c.verificationStatus} />
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className={panel}>
          {head(ka.admin.invoicesByCurrency, "/admin/finance")}
          {byCurrency.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted">{ka.panel.financeEmpty}</p>
          ) : (
            <div className="space-y-2">
              {byCurrency.map((r) => {
                const total = Number(r._sum.total ?? 0);
                const paid = Number(r._sum.paidAmount ?? 0);
                const pct = total > 0 ? Math.min(100, Math.round((paid / total) * 100)) : 0;
                return (
                  <div key={r.currency} className="rounded-lg border border-line p-3">
                    <div className="flex items-baseline justify-between gap-2 text-xs">
                      <span className="font-bold text-ink">{r.currency} <span className="font-normal text-muted">({r._count})</span></span>
                      <span className="tabular-nums text-ink">{formatMoney(total, r.currency)}</span>
                    </div>
                    <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-chip">
                      <div className="h-full rounded-full bg-success" style={{ width: `${pct}%` }} />
                    </div>
                    <div className="mt-1.5 flex justify-between text-[11px] tabular-nums text-muted">
                      <span>{ka.panel.finance_paid}: <span className="text-success">{formatMoney(paid, r.currency)}</span></span>
                      <span>{ka.panel.finance_due}: {formatMoney(Math.max(0, total - paid), r.currency)}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className={panel}>
          {head(d.quickTitle)}
          <div className="grid grid-cols-2 gap-2 lg:grid-cols-1 2xl:grid-cols-2">
            {quick.map((q) => (
              <Link key={q.href} href={q.href} className="flex min-h-[46px] items-center gap-2 rounded-[9px] border border-line px-2.5 py-2 text-xs font-bold text-ink transition-colors hover:border-accent/40 hover:bg-blue-soft">
                <span className="grid size-7 shrink-0 place-items-center rounded-lg bg-blue-soft text-accent">
                  <Icon name={q.icon} size={15} />
                </span>
                <span className="leading-tight">{q.label}</span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <Card className="mt-3">
        <CardHeader title={ka.demo.title} text={ka.demo.text} />
        <CardBody className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <ActionForm action={loadDemoDataAction} className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <Field label={ka.demo.password} name="demoPassword">
              <Input name="demoPassword" placeholder="b2b123-" autoComplete="off" />
            </Field>
            <SubmitButton>{ka.demo.load}</SubmitButton>
          </ActionForm>
          <ActionForm action={removeDemoDataAction}>
            <SubmitButton variant="danger">{ka.demo.remove}</SubmitButton>
          </ActionForm>
        </CardBody>
      </Card>
    </>
  );
}
