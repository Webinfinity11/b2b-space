import type { Metadata } from "next";
import Link from "next/link";
import { ka } from "@/i18n/ka";
import { requireAdmin } from "@/lib/authz";
import { db } from "@/lib/db";
import { formatMoney } from "@/lib/format";
import { OPEN_STATUSES } from "@/lib/invoices";
import { Card, CardBody, CardHeader, EmptyState, PageHeader, StatCard } from "@/components/ui/Card";

export const metadata: Metadata = { title: ka.admin.finance };

const MONTHS = 6;

/**
 * Platform-wide finance. Amounts are never summed across currencies (no conversion rate) —
 * every figure is shown per currency.
 */
export default async function AdminFinancePage() {
  await requireAdmin();
  const now = new Date();
  const since = new Date(now.getFullYear(), now.getMonth() - (MONTHS - 1), 1);
  const [issued, open, overdue, refunded, cancelled, payments, recentInvoices, recentPayments] = await Promise.all([
    db.invoice.groupBy({ by: ["currency"], where: { status: { notIn: ["DRAFT", "CANCELLED"] } }, _sum: { total: true, paidAmount: true }, _count: true }),
    db.invoice.groupBy({ by: ["currency"], where: { status: { in: [...OPEN_STATUSES] } }, _sum: { total: true, paidAmount: true }, _count: true }),
    db.invoice.groupBy({ by: ["currency"], where: { status: { in: [...OPEN_STATUSES] }, dueDate: { lt: now } }, _sum: { total: true, paidAmount: true }, _count: true }),
    db.invoice.groupBy({ by: ["currency"], where: { status: "REFUNDED" }, _sum: { paidAmount: true }, _count: true }),
    db.invoice.count({ where: { status: "CANCELLED" } }),
    db.paymentRecord.groupBy({ by: ["currency"], _sum: { amount: true }, _count: true }),
    db.invoice.findMany({ where: { issuedAt: { gte: since }, status: { notIn: ["DRAFT", "CANCELLED"] } }, select: { issuedAt: true, total: true, currency: true } }),
    db.paymentRecord.findMany({ where: { paidAt: { gte: since } }, select: { paidAt: true, amount: true, currency: true } }),
  ]);

  const currencies = [...new Set([...issued.map((r) => r.currency), ...payments.map((r) => r.currency)])].sort();
  const by = <T extends { currency: string }>(rows: T[], c: string) => rows.find((r) => r.currency === c);
  const n = (v: { toString(): string } | null | undefined) => Number(v?.toString() ?? 0);

  const months = Array.from({ length: MONTHS }, (_, k) => new Date(now.getFullYear(), now.getMonth() - (MONTHS - 1) + k, 1));
  const key = (d: Date) => `${d.getFullYear()}-${d.getMonth()}`;
  const monthly = new Map<string, { issued: number; paid: number }>();
  for (const r of recentInvoices) {
    const k = `${r.currency}|${key(r.issuedAt)}`;
    const e = monthly.get(k) ?? { issued: 0, paid: 0 };
    e.issued += n(r.total);
    monthly.set(k, e);
  }
  for (const p of recentPayments) {
    const k = `${p.currency}|${key(p.paidAt)}`;
    const e = monthly.get(k) ?? { issued: 0, paid: 0 };
    e.paid += n(p.amount);
    monthly.set(k, e);
  }
  const monthLabel = (d: Date) => new Intl.DateTimeFormat("ka-GE", { month: "long", year: "numeric" }).format(d);
  const f = ka.admin.fin;

  return (
    <>
      <PageHeader title={ka.admin.finance} text={f.text} />
      {currencies.length === 0 ? (
        <EmptyState text={ka.panel.financeEmpty} />
      ) : (
        currencies.map((c) => {
          const iss = by(issued, c);
          const op = by(open, c);
          const od = by(overdue, c);
          const rf = by(refunded, c);
          const pm = by(payments, c);
          return (
            <section key={c} className="mb-8">
              {currencies.length > 1 && <h2 className="mb-3 text-lg font-semibold">{c}</h2>}
              <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
                <StatCard label={f.issued} value={formatMoney(n(iss?._sum.total), c)} hint={f.count(iss?._count ?? 0)} />
                <StatCard label={f.paid} value={formatMoney(n(pm?._sum.amount), c)} hint={f.paymentsCount(pm?._count ?? 0)} />
                <StatCard label={f.outstanding} value={formatMoney(n(op?._sum.total) - n(op?._sum.paidAmount), c)} hint={f.count(op?._count ?? 0)} />
                <StatCard
                  label={f.overdue}
                  value={<span className={od?._count ? "text-danger" : ""}>{formatMoney(n(od?._sum.total) - n(od?._sum.paidAmount), c)}</span>}
                  hint={<Link href="/admin/invoices?status=OVERDUE" className="hover:underline">{f.count(od?._count ?? 0)}</Link>}
                />
              </div>
              <Card className="mt-4">
                <CardHeader title={f.monthly} />
                <CardBody>
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[420px] text-sm tabular-nums">
                      <thead>
                        <tr className="text-left text-xs text-muted">
                          <th className="pb-2 font-medium">{f.month}</th>
                          <th className="pb-2 text-right font-medium">{f.issued}</th>
                          <th className="pb-2 text-right font-medium">{f.paid}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {months.map((m) => {
                          const e = monthly.get(`${c}|${key(m)}`) ?? { issued: 0, paid: 0 };
                          return (
                            <tr key={key(m)} className="border-t border-line">
                              <td className="py-2">{monthLabel(m)}</td>
                              <td className="py-2 text-right">{formatMoney(e.issued, c)}</td>
                              <td className="py-2 text-right text-success">{formatMoney(e.paid, c)}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                  <p className="mt-3 text-xs text-muted">
                    {f.refunded}: {formatMoney(n(rf?._sum.paidAmount), c)} ({rf?._count ?? 0}) · {f.cancelled}: {cancelled}
                  </p>
                </CardBody>
              </Card>
            </section>
          );
        })
      )}
    </>
  );
}
