import "server-only";
import { Prisma } from "@/generated/prisma/client";
import { ka } from "@/i18n/ka";
import { db } from "./db";
import { yearInGeorgia } from "./money";
import { notify } from "./notify";

const D = Prisma.Decimal;
type Dec = Prisma.Decimal;

/**
 * Explicit commission percent of a deal: set on the deal by an admin, otherwise the offer's.
 * Returns null when neither is set (the automatic rules then decide).
 */
export function dealCommissionPct(c: { commissionPct: Dec | null; offer?: { commissionPct: Dec | null } | null }) {
  return c.commissionPct ?? c.offer?.commissionPct ?? null;
}

export type RuleRow = { id: string; pct: Dec | null; categoryIds: string[]; minAmount: Dec | null; capAmount: Dec | null; isDefault: boolean; isActive: boolean; sortOrder: number };

export function activeRules() {
  return db.commissionRule.findMany({ where: { isActive: true, pct: { not: null } }, orderBy: { sortOrder: "asc" } });
}

/**
 * "ავტომატური წესი": picks the rule for a deal.
 * 1) a large-deal rule whose minimum the amount reaches (the highest such minimum wins);
 * 2) a rule listing the offer's category;
 * 3) the default rule.
 */
export function matchRule(rules: RuleRow[], categoryId: string | null, base: Dec | number | null): RuleRow | null {
  const usable = rules.filter((r) => r.isActive && r.pct);
  const amount = base == null ? null : new D(base);
  const large = usable
    .filter((r) => r.minAmount && amount && amount.gte(r.minAmount) && (!r.categoryIds.length || (categoryId && r.categoryIds.includes(categoryId))))
    .sort((a, b) => b.minAmount!.cmp(a.minAmount!))[0];
  if (large) return large;
  const byCategory = categoryId ? usable.find((r) => !r.minAmount && r.categoryIds.includes(categoryId)) : undefined;
  if (byCategory) return byCategory;
  return usable.find((r) => r.isDefault && !r.minAmount) ?? null;
}

/** Percent + rule for a deal: explicit (deal/offer) first, then the automatic rules. */
export function resolveCommission(
  explicit: Dec | null,
  rules: RuleRow[],
  categoryId: string | null,
  base: Dec | number | null,
): { pct: Dec | null; rule: RuleRow | null } {
  if (explicit) return { pct: explicit, rule: null };
  const rule = matchRule(rules, categoryId, base);
  return { pct: rule?.pct ?? null, rule };
}

/** Expected commission of an open deal (for KPIs): amount × resolved percent, capped. */
export function expectedCommission(
  deal: { amount: Dec | null; commissionPct: Dec | null; offer?: { commissionPct: Dec | null; categoryId?: string | null } | null },
  rules: RuleRow[],
) {
  if (!deal.amount) return 0;
  const { pct, rule } = resolveCommission(dealCommissionPct(deal), rules, deal.offer?.categoryId ?? null, deal.amount);
  if (!pct) return 0;
  let v = deal.amount.mul(pct).div(100);
  if (rule?.capAmount && v.gt(rule.capAmount)) v = rule.capAmount;
  return Number(v);
}

/**
 * Records the platform commission for a deal invoice once it is fully paid or the buyer has
 * confirmed delivery/payment (idempotent — invoiceId is unique), and issues the SGBA commission
 * invoice number to the seller.
 * Rate: frozen on the invoice at issue time, else the deal's / offer's, else the automatic rules.
 * Base: price of the goods/services — subtotal minus discount, without VAT and delivery.
 */
export async function createCommissionForInvoice(invoiceId: string) {
  const inv = await db.invoice.findUnique({
    where: { id: invoiceId },
    select: {
      id: true, number: true, status: true, buyerConfirmedAt: true, subtotal: true, discountAmount: true, currency: true, sellerCompanyId: true, sellerUserId: true, commissionPct: true,
      commission: { select: { id: true } },
      dealTermsVersion: { select: { dealTerms: { select: { conversation: { select: { id: true, commissionPct: true, offer: { select: { commissionPct: true, categoryId: true } } } } } } } },
    },
  });
  if (!inv || inv.commission) return;
  if (inv.status !== "PAID" && !inv.buyerConfirmedAt) return;
  if (["CANCELLED", "REFUNDED"].includes(inv.status)) return;
  const conversation = inv.dealTermsVersion.dealTerms.conversation;
  const base = inv.subtotal.sub(inv.discountAmount);
  if (base.lte(0)) return;
  const { pct, rule } = resolveCommission(inv.commissionPct ?? dealCommissionPct(conversation), await activeRules(), conversation.offer?.categoryId ?? null, base);
  if (!pct || pct.lte(0)) return;
  let amount = base.mul(pct).div(100).toDecimalPlaces(2);
  if (rule?.capAmount && amount.gt(rule.capAmount)) amount = rule.capAmount;

  const [{ nextval }] = await db.$queryRaw<{ nextval: bigint }[]>`SELECT nextval('commission_number_seq')`;
  const number = `SGBA-${yearInGeorgia()}-${String(nextval).padStart(6, "0")}`;
  const created = await db.commission.upsert({
    where: { invoiceId: inv.id },
    update: {},
    create: { invoiceId: inv.id, number, ruleId: rule?.id ?? null, conversationId: conversation.id, companyId: inv.sellerCompanyId, currency: inv.currency, baseAmount: base, pct, amount },
  });
  if (created.number !== number) return; // someone else created it in between

  // The seller (company owners + finance people, or the person) receives the SGBA invoice.
  const recipients = inv.sellerCompanyId
    ? (await db.companyMember.findMany({ where: { companyId: inv.sellerCompanyId, status: "ACTIVE" }, select: { userId: true, role: true, permissions: true } }))
        .filter((m) => m.role === "OWNER" || m.permissions.includes("finance.view"))
        .map((m) => m.userId)
    : [inv.sellerUserId];
  await notify(recipients, { type: "INVOICE_CREATED", title: ka.finance.commissionIssued(number, inv.number), link: "/app/finance" });
}

/** Back-compat name used by payment recording. */
export const createCommissionForPaidInvoice = createCommissionForInvoice;

/** After an admin sets a deal's rate: paid/confirmed invoices of that deal that earned nothing get their commission. */
export async function backfillDealCommissions(conversationId: string) {
  const open = await db.invoice.findMany({
    where: {
      commission: null,
      commissionPct: null,
      status: { notIn: ["CANCELLED", "REFUNDED"] },
      OR: [{ status: "PAID" }, { buyerConfirmedAt: { not: null } }],
      dealTermsVersion: { dealTerms: { conversationId } },
    },
    select: { id: true },
  });
  for (const inv of open) await createCommissionForInvoice(inv.id);
  return open.length;
}
