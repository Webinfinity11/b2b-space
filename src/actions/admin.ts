"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { ka } from "@/i18n/ka";
import { Prisma } from "@/generated/prisma/client";
import { audit } from "@/lib/audit";
import { assertAdmin } from "@/lib/authz";
import { db } from "@/lib/db";
import { fail, invalid, zCheckbox, zText, type FormState } from "@/lib/forms";
import { notify } from "@/lib/notify";
import { slugify } from "@/lib/slug";

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
      link: "/company/verification",
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
  const status = z.enum(["ACTIVE", "SUSPENDED"]).parse(formData.get("status"));
  if (userId === admin.id) return;
  await db.user.update({ where: { id: userId }, data: { status } });
  if (status === "SUSPENDED") await db.session.deleteMany({ where: { userId } });
  await audit({ actorId: admin.id, action: "user.status_changed", entityType: "User", entityId: userId, metadata: { status } });
  revalidatePath("/admin/users");
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

export async function adminArchiveOfferAction(formData: FormData) {
  const admin = await assertAdmin();
  const id = String(formData.get("offerId"));
  const offer = await db.offer.update({ where: { id }, data: { status: "ARCHIVED" } });
  await audit({ actorId: admin.id, action: "offer.admin_archived", entityType: "Offer", entityId: offer.id });
  revalidatePath("/admin/offers");
  revalidatePath("/offers");
}
