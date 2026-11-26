import Link from "next/link";
import { ka } from "@/i18n/ka";
import { requireAdmin } from "@/lib/authz";
import { db } from "@/lib/db";
import { formatDateTime, formatMoney } from "@/lib/format";
import { searchOffers } from "@/lib/public";
import { HeroArt, type HeroData } from "@/components/panel/HeroArt";
import { OfferFace, offerCardClass } from "@/components/panel/OfferFace";
import { ButtonLink } from "@/components/ui/Button";
import { companyName } from "@/lib/public";
import { DAY, bucket, dayLabel, daysFrom, trendOf, windowStart } from "@/lib/trend";
import { Card, CardBody, CardHeader, PageHeader, SectionTitle } from "@/components/ui/Card";
import { Icon, type IconName } from "@/components/ui/Icon";
import { ActivityChart } from "@/components/panel/ActivityChart";
import { KpiTile } from "@/components/panel/KpiTile";
import { VerificationBadge } from "@/components/panel/StatusBadges";
import { ActionForm, Field, Input, SubmitButton } from "@/components/ui/Form";
import { loadDemoDataAction, removeDemoDataAction } from "@/actions/admin";

const LIVE = ["PUBLISHED", "ACCEPTING_RESPONSES", "NEGOTIATING"] as const;

export default async function AdminOverviewPage() {
  const admin = await requireAdmin();
  const since = windowStart(30);
  const since60 = windowStart(60);
  const [users, companies, pending, offers, requests, invoiceCount, byCurrency, queue, hUsers, hCompanies, hOffers, hRequests, hInvoices] = await Promise.all([
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
  // Banner and offer cards: the same blocks members see on their dashboard.
  const weeksStart = windowStart(42);
  const [heroCompanies, heroOffers, latest, badge] = await Promise.all([
    db.company.findMany({ where: { verificationStatus: "VERIFIED", createdAt: { gte: since } }, select: { createdAt: true } }),
    db.offer.findMany({ where: { type: "OFFER", status: { in: [...LIVE] }, hiddenAt: null, publishedAt: { gte: weeksStart } }, select: { publishedAt: true } }),
    searchOffers({ loggedIn: true, type: "OFFER", page: 1, pageSize: 4 }),
    db.offerBadge.findFirst({ where: { showBanner: true, isActive: true }, orderBy: { sortOrder: "asc" } }),
  ]);
  const heroData: HeroData = {
    companiesPerDay: bucket(heroCompanies.map((c) => ({ at: c.createdAt })), since, 30),
    offersPerWeek: Array.from({ length: 6 }, (_, w) => {
      const from = weeksStart.getTime() + w * 7 * DAY;
      return heroOffers.filter((o) => o.publishedAt && o.publishedAt.getTime() >= from && o.publishedAt.getTime() < from + 7 * DAY).length;
    }),
  };
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
      <PageHeader
        title={ka.sgba.greeting(admin.firstName)}
        action={
          <ButtonLink href="/admin/registrations">
            <Icon name="inbox" size={16} /> {ka.sgba.approvalsTitle}
          </ButtonLink>
        }
      />

      <section className="relative isolate flex min-h-[260px] items-center overflow-hidden rounded-[16px] bg-[#1d45d1] shadow-[0_18px_40px_-22px_rgb(29_69_209/0.55)]">
        <HeroArt data={heroData} />
        <div className="relative z-20 w-full px-6 py-7 sm:w-[58%] sm:px-9">
          <h2 className="text-[26px] font-extrabold leading-[1.3] tracking-[-0.5px] text-white sm:text-[32px]">{badge?.name ?? ka.admin.overview}</h2>
          <p className="mb-5 mt-2 max-w-md text-[13.5px] leading-relaxed text-white/80">{badge?.description ?? ka.admin.overviewText}</p>
          <Link href="/admin/badges" className="inline-flex h-11 items-center gap-2 rounded-full bg-white px-5 text-[13px] font-bold text-[#1d45d1] shadow-[0_8px_20px_-8px_rgb(8_20_80/0.5)] transition-transform hover:-translate-y-px">
            {ka.sgba.badgesTitle} <Icon name="arrow" size={17} />
          </Link>
        </div>
      </section>

      <section className="mb-6 mt-7">
        <SectionTitle
          title={ka.admin.offers}
          action={
            <Link href="/admin/offers" className="inline-flex items-center gap-2 text-[13px] font-bold text-accent hover:text-accent-hover">
              {ka.sgba.viewAll} <Icon name="arrow" size={18} />
            </Link>
          }
        />
        {latest.items.length === 0 ? (
          <p className="rounded-[13px] border border-dashed border-line-strong bg-surface px-4 py-10 text-center text-sm text-muted">{ka.sgba.noOffers}</p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {latest.items.map((o) => (
              <Link key={o.id} href={`/admin/offers/${o.id}`} className={offerCardClass}>
                <OfferFace offer={o} />
              </Link>
            ))}
          </div>
        )}
      </section>

      <section className="mb-3 grid grid-cols-2 gap-2.5 lg:grid-cols-5">
        {kpis.map((k, i) => (
          <KpiTile key={k.id} tone={(["blue", "green", "violet", "amber", "pink"] as const)[i]} {...k} className={i === 4 ? "col-span-2 lg:col-span-1" : ""} />
        ))}
      </section>

      <section className="grid gap-3 lg:grid-cols-[1.5fr_1.15fr_1fr]">
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
      </section>

      <section className="mt-3">
        <div className={panel}>
          {head(d.quickTitle)}
          <div className="grid grid-cols-2 gap-2 lg:grid-cols-6">
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
