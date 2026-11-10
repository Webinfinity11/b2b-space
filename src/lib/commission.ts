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
 */
export async function createCommissionForPaidInvoice(invoiceId: string) {
  const inv = await db.invoice.findUnique({
    where: { id: invoiceId },
    select: {
      id: true, status: true, total: true, currency: true, sellerCompanyId: true,
      dealTermsVersion: { select: { dealTerms: { select: { conversation: { select: { id: true, commissionPct: true, offer: { select: { commissionPct: true } } } } } } } },
    },
  });
  if (!inv || inv.status !== "PAID") return;
  const conversation = inv.dealTermsVersion.dealTerms.conversation;
  const pct = dealCommissionPct(conversation);
  if (!pct || pct.lte(0)) return;
  const amount = inv.total.mul(pct).div(100).toDecimalPlaces(2);
  await db.commission.upsert({
    where: { invoiceId: inv.id },
    update: {},
    create: { invoiceId: inv.id, conversationId: conversation.id, companyId: inv.sellerCompanyId, currency: inv.currency, baseAmount: inv.total, pct, amount },
  });
}
