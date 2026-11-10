import type { Metadata } from "next";
import { ka } from "@/i18n/ka";
import { getActiveMembership, requireUser } from "@/lib/authz";
import { CURRENCIES } from "@/lib/currencies";
import { db } from "@/lib/db";
import { formatMoney } from "@/lib/format";
import { effectiveStatus } from "@/lib/invoices";
import { param } from "@/lib/params";
import { hasPermission } from "@/lib/permissions";
import { invoiceSide, visibleInvoices } from "@/lib/scope";
import { buttonClass } from "@/components/ui/Button";
import { Card, CardBody, CardHeader, EmptyState, PageHeader } from "@/components/ui/Card";
import { controlClass } from "@/components/ui/styles";
import { notFound } from "next/navigation";

export const metadata: Metadata = { title: ka.finance.title };

type Totals = { count: number; total: number; paid: number; due: number; overdue: number };

export default async function FinancePage({ searchParams }: PageProps<"/app/finance">) {
  const user = await requireUser("/app/finance");
  const m = await getActiveMembership(user.id);
  if (m && !hasPermission(m, "finance.view") && !hasPermission(m, "invoices.view")) notFound();
  const sp = await searchParams;
  const from = param(sp.from, 10);
  const to = param(sp.to, 10);
  const currency = CURRENCIES.find((c) => c === param(sp.currency));

  const invoices = await db.invoice.findMany({
    where: {
      AND: [
        visibleInvoices(user.id, m),
        { status: { notIn: ["DRAFT", "CANCELLED"] } },
        currency ? { currency } : {},
        from ? { issuedAt: { gte: new Date(`${from}T00:00:00+04:00`) } } : {},
        to ? { issuedAt: { lte: new Date(`${to}T23:59:59+04:00`) } } : {},
      ],
    },
  });

  // Per direction and currency — amounts in different currencies are never added together.
  const sums = { seller: new Map<string, Totals>(), buyer: new Map<string, Totals>() };
  for (const inv of invoices) {
    const map = sums[invoiceSide(inv, user.id, m)];
    const r = map.get(inv.currency) ?? { count: 0, total: 0, paid: 0, due: 0, overdue: 0 };
    const total = Number(inv.total);
    const paid = Number(inv.paidAmount);
    const open = Math.max(0, total - paid);
    r.count++;
    r.total += total;
    r.paid += paid;
    if (effectiveStatus(inv) === "OVERDUE") r.overdue += open;
    else r.due += open;
    map.set(inv.currency, r);
  }

  return (
    <>
      <PageHeader title={ka.finance.title} text={ka.finance.text} />
      <form className="mb-6 flex flex-wrap items-end gap-2">
        <label className="text-xs text-muted">
          {ka.finance.from}
          <input type="date" name="from" defaultValue={from} className={`${controlClass} mt-1 h-10 w-auto`} />
        </label>
        <label className="text-xs text-muted">
          {ka.finance.to}
          <input type="date" name="to" defaultValue={to} className={`${controlClass} mt-1 h-10 w-auto`} />
        </label>
        <select name="currency" defaultValue={currency ?? ""} className={`${controlClass} h-10 w-auto`} aria-label={ka.terms.currency}>
          <option value="">{ka.terms.currency}: {ka.invoice.filterAll}</option>
          {CURRENCIES.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
        <button type="submit" className={buttonClass("secondary", "md")}>{ka.finance.apply}</button>
      </form>
      {invoices.length === 0 ? (
        <EmptyState text={ka.panel.financeEmpty} />
      ) : (
        <div className="grid gap-6 lg:grid-cols-2">
          <Section title={ka.finance.issuedTitle} rows={sums.seller} />
          <Section title={ka.finance.receivedTitle} rows={sums.buyer} />
        </div>
      )}
    </>
  );
}

function Section({ title, rows }: { title: string; rows: Map<string, Totals> }) {
  return (
    <Card>
      <CardHeader title={title} />
      <CardBody>
        {rows.size === 0 ? (
          <p className="text-sm text-muted">{ka.common.noData}</p>
        ) : (
          <div className="space-y-4">
            {[...rows].map(([cur, r]) => (
              <div key={cur} className="rounded-lg border border-line p-4">
                <div className="mb-3 flex items-center justify-between">
                  <span className="font-semibold">{cur}</span>
                  <span className="text-xs text-muted">{ka.finance.count}: {r.count}</span>
                </div>
                <dl className="grid grid-cols-2 gap-3 text-sm tabular-nums">
                  <Stat label={ka.panel.finance_total} value={formatMoney(r.total, cur)} />
                  <Stat label={ka.panel.finance_paid} value={formatMoney(r.paid, cur)} cls="text-success" />
                  <Stat label={ka.panel.finance_due} value={formatMoney(r.due, cur)} />
                  <Stat label={ka.panel.finance_overdue} value={formatMoney(r.overdue, cur)} cls="text-danger" />
                </dl>
              </div>
            ))}
          </div>
        )}
      </CardBody>
    </Card>
  );
}

function Stat({ label, value, cls = "" }: { label: string; value: string; cls?: string }) {
  return (
    <div>
      <dt className="text-xs text-muted">{label}</dt>
      <dd className={`mt-0.5 text-base font-semibold ${cls || "text-accent-strong"}`}>{value}</dd>
    </div>
  );
}
