import type { Metadata } from "next";
import Link from "next/link";
import { ka } from "@/i18n/ka";
import { getActiveMembership, requireUser } from "@/lib/authz";
import { activeRules, expectedCommission } from "@/lib/commission";
import { db } from "@/lib/db";
import { dealSideFor } from "@/lib/deals";
import { formatDate } from "@/lib/format";
import { formatAmount } from "@/lib/money";
import { invoiceSide, visibleConversations, visibleInvoices } from "@/lib/scope";
import { Icon } from "@/components/ui/Icon";
import { KpiCard, PageHeader, SectionTitle } from "@/components/ui/Card";

export const metadata: Metadata = { title: ka.sgba.finTitle };

const STATUS_TONE: Record<string, string> = {
  CONFIRMED: "bg-[#fdf3dc] text-[#b7791f]",
  SETTLED: "bg-[#e3f4ec] text-[#20815d]",
  CANCELLED: "bg-chip text-muted",
};

/** Commissions owed by the active company (as seller) and how they are generated. */
export default async function FinancePage() {
  const user = await requireUser("/app/finance");
  const m = await getActiveMembership(user.id);
  const since = new Date();
  since.setDate(since.getDate() - 30);

  const ruleRows = await activeRules();
  const [deals, commissions, rules] = await Promise.all([
    db.conversation.findMany({
      where: { AND: [visibleConversations(user.id, m), { stage: { not: "CONTRACT" } }, { amount: { not: null } }] },
      select: { amount: true, commissionPct: true, sellerSide: true, offer: { select: { type: true, commissionPct: true, categoryId: true } }, participants: { select: { side: true, userId: true, companyId: true } } },
    }),
    m
      ? db.commission.findMany({
          where: { companyId: m.companyId },
          orderBy: { createdAt: "desc" },
          take: 50,
          include: { invoice: { select: { id: true, number: true } }, conversation: { select: { subject: true } } },
        })
      : Promise.resolve([]),
    db.commissionRule.findMany({ where: { isActive: true }, orderBy: { sortOrder: "asc" } }),
  ]);

  // Generated: expected commission from open deals where we are the seller.
  const generated = deals.reduce((sum, d) => {
    const mine = d.participants.find((p) => (m ? p.companyId === m.companyId : p.userId === user.id));
    if (!mine || dealSideFor(mine.side, d.offer?.type ?? null, d.sellerSide) !== "SELLER") return sum;
    return sum + expectedCommission(d, ruleRows);
  }, 0);
  const gel = commissions.filter((c) => c.currency === "GEL");
  const confirmed = gel.filter((c) => c.status === "CONFIRMED").reduce((s, c) => s + Number(c.amount), 0);
  const settled = gel.filter((c) => c.status === "SETTLED" && c.settledAt && c.settledAt >= since).reduce((s, c) => s + Number(c.amount), 0);

  // ── Money: invoices where we sell (income) or buy (expense), per currency ──
  const invScope = visibleInvoices(user.id, m);
  const [invoices, payments] = await Promise.all([
    db.invoice.findMany({
      where: { AND: [invScope, { status: { notIn: ["DRAFT", "CANCELLED"] } }] },
      select: { currency: true, total: true, paidAmount: true, status: true, dueDate: true, sellerUserId: true, sellerCompanyId: true },
    }),
    db.paymentRecord.findMany({
      where: { invoice: invScope },
      orderBy: { paidAt: "desc" },
      take: 10,
      include: { invoice: { select: { id: true, number: true, sellerUserId: true, sellerCompanyId: true } } },
    }),
  ]);
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const money = new Map<string, { received: number; receivable: number; overdue: number; paid: number; toPay: number }>();
  for (const inv of invoices) {
    const row = money.get(inv.currency) ?? { received: 0, receivable: 0, overdue: 0, paid: 0, toPay: 0 };
    const open = Number(inv.total) - Number(inv.paidAmount);
    // Refunded money went back — it is neither received nor paid.
    const kept = inv.status === "REFUNDED" ? 0 : Number(inv.paidAmount);
    const isOpen = !["PAID", "REFUNDED"].includes(inv.status) && open > 0;
    if (invoiceSide(inv, user.id, m) === "seller") {
      row.received += kept;
      if (isOpen) row.receivable += open;
      if (isOpen && inv.dueDate && inv.dueDate < now) row.overdue += open;
    } else {
      row.paid += kept;
      if (isOpen) row.toPay += open;
    }
    money.set(inv.currency, row);
  }
  const g = money.get("GEL") ?? { received: 0, receivable: 0, overdue: 0, paid: 0, toPay: 0 };
  const thisMonth = payments
    .filter((p) => p.currency === "GEL" && p.paidAt >= monthStart && invoiceSide(p.invoice, user.id, m) === "seller")
    .reduce((s, p) => s + Number(p.amount), 0);
  const others = [...money.entries()].filter(([cur]) => cur !== "GEL");

  return (
    <>
      <PageHeader eyebrow={`${ka.brandShort} ${ka.sgba.finEyebrow}`} title={ka.sgba.nav.finance} text={ka.sgba.finMoneyText} />

      <SectionTitle eyebrow={ka.sgba.finMoneyEyebrow} title={ka.sgba.finMoneyTitle} />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard dark label={ka.sgba.finReceived} value={formatAmount(g.received, "GEL")} hint={ka.sgba.finThisMonth(formatAmount(thisMonth, "GEL"))} icon={<Icon name="check" size={18} />} />
        <KpiCard label={ka.sgba.finReceivable} value={formatAmount(g.receivable, "GEL")} hint={g.overdue ? ka.sgba.finOverdue(formatAmount(g.overdue, "GEL")) : ka.sgba.kpiReceivableHint} icon={<Icon name="invoice" size={18} />} tone={g.overdue ? "yellow" : "blue"} />
        <KpiCard label={ka.sgba.finPaidOut} value={formatAmount(g.paid, "GEL")} hint={ka.sgba.finAsBuyer} icon={<Icon name="arrowUp" size={18} />} tone="violet" />
        <KpiCard label={ka.sgba.finToPay} value={formatAmount(g.toPay, "GEL")} hint={ka.sgba.finAsBuyer} icon={<Icon name="clock" size={18} />} tone="yellow" />
      </div>
      {others.length > 0 && (
        <p className="mt-3 text-xs text-muted">
          {others.map(([cur, r]) => `${cur}: ${ka.sgba.finReceived} ${formatAmount(r.received, cur)} · ${ka.sgba.finReceivable} ${formatAmount(r.receivable, cur)} · ${ka.sgba.finToPay} ${formatAmount(r.toPay, cur)}`).join("   |   ")}
        </p>
      )}

      <section className="mt-6 rounded-[16px] border border-line bg-surface p-6">
        <SectionTitle title={ka.sgba.finPayments} action={<Link href="/app/invoices" className="text-sm font-medium text-accent-strong hover:underline">{ka.sgba.nav.documents} →</Link>} />
        {payments.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted">{ka.sgba.finNoPayments}</p>
        ) : (
          <ul className="divide-y divide-line">
            {payments.map((p) => {
              const incoming = invoiceSide(p.invoice, user.id, m) === "seller";
              return (
                <li key={p.id} className="flex flex-wrap items-center justify-between gap-3 py-3 text-sm">
                  <div className="min-w-0">
                    <Link href={`/app/invoices/${p.invoice.id}`} className="font-medium text-accent-strong hover:underline">{ka.invoice.invoiceWord} {p.invoice.number}</Link>
                    <div className="text-xs text-muted">{formatDate(p.paidAt)}{p.method ? ` · ${p.method}` : ""}</div>
                  </div>
                  <span className={`font-semibold tabular-nums ${incoming ? "text-success" : "text-ink"}`}>
                    {incoming ? "+" : "−"} {formatAmount(Number(p.amount), p.currency)}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <div className="mt-10">
        <SectionTitle eyebrow={ka.sgba.finEyebrow} title={ka.sgba.finTitle} />
        <p className="-mt-2 mb-4 text-[13px] text-muted">{ka.sgba.finText}</p>
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        <KpiCard label={ka.sgba.finGenerated} value={formatAmount(generated, "GEL")} hint={ka.sgba.finGeneratedHint} icon={<Icon name="trend" size={18} />} tone="blue" />
        <KpiCard label={ka.sgba.finConfirmed} value={formatAmount(confirmed, "GEL")} hint={ka.sgba.finConfirmedHint} icon={<Icon name="check" size={18} />} tone="yellow" />
        <KpiCard label={ka.sgba.finSettled} value={formatAmount(settled, "GEL")} hint={ka.sgba.finSettledHint} icon={<Icon name="invoice" size={18} />} tone="green" />
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-2">
        <section className="rounded-[16px] border border-line bg-surface p-6">
          <SectionTitle eyebrow={ka.sgba.finRulesEyebrow} title={ka.sgba.finRulesTitle} />
          <ul className="divide-y divide-line">
            {rules.map((r) => (
              <li key={r.id} className="flex items-center justify-between gap-4 py-3 text-sm">
                <span>{r.title}</span>
                <span className="shrink-0 font-semibold text-success">{r.rate}</span>
              </li>
            ))}
          </ul>
        </section>
        <section className="rounded-[16px] border border-line bg-surface p-6">
          <SectionTitle eyebrow={ka.sgba.finStepsEyebrow} title={ka.sgba.finStepsTitle} />
          <ol className="space-y-3">
            {ka.sgba.finSteps.map((s, i) => (
              <li key={s} className="flex items-center gap-3 text-sm">
                <span className="grid size-7 shrink-0 place-items-center rounded-full bg-accent text-xs font-bold text-white">{i + 1}</span>
                {s}
              </li>
            ))}
          </ol>
        </section>
      </div>

      <section className="mt-6 rounded-[16px] border border-line bg-surface p-6">
        <SectionTitle title={ka.sgba.finHistory} action={<Link href="/app/invoices" className="text-sm font-medium text-accent-strong hover:underline">{ka.sgba.nav.documents} →</Link>} />
        {commissions.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted">{ka.sgba.finHistoryEmpty}</p>
        ) : (
          <ul className="divide-y divide-line">
            {commissions.map((c) => (
              <li key={c.id} className="flex flex-wrap items-center justify-between gap-3 py-3 text-sm">
                <div className="min-w-0">
                  <Link href={`/app/invoices/${c.invoice.id}`} className="font-medium text-accent-strong hover:underline">{ka.invoice.invoiceWord} {c.invoice.number}</Link>
                  <div className="truncate text-xs text-muted">{c.conversation?.subject} · {formatDate(c.createdAt)}</div>
                  {c.number && (
                    <a href={`/api/commissions/${c.id}/pdf`} target="_blank" className="mt-0.5 inline-block text-xs font-medium text-accent-strong hover:underline">
                      {ka.finance.commissionPdf} · {c.number}
                    </a>
                  )}
                  {c.note && <div className="text-xs text-muted">{c.note}</div>}
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-muted tabular-nums">{formatAmount(Number(c.baseAmount), c.currency)} × {c.pct.toString()}%</span>
                  <span className="font-semibold tabular-nums">{formatAmount(Number(c.amount), c.currency)}</span>
                  <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${STATUS_TONE[c.status]}`}>{ka.sgba.commissionStatus[c.status]}</span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}
