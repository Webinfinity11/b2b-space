"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { ka } from "@/i18n/ka";
import type { OfferStatus } from "@/generated/prisma/enums";
import { audit } from "@/lib/audit";
import { ForbiddenError, assertUser } from "@/lib/authz";
import { db } from "@/lib/db";
import { fail, zCheckbox, zOptionalText, zText, type FormState } from "@/lib/forms";
import { notify } from "@/lib/notify";
import { hasPermission } from "@/lib/permissions";
import { rateLimit } from "@/lib/rate-limit";
import { DOCUMENT_TYPES, UploadError, filesFrom, storeFile } from "@/lib/storage";
import { CURRENCIES } from "@/lib/currencies";
import { companyCanAct } from "@/lib/company-policy";

const v = ka.validation;

const zMoney = z
  .string()
  .trim()
  .optional()
  .transform((s) => (s ? s.replace(",", ".").replace(/\s/g, "") : null))
  .refine((s) => s === null || /^\d{1,15}(\.\d{1,2})?$/.test(s), { error: v.number });

const zQty = z
  .string()
  .trim()
  .optional()
  .transform((s) => (s ? s.replace(",", ".").replace(/\s/g, "") : null))
  .refine((s) => s === null || (/^\d{1,14}(\.\d{1,3})?$/.test(s) && Number(s) > 0), { error: v.positive });

const offerSchema = z
  .object({
    type: z.enum(["OFFER", "REQUEST"]),
    title: zText(5, 160),
    description: zText(10, 5000),
    categoryId: z.string().min(1, { error: v.chooseCategory }),
    itemKind: z.enum(["PRODUCT", "SERVICE"]),
    priceType: z.enum(["FIXED", "FROM", "RANGE", "NEGOTIABLE", "NONE"]),
    priceMin: zMoney,
    priceMax: zMoney,
    currency: z
      .string()
      .optional()
      .transform((s) => s || null),
    quantity: zQty,
    unit: zOptionalText(30),
    deliveryTerms: zOptionalText(1000),
    perk: zOptionalText(80),
    audience: zOptionalText(160),
    city: zOptionalText(80),
    validUntil: z
      .string()
      .optional()
      .transform((s) => (s ? new Date(`${s}T23:59:59+04:00`) : null))
      .refine((d) => d === null || (!Number.isNaN(d.getTime()) && d > new Date()), { error: v.futureDate }),
    visibility: z.enum(["PUBLIC", "REGISTERED"]),
    isAnonymous: zCheckbox,
    publishAs: z.string().min(1),
  })
  .superRefine((d, ctx) => {
    const needsMin = d.priceType === "FIXED" || d.priceType === "FROM" || d.priceType === "RANGE";
    if (needsMin && !d.priceMin) ctx.addIssue({ code: "custom", path: ["priceMin"], message: v.priceRequired });
    if (d.priceType === "RANGE") {
      if (!d.priceMax) ctx.addIssue({ code: "custom", path: ["priceMax"], message: v.priceRequired });
      else if (d.priceMin && Number(d.priceMax) <= Number(d.priceMin)) ctx.addIssue({ code: "custom", path: ["priceMax"], message: v.priceRange });
    }
    if (needsMin && (!d.currency || !CURRENCIES.includes(d.currency))) ctx.addIssue({ code: "custom", path: ["currency"], message: v.currencyRequired });
  });

/** Resolves "publish as" to a company the user may publish for (active + offers.manage), or personal. */
async function resolvePublisher(userId: string, publishAs: string): Promise<string | null> {
  if (publishAs === "personal") return null;
  const member = await db.companyMember.findUnique({
    where: { companyId_userId: { companyId: publishAs, userId } },
    include: { company: { select: { verificationStatus: true } } },
  });
  if (!member || member.status !== "ACTIVE" || !hasPermission(member, "offers.manage") || !companyCanAct(member.company.verificationStatus)) {
    throw new ForbiddenError();
  }
  return publishAs;
}

/** The user may edit an offer they authored personally, or one of a company where they hold offers.manage. */
async function assertCanManageOffer(offerId: string) {
  const user = await assertUser();
  const offer = await db.offer.findUnique({ where: { id: offerId } });
  if (!offer) throw new ForbiddenError();
  if (offer.companyId) {
    const member = await db.companyMember.findUnique({ where: { companyId_userId: { companyId: offer.companyId, userId: user.id } } });
    if (!member || member.status !== "ACTIVE" || !hasPermission(member, "offers.manage")) throw new ForbiddenError();
  } else if (offer.authorUserId !== user.id) {
    throw new ForbiddenError();
  }
  return { user, offer };
}

export async function saveOfferAction(_: FormState, formData: FormData): Promise<FormState> {
  const offerId = String(formData.get("offerId") ?? "") || null;
  const user = await assertUser();
  const existing = offerId ? (await assertCanManageOffer(offerId)).offer : null;

  const parsed = offerSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return fail(v.formErrors, formData, Object.fromEntries(parsed.error.issues.map((i) => [String(i.path[0]), i.message])));
  }
  const d = parsed.data;
  const category = await db.category.findFirst({ where: { id: d.categoryId, kind: "OFFER", OR: [{ isActive: true }, ...(existing ? [{ id: existing.categoryId ?? "" }] : [])] }, select: { id: true } });
  if (!category) return fail(v.formErrors, formData, { categoryId: v.chooseCategory });
  const companyId = existing ? existing.companyId : await resolvePublisher(user.id, d.publishAs);

  const files = filesFrom(formData, "attachments");
  const currentCount = existing ? await db.offerAttachment.count({ where: { offerId: existing.id } }) : 0;
  if (currentCount + files.length > 5) return fail(v.formErrors, formData, { attachments: ka.offerForm.imagesHint });
  const stored = [];
  try {
    for (const file of files) stored.push(await storeFile(file, { visibility: "public", folder: "offers", allowed: DOCUMENT_TYPES, maxMb: 10 }));
  } catch (e) {
    if (e instanceof UploadError) return fail(v.formErrors, formData, { attachments: e.code === "size" ? v.fileSize(10) : v.fileType });
    throw e;
  }

  const publish = formData.get("intent") === "publish";
  const hasPrice = d.priceType === "FIXED" || d.priceType === "FROM" || d.priceType === "RANGE";
  const data = {
    type: d.type,
    title: d.title,
    description: d.description,
    categoryId: d.categoryId,
    itemKind: d.itemKind,
    priceType: d.priceType,
    priceMin: hasPrice ? d.priceMin : null,
    priceMax: d.priceType === "RANGE" ? d.priceMax : null,
    currency: hasPrice ? d.currency : null,
    quantity: d.quantity,
    unit: d.quantity ? d.unit : null,
    deliveryTerms: d.deliveryTerms,
    perk: d.perk,
    audience: d.audience,
    city: d.city,
    validUntil: d.validUntil,
    visibility: d.visibility,
    isAnonymous: d.isAnonymous,
  };

  let id: string;
  if (existing) {
    const status: OfferStatus = publish && existing.status === "DRAFT" ? "PUBLISHED" : existing.status;
    await db.offer.update({
      where: { id: existing.id },
      data: { ...data, type: existing.type, status, publishedAt: status !== "DRAFT" ? (existing.publishedAt ?? new Date()) : null },
    });
    id = existing.id;
  } else {
    const created = await db.offer.create({
      data: { ...data, authorUserId: user.id, companyId, status: publish ? "PUBLISHED" : "DRAFT", publishedAt: publish ? new Date() : null },
    });
    id = created.id;
  }
  if (stored.length) {
    await db.offerAttachment.createMany({
      data: stored.map((s, i) => ({
        offerId: id,
        url: s.url!,
        fileName: s.fileName,
        mimeType: s.mimeType,
        sizeBytes: s.sizeBytes,
        isImage: s.mimeType.startsWith("image/"),
        sortOrder: currentCount + i,
      })),
    });
  }
  await audit({ actorId: user.id, action: existing ? "offer.updated" : "offer.created", entityType: "Offer", entityId: id, metadata: { publish, isAnonymous: d.isAnonymous } });
  revalidatePath("/offers");
  redirect(d.type === "REQUEST" ? "/company/requests" : "/company/offers");
}

const STATUS_TRANSITIONS: Record<string, OfferStatus[]> = {
  publish: ["DRAFT", "CLOSED"],
  close: ["PUBLISHED", "ACCEPTING_RESPONSES", "NEGOTIATING"],
  archive: ["DRAFT", "PUBLISHED", "ACCEPTING_RESPONSES", "NEGOTIATING", "CLOSED", "EXPIRED"],
};

export async function changeOfferStatusAction(formData: FormData) {
  const { user, offer } = await assertCanManageOffer(String(formData.get("offerId")));
  const op = String(formData.get("op"));
  const allowedFrom = STATUS_TRANSITIONS[op];
  if (!allowedFrom || !allowedFrom.includes(offer.status)) throw new ForbiddenError();
  // An offer past its date would be "published" yet invisible — the owner must extend the date first.
  if (op === "publish" && offer.validUntil && offer.validUntil < new Date()) redirect(`/company/offers/${offer.id}`);
  const status: OfferStatus = op === "publish" ? "PUBLISHED" : op === "close" ? "CLOSED" : "ARCHIVED";
  await db.offer.update({ where: { id: offer.id }, data: { status, publishedAt: status === "PUBLISHED" ? (offer.publishedAt ?? new Date()) : offer.publishedAt } });
  await audit({ actorId: user.id, action: "offer.status_changed", entityType: "Offer", entityId: offer.id, metadata: { from: offer.status, to: status } });
  revalidatePath("/company", "layout");
  revalidatePath("/offers");
}

export async function deleteOfferAttachmentAction(formData: FormData) {
  const att = await db.offerAttachment.findUnique({ where: { id: String(formData.get("attachmentId")) } });
  if (!att) return;
  await assertCanManageOffer(att.offerId);
  await db.offerAttachment.delete({ where: { id: att.id } });
  revalidatePath(`/company/offers/${att.offerId}`);
}

// ─────────────────────────────── Responses ───────────────────────────────

export async function respondToOfferAction(_: FormState, formData: FormData): Promise<FormState> {
  const user = await assertUser();
  if (!rateLimit(`respond:${user.id}`, 20, 60 * 60_000)) return fail(ka.auth.tooManyAttempts, formData);
  const parsed = z
    .object({ offerId: z.string().min(1), message: zText(10, 3000), respondAs: z.string().min(1) })
    .safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return fail(v.formErrors, formData, Object.fromEntries(parsed.error.issues.map((i) => [String(i.path[0]), i.message])));
  }
  const { offerId, message, respondAs } = parsed.data;

  const offer = await db.offer.findUnique({ where: { id: offerId } });
  if (!offer || !["PUBLISHED", "ACCEPTING_RESPONSES", "NEGOTIATING"].includes(offer.status) || (offer.validUntil && offer.validUntil < new Date())) {
    return fail(ka.offer.notAcceptingResponses, formData);
  }

  let responderCompanyId: string | null = null;
  if (respondAs !== "personal") {
    const member = await db.companyMember.findUnique({
      where: { companyId_userId: { companyId: respondAs, userId: user.id } },
      include: { company: { select: { verificationStatus: true } } },
    });
    if (!member || member.status !== "ACTIVE" || !hasPermission(member, "responses.manage") || !companyCanAct(member.company.verificationStatus)) {
      return fail(ka.offer.noRespondPermission, formData);
    }
    responderCompanyId = respondAs;
  }

  // Cannot respond to your own (or your company's) offer.
  if (offer.authorUserId === user.id || (offer.companyId && offer.companyId === responderCompanyId)) return fail(ka.offer.ownOffer, formData);
  // One open response per person — and per company, so colleagues don't open parallel chats.
  const duplicate = await db.offerResponse.findFirst({
    where: { offerId, status: { not: "WITHDRAWN" }, OR: [{ responderUserId: user.id }, ...(responderCompanyId ? [{ responderCompanyId }] : [])] },
  });
  if (duplicate) return fail(ka.offer.alreadyResponded, formData);

  const conversationId = await db.$transaction(async (tx) => {
    const response = await tx.offerResponse.create({ data: { offerId, responderUserId: user.id, responderCompanyId, message } });
    const conversation = await tx.conversation.create({
      data: {
        offerId,
        responseId: response.id,
        subject: offer.title,
        participants: {
          create: [
            { userId: offer.authorUserId, companyId: offer.companyId, side: "AUTHOR", identityRevealed: !offer.isAnonymous },
            { userId: user.id, companyId: responderCompanyId, side: "RESPONDER", identityRevealed: true, lastReadAt: new Date() },
          ],
        },
        messages: {
          create: [
            { kind: "SYSTEM", body: "conversation.opened" },
            { kind: "TEXT", senderId: user.id, body: message },
          ],
        },
      },
    });
    if (offer.status === "PUBLISHED") await tx.offer.update({ where: { id: offerId }, data: { status: "ACCEPTING_RESPONSES" } });
    return conversation.id;
  });

  // Notify the author and company colleagues who handle responses.
  const recipients = [offer.authorUserId];
  if (offer.companyId) {
    const members = await db.companyMember.findMany({ where: { companyId: offer.companyId, status: "ACTIVE" } });
    recipients.push(...members.filter((m) => hasPermission(m, "responses.manage")).map((m) => m.userId));
  }
  await notify(recipients, { type: "NEW_RESPONSE", title: ka.notifications.newResponse(offer.title), link: `/app/conversations/${conversationId}` });
  await audit({ actorId: user.id, action: "offer.response_sent", entityType: "Offer", entityId: offerId, metadata: { conversationId } });
  redirect(`/app/conversations/${conversationId}`);
}
