"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { ka } from "@/i18n/ka";
import { Prisma } from "@/generated/prisma/client";
import type { InvoiceStatus } from "@/generated/prisma/enums";
import { audit } from "@/lib/audit";
import { assertUser, getActiveMembership } from "@/lib/authz";
import { db } from "@/lib/db";
import { otherSideUserIds, requireDealContext } from "@/lib/deals";
import { fail, type FormState } from "@/lib/forms";
import { assertInvoiceManager, buildInvoiceSnapshot } from "@/lib/invoices";
import { notify } from "@/lib/notify";
import { todayInGeorgia } from "@/lib/money";

const i18n = ka.invoice;

// ─────────────────────────────── Create ───────────────────────────────

export async function createInvoiceAction(_: FormState, formData: FormData): Promise<FormState> {
  const ctx = await requireDealContext(String(formData.get("conversationId")), "invoices.manage");
  if (ctx.dealSide !== "SELLER") return fail(i18n.onlySeller);
  const deal = ctx.conversation.dealTerms;
  const version = deal?.versions[0];
  if (!deal || !version || version.id !== String(formData.get("versionId")) || version.status !== "APPROVED_BY_BOTH") {
    return fail(i18n.notApproved);
  }
  if (version.invoice) return fail(i18n.alreadyExists);

  const dueRaw = String(formData.get("dueDate") ?? "");
  const dueDate = dueRaw ? new Date(`${dueRaw}T23:59:59+04:00`) : null;
  if (dueDate && Number.isNaN(dueDate.getTime())) return fail(ka.validation.formErrors, formData, { dueDate: ka.validation.date });

  const snapshot = await buildInvoiceSnapshot(deal, version);
  let invoiceId: string;
  let number: string;
  try {
    const result = await db.$transaction(async (tx) => {
      const [{ nextval }] = await tx.$queryRaw<{ nextval: bigint }[]>`SELECT nextval('invoice_number_seq')`;
      const num = `B2B-${new Date().getFullYear()}-${String(nextval).padStart(6, "0")}`;
      const inv = await tx.invoice.create({
        data: {
          number: num,
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
          items: {
            create: version.items.map((it) => ({
              name: it.name,
              description: it.description,
              quantity: it.quantity,
              unit: it.unit,
              unitPrice: it.unitPrice,
              lineTotal: it.lineTotal,
              sortOrder: it.sortOrder,
            })),
          },
          statusHistory: { create: { fromStatus: null, toStatus: "ISSUED", changedById: ctx.userId } },
        },
      });
      return { id: inv.id, num };
    });
    invoiceId = result.id;
    number = result.num;
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") return fail(i18n.alreadyExists);
    throw e;
  }

  const c = ctx.conversation;
  await db.message.create({ data: { conversationId: c.id, kind: "TERMS", body: ka.terms.system.invoice(number) } });
  await notify(otherSideUserIds(c, "SELLER", ctx.userId), { type: "INVOICE_CREATED", title: i18n.notifyCreated(number), link: `/app/invoices/${invoiceId}` });
  await audit({ actorId: ctx.userId, action: "invoice.created", entityType: "Invoice", entityId: invoiceId, metadata: { number, total: version.total.toString(), currency: version.currency } });
  redirect(`/app/invoices/${invoiceId}`);
}

// ─────────────────────────────── Status & payments ───────────────────────────────

async function changeStatus(invoiceId: string, from: InvoiceStatus, to: InvoiceStatus, userId: string, comment?: string | null) {
  await db.$transaction([
    db.invoice.update({ where: { id: invoiceId }, data: { status: to } }),
    db.invoiceStatusChange.create({ data: { invoiceId, fromStatus: from, toStatus: to, changedById: userId, comment: comment ?? null } }),
  ]);
}

export async function markInvoiceSentAction(_: FormState, formData: FormData): Promise<FormState> {
  const { user, inv } = await assertInvoiceManager(String(formData.get("invoiceId")));
  if (inv.status !== "ISSUED") return fail(ka.errors.forbidden);
  await changeStatus(inv.id, inv.status, "SENT", user.id);
  await audit({ actorId: user.id, action: "invoice.status_changed", entityType: "Invoice", entityId: inv.id, metadata: { from: inv.status, to: "SENT" } });
  revalidatePath(`/app/invoices/${inv.id}`);
  return { ok: true, message: i18n.saved };
}

export async function cancelInvoiceAction(_: FormState, formData: FormData): Promise<FormState> {
  const { user, inv } = await assertInvoiceManager(String(formData.get("invoiceId")));
  const reason = String(formData.get("reason") ?? "").trim().slice(0, 1000);
  if (!reason) return fail(ka.validation.formErrors, formData, { reason: i18n.reasonRequired });
  if (["PAID", "PARTIALLY_PAID", "CANCELLED", "REFUNDED"].includes(inv.status)) return fail(ka.errors.forbidden);
  await changeStatus(inv.id, inv.status, "CANCELLED", user.id, reason);
  await audit({ actorId: user.id, action: "invoice.status_changed", entityType: "Invoice", entityId: inv.id, metadata: { from: inv.status, to: "CANCELLED", reason } });
  revalidatePath(`/app/invoices/${inv.id}`);
  return { ok: true, message: i18n.saved };
}

const paymentSchema = z.object({
  amount: z
    .string()
    .trim()
    .transform((s) => s.replace(",", ".").replace(/\s/g, ""))
    .refine((s) => /^\d{1,15}(\.\d{1,2})?$/.test(s) && Number(s) > 0, { error: ka.validation.positive }),
  paidAt: z
    .string()
    .min(1, { error: ka.validation.required })
    .transform((s) => new Date(`${s}T12:00:00+04:00`))
    .refine((d) => !Number.isNaN(d.getTime()) && d <= new Date(Date.now() + 864e5), { error: ka.validation.date }),
  method: z.string().trim().max(100),
  reference: z.string().trim().max(200),
});

/** Manual payment record (no provider yet). Status is derived from the recorded amounts — never assumed. */
export async function recordPaymentAction(_: FormState, formData: FormData): Promise<FormState> {
  const { user, inv } = await assertInvoiceManager(String(formData.get("invoiceId")));
  if (["CANCELLED", "REFUNDED", "PAID", "DRAFT"].includes(inv.status)) return fail(ka.errors.forbidden);
  const parsed = paymentSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return fail(ka.validation.formErrors, formData, Object.fromEntries(parsed.error.issues.map((i) => [String(i.path[0]), i.message])));
  }
  const amount = new Prisma.Decimal(parsed.data.amount);
  const remaining = inv.total.sub(inv.paidAmount);
  if (amount.gt(remaining)) return fail(ka.validation.formErrors, formData, { amount: i18n.overpay });

  const paid = inv.paidAmount.add(amount);
  const status: InvoiceStatus = paid.gte(inv.total) ? "PAID" : "PARTIALLY_PAID";
  await db.$transaction([
    db.paymentRecord.create({
      data: {
        invoiceId: inv.id,
        amount,
        currency: inv.currency,
        paidAt: parsed.data.paidAt,
        method: parsed.data.method || null,
        reference: parsed.data.reference || null,
        recordedById: user.id,
      },
    }),
    db.invoice.update({ where: { id: inv.id }, data: { paidAmount: paid, status } }),
    ...(status !== inv.status
      ? [db.invoiceStatusChange.create({ data: { invoiceId: inv.id, fromStatus: inv.status, toStatus: status, changedById: user.id, comment: `${amount.toFixed(2)} ${inv.currency}` } })]
      : []),
  ]);
  await audit({ actorId: user.id, action: "invoice.payment_recorded", entityType: "Invoice", entityId: inv.id, metadata: { amount: amount.toFixed(2), currency: inv.currency, status } });
  revalidatePath(`/app/invoices/${inv.id}`);
  return { ok: true, message: i18n.saved };
}

/** One click: records a payment for the whole remaining amount, dated today (Georgia). */
export async function markPaidInFullAction(prev: FormState, formData: FormData): Promise<FormState> {
  const { inv } = await assertInvoiceManager(String(formData.get("invoiceId")));
  const remaining = inv.total.sub(inv.paidAmount);
  if (remaining.lte(0)) return fail(ka.errors.forbidden);
  const fd = new FormData();
  fd.set("invoiceId", inv.id);
  fd.set("amount", remaining.toFixed(2));
  fd.set("paidAt", todayInGeorgia());
  fd.set("method", String(formData.get("method") ?? ""));
  fd.set("reference", "");
  return recordPaymentAction(prev, fd);
}

/** Buyer opening an issued/sent invoice marks it as viewed (optional status from the brief). */
export async function markInvoiceViewed(invoiceId: string) {
  const user = await assertUser();
  const m = await getActiveMembership(user.id);
  const inv = await db.invoice.findUnique({ where: { id: invoiceId } });
  if (!inv || !["ISSUED", "SENT"].includes(inv.status)) return;
  const isBuyer = inv.buyerCompanyId ? inv.buyerCompanyId === m?.companyId : inv.buyerUserId === user.id;
  if (!isBuyer) return;
  await changeStatus(inv.id, inv.status, "VIEWED", user.id);
}
