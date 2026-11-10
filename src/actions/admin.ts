"use server";

import { after } from "next/server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { ka } from "@/i18n/ka";
import { Prisma } from "@/generated/prisma/client";
import { emailEnabled, renderEmail, sendEmail } from "@/lib/email";
import { audit } from "@/lib/audit";
import { assertAdmin } from "@/lib/authz";
import { db } from "@/lib/db";
import { fail, invalid, zCheckbox, zText, type FormState } from "@/lib/forms";
import { notify } from "@/lib/notify";
import { slugify } from "@/lib/slug";
import { loadDemoData, removeDemoData } from "@/lib/demo-data";
import { invoiceSideUserIds } from "@/lib/invoices";
import { CHAT_ACCESS_ACTION } from "@/lib/admin-access";
import { audienceWhere } from "@/lib/campaigns";
import { companyName } from "@/lib/public";

// ─────────────────────────────── Company verification ───────────────────────────────

const STATUSES = ["PENDING", "IN_REVIEW", "VERIFIED", "REJECTED", "SUSPENDED"] as const;

export async function decideCompanyAction(_: FormState, formData: FormData): Promise<FormState> {
  const admin = await assertAdmin();
  const parsed = z
    .object({
      companyId: z.string().min(1),
      status: z.enum(STATUSES, { error: ka.validation.required }),
      comment: z.string().trim().max(2000).optional(),
    })
    .safeParse(Object.fromEntries(formData));
  if (!parsed.success) return invalid(parsed.error, formData);
  const { companyId, status, comment } = parsed.data;

  const company = await db.company.findUniqueOrThrow({ where: { id: companyId }, select: { verificationStatus: true, legalName: true, tradeName: true } });
  if (company.verificationStatus === status) return fail(ka.admin.sameStatus, formData, { status: ka.admin.sameStatus });
  if ((status === "REJECTED" || status === "SUSPENDED") && !comment) {
    return fail(ka.admin.commentRequired, formData, { comment: ka.admin.commentRequired });
  }

  await db.$transaction([
    db.company.update({
      where: { id: companyId },
      data: { verificationStatus: status, verifiedAt: status === "VERIFIED" ? new Date() : status === "PENDING" || status === "REJECTED" ? null : undefined },
    }),
    db.verificationDecision.create({
      data: { companyId, reviewerId: admin.id, fromStatus: company.verificationStatus, toStatus: status, comment: comment || null },
    }),
  ]);

  const owners = await db.companyMember.findMany({ where: { companyId, role: "OWNER", status: "ACTIVE" }, select: { userId: true } });
  await notify(
    owners.map((o) => o.userId),
    {
      type: "COMPANY_STATUS_CHANGED",
      title: ka.notifications.companyStatus(company.tradeName || company.legalName, ka.enums.verificationStatus[status]),
      body: comment || undefined,
      link: "/company/profile",
    },
  );
  await audit({
    actorId: admin.id,
    action: "company.verification_decision",
    entityType: "Company",
    entityId: companyId,
    metadata: { from: company.verificationStatus, to: status, comment: comment || null },
  });
  revalidatePath("/admin", "layout");
  return { ok: true, message: ka.admin.decisionSaved };
}

// ─────────────────────────────── Users ───────────────────────────────

export async function setUserStatusAction(formData: FormData) {
  const admin = await assertAdmin();
  const userId = String(formData.get("userId"));
  const status = z.enum(["ACTIVE", "SUSPENDED", "REJECTED"]).parse(formData.get("status"));
  if (userId === admin.id) return;
  const before = await db.user.findUnique({ where: { id: userId }, select: { status: true, email: true, firstName: true } });
  if (!before) return;
  await db.user.update({ where: { id: userId }, data: { status } });
  if (status !== "ACTIVE") await db.session.deleteMany({ where: { userId } });
  // Approving / declining a registration decides the company registered with it as well.
  if (before.status === "PENDING") {
    const companies = await db.company.findMany({ where: { createdById: userId, verificationStatus: { in: ["PENDING", "IN_REVIEW"] } }, select: { id: true, verificationStatus: true } });
    const to = status === "ACTIVE" ? "VERIFIED" : "REJECTED";
    for (const c of companies) {
      await db.$transaction([
        db.company.update({ where: { id: c.id }, data: { verificationStatus: to, verifiedAt: to === "VERIFIED" ? new Date() : null } }),
        db.verificationDecision.create({ data: { companyId: c.id, reviewerId: admin.id, fromStatus: c.verificationStatus, toStatus: to } }),
      ]);
    }
  }
  const action = before.status === "PENDING" ? (status === "ACTIVE" ? "user.approved" : "user.rejected") : "user.status_changed";
  await audit({ actorId: admin.id, action, entityType: "User", entityId: userId, metadata: { from: before.status, status } });
  // Let the person know their account was approved / declined.
  if (before.status === "PENDING" && emailEnabled()) {
    const approved = status === "ACTIVE";
    const { html, text } = renderEmail({
      title: approved ? ka.approval.approvedTitle : ka.approval.rejectedTitle,
      body: approved ? ka.approval.approvedText(before.firstName) : ka.approval.rejectedText(before.firstName),
      link: approved ? "/login" : null,
      button: ka.nav.login,
      footer: ka.email.footer,
    });
    after(() => sendEmail({ to: before.email, subject: approved ? ka.approval.approvedTitle : ka.approval.rejectedTitle, html, text }).then(() => undefined));
  }
  revalidatePath("/admin", "layout");
}

export async function setUserRoleAction(formData: FormData) {
  const admin = await assertAdmin();
  const userId = String(formData.get("userId"));
  const role = z.enum(["USER", "ADMIN", "FINANCE_MANAGER"]).parse(formData.get("role"));
  if (userId === admin.id) return;
  await db.user.update({ where: { id: userId }, data: { platformRole: role } });
  await audit({ actorId: admin.id, action: "user.role_changed", entityType: "User", entityId: userId, metadata: { role } });
  revalidatePath("/admin/users");
}

// ─────────────────────────────── Categories ───────────────────────────────

const categorySchema = z.object({
  name: zText(2, 80),
  slug: z
    .string()
    .trim()
    .max(80)
    .optional()
    .transform((s) => (s ? slugify(s) : "")),
  parentId: z
    .string()
    .optional()
    .transform((s) => s || null),
  sortOrder: z.coerce.number({ error: ka.validation.number }).int().min(0).max(9999).default(0),
  isActive: zCheckbox,
  kind: z.enum(["OFFER", "INDUSTRY"]).default("INDUSTRY"),
});

export async function saveCategoryAction(_: FormState, formData: FormData): Promise<FormState> {
  const admin = await assertAdmin();
  const id = String(formData.get("id") ?? "") || null;
  const parsed = categorySchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return invalid(parsed.error, formData);
  const data = { ...parsed.data, slug: parsed.data.slug || slugify(parsed.data.name) };
  if (!data.slug) return fail(ka.validation.formErrors, formData, { slug: ka.validation.required });
  if (data.parentId) {
    const parent = await db.category.findUnique({ where: { id: data.parentId }, select: { parentId: true } });
    // Two levels only: category → subcategory.
    if (!parent || parent.parentId || data.parentId === id) return fail(ka.validation.formErrors, formData, { parentId: ka.validation.chooseCategory });
    if (id && (await db.category.count({ where: { parentId: id } })) > 0) {
      return fail(ka.validation.formErrors, formData, { parentId: ka.admin.categoryHasChildren });
    }
  }
  try {
    const saved = id ? await db.category.update({ where: { id }, data }) : await db.category.create({ data });
    await audit({ actorId: admin.id, action: id ? "category.updated" : "category.created", entityType: "Category", entityId: saved.id, metadata: data });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") return fail(ka.validation.formErrors, formData, { slug: ka.admin.slugTaken });
    throw e;
  }
  revalidatePath("/admin/categories");
  revalidatePath("/", "layout");
  return { ok: true, message: ka.common.saved };
}

export async function deleteCategoryAction(_: FormState, formData: FormData): Promise<FormState> {
  const admin = await assertAdmin();
  const id = String(formData.get("id"));
  const cat = await db.category.findUnique({ where: { id }, include: { _count: { select: { children: true, companies: true, offers: true } } } });
  if (!cat) return fail(ka.errors.generic);
  if (cat._count.children > 0) return fail(ka.admin.categoryHasChildren);
  if (cat._count.companies > 0 || cat._count.offers > 0) return fail(ka.admin.categoryInUse);
  await db.category.delete({ where: { id } });
  await audit({ actorId: admin.id, action: "category.deleted", entityType: "Category", entityId: id, metadata: { name: cat.name } });
  revalidatePath("/admin/categories");
  return { ok: true, message: ka.common.saved };
}

// ─────────────────────────────── Offers ───────────────────────────────

/** Marks an offer as a main-partner / women-in-business offer (or clears the tag). */
export async function adminSetOfferTagAction(formData: FormData) {
  const admin = await assertAdmin();
  const offerId = String(formData.get("offerId"));
  const raw = String(formData.get("tag") ?? "");
  const tag = raw === "MAIN_PARTNER" || raw === "WOMEN_BUSINESS" ? raw : null;
  await db.offer.update({ where: { id: offerId }, data: { tag } });
  await audit({ actorId: admin.id, action: "offer.tag_changed", entityType: "Offer", entityId: offerId, metadata: { tag } });
  revalidatePath("/admin/offers");
  revalidatePath("/offers");
}

export async function adminArchiveOfferAction(formData: FormData) {
  const admin = await assertAdmin();
  const id = String(formData.get("offerId"));
  const offer = await db.offer.update({ where: { id }, data: { status: "ARCHIVED" } });
  await audit({ actorId: admin.id, action: "offer.admin_archived", entityType: "Offer", entityId: offer.id });
  revalidatePath("/admin/offers");
  revalidatePath("/offers");
}

// ─────────────────────────────── Demo data ───────────────────────────────

/** Loads (or reloads) the clearly marked demo set so the platform can be shown. Admin only, audited. */
export async function loadDemoDataAction(_: FormState, formData: FormData): Promise<FormState> {
  const admin = await assertAdmin();
  const password = String(formData.get("demoPassword") ?? "");
  if (password.length < 6) return fail(ka.validation.formErrors, formData, { demoPassword: ka.validation.tooShort(6) });
  await loadDemoData(db, password);
  await audit({ actorId: admin.id, action: "demo.loaded", entityType: "Platform" });
  revalidatePath("/", "layout");
  return { ok: true, message: ka.demo.loaded };
}

export async function removeDemoDataAction(): Promise<FormState> {
  const admin = await assertAdmin();
  const n = await removeDemoData(db);
  await audit({ actorId: admin.id, action: "demo.removed", entityType: "Platform", metadata: { users: n } });
  revalidatePath("/", "layout");
  return { ok: true, message: ka.demo.removed };
}

// ─────────────────────────────── Invoices ───────────────────────────────

/** Admin transitions (no provider yet): cancel an unpaid invoice, or mark a paid one as refunded. Reason required, audited. */
const ADMIN_INVOICE_TRANSITIONS: Record<string, string[]> = {
  CANCELLED: ["ISSUED", "SENT", "VIEWED"],
  REFUNDED: ["PAID", "PARTIALLY_PAID"],
};

export async function adminInvoiceStatusAction(_: FormState, formData: FormData): Promise<FormState> {
  const admin = await assertAdmin();
  const parsed = z
    .object({
      invoiceId: z.string().min(1),
      status: z.enum(["CANCELLED", "REFUNDED"], { error: ka.validation.required }),
      comment: z.string().trim().min(5, { error: ka.admin.reasonRequired }).max(1000),
    })
    .safeParse(Object.fromEntries(formData));
  if (!parsed.success) return invalid(parsed.error, formData);
  const { invoiceId, status, comment } = parsed.data;
  const inv = await db.invoice.findUnique({ where: { id: invoiceId } });
  if (!inv) return fail(ka.errors.generic);
  if (!ADMIN_INVOICE_TRANSITIONS[status].includes(inv.status)) return fail(ka.admin.transitionNotAllowed, formData);

  const updated = await db.$transaction(async (tx) => {
    const r = await tx.invoice.updateMany({ where: { id: inv.id, status: inv.status }, data: { status } });
    if (r.count !== 1) return false;
    await tx.invoiceStatusChange.create({ data: { invoiceId: inv.id, fromStatus: inv.status, toStatus: status, changedById: admin.id, comment: `${ka.admin.byPlatform}: ${comment}` } });
    // A refunded deal owes no commission.
    if (status === "REFUNDED") await tx.commission.updateMany({ where: { invoiceId: inv.id, status: "CONFIRMED" }, data: { status: "CANCELLED" } });
    return true;
  });
  if (!updated) return fail(ka.errors.generic);

  const users = [...(await invoiceSideUserIds(inv.sellerCompanyId, inv.sellerUserId)), ...(await invoiceSideUserIds(inv.buyerCompanyId, inv.buyerUserId))];
  await notify(users, { type: "INVOICE_CREATED", title: ka.admin.invoiceStatusNotify(inv.number, ka.enums.invoiceStatus[status]), body: comment, link: `/app/invoices/${inv.id}` });
  await audit({ actorId: admin.id, action: "invoice.admin_status_changed", entityType: "Invoice", entityId: inv.id, metadata: { number: inv.number, from: inv.status, to: status, comment } });
  revalidatePath(`/admin/invoices/${inv.id}`);
  revalidatePath("/admin/invoices");
  return { ok: true, message: ka.common.saved };
}

// ─────────────────────────────── Private chat access ───────────────────────────────

/** Admin access to a private conversation: requires a written reason; every grant is audited and expires. */
export async function grantConversationAccessAction(_: FormState, formData: FormData): Promise<FormState> {
  const admin = await assertAdmin();
  const conversationId = String(formData.get("conversationId") ?? "");
  const reason = String(formData.get("reason") ?? "").trim().slice(0, 1000);
  if (reason.length < 10) return fail(ka.validation.formErrors, formData, { reason: ka.admin.chatReasonShort });
  const exists = await db.conversation.findUnique({ where: { id: conversationId }, select: { id: true, subject: true } });
  if (!exists) return fail(ka.errors.generic);
  await audit({ actorId: admin.id, action: CHAT_ACCESS_ACTION, entityType: "Conversation", entityId: exists.id, metadata: { reason, subject: exists.subject } });
  revalidatePath(`/admin/conversations/${exists.id}`);
  return { ok: true, message: ka.admin.chatAccessGranted };
}

// ─────────────────────────────── Commissions ───────────────────────────────

const zPct = z
  .string()
  .optional()
  .transform((s) => (s ? s.replace(",", ".").trim() : ""))
  .refine((s) => s === "" || (Number.isFinite(Number(s)) && Number(s) >= 0 && Number(s) <= 100), { error: ka.validation.number })
  .transform((s) => (s === "" ? null : new Prisma.Decimal(s)));

/** Commission % and display text of an offer (used for deals started from it). */
export async function setOfferCommissionAction(formData: FormData) {
  const admin = await assertAdmin();
  const offerId = String(formData.get("offerId"));
  const pct = zPct.safeParse(formData.get("commissionPct") ?? "");
  if (!pct.success) return;
  const commissionText = String(formData.get("commissionText") ?? "").trim().slice(0, 80) || null;
  await db.offer.update({ where: { id: offerId }, data: { commissionPct: pct.data, commissionText } });
  await audit({ actorId: admin.id, action: "offer.commission_changed", entityType: "Offer", entityId: offerId, metadata: { pct: pct.data?.toString() ?? null, commissionText } });
  revalidatePath("/admin/offers");
}

/** Overrides the commission % of one deal. */
export async function setDealCommissionAction(formData: FormData) {
  const admin = await assertAdmin();
  const conversationId = String(formData.get("conversationId"));
  const pct = zPct.safeParse(formData.get("commissionPct") ?? "");
  if (!pct.success) return;
  await db.conversation.update({ where: { id: conversationId }, data: { commissionPct: pct.data } });
  await audit({ actorId: admin.id, action: "conversation.commission_changed", entityType: "Conversation", entityId: conversationId, metadata: { pct: pct.data?.toString() ?? null } });
  revalidatePath(`/admin/conversations/${conversationId}`);
}

/** Marks a confirmed commission as received. */
export async function settleCommissionAction(formData: FormData) {
  const admin = await assertAdmin();
  const id = String(formData.get("commissionId"));
  const r = await db.commission.updateMany({ where: { id, status: "CONFIRMED" }, data: { status: "SETTLED", settledAt: new Date() } });
  if (r.count) await audit({ actorId: admin.id, action: "commission.settled", entityType: "Commission", entityId: id });
  revalidatePath("/admin/commissions");
}

// ─────────────────────────────── Campaigns ───────────────────────────────

/**
 * Campaign workflow: review → approve (price) → mark paid & launch (delivers to the audience) → finish; or reject.
 */
export async function adminCampaignAction(_: FormState, formData: FormData): Promise<FormState> {
  const admin = await assertAdmin();
  const id = String(formData.get("requestId"));
  const op = z.enum(["review", "approve", "launch", "finish", "reject"]).parse(formData.get("op"));
  const adminNote = String(formData.get("adminNote") ?? "").trim().slice(0, 1000) || null;
  const req = await db.campaignRequest.findUnique({ where: { id } });
  if (!req) return fail(ka.errors.generic);
  const allowed: Record<typeof op, string[]> = {
    review: ["NEW"],
    approve: ["NEW", "IN_PROGRESS"],
    launch: ["APPROVED"],
    finish: ["RUNNING"],
    reject: ["NEW", "IN_PROGRESS", "APPROVED"],
  };
  if (!allowed[op].includes(req.status)) return fail(ka.admin.transitionNotAllowed, formData);
  if (op === "reject" && !adminNote) return fail(ka.validation.formErrors, formData, { adminNote: ka.validation.required });

  let price: Prisma.Decimal | null = req.price;
  if (op === "approve") {
    const raw = String(formData.get("price") ?? "").replace(/s/g, "").replace(",", ".");
    if (!raw || !Number.isFinite(Number(raw)) || Number(raw) < 0) return fail(ka.validation.formErrors, formData, { price: ka.validation.number });
    price = new Prisma.Decimal(raw);
  }
  const status = ({ review: "IN_PROGRESS", approve: "APPROVED", launch: "RUNNING", finish: "DONE", reject: "REJECTED" } as const)[op];
  const now = new Date();
  await db.campaignRequest.update({
    where: { id },
    data: {
      status,
      price,
      adminNote: adminNote ?? req.adminNote,
      ...(op === "launch" ? { paidAt: now, launchedAt: now } : {}),
      ...(op === "finish" ? { finishedAt: now } : {}),
    },
  });

  // Launch: deliver the offer to every company in the audience.
  let delivered = 0;
  if (op === "launch") {
    const targets = await db.company.findMany({ where: audienceWhere(req), select: { id: true, members: { where: { status: "ACTIVE" }, select: { userId: true, role: true, permissions: true } } } });
    await db.campaignRecipient.createMany({ data: targets.map((t) => ({ requestId: id, companyId: t.id })), skipDuplicates: true });
    const userIds = targets.flatMap((t) => t.members.filter((mm) => mm.role === "OWNER" || mm.permissions.includes("responses.manage")).map((mm) => mm.userId));
    const sender = await db.company.findUnique({ where: { id: req.companyId }, select: { legalName: true, tradeName: true } });
    await notify(userIds, { type: "CAMPAIGN", title: ka.sgba.campDeliveredTitle(sender ? companyName(sender) : "", req.title), body: req.perk ?? undefined, link: `/app/campaigns/inbox/${id}` });
    delivered = targets.length;
  }

  const owners = await db.companyMember.findMany({ where: { companyId: req.companyId, status: "ACTIVE", role: "OWNER" }, select: { userId: true } });
  await notify([...new Set([req.userId, ...owners.map((o) => o.userId)])], {
    type: "CAMPAIGN",
    title: ka.sgba.campStatusNotify(req.title, ka.sgba.campStatus[status]),
    body: op === "approve" && price ? ka.sgba.campPriceNotify(price.toFixed(2)) : (adminNote ?? undefined),
    link: `/app/campaigns/${id}`,
  });
  await audit({ actorId: admin.id, action: `campaign.${op}`, entityType: "CampaignRequest", entityId: id, metadata: { status, price: price?.toString() ?? null, delivered } });
  revalidatePath("/admin", "layout");
  return { ok: true, message: op === "launch" ? ka.sgba.campLaunched(delivered) : ka.common.saved };
}

const packageSchema = z.object({
  kind: zText(2, 60),
  title: zText(2, 120),
  audience: zText(2, 300),
  channels: zText(2, 200),
  priceFrom: z.coerce.number({ error: ka.validation.number }).min(0).max(1e9),
  accent: z.enum(["violet", "blue", "gold", "teal"]).default("blue"),
  sortOrder: z.coerce.number().int().min(0).max(9999).default(0),
  isActive: zCheckbox,
});

export async function saveCampaignPackageAction(_: FormState, formData: FormData): Promise<FormState> {
  const admin = await assertAdmin();
  const id = String(formData.get("id") ?? "") || null;
  const parsed = packageSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return invalid(parsed.error, formData);
  const saved = id ? await db.campaignPackage.update({ where: { id }, data: parsed.data }) : await db.campaignPackage.create({ data: parsed.data });
  await audit({ actorId: admin.id, action: id ? "campaign.package_updated" : "campaign.package_created", entityType: "CampaignPackage", entityId: saved.id });
  revalidatePath("/admin/campaigns");
  revalidatePath("/app/campaigns");
  return { ok: true, message: ka.common.saved };
}
