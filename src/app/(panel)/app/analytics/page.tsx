import type { Metadata } from "next";
import { ka } from "@/i18n/ka";
import { getActiveMembership, requireUser } from "@/lib/authz";
import { db } from "@/lib/db";
import { formatAmount } from "@/lib/money";
import { activeContextConversations, manageableOffers, visibleInvoices } from "@/lib/scope";
import { Icon } from "@/components/ui/Icon";
import type { Prisma } from "@/generated/prisma/client";
import { readCompanyFilter } from "@/lib/company-filter";
import { getCategoryTree } from "@/lib/public";
import { CompanyFilterBar } from "@/components/panel/CompanyFilterBar";
import { KpiCard, PageHeader, SectionTitle } from "@/components/ui/Card";

export const metadata: Metadata = { title: ka.sgba.nav.analytics };

const STAGES = ["INTEREST", "OFFER", "NEGOTIATION", "MEETING", "CONTRACT"] as const;
const MONTHS = ["იან", "თებ", "მარ", "აპრ", "მაი", "ივნ", "ივლ", "აგვ", "სექ", "ოქტ", "ნოე", "დეკ"];

/** Company analytics: pipeline, conversion, invoicing by month, top offers, campaign results. */
export default async function AnalyticsPage({ searchParams }: PageProps<"/app/analytics">) {
  const user = await requireUser("/app/analytics");
  const m = await getActiveMembership(user.id);
  // Counterparty filter: only deals / invoices with partner companies matching industry, size, city, role; period.
  const f = readCompanyFilter(await searchParams);
  const mine = m?.companyId ?? "__none__";
  const dealWhere: Prisma.ConversationWhereInput[] = [activeContextConversations(user.id, m)];
  if (f.company) dealWhere.push({ participants: { some: { companyId: { not: mine }, company: f.company } } });
  if (f.since) dealWhere.push({ createdAt: { gte: f.since } });
  const invWhere: Prisma.InvoiceWhereInput[] = [];
  if (f.company) invWhere.push({ OR: [{ buyerCompany: f.company, NOT: { buyerCompanyId: mine } }, { sellerCompany: f.company, NOT: { sellerCompanyId: mine } }] });
  // Months are counted in Georgian time (UTC+4, no DST) — the server runs in UTC.
  const geo = (d: Date) => new Date(d.getTime() + 4 * 3600_000);
  const nowG = geo(new Date());
  const firstMonth = new Date(Date.UTC(nowG.getUTCFullYear(), nowG.getUTCMonth() - 5, 1));
  const sixAgo = new Date(firstMonth.getTime() - 4 * 3600_000);

  const [deals, invoices, offers, campaigns] = await Promise.all([
    db.conversation.findMany({
      where: { AND: dealWhere },
      select: {
        stage: true,
        amount: true,
        participants: { select: { companyId: true, company: { select: { categories: { where: { category: { kind: "INDUSTRY" } }, select: { category: { select: { id: true, name: true, parentId: true, parent: { select: { id: true, name: true } } } } } } } } } },
      },
    }),
    db.invoice.findMany({
      where: { AND: [visibleInvoices(user.id, m), { issuedAt: { gte: f.since && f.since > sixAgo ? f.since : sixAgo } }, { status: { notIn: ["DRAFT", "CANCELLED"] } }, ...invWhere] },
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
    const d = new Date(Date.UTC(firstMonth.getUTCFullYear(), firstMonth.getUTCMonth() + i, 1));
    return { key: `${d.getUTCFullYear()}-${d.getUTCMonth()}`, label: MONTHS[d.getUTCMonth()], issued: 0, paid: 0 };
  });
  for (const inv of invoices) {
    const seller = inv.sellerCompanyId ? inv.sellerCompanyId === m?.companyId : inv.sellerUserId === user.id;
    if (!seller || inv.currency !== "GEL") continue;
    const g = geo(inv.issuedAt);
    const row = months.find((x) => x.key === `${g.getUTCFullYear()}-${g.getUTCMonth()}`);
    if (row) {
      row.issued += Number(inv.total);
      row.paid += Number(inv.paidAmount);
    }
  }
  const maxMonth = Math.max(1, ...months.map((x) => x.issued));
  const topOffers = [...offers].sort((a, b) => b._count.conversations - a._count.conversations).slice(0, 5);
  const rec = campaigns.flatMap((c) => c.recipients);
  const industryTree = await getCategoryTree("INDUSTRY");

  // Deals by the partner company's industry (top-level industry; a deal counts once per industry).
  const perIndustry = new Map<string, { name: string; count: number; value: number }>();
  for (const d of deals) {
    const names = new Map<string, string>();
    for (const p of d.participants) {
      if (!p.company || p.companyId === mine) continue;
      for (const c of p.company.categories) {
        const top = c.category.parent ?? c.category;
        names.set(top.id, top.name);
      }
    }
    if (names.size === 0) names.set("—", ka.analyticsFilter.other);
    for (const [id, name] of names) {
      const row = perIndustry.get(id) ?? { name, count: 0, value: 0 };
      row.count++;
      row.value += Number(d.amount ?? 0);
      perIndustry.set(id, row);
    }
  }
  const industryRows = [...perIndustry.values()].sort((a, b) => b.count - a.count);
  const maxInd = Math.max(1, ...industryRows.map((x) => x.count));

  return (
    <>
      <PageHeader eyebrow={ka.sgba.analyticsEyebrow} title={ka.sgba.nav.analytics} text={ka.sgba.analyticsText} />
      <CompanyFilterBar action="/app/analytics" values={f.values} industries={industryTree} extra={f.active ? <span className="text-xs text-muted">{ka.analyticsFilter.filteredNote}</span> : undefined} />
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
        <SectionTitle title={ka.analyticsFilter.byIndustry} />
        {industryRows.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted">{ka.analyticsFilter.byIndustryEmpty}</p>
        ) : (
          <ul className="space-y-3">
            {industryRows.map((x) => (
              <li key={x.name}>
                <div className="mb-1 flex justify-between gap-3 text-sm">
                  <span className="min-w-0 truncate">{x.name}</span>
                  <span className="shrink-0 text-muted tabular-nums">{x.count} · {formatAmount(x.value, "GEL")}</span>
                </div>
                <div className="h-2.5 rounded-full bg-chip">
                  <div className="h-2.5 rounded-full bg-accent" style={{ width: `${(x.count / maxInd) * 100}%` }} />
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

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
