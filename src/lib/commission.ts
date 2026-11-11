import "server-only";
import { Prisma } from "@/generated/prisma/client";
import { db } from "./db";

/**
 * Commission percent of a deal: set on the deal by an admin, otherwise the offer's.
 * Returns null when no commission applies.
 */
export function dealCommissionPct(c: { commissionPct: Prisma.Decimal | null; offer?: { commissionPct: Prisma.Decimal | null } | null }) {
  return c.commissionPct ?? c.offer?.commissionPct ?? null;
}

/**
 * Called when an invoice becomes fully paid: records the platform commission once
 * (idempotent — invoiceId is unique). The seller company owes it.
 * Rate: frozen on the invoice at issue time, else the deal's current one (admin may set it later).
 * Base: the price of the goods/services — subtotal minus discount, without VAT and delivery.
 */
export async function createCommissionForPaidInvoice(invoiceId: string) {
  const inv = await db.invoice.findUnique({
    where: { id: invoiceId },
    select: {
      id: true, status: true, subtotal: true, discountAmount: true, currency: true, sellerCompanyId: true, commissionPct: true,
      dealTermsVersion: { select: { dealTerms: { select: { conversation: { select: { id: true, commissionPct: true, offer: { select: { commissionPct: true } } } } } } } },
    },
  });
  if (!inv || inv.status !== "PAID") return;
  const conversation = inv.dealTermsVersion.dealTerms.conversation;
  const pct = inv.commissionPct ?? dealCommissionPct(conversation);
  if (!pct || pct.lte(0)) return;
  const base = inv.subtotal.sub(inv.discountAmount);
  if (base.lte(0)) return;
  const amount = base.mul(pct).div(100).toDecimalPlaces(2);
  await db.commission.upsert({
    where: { invoiceId: inv.id },
    update: {},
    create: { invoiceId: inv.id, conversationId: conversation.id, companyId: inv.sellerCompanyId, currency: inv.currency, baseAmount: base, pct, amount },
  });
}

/** After an admin sets a deal's rate: paid invoices of that deal that earned nothing get their commission. */
export async function backfillDealCommissions(conversationId: string) {
  const paid = await db.invoice.findMany({
    where: { status: "PAID", commission: null, commissionPct: null, dealTermsVersion: { dealTerms: { conversationId } } },
    select: { id: true },
  });
  for (const inv of paid) await createCommissionForPaidInvoice(inv.id);
  return paid.length;
}
