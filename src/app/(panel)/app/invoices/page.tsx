import type { Metadata } from "next";
import Link from "next/link";
import type { Prisma } from "@/generated/prisma/client";
import type { InvoiceStatus } from "@/generated/prisma/enums";
import { ka } from "@/i18n/ka";
import { getActiveMembership, requireUser } from "@/lib/authz";
import { CURRENCIES } from "@/lib/currencies";
import { db } from "@/lib/db";
import { formatDate, formatMoney } from "@/lib/format";
import { effectiveStatus, type InvoiceSnapshot } from "@/lib/invoices";
import { param } from "@/lib/params";
import { invoiceSide, visibleInvoices } from "@/lib/scope";
import { Badge } from "@/components/ui/Badge";
import { EmptyState, PageHeader } from "@/components/ui/Card";
import { Table, Td } from "@/components/ui/Table";
import { controlClass } from "@/components/ui/styles";
import { ButtonLink, buttonClass } from "@/components/ui/Button";
import { InvoiceStatusBadge } from "@/components/panel/InvoiceStatusBadge";

export const metadata: Metadata = { title: ka.invoice.title };

const STATUSES = ["ISSUED", "SENT", "VIEWED", "PARTIALLY_PAID", "PAID", "OVERDUE", "CANCELLED"] as const;

export default async function InvoicesPage({ searchParams }: PageProps<"/app/invoices">) {
  const user = await requireUser("/app/invoices");
  const m = await getActiveMembership(user.id);
  const sp = await searchParams;
  const status = STATUSES.find((s) => s === param(sp.status));
  const currency = CURRENCIES.find((c) => c === param(sp.currency));
  const dir = param(sp.dir);

  const where: Prisma.InvoiceWhereInput = { AND: [visibleInvoices(user.id, m), currency ? { currency } : {}] };
  const rows = await db.invoice.findMany({ where, orderBy: { issuedAt: "desc" }, take: 200 });
  const items = rows
    .map((inv) => ({ inv, side: invoiceSide(inv, user.id, m), shown: effectiveStatus(inv) as InvoiceStatus }))
    .filter((r) => (!status || r.shown === status) && (!dir || (dir === "issued" ? r.side === "seller" : r.side === "buyer")));

  return (
    <>
      <PageHeader title={ka.invoice.title} text={ka.invoice.text} />
      <form className="mb-4 flex flex-wrap items-end gap-2">
        <select name="dir" defaultValue={dir ?? ""} className={`${controlClass} h-10 w-auto`} aria-label={ka.invoice.direction}>
          <option value="">{ka.invoice.direction}: {ka.invoice.filterAll}</option>
          <option value="issued">{ka.invoice.issued}</option>
          <option value="received">{ka.invoice.received}</option>
        </select>
        <select name="status" defaultValue={status ?? ""} className={`${controlClass} h-10 w-auto`} aria-label={ka.common.status}>
          <option value="">{ka.common.status}: {ka.invoice.filterAll}</option>
          {STATUSES.map((s) => (
            <option key={s} value={s}>{ka.enums.invoiceStatus[s]}</option>
          ))}
        </select>
        <select name="currency" defaultValue={currency ?? ""} className={`${controlClass} h-10 w-auto`} aria-label={ka.terms.currency}>
          <option value="">{ka.terms.currency}: {ka.invoice.filterAll}</option>
          {CURRENCIES.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
        <button type="submit" className={buttonClass("secondary", "md")}>{ka.common.filter}</button>
      </form>
      {items.length === 0 ? (
        <EmptyState text={ka.invoice.empty} action={<ButtonLink href="/app/conversations" variant="secondary">{ka.panel.conversations}</ButtonLink>} />
      ) : (
        <Table head={[ka.invoice.number, ka.invoice.direction, ka.invoice.counterparty, ka.terms.total, ka.invoice.dueDate, ka.common.status]}>
          {items.map(({ inv, side, shown }) => {
            const snap = inv.snapshot as unknown as InvoiceSnapshot;
            const other = side === "seller" ? snap.buyer : snap.seller;
            return (
              <tr key={inv.id}>
                <Td>
                  <Link href={`/app/invoices/${inv.id}`} className="font-medium text-accent-strong hover:underline">{inv.number}</Link>
                  <div className="text-xs text-muted">{formatDate(inv.issuedAt)}</div>
                </Td>
                <Td><Badge tone={side === "seller" ? "info" : "neutral"}>{side === "seller" ? ka.invoice.issued : ka.invoice.received}</Badge></Td>
                <Td>{other.name}</Td>
                <Td className="whitespace-nowrap tabular-nums">
                  {formatMoney(inv.total, inv.currency)}
                  {Number(inv.paidAmount) > 0 && <div className="text-xs text-success">{ka.invoice.paid}: {formatMoney(inv.paidAmount, inv.currency)}</div>}
                </Td>
                <Td className="whitespace-nowrap text-muted">{inv.dueDate ? formatDate(inv.dueDate) : ka.common.none}</Td>
                <Td><InvoiceStatusBadge status={shown} /></Td>
              </tr>
            );
          })}
        </Table>
      )}
    </>
  );
}
