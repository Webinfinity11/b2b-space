import Link from "next/link";
import { ka } from "@/i18n/ka";
import { requireAdmin } from "@/lib/authz";
import { db } from "@/lib/db";
import { formatDateTime, formatMoney } from "@/lib/format";
import { companyName } from "@/lib/public";
import { Card, CardBody, CardHeader, PageHeader, StatCard } from "@/components/ui/Card";
import { VerificationBadge } from "@/components/panel/StatusBadges";
import { ActionForm, Field, Input, SubmitButton } from "@/components/ui/Form";
import { loadDemoDataAction, removeDemoDataAction } from "@/actions/admin";

const LIVE = ["PUBLISHED", "ACCEPTING_RESPONSES", "NEGOTIATING"] as const;

export default async function AdminOverviewPage() {
  await requireAdmin();
  const [users, companies, pending, verified, offers, requests, conversations, invoiceCount, byCurrency, queue] = await Promise.all([
    db.user.count(),
    db.company.count(),
    db.company.count({ where: { verificationStatus: { in: ["PENDING", "IN_REVIEW"] } } }),
    db.company.count({ where: { verificationStatus: "VERIFIED" } }),
    db.offer.count({ where: { type: "OFFER", status: { in: [...LIVE] } } }),
    db.offer.count({ where: { type: "REQUEST", status: { in: [...LIVE] } } }),
    db.conversation.count(),
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
      take: 8,
      select: { id: true, legalName: true, tradeName: true, verificationStatus: true, updatedAt: true },
    }),
  ]);

  return (
    <>
      <PageHeader title={ka.admin.overview} text={ka.admin.overviewText} />
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label={ka.admin.stats.users} value={users} />
        <StatCard label={ka.admin.stats.companies} value={companies} />
        <StatCard label={ka.admin.stats.pending} value={pending} />
        <StatCard label={ka.admin.stats.verified} value={verified} />
        <StatCard label={ka.admin.stats.activeOffers} value={offers} />
        <StatCard label={ka.admin.stats.activeRequests} value={requests} />
        <StatCard label={ka.admin.stats.conversations} value={conversations} />
        <StatCard label={ka.admin.stats.invoices} value={invoiceCount} />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader title={ka.admin.queue} action={<Link href="/admin/companies?status=IN_REVIEW" className="text-sm text-accent-strong hover:underline">{ka.home.viewAll}</Link>} />
          <CardBody>
            {queue.length === 0 ? (
              <p className="text-sm text-muted">{ka.admin.queueEmpty}</p>
            ) : (
              <ul className="divide-y divide-line">
                {queue.map((c) => (
                  <li key={c.id} className="flex items-center justify-between gap-3 py-2.5 first:pt-0 last:pb-0">
                    <div className="min-w-0">
                      <Link href={`/admin/companies/${c.id}`} className="text-sm font-medium hover:underline">{companyName(c)}</Link>
                      <p className="text-xs text-muted">{formatDateTime(c.updatedAt)}</p>
                    </div>
                    <VerificationBadge status={c.verificationStatus} />
                  </li>
                ))}
              </ul>
            )}
          </CardBody>
        </Card>
        <Card>
          <CardHeader title={ka.admin.invoicesByCurrency} />
          <CardBody>
            {byCurrency.length === 0 ? (
              <p className="text-sm text-muted">{ka.panel.financeEmpty}</p>
            ) : (
              <table className="w-full text-sm tabular-nums">
                <thead>
                  <tr className="text-left text-xs text-muted">
                    <th className="pb-2 font-medium" />
                    <th className="pb-2 text-right font-medium">{ka.panel.finance_total}</th>
                    <th className="pb-2 text-right font-medium">{ka.panel.finance_paid}</th>
                    <th className="pb-2 text-right font-medium">{ka.panel.finance_due}</th>
                  </tr>
                </thead>
                <tbody>
                  {byCurrency.map((r) => {
                    const total = Number(r._sum.total ?? 0);
                    const paid = Number(r._sum.paidAmount ?? 0);
                    return (
                      <tr key={r.currency} className="border-t border-line">
                        <td className="py-2 font-medium">{r.currency} <span className="text-xs text-muted">({r._count})</span></td>
                        <td className="py-2 text-right">{formatMoney(total, r.currency)}</td>
                        <td className="py-2 text-right text-success">{formatMoney(paid, r.currency)}</td>
                        <td className="py-2 text-right">{formatMoney(Math.max(0, total - paid), r.currency)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </CardBody>
        </Card>
      </div>

      <Card className="mt-6">
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
