"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { ka } from "@/i18n/ka";
import { Prisma } from "@/generated/prisma/client";
import { audit } from "@/lib/audit";
import { CURRENCIES } from "@/lib/currencies";
import { db } from "@/lib/db";
import { computeTotals, dealSideFor, otherSideUserIds, requireDealContext, type ItemInput } from "@/lib/deals";
import { dealCommissionPct } from "@/lib/commission";
import { yearInGeorgia } from "@/lib/money";
import { fail, type FormState } from "@/lib/forms";
import { notify } from "@/lib/notify";
import { formatMoney } from "@/lib/format";
import { CORRECTABLE, buildInvoiceSnapshot } from "@/lib/invoices";
import { ForbiddenError } from "@/lib/authz";
import type { InvoiceStatus } from "@/generated/prisma/enums";

const v = ka.validation;
const t = ka.terms;

const money = (max = 15) =>
  z
    .string()
    .trim()
    .transform((s) => s.replace(",", ".").replace(/\s/g, ""))
    .refine((s) => s === "" || new RegExp(`^\\d{1,${max}}(\\.\\d{1,2})?$`).test(s), { error: v.number });

const termsSchema = z.object({
  conversationId: z.string().min(1),
  currency: z.string().refine((c) => CURRENCIES.includes(c), { error: v.currencyRequired }),
  discountAmount: money(),
  taxRatePercent: z
    .string()
    .trim()
    .transform((s) => s.replace(",", "."))
    .refine((s) => s === "" || (/^\d{1,2}(\.\d{1,2})?$/.test(s) && Number(s) <= 100), { error: v.number }),
  deliveryTerms: z.string().trim().max(1000, { error: v.tooLong(1000) }),
  deliveryCost: money(),
  paymentTerms: z.string().trim().max(1000, { error: v.tooLong(1000) }),
  validUntil: z
    .string()
    .optional()
    .transform((s) => (s ? new Date(`${s}T23:59:59+04:00`) : null))
    .refine((d) => d === null || (!Number.isNaN(d.getTime()) && d > new Date()), { error: v.futureDate }),
  notes: z.string().trim().max(2000, { error: v.tooLong(2000) }),
});

function parseItems(formData: FormData): { items: ItemInput[]; errors: Record<string, string> } {
  const names = formData.getAll("itemName").map(String);
  const descs = formData.getAll("itemDescription").map(String);
  const qtys = formData.getAll("itemQuantity").map(String);
  const units = formData.getAll("itemUnit").map(String);
  const prices = formData.getAll("itemUnitPrice").map(String);
  const items: ItemInput[] = [];
  const errors: Record<string, string> = {};
  names.forEach((rawName, i) => {
    const name = rawName.trim();
    const quantity = (qtys[i] ?? "").trim().replace(",", ".");
    const unitPrice = (prices[i] ?? "").trim().replace(",", ".");
    const unit = (units[i] ?? "").trim() || ka.invoice.defaultUnit;
    if (!name && !quantity && !unitPrice) return; // empty row
    if (!name || name.length > 200) errors[`items.${i}.name`] = v.required;
    if (!/^\d{1,12}(\.\d{1,3})?$/.test(quantity) || Number(quantity) <= 0) errors[`items.${i}.quantity`] = v.positive;
    if (!/^\d{1,13}(\.\d{1,2})?$/.test(unitPrice)) errors[`items.${i}.unitPrice`] = v.number;
    if (unit.length > 30) errors[`items.${i}.unit`] = v.tooLong(30);
    items.push({ name: name.slice(0, 200), description: (descs[i] ?? "").trim().slice(0, 500) || null, quantity, unit, unitPrice });
  });
  if (items.length === 0) errors.items = t.noItems;
  if (items.length > 50) errors.items = v.tooLong(50);
  return { items, errors };
}



// ─────────────────────────────── New version ───────────────────────────────



/**
 * Simplified flow (client request 2026-11-09): the seller fills items in the chat and the
 * invoice is issued immediately. Internally it is still stored as an agreed terms version,
 * so the data model, snapshot and history stay the same.
 */
export async function sendInvoiceAction(_: FormState, formData: FormData): Promise<FormState> {
  const ctx = await requireDealContext(String(formData.get("conversationId")), "invoices.manage");
  if (ctx.dealSide !== "SELLER") return fail(ka.invoice.onlySeller);
  const c = ctx.conversation;

  const parsed = termsSchema.safeParse(Object.fromEntries(formData));
  const { items, errors: itemErrors } = parseItems(formData);
  const dueRaw = String(formData.get("dueDate") ?? "");
  const dueDate = dueRaw ? new Date(`${dueRaw}T23:59:59+04:00`) : null;
  const dueError: Record<string, string> = dueDate && Number.isNaN(dueDate.getTime()) ? { dueDate: v.date } : {};
  if (!parsed.success || Object.keys(itemErrors).length || Object.keys(dueError).length) {
    const errors = { ...(parsed.success ? {} : Object.fromEntries(parsed.error.issues.map((i) => [String(i.path[0]), i.message]))), ...itemErrors, ...dueError };
    return fail(v.formErrors, formData, errors);
  }
  const d = parsed.data;
  const totals = computeTotals(items, d.discountAmount, d.taxRatePercent || null, d.deliveryCost);
  if (totals.discount.gt(totals.subtotal)) return fail(v.formErrors, formData, { discountAmount: t.discountTooBig });

  // Correction: a new invoice replaces an unpaid one from the same deal; the original is cancelled.
  const correctsId = String(formData.get("correctsInvoiceId") ?? "") || null;
  const correctionReason = String(formData.get("correctionReason") ?? "").trim().slice(0, 1000);
  let original: { id: string; number: string; status: string } | null = null;
  if (correctsId) {
    original = await db.invoice.findFirst({
      where: { id: correctsId, dealTermsVersion: { dealTerms: { conversationId: c.id } } },
      select: { id: true, number: true, status: true },
    });
    if (!original || !CORRECTABLE.includes(original.status)) return fail(ka.invoice.cannotCorrect, formData);
    if (!correctionReason) return fail(v.formErrors, formData, { correctionReason: ka.invoice.reasonRequired });
  }

  const firstOf = (side: "SELLER" | "BUYER") =>
    [...c.participants].sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime()).find((p) => dealSideFor(p.side, c.offer?.type ?? null, c.sellerSide) === side)!;
  const seller = firstOf("SELLER");
  const buyer = firstOf("BUYER");
  const versionNumber = (c.dealTerms?.versions[0]?.versionNumber ?? 0) + 1;

  const { invoiceId, number } = await db.$transaction(async (tx) => {
    if (original) {
      // Re-checked inside the transaction so two parallel corrections can't both win.
      const locked = await tx.invoice.updateMany({ where: { id: original.id, status: { in: CORRECTABLE as InvoiceStatus[] } }, data: { status: "CANCELLED" } });
      if (locked.count !== 1) throw new ForbiddenError();
    }
    const deal =
      c.dealTerms ??
      (await tx.dealTerms.create({
        data: { conversationId: c.id, sellerUserId: seller.userId, buyerUserId: buyer.userId, sellerCompanyId: seller.companyId, buyerCompanyId: buyer.companyId },
      }));
    await tx.dealTermsVersion.updateMany({
      where: { dealTermsId: deal.id, status: { in: ["DRAFT", "SENT_FOR_APPROVAL", "APPROVED_BY_ONE", "CHANGES_REQUESTED"] } },
      data: { status: "SUPERSEDED" },
    });
    const version = await tx.dealTermsVersion.create({
      data: {
        dealTermsId: deal.id,
        versionNumber,
        status: "APPROVED_BY_BOTH",
        currency: d.currency,
        discountAmount: totals.discount,
        taxRatePercent: d.taxRatePercent || null,
        taxAmount: totals.taxAmount,
        deliveryTerms: d.deliveryTerms || null,
        deliveryCost: new Prisma.Decimal(d.deliveryCost || 0),
        subtotal: totals.subtotal,
        total: totals.total,
        paymentTerms: d.paymentTerms || null,
        notes: d.notes || null,
        createdById: ctx.userId,
        items: {
          create: totals.lines.map((l, i) => ({ name: l.name, description: l.description, quantity: l.quantity, unit: l.unit, unitPrice: l.unitPrice, lineTotal: l.lineTotal, sortOrder: i })),
        },
        approvals: { create: { side: "SELLER", userId: ctx.userId, companyId: ctx.actingCompanyId, decision: "APPROVED" } },
      },
      include: { items: true },
    });
    await tx.dealTerms.update({ where: { id: deal.id }, data: { currentVersionId: version.id } });
    const snapshot = await buildInvoiceSnapshot(deal, version, tx);
    const [{ nextval }] = await tx.$queryRaw<{ nextval: bigint }[]>`SELECT nextval('invoice_number_seq')`;
    const num = `B2B-${yearInGeorgia()}-${String(nextval).padStart(6, "0")}`;
    // The commission rate is fixed at issue time; later admin changes don't rewrite history.
    const conv = await tx.conversation.findUniqueOrThrow({ where: { id: ctx.conversation.id }, select: { commissionPct: true, offer: { select: { commissionPct: true } } } });
    const inv = await tx.invoice.create({
      data: {
        number: num,
        commissionPct: dealCommissionPct(conv),
        dealTermsVersionId: version.id,
        sellerCompanyId: deal.sellerCompanyId,
        buyerCompanyId: deal.buyerCompanyId,
        sellerUserId: deal.sellerUserId,
        buyerUserId: deal.buyerUserId,
        status: "ISSUED",
        dueDate,
        currency: version.currency,
        subtotal: version.subtotal,
        discountAmount: version.discountAmount,
        taxAmount: version.taxAmount,
        deliveryCost: version.deliveryCost,
        total: version.total,
        paymentTerms: version.paymentTerms,
        notes: version.notes,
        snapshot: snapshot as unknown as Prisma.InputJsonValue,
        correctsInvoiceId: original?.id ?? null,
        items: {
          create: version.items.map((it) => ({ name: it.name, description: it.description, quantity: it.quantity, unit: it.unit, unitPrice: it.unitPrice, lineTotal: it.lineTotal, sortOrder: it.sortOrder })),
        },
        statusHistory: { create: { fromStatus: null, toStatus: "ISSUED", changedById: ctx.userId, comment: original ? ka.invoice.correctsComment(original.number, correctionReason) : null } },
      },
    });
    if (original) {
      await tx.invoiceStatusChange.create({
        data: { invoiceId: original.id, fromStatus: original.status as InvoiceStatus, toStatus: "CANCELLED", changedById: ctx.userId, comment: ka.invoice.correctedByComment(num, correctionReason) },
      });
    }
    return { invoiceId: inv.id, number: num };
  });

  // The invoice appears in the chat as a card (fileUrl links to the invoice page).
  await db.message.create({
    data: {
      conversationId: c.id,
      senderId: ctx.userId,
      kind: "TERMS",
      body: `${number} · ${formatMoney(totals.total, d.currency)}`,
      fileUrl: `/app/invoices/${invoiceId}`,
      fileName: number,
    },
  });
  await db.conversation.update({ where: { id: c.id }, data: { lastMessageAt: new Date() } });
  await notify(otherSideUserIds(c, "SELLER", ctx.userId), {
    type: "INVOICE_CREATED",
    title: original ? ka.invoice.notifyCorrected(number, original.number) : ka.invoice.notifyCreated(number),
    body: original ? correctionReason : undefined,
    link: original ? `/app/invoices/${invoiceId}` : `/app/conversations/${c.id}`,
  });
  await audit({ actorId: ctx.userId, action: "invoice.created", entityType: "Invoice", entityId: invoiceId, metadata: { number, total: totals.total.toString(), currency: d.currency } });
  if (original) {
    await audit({ actorId: ctx.userId, action: "invoice.corrected", entityType: "Invoice", entityId: original.id, metadata: { original: original.number, replacement: number, reason: correctionReason } });
    revalidatePath(`/app/invoices/${original.id}`);
  }
  if (formData.get("stay") === "1" && !original) {
    revalidatePath(`/app/conversations/${c.id}`);
    return { ok: true, message: ka.invoice.sentToChat(number) };
  }
  redirect(`/app/invoices/${invoiceId}`);
}
