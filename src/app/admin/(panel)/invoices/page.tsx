import type { Metadata } from "next";
import Link from "next/link";
import type { Prisma } from "@/generated/prisma/client";
import type { InvoiceStatus } from "@/generated/prisma/enums";
import { ka } from "@/i18n/ka";
import { requireAdmin } from "@/lib/authz";
import { CURRENCIES } from "@/lib/currencies";
import { db } from "@/lib/db";
import { formatDate, formatMoney } from "@/lib/format";
import { displayStatusWhere, effectiveStatus, type InvoiceSnapshot } from "@/lib/invoices";
import { pageParam, param } from "@/lib/params";
import { buttonClass } from "@/components/ui/Button";
import { EmptyState, PageHeader } from "@/components/ui/Card";
import { Pagination } from "@/components/ui/Pagination";
import { Table, Td } from "@/components/ui/Table";
import { controlClass } from "@/components/ui/styles";
import { InvoiceStatusBadge } from "@/components/panel/InvoiceStatusBadge";

export const metadata: Metadata = { title: ka.admin.invoices };

const PER_PAGE = 25;
const STATUSES = ["ISSUED", "SENT", "VIEWED", "PARTIALLY_PAID", "PAID", "OVERDUE", "CANCELLED", "REFUNDED"] as const;

export default async function AdminInvoicesPage({ searchParams }: PageProps<"/admin/invoices">) {
  await requireAdmin();
  const sp = await searchParams;
  const status = STATUSES.find((s) => s === param(sp.status));
  const currency = CURRENCIES.find((c) => c === param(sp.currency));
  const q = param(sp.q, 60);
  const page = pageParam(sp.page);
  const and: Prisma.InvoiceWhereInput[] = [];
  if (status) and.push(displayStatusWhere(status));
  if (currency) and.push({ currency });
  if (q) {
    and.push({
      OR: [
        { number: { contains: q, mode: "insensitive" } },
        { sellerCompany: { OR: [{ legalName: { contains: q, mode: "insensitive" } }, { tradeName: { contains: q, mode: "insensitive" } }] } },
        { buyerCompany: { OR: [{ legalName: { contains: q, mode: "insensitive" } }, { tradeName: { contains: q, mode: "insensitive" } }] } },
      ],
    });
  }
  const where: Prisma.InvoiceWhereInput = { AND: and };
  const [total, rows] = await Promise.all([
    db.invoice.count({ where }),
    db.invoice.findMany({ where, orderBy: { issuedAt: "desc" }, skip: (page - 1) * PER_PAGE, take: PER_PAGE }),
  ]);

  return (
    <>
      <PageHeader title={ka.admin.invoices} text={ka.catalog.results(total)} />
      <form className="mb-4 flex flex-wrap items-end gap-2">
        <input name="q" defaultValue={q} placeholder={ka.admin.invoiceSearch} aria-label={ka.admin.invoiceSearch} className={`${controlClass} h-10 w-full sm:w-64`} />
        <select name="status" defaultValue={status ?? ""} className={`${controlClass} h-10 w-auto`} aria-label={ka.common.status}>
          <option value="">{ka.common.status}: {ka.invoice.filterAll}</option>
          {STATUSES.map((s) => (
            <option key={s} value={s}>{ka.enums.invoiceStatus[s]}</option>
          ))}
        </select>
        {CURRENCIES.length > 1 && (
          <select name="currency" defaultValue={currency ?? ""} className={`${controlClass} h-10 w-auto`} aria-label={ka.terms.currency}>
            <option value="">{ka.terms.currency}: {ka.invoice.filterAll}</option>
            {CURRENCIES.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        )}
        <button type="submit" className={buttonClass("secondary", "md")}>{ka.common.filter}</button>
      </form>
      {rows.length === 0 ? (
        <EmptyState text={ka.common.noData} />
      ) : (
        <Table head={[ka.invoice.number, ka.invoice.seller, ka.invoice.buyer, ka.terms.total, ka.invoice.dueDate, ka.common.status]}>
          {rows.map((inv) => {
            const snap = inv.snapshot as unknown as InvoiceSnapshot;
            return (
              <tr key={inv.id}>
                <Td>
                  <Link href={`/admin/invoices/${inv.id}`} className="font-medium text-accent-strong hover:underline">{inv.number}</Link>
                  <div className="text-xs text-muted">{formatDate(inv.issuedAt)}</div>
                </Td>
                <Td>{snap.seller.name}</Td>
                <Td>{snap.buyer.name}</Td>
                <Td className="whitespace-nowrap tabular-nums">
                  {formatMoney(inv.total, inv.currency)}
                  {Number(inv.paidAmount) > 0 && <div className="text-xs text-success">{ka.invoice.paid}: {formatMoney(inv.paidAmount, inv.currency)}</div>}
                </Td>
                <Td className="whitespace-nowrap text-muted">{inv.dueDate ? formatDate(inv.dueDate) : ka.common.none}</Td>
                <Td><InvoiceStatusBadge status={effectiveStatus(inv) as InvoiceStatus} /></Td>
              </tr>
            );
          })}
        </Table>
      )}
      <Pagination page={page} pages={Math.max(1, Math.ceil(total / PER_PAGE))} basePath="/admin/invoices" params={{ status, currency, q }} />
    </>
  );
}
