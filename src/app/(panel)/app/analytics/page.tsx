import type { Metadata } from "next";
import { ka } from "@/i18n/ka";
import { getActiveMembership, requireUser } from "@/lib/authz";
import { db } from "@/lib/db";
import { formatAmount } from "@/lib/money";
import { manageableOffers, visibleConversations, visibleInvoices } from "@/lib/scope";
import { Icon } from "@/components/ui/Icon";
import { KpiCard, PageHeader, SectionTitle } from "@/components/ui/Card";

export const metadata: Metadata = { title: ka.sgba.nav.analytics };

const STAGES = ["INTEREST", "OFFER", "NEGOTIATION", "MEETING", "CONTRACT"] as const;
const MONTHS = ["იან", "თებ", "მარ", "აპრ", "მაი", "ივნ", "ივლ", "აგვ", "სექ", "ოქტ", "ნოე", "დეკ"];

/** Company analytics: pipeline, conversion, invoicing by month, top offers, campaign results. */
export default async function AnalyticsPage() {
  const user = await requireUser("/app/analytics");
  const m = await getActiveMembership(user.id);
  const sixAgo = new Date();
  sixAgo.setMonth(sixAgo.getMonth() - 5, 1);
  sixAgo.setHours(0, 0, 0, 0);

  const [deals, invoices, offers, campaigns] = await Promise.all([
    db.conversation.findMany({ where: visibleConversations(user.id, m), select: { stage: true, amount: true } }),
    db.invoice.findMany({
      where: { AND: [visibleInvoices(user.id, m), { issuedAt: { gte: sixAgo } }, { status: { notIn: ["DRAFT", "CANCELLED"] } }] },
      select: { issuedAt: true, total: true, paidAmount: true, currency: true, sellerCompanyId: true, sellerUserId: true },
    }),
    db.offer.findMany({
      where: manageableOffers(user.id, m),
      select: { id: true, title: true, status: true, _count: { select: { responses: true, conversations: true } } },
      orderBy: { createdAt: "desc" },
      take: 50,
    }),
    m ? db.campaignRequest.findMany({ where: { companyId: m.companyId }, select: { recipients: { select: { viewedAt: true, repliedAt: true } } } }) : Promise.resolve([]),
  ]);

  const byStage = STAGES.map((s) => {
    const rows = deals.filter((d) => d.stage === s);
    return { s, count: rows.length, value: rows.reduce((a, d) => a + Number(d.amount ?? 0), 0) };
  });
  const maxCount = Math.max(1, ...byStage.map((b) => b.count));
  const won = byStage.find((b) => b.s === "CONTRACT")!.count;
  const conversion = deals.length ? Math.round((won / deals.length) * 100) : 0;
  const pipeline = byStage.filter((b) => b.s !== "CONTRACT").reduce((a, b) => a + b.value, 0);

  // Sales invoices per month (GEL), issued vs paid.
  const months = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(sixAgo);
    d.setMonth(sixAgo.getMonth() + i);
    return { key: `${d.getFullYear()}-${d.getMonth()}`, label: MONTHS[d.getMonth()], issued: 0, paid: 0 };
  });
  for (const inv of invoices) {
    const seller = inv.sellerCompanyId ? inv.sellerCompanyId === m?.companyId : inv.sellerUserId === user.id;
    if (!seller || inv.currency !== "GEL") continue;
    const row = months.find((x) => x.key === `${inv.issuedAt.getFullYear()}-${inv.issuedAt.getMonth()}`);
    if (row) {
      row.issued += Number(inv.total);
      row.paid += Number(inv.paidAmount);
    }
  }
  const maxMonth = Math.max(1, ...months.map((x) => x.issued));
  const topOffers = [...offers].sort((a, b) => b._count.conversations - a._count.conversations).slice(0, 5);
  const rec = campaigns.flatMap((c) => c.recipients);

  return (
    <>
      <PageHeader eyebrow={ka.sgba.analyticsEyebrow} title={ka.sgba.nav.analytics} text={ka.sgba.analyticsText} />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard label={ka.sgba.anDeals} value={deals.length} icon={<Icon name="chat" size={18} />} tone="blue" />
        <KpiCard label={ka.sgba.anConversion} value={`${conversion}%`} hint={ka.sgba.anConversionHint(won)} icon={<Icon name="check" size={18} />} tone="green" />
        <KpiCard label={ka.sgba.anPipeline} value={formatAmount(pipeline, "GEL")} icon={<Icon name="trend" size={18} />} tone="violet" />
        <KpiCard label={ka.sgba.anCampaignReach} value={rec.length} hint={ka.sgba.anCampaignHint(rec.filter((r) => r.viewedAt).length, rec.filter((r) => r.repliedAt).length)} icon={<Icon name="inbox" size={18} />} tone="yellow" />
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-2">
        <section className="rounded-[16px] border border-line bg-surface p-6">
          <SectionTitle eyebrow={ka.sgba.salesEyebrow} title={ka.sgba.anFunnel} />
          <ul className="space-y-3">
            {byStage.map((b) => (
              <li key={b.s}>
                <div className="mb-1 flex justify-between text-sm">
                  <span>{ka.sgba.stages[b.s]}</span>
                  <span className="text-muted tabular-nums">{b.count} · {formatAmount(b.value, "GEL")}</span>
                </div>
                <div className="h-2.5 rounded-full bg-chip">
                  <div className="h-2.5 rounded-full bg-accent" style={{ width: `${(b.count / maxCount) * 100}%` }} />
                </div>
              </li>
            ))}
          </ul>
        </section>

        <section className="rounded-[16px] border border-line bg-surface p-6">
          <SectionTitle eyebrow={ka.sgba.nav.documents} title={ka.sgba.anInvoices} />
          <div className="flex h-48 items-end gap-3">
            {months.map((x) => (
              <div key={x.key} className="flex h-full flex-1 flex-col items-center justify-end gap-1">
                <div className="relative w-full max-w-10 rounded-t-md bg-[#dbe7f5]" style={{ height: `${(x.issued / maxMonth) * 100}%` }} title={formatAmount(x.issued, "GEL")}>
                  <div className="absolute inset-x-0 bottom-0 rounded-t-md bg-success" style={{ height: x.issued ? `${(x.paid / x.issued) * 100}%` : 0 }} />
                </div>
                <span className="text-[11px] text-muted">{x.label}</span>
              </div>
            ))}
          </div>
          <div className="mt-3 flex gap-4 text-xs text-muted">
            <span className="flex items-center gap-1.5"><span className="size-2.5 rounded-sm bg-[#dbe7f5]" /> {ka.sgba.anIssued}</span>
            <span className="flex items-center gap-1.5"><span className="size-2.5 rounded-sm bg-success" /> {ka.sgba.anPaid}</span>
          </div>
        </section>
      </div>

      <section className="mt-6 rounded-[16px] border border-line bg-surface p-6">
        <SectionTitle title={ka.sgba.anTopOffers} />
        {topOffers.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted">{ka.sgba.anNoOffers}</p>
        ) : (
          <ul className="divide-y divide-line">
            {topOffers.map((o) => (
              <li key={o.id} className="flex items-center justify-between gap-3 py-3 text-sm">
                <span className="min-w-0 truncate">{o.title}</span>
                <span className="shrink-0 text-muted">{ka.sgba.anOfferStats(o._count.conversations)}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}
