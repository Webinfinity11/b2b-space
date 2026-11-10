import Link from "next/link";
import { ka } from "@/i18n/ka";
import { getActiveMembership, requireUser } from "@/lib/authz";
import { otherPartyLabel, partySelect } from "@/lib/chat";
import { db } from "@/lib/db";
import { formatAmount } from "@/lib/money";
import { OPEN_STATUSES } from "@/lib/invoices";
import { searchOffers } from "@/lib/public";
import { visibleConversations, visibleInvoices } from "@/lib/scope";
import { ButtonLink } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { KpiCard, PageHeader, SectionTitle } from "@/components/ui/Card";
import { OfferGrid } from "@/components/panel/OfferGrid";
import { StagePill } from "@/components/panel/StagePill";
import { RelativeTime } from "@/components/panel/RelativeTime";

export default async function DashboardPage() {
  const user = await requireUser("/app");
  const m = await getActiveMembership(user.id);
  const convScope = visibleConversations(user.id, m);
  const invScope = visibleInvoices(user.id, m);

  const [deals, dealCount, notifications, unreadMsgLinks, invoices, perks] = await Promise.all([
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
    searchOffers({ loggedIn: true, type: "OFFER", page: 1, pageSize: 4 }),
  ]);
  const banner = await db.offerBadge.findFirst({ where: { showBanner: true, isActive: true }, orderBy: { sortOrder: "asc" } });
  const activeDeals = await db.conversation.count({ where: { AND: [convScope, { stage: { not: "CONTRACT" } }] } });
  const forecast = await db.conversation.aggregate({ where: { AND: [convScope, { stage: { not: "CONTRACT" } }] }, _sum: { amount: true } });
  const unread = notifications.filter((n) => !n.readAt).length;

  // Receivables: open invoices where we are the seller (GEL shown; other currencies are listed in Finance).
  const receivable = invoices
    .filter((i) => i.currency === "GEL" && (i.sellerCompanyId ? i.sellerCompanyId === m?.companyId : i.sellerUserId === user.id))
    .reduce((s, i) => s + Number(i.total) - Number(i.paidAmount), 0);

  const mySide = (c: (typeof deals)[number]) =>
    (c.participants.find((p) => p.userId === user.id) ?? c.participants.find((p) => p.companyId && p.companyId === m?.companyId))?.side ?? null;

  return (
    <>
      <PageHeader
        eyebrow={`${ka.brandShort} — ${ka.sgba.dashEyebrow}`}
        title={ka.sgba.greeting(user.firstName)}
        text={ka.sgba.dashText}
        action={
          <>
            <ButtonLink href="/company/offers/new?type=REQUEST" variant="secondary">
              <Icon name="box" size={16} /> {ka.sgba.createRequest}
            </ButtonLink>
            <ButtonLink href="/app/campaigns">
              <Icon name="plus" size={16} /> {ka.sgba.newCampaign}
            </ButtonLink>
          </>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard featured label={ka.sgba.kpiDeals} value={activeDeals} hint={ka.sgba.kpiDealsHint(dealCount)} icon={<Icon name="chat" size={18} />} tone="blue" />
        <KpiCard label={ka.sgba.kpiForecast} value={formatAmount(Number(forecast._sum.amount ?? 0), "GEL")} hint={ka.sgba.kpiForecastHint} icon={<Icon name="trend" size={18} />} tone="green" />
        <KpiCard label={ka.sgba.kpiMessages} value={unread} hint={ka.sgba.kpiMessagesHint(unreadMsgLinks.length)} icon={<Icon name="mail" size={18} />} tone="violet" />
        <KpiCard label={ka.sgba.kpiReceivable} value={formatAmount(receivable, "GEL")} hint={ka.sgba.kpiReceivableHint} icon={<Icon name="file" size={18} />} tone="yellow" />
      </div>

      {/* Featured badge banner (admin: ნიშნები → "ბანერად") */}
      {banner && (
      <section className="relative isolate mt-6 flex min-h-[214px] items-center overflow-hidden rounded-[16px] bg-gradient-to-r from-blue-soft to-blue-soft-2">
        <div className="relative z-10 w-full px-6 py-6 sm:w-[78%] sm:px-8">
          <div className="mb-2 text-xs font-bold text-muted">{ka.brandShort} {ka.sgba.promoEyebrow}</div>
          <h2 className="text-[26px] font-bold leading-snug tracking-[-0.5px] text-ink sm:text-[30px]">{banner.name}</h2>
          <p className="mb-5 mt-1.5 max-w-xl text-sm leading-relaxed text-secondary">{banner.description}</p>
          <ButtonLink href={`/offers?badge=${banner.id}`} className="h-[42px] px-4 text-[13px]">
            {ka.sgba.promoButton} <Icon name="arrow" size={19} />
          </ButtonLink>
        </div>
        {/* eslint-disable-next-line @next/next/no-img-element -- decorative design art */}
        <img
          src="/images/banner-art.webp"
          alt=""
          aria-hidden="true"
          className="pointer-events-none absolute inset-y-0 right-0 z-0 h-full w-[45%] object-cover object-right [mask-image:linear-gradient(to_right,transparent_0%,#000_30%)] max-sm:opacity-40"
        />
      </section>
      )}

      {/* Special offers */}
      <section className="mt-8">
        <SectionTitle
          eyebrow={ka.sgba.perksEyebrow}
          title={ka.sgba.perksTitle}
          action={<Link href="/offers" className="inline-flex items-center gap-2 text-[13px] font-bold text-accent hover:text-accent-hover">{ka.sgba.viewAll} <Icon name="arrow" size={18} /></Link>}
        />
        {perks.items.length === 0 ? (
          <p className="rounded-[16px] border border-dashed border-line-strong bg-surface px-4 py-10 text-center text-sm text-muted">{ka.sgba.noOffers}</p>
        ) : (
          <OfferGrid offers={perks.items} respondAs={m?.companyId ?? "personal"} ownSlug={m?.company.slug} />
        )}
      </section>

      {/* Deals + activity */}
      <div className="mt-8 grid gap-6 xl:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
        <section className="rounded-[16px] border border-line bg-surface p-5">
          <SectionTitle
            eyebrow={ka.sgba.salesEyebrow}
            title={ka.sgba.kpiDeals}
            action={<Link href="/app/conversations" className="text-sm font-medium text-accent-strong hover:underline">{ka.sgba.viewAll} →</Link>}
          />
          {deals.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted">{ka.sgba.noDeals}</p>
          ) : (
            <ul className="divide-y divide-line">
              {deals.map((c) => {
                const other = otherPartyLabel(c.participants, mySide(c));
                return (
                  <li key={c.id}>
                    <Link href={`/app/conversations/${c.id}`} className="flex items-center gap-3 py-3 hover:bg-canvas/60">
                      <span className="grid size-10 shrink-0 place-items-center rounded-full bg-blue-soft text-xs font-bold text-accent">{other.slice(0, 2)}</span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-semibold">{other}</span>
                        <span className="block truncate text-xs text-muted">{c.subject}</span>
                      </span>
                      <StagePill stage={c.stage} />
                      <span className="w-24 shrink-0 text-right text-sm font-semibold tabular-nums max-sm:hidden">{c.amount ? formatAmount(Number(c.amount), "GEL") : "—"}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <section className="rounded-[16px] border border-line bg-surface p-5">
          <SectionTitle
            eyebrow={ka.sgba.activityEyebrow}
            title={ka.sgba.nav.messages}
            action={<Link href="/app/notifications" className="text-sm font-medium text-accent-strong hover:underline">{ka.sgba.viewAll} →</Link>}
          />
          {notifications.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted">{ka.sgba.noActivity}</p>
          ) : (
            <ul className="space-y-1">
              {notifications.map((n) => (
                <li key={n.id}>
                  <Link href={n.link ?? "/app/notifications"} className="flex items-start gap-3 rounded-[10px] px-2 py-2.5 hover:bg-canvas">
                    <span className={`grid size-9 shrink-0 place-items-center rounded-lg ${n.readAt ? "bg-chip text-muted" : "bg-blue-soft text-accent"}`}>
                      <Icon name={n.type.startsWith("INVOICE") || n.type.startsWith("PAYMENT") ? "invoice" : n.type === "NEW_MESSAGE" ? "chat" : "bell"} size={16} />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className={`block text-sm ${n.readAt ? "text-secondary" : "font-medium text-ink"}`}>{n.title}</span>
                      <RelativeTime date={n.createdAt.toISOString()} className="text-xs text-muted" />
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </>
  );
}
