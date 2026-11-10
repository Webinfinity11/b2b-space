import type { Metadata } from "next";
import Link from "next/link";
import { ka } from "@/i18n/ka";
import { settleCommissionAction } from "@/actions/admin";
import { requireAdmin } from "@/lib/authz";
import { db } from "@/lib/db";
import { formatDate } from "@/lib/format";
import { formatAmount } from "@/lib/money";
import { companyName } from "@/lib/public";
import { Button } from "@/components/ui/Button";
import { EmptyState, KpiCard, PageHeader } from "@/components/ui/Card";
import { Table, Td } from "@/components/ui/Table";

export const metadata: Metadata = { title: ka.sgba.commissionsAdmin };

export default async function AdminCommissionsPage() {
  await requireAdmin();
  const rows = await db.commission.findMany({
    orderBy: { createdAt: "desc" },
    take: 200,
    include: { company: { select: { legalName: true, tradeName: true } }, invoice: { select: { id: true, number: true } } },
  });
  const sum = (s: string) => rows.filter((r) => r.status === s && r.currency === "GEL").reduce((a, r) => a + Number(r.amount), 0);

  return (
    <>
      <PageHeader title={ka.sgba.commissionsAdmin} text={ka.sgba.finText} />
      <div className="mb-6 grid gap-4 md:grid-cols-2">
        <KpiCard label={ka.sgba.finConfirmed} value={formatAmount(sum("CONFIRMED"), "GEL")} hint={ka.sgba.finConfirmedHint} tone="yellow" />
        <KpiCard label={ka.sgba.finSettled} value={formatAmount(sum("SETTLED"), "GEL")} tone="green" />
      </div>
      {rows.length === 0 ? (
        <EmptyState text={ka.sgba.finHistoryEmpty} />
      ) : (
        <Table head={[ka.nav.companies, ka.invoice.invoiceWord, ka.sgba.colDeal, ka.sgba.colCommission, ka.admin.userStatus, ""]}>
          {rows.map((r) => (
            <tr key={r.id}>
              <Td>{r.company ? companyName(r.company) : "—"}<div className="text-xs text-muted">{formatDate(r.createdAt)}</div></Td>
              <Td><Link href={`/admin/invoices/${r.invoice.id}`} className="text-accent-strong hover:underline">{r.invoice.number}</Link></Td>
              <Td className="tabular-nums">{formatAmount(Number(r.baseAmount), r.currency)} × {r.pct.toString()}%</Td>
              <Td className="font-semibold tabular-nums">{formatAmount(Number(r.amount), r.currency)}</Td>
              <Td>{ka.sgba.commissionStatus[r.status]}{r.settledAt ? <div className="text-xs text-muted">{formatDate(r.settledAt)}</div> : null}</Td>
              <Td>
                {r.status === "CONFIRMED" && (
                  <form action={settleCommissionAction}>
                    <input type="hidden" name="commissionId" value={r.id} />
                    <Button type="submit" size="sm" variant="secondary">{ka.sgba.markSettled}</Button>
                  </form>
                )}
              </Td>
            </tr>
          ))}
        </Table>
      )}
    </>
  );
}
