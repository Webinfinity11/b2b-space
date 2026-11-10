import Link from "next/link";
import { ka } from "@/i18n/ka";
import type { InvoiceStatus } from "@/generated/prisma/enums";
import { db } from "@/lib/db";
import type { DealContext } from "@/lib/deals";
import { formatDate, formatMoney } from "@/lib/format";
import { effectiveStatus } from "@/lib/invoices";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { InvoiceStatusBadge } from "./InvoiceStatusBadge";

/** Chat sidebar: invoices of this conversation + "send invoice" for the seller. */
export async function ChatInvoiceCard({ ctx }: { ctx: DealContext }) {
  const c = ctx.conversation;
  const invoices = c.dealTerms
    ? await db.invoice.findMany({ where: { dealTermsVersion: { dealTermsId: c.dealTerms.id } }, orderBy: { issuedAt: "desc" } })
    : [];
  const isSeller = ctx.dealSide === "SELLER";

  return (
    <Card>
      <CardHeader title={ka.invoice.chatTitle} />
      <CardBody className="space-y-3">
        {invoices.length === 0 ? (
          <p className="text-sm text-muted">{ka.invoice.chatEmpty} {isSeller ? ka.invoice.chatSellerHint : ka.invoice.chatBuyerHint}</p>
        ) : (
          <ul className="divide-y divide-line">
            {invoices.map((inv) => (
              <li key={inv.id} className="py-2 first:pt-0">
                <div className="flex items-center justify-between gap-2">
                  <Link href={`/app/invoices/${inv.id}`} className="text-sm font-medium text-accent-strong hover:underline">{inv.number}</Link>
                  <InvoiceStatusBadge status={effectiveStatus(inv) as InvoiceStatus} />
                </div>
                <div className="flex justify-between text-xs text-muted">
                  <span>{formatDate(inv.issuedAt)}</span>
                  <span className="tabular-nums">{formatMoney(inv.total, inv.currency)}</span>
                </div>
              </li>
            ))}
          </ul>
        )}
        {isSeller && ctx.can("invoices.manage") && (
          <a href="#invoice" className="hidden h-10 w-full items-center justify-center gap-2 rounded-full bg-accent lg:flex text-sm font-medium text-on-accent hover:bg-accent-hover">
            + {ka.invoice.composerButton}
          </a>
        )}
      </CardBody>
    </Card>
  );
}
