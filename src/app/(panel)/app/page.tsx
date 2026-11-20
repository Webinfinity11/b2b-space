import Link from "next/link";
import { ka } from "@/i18n/ka";
import { NotificationLink } from "@/components/panel/NotificationLink";
import { getActiveMembership, requireUser } from "@/lib/authz";
import { otherPartyLabel, partySelect } from "@/lib/chat";
import { db } from "@/lib/db";
import { formatAmount } from "@/lib/money";
import { OPEN_STATUSES } from "@/lib/invoices";
import { searchOffers } from "@/lib/public";
import { companyIndustryIds } from "@/lib/sectors";
import { activeContextConversations, visibleInvoices } from "@/lib/scope";
import { ButtonLink } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { PageHeader, SectionTitle } from "@/components/ui/Card";
import { ActivityChart } from "@/components/panel/ActivityChart";
import { HeroArt, type HeroData } from "@/components/panel/HeroArt";
import { KpiTile } from "@/components/panel/KpiTile";
import { OfferGrid } from "@/components/panel/OfferGrid";
import { DAY, bucket, dayLabel, daysFrom, trendOf, windowStart, type Trend } from "@/lib/trend";
import { StagePill } from "@/components/panel/StagePill";
import { RelativeTime } from "@/components/panel/RelativeTime";

const LIVE = ["PUBLISHED", "ACCEPTING_RESPONSES", "NEGOTIATING"] as const;

export default async function DashboardPage() {
  const user = await requireUser("/app");
  const m = await getActiveMembership(user.id);
  const convScope = activeContextConversations(user.id, m);
  const invScope = visibleInvoices(user.id, m);
  // Offers for my sector (targeted at my industry or at all sectors).
  const industries = m ? await companyIndustryIds(m.companyId) : [];
  const industryNames = industries.length ? (await db.category.findMany({ where: { id: { in: industries }, parentId: null }, select: { name: true } })).map((c) => c.name).join(", ") : "";
  const forIndustries = industries.length ? industries : undefined;
  const since = windowStart(30);

  const [deals, dealCount, notifications, unreadMsgLinks, invoices, perks, requests, recentInvoices, chartDeals, chartInvoices] = await Promise.all([
    db.conversation.findMany({
      where: { AND: [convScope, { stage: { not: "CONTRACT" } }] },
      orderBy: { lastMessageAt: "desc" },
      take: 5,
      include: { participants: { select: partySelect }, offer: { select: { title: true, category: { select: { name: true } } } } },
    }),
    db.conversation.count({ where: convScope }),
    db.notification.findMany({ where: { userId: user.id }, orderBy: { createdAt: "desc" }, take: 5 }),
    db.notification.findMany({ where: { userId: user.id, readAt: null, type: "NEW_MESSAGE" }, distinct: ["link"], select: { link: true } }),
    db.invoice.findMany({
      where: { AND: [invScope, { status: { in: [...OPEN_STATUSES] } }] },
      select: { currency: true, total: true, paidAmount: true, sellerUserId: true, sellerCompanyId: true },
    }),
    searchOffers({ loggedIn: true, type: "OFFER", page: 1, pageSize: 4, forIndustries, excludeOwn: { userId: user.id, companyId: m?.companyId } }),
    searchOffers({ loggedIn: true, type: "REQUEST", page: 1, pageSize: 4, forIndustries, excludeOwn: { userId: user.id, companyId: m?.companyId } }),
    db.invoice.findMany({
      where: invScope,
      orderBy: { issuedAt: "desc" },
      take: 3,
      select: { id: true, number: true, issuedAt: true, total: true, currency: true },
    }),
    db.conversation.findMany({ where: { AND: [convScope, { createdAt: { gte: since } }] }, select: { createdAt: true } }),
    db.invoice.findMany({ where: { AND: [invScope, { issuedAt: { gte: since } }] }, select: { issuedAt: true } }),
  ]);
  // 60 days of history for KPI sparklines + change vs the previous 30 days.
  const since60 = windowStart(60);
  const [hDeals, hInvoices, hRequests, hMessages] = await Promise.all([
    db.conversation.findMany({ where: { AND: [convScope, { createdAt: { gte: since60 } }] }, select: { createdAt: true, amount: true } }),
    db.invoice.findMany({ where: { AND: [invScope, { issuedAt: { gte: since60 } }] }, select: { issuedAt: true, total: true, currency: true, sellerUserId: true, sellerCompanyId: true } }),
    db.offer.findMany({ where: { type: "REQUEST", status: { in: [...LIVE] }, hiddenAt: null, publishedAt: { gte: since60 } }, select: { publishedAt: true } }),
    db.notification.findMany({ where: { userId: user.id, type: "NEW_MESSAGE", createdAt: { gte: since60 } }, select: { createdAt: true } }),
  ]);
  // Real data for the banner cards: company growth (30 days), offers per week (6 weeks), latest companies.
  const weeksStart = windowStart(42);
  const [heroCompanies, heroOffers] = await Promise.all([
    db.company.findMany({ where: { verificationStatus: "VERIFIED", createdAt: { gte: since } }, select: { createdAt: true } }),
    db.offer.findMany({ where: { type: "OFFER", status: { in: [...LIVE] }, hiddenAt: null, publishedAt: { gte: weeksStart } }, select: { publishedAt: true } }),
  ]);
  const heroData: HeroData = {
    companiesPerDay: bucket(heroCompanies.map((c) => ({ at: c.createdAt })), since, 30),
    offersPerWeek: Array.from({ length: 6 }, (_, w) => {
      const from = weeksStart.getTime() + w * 7 * DAY;
      return heroOffers.filter((o) => o.publishedAt && o.publishedAt.getTime() >= from && o.publishedAt.getTime() < from + 7 * DAY).length;
    }),
  };
  const banner =
    (await db.offerBadge.findFirst({ where: { showBanner: true, isActive: true }, orderBy: { sortOrder: "asc" } })) ??
    (await db.offerBadge.findFirst({ where: { isActive: true, name: { contains: "ქალები" } } }));
  const activeDeals = await db.conversation.count({ where: { AND: [convScope, { stage: { not: "CONTRACT" } }] } });
  const forecast = await db.conversation.aggregate({ where: { AND: [convScope, { stage: { not: "CONTRACT" } }] }, _sum: { amount: true } });
  const unread = await db.notification.count({ where: { userId: user.id, readAt: null } });

  const isSeller = (i: { sellerCompanyId: string | null; sellerUserId: string }) => (i.sellerCompanyId ? i.sellerCompanyId === m?.companyId : i.sellerUserId === user.id);
  // Open invoices in GEL (other currencies are listed in Finance).
  const receivable = invoices.filter((i) => i.currency === "GEL" && isSeller(i)).reduce((s, i) => s + Number(i.total) - Number(i.paidAmount), 0);
  const toPay = invoices.filter((i) => i.currency === "GEL" && !isSeller(i)).reduce((s, i) => s + Number(i.total) - Number(i.paidAmount), 0);

  const mySide = (c: (typeof deals)[number]) =>
    (c.participants.find((p) => p.userId === user.id) ?? c.participants.find((p) => p.companyId && p.companyId === m?.companyId))?.side ?? null;

  const dayLabels = daysFrom(since, 30).map(dayLabel);

  const since60Rows = (rows: { at: Date | null; v?: number }[]) => trendOf(bucket(rows, since60, 60));
  const tDeals = since60Rows(hDeals.map((c) => ({ at: c.createdAt })));
  const tForecast = since60Rows(hDeals.map((c) => ({ at: c.createdAt, v: Number(c.amount ?? 0) })));
  const tMessages = since60Rows(hMessages.map((n) => ({ at: n.createdAt })));
  const tReceivable = since60Rows(hInvoices.filter((i) => i.currency === "GEL" && isSeller(i)).map((i) => ({ at: i.issuedAt, v: Number(i.total) })));
  const tRequests = since60Rows(hRequests.map((r) => ({ at: r.publishedAt })));

  const d = ka.sgba.dash;
  const panel = "rounded-[13px] border border-line bg-surface p-4";
  const panelHead = (title: string, href?: string) => (
    <div className="mb-3 flex items-center justify-between gap-2">
      <h3 className="text-[13px] font-bold text-ink">{title}</h3>
      {href && (
        <Link href={href} className="inline-flex items-center gap-1 whitespace-nowrap text-xs font-bold text-accent hover:text-accent-hover">
          {ka.sgba.viewAll} <Icon name="arrow" size={13} />
        </Link>
      )}
    </div>
  );
  const TONES_ORDER = ["blue", "green", "violet", "amber", "pink"] as const;
  const kpis: { label: string; value: string | number; hint: string; icon: "chat" | "trend" | "mail" | "file" | "box"; t: Trend }[] = [
    { label: ka.sgba.kpiDeals, value: activeDeals, hint: ka.sgba.kpiDealsHint(dealCount), icon: "chat", t: tDeals },
    { label: ka.sgba.kpiForecast, value: formatAmount(Number(forecast._sum.amount ?? 0), "GEL"), hint: ka.sgba.kpiForecastHint, icon: "trend", t: tForecast },
    { label: ka.sgba.kpiMessages, value: unread, hint: ka.sgba.kpiMessagesHint(unreadMsgLinks.length), icon: "mail", t: tMessages },
    { label: ka.sgba.kpiReceivable, value: formatAmount(receivable, "GEL"), hint: ka.sgba.kpiReceivableHint, icon: "file", t: tReceivable },
    { label: d.kpiRequests, value: requests.total, hint: d.kpiRequestsHint, icon: "box", t: tRequests },
  ];
  const shortcuts: { href: string; label: string; icon: "tag" | "box" | "building" | "chat" | "invoice" | "chart" }[] = [
    { href: "/company/offers/new?type=OFFER", label: d.qOffer, icon: "tag" },
    { href: "/company/offers/new?type=REQUEST", label: d.qRequest, icon: "box" },
    { href: "/companies", label: d.qCompany, icon: "building" },
    { href: "/app/conversations", label: d.qMessages, icon: "chat" },
    { href: "/app/invoices/new", label: d.qInvoice, icon: "invoice" },
    { href: "/app/analytics", label: d.qAnalytics, icon: "chart" },
  ];

  return (
    <>
      <PageHeader
        title={ka.sgba.greeting(user.firstName)}
        action={
          <ButtonLink href="/company/offers/new?type=REQUEST">
            <Icon name="plus" size={16} /> {ka.sgba.createRequest}
          </ButtonLink>
        }
      />

      {/* Hero: featured programme badge (admin: ნიშნები → "ბანერად") with the network in numbers */}
      <section className="relative isolate flex min-h-[260px] items-center overflow-hidden rounded-[16px] bg-[#1d45d1] shadow-[0_18px_40px_-22px_rgb(29_69_209/0.55)]">
        <HeroArt data={heroData} />
        <div className="relative z-20 w-full px-6 py-7 sm:w-[58%] sm:px-9">
          <h2 className="text-[26px] font-extrabold leading-[1.3] tracking-[-0.5px] text-white sm:text-[32px]">{banner?.name ?? ka.sgba.promoTitle}</h2>
          <p className="mb-5 mt-2 max-w-md text-[13.5px] leading-relaxed text-white/80">{banner?.description ?? ka.sgba.promoText}</p>
          <Link
            href={banner ? `/offers?badge=${banner.id}` : "/offers"}
            className="inline-flex h-11 items-center gap-2 rounded-full bg-white px-5 text-[13px] font-bold text-[#1d45d1] shadow-[0_8px_20px_-8px_rgb(8_20_80/0.5)] transition-transform hover:-translate-y-px"
          >
            {ka.sgba.promoButton} <Icon name="arrow" size={17} />
          </Link>
        </div>
      </section>

      {/* Special offers for my sector */}
      <section className="mb-6 mt-7">
        <SectionTitle
          eyebrow={industries.length ? ka.sectors.forYouText(industryNames) : ka.sgba.perksEyebrow}
          title={industries.length ? ka.sectors.forYou : ka.sgba.perksTitle}
          action={
            <Link href="/offers" className="inline-flex items-center gap-2 text-[13px] font-bold text-accent hover:text-accent-hover">
              {ka.sgba.viewAll} <Icon name="arrow" size={18} />
            </Link>
          }
        />
        {perks.items.length === 0 ? (
          <p className="rounded-[13px] border border-dashed border-line-strong bg-surface px-4 py-10 text-center text-sm text-muted">{ka.sgba.noOffers}</p>
        ) : (
          <OfferGrid offers={perks.items} respondAs={m?.companyId ?? "personal"} ownSlug={m?.company.slug} />
        )}
      </section>

      <section className="mb-3 grid grid-cols-2 gap-2.5 lg:grid-cols-5">
        {kpis.map((k, i) => (
          <KpiTile key={k.label} tone={TONES_ORDER[i]} id={`c${i}`} label={k.label} value={k.value} hint={k.hint} icon={k.icon} t={k.t} className={i === 4 ? "col-span-2 lg:col-span-1" : ""} />
        ))}
      </section>

      <section className="grid gap-3 lg:grid-cols-[1.5fr_1.15fr_1fr]">
        <div className={panel}>
          <div className="mb-3 flex items-center justify-between gap-2">
            <h3 className="text-[13px] font-bold text-ink">{d.chartTitle}</h3>
            <span className="rounded-[7px] border border-line px-2.5 py-1 text-[11px] text-secondary">{d.period}</span>
          </div>
          <ActivityChart
            days={dayLabels}
            series={[
              { label: d.chartDeals, values: bucket(chartDeals.map((c) => ({ at: c.createdAt })), since, 30), color: "var(--color-accent)" },
              { label: d.chartInvoices, values: bucket(chartInvoices.map((i) => ({ at: i.issuedAt })), since, 30), color: "var(--color-success)" },
            ]}
            empty={d.chartEmpty}
          />
        </div>

        <div className={panel}>
          {panelHead(d.notificationsTitle, "/app/notifications")}
          {notifications.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted">{ka.sgba.noActivity}</p>
          ) : (
            <ul className="divide-y divide-line">
              {notifications.slice(0, 4).map((n) => (
                <li key={n.id}>
                  <NotificationLink
                    id={n.id}
                    href={n.link && n.link.startsWith("/") && !n.link.startsWith("//") ? n.link : "/app/notifications"}
                    unread={!n.readAt}
                    className="flex items-center gap-2.5 py-2.5 hover:bg-canvas"
                  >
                    <span className={`grid size-7 shrink-0 place-items-center rounded-full ${n.readAt ? "bg-chip text-muted" : "bg-blue-soft text-accent"}`}>
                      <Icon name={n.type.startsWith("INVOICE") || n.type.startsWith("PAYMENT") ? "invoice" : n.type === "NEW_MESSAGE" ? "chat" : "bell"} size={14} />
                    </span>
                    <span className={`min-w-0 flex-1 text-xs leading-snug ${n.readAt ? "text-secondary" : "font-semibold text-ink"}`}>{n.title}</span>
                    <RelativeTime date={n.createdAt.toISOString()} className="shrink-0 text-[11px] text-muted" />
                  </NotificationLink>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className={panel}>
          {panelHead(d.requestsTitle, "/offers?type=REQUEST")}
          {requests.items.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted">{d.requestsEmpty}</p>
          ) : (
            <ul className="divide-y divide-line">
              {requests.items.map((r) => (
                <li key={r.id}>
                  <Link href="/offers?type=REQUEST" className="block py-2.5 hover:bg-canvas">
                    <span className="block truncate text-xs font-semibold text-ink">{r.title}</span>
                    <span className="mt-0.5 flex items-center justify-between gap-2 text-[11px] text-muted">
                      <span className="truncate">{r.publisher.kind === "company" ? r.publisher.name : ka.offer.anonymous}</span>
                      {r.category && <span className="shrink-0 rounded-[5px] bg-chip px-1.5 py-0.5 text-accent">{r.category.name}</span>}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      <section className="mt-3 grid gap-3 lg:grid-cols-3">
        <div className={panel}>
          {panelHead(d.dealsTitle, "/app/conversations")}
          {deals.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted">{ka.sgba.noDeals}</p>
          ) : (
            <ul>
              {deals.slice(0, 4).map((c) => {
                const other = otherPartyLabel(c.participants, mySide(c));
                return (
                  <li key={c.id}>
                    <Link href={`/app/conversations/${c.id}`} className="flex items-center gap-2.5 py-2 hover:bg-canvas">
                      <span className="grid size-[26px] shrink-0 place-items-center rounded-full bg-blue-soft text-[10px] font-bold text-accent">{other.slice(0, 2)}</span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-xs font-bold text-ink">{other}</span>
                        <span className="block truncate text-[11px] text-muted">{c.subject}</span>
                      </span>
                      <StagePill stage={c.stage} />
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <div className={panel}>
          {panelHead(d.financeTitle, "/app/finance")}
          <div className="mb-3 grid grid-cols-2 gap-2">
            <div className="rounded-lg border border-line p-2.5">
              <small className="block text-[11px] text-muted">{d.receivable}</small>
              <strong className="mt-1 block truncate text-[15px] tabular-nums text-ink">{formatAmount(receivable, "GEL")}</strong>
            </div>
            <div className="rounded-lg border border-line p-2.5">
              <small className="block text-[11px] text-muted">{d.toPay}</small>
              <strong className="mt-1 block truncate text-[15px] tabular-nums text-ink">{formatAmount(toPay, "GEL")}</strong>
            </div>
          </div>
          <div className="mb-1 text-xs font-bold text-ink">{d.recentInvoices}</div>
          {recentInvoices.length === 0 ? (
            <p className="py-3 text-center text-xs text-muted">{d.noInvoices}</p>
          ) : (
            <ul className="divide-y divide-line">
              {recentInvoices.map((i) => (
                <li key={i.id}>
                  <Link href={`/app/invoices/${i.id}`} className="grid grid-cols-[1.2fr_.8fr_auto] items-center gap-2 py-2 text-xs tabular-nums hover:bg-canvas">
                    <span className="truncate font-medium text-ink">{i.number}</span>
                    <span className="text-muted">{i.issuedAt.toLocaleDateString("ka-GE")}</span>
                    <span className="text-right font-bold text-ink">{formatAmount(Number(i.total), i.currency)}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className={panel}>
          {panelHead(d.quickTitle)}
          <div className="grid grid-cols-2 gap-2">
            {shortcuts.map((q) => (
              <Link
                key={q.href}
                href={q.href}
                className="flex min-h-[46px] items-center gap-2 rounded-[9px] border border-line px-2.5 py-2 text-xs font-bold text-ink transition-colors hover:border-accent/40 hover:bg-blue-soft"
              >
                <span className="grid size-7 shrink-0 place-items-center rounded-lg bg-blue-soft text-accent">
                  <Icon name={q.icon} size={15} />
                </span>
                <span className="leading-tight">{q.label}</span>
              </Link>
            ))}
          </div>
        </div>
      </section>

    </>
  );
}
