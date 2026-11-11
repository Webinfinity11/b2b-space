"use server";

import { createHash, randomBytes } from "node:crypto";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { ka } from "@/i18n/ka";
import { Prisma } from "@/generated/prisma/client";
import { audit } from "@/lib/audit";
import { ForbiddenError, assertCompanyPermission } from "@/lib/authz";
import { db } from "@/lib/db";
import { fail, invalid, zCheckbox, zEmail, zOptionalPhone, zOptionalText, zOptionalUrl, zText, type FormState } from "@/lib/forms";
import { notify } from "@/lib/notify";
import { appUrl, emailEnabled, renderEmail, sendEmail } from "@/lib/email";
import { DEFAULT_PERMISSIONS, sanitizePermissions } from "@/lib/permissions";
import { IMAGE_TYPES, UploadError, deletePublicFile, filesFrom, storeFile } from "@/lib/storage";

const COUNTRY_CODES = Object.keys(ka.countries) as [string, ...string[]];

const legalSchema = z.object({
  legalName: zText(2, 200),
  registrationNumber: zText(3, 40),
  taxNumber: zOptionalText(40),
  country: z.enum(COUNTRY_CODES, { error: ka.validation.required }),
});

const profileSchema = z.object({
  tradeName: zOptionalText(200),
  city: zOptionalText(80),
  legalAddress: zText(3, 300),
  description: zOptionalText(1000),
  activities: zOptionalText(2000),
  customCategory: zOptionalText(80),
  website: zOptionalUrl,
  facebookUrl: zOptionalUrl,
  linkedinUrl: zOptionalUrl,
  instagramUrl: zOptionalUrl,
  contactPerson: zText(2, 120),
  contactEmail: zEmail,
  contactPhone: zOptionalPhone,
  businessRole: z.enum(["BUYER", "SELLER", "BOTH"]).default("BOTH"),
  size: z.enum(["SMALL", "MEDIUM", "LARGE"]).default("SMALL"),
  direction: zOptionalText(120),
});

async function parseCategories(formData: FormData): Promise<string[] | string> {
  const ids = [...new Set(formData.getAll("categoryIds").map(String))];
  const custom = String(formData.get("customCategory") ?? "").trim();
  if (ids.length === 0) return custom ? [] : ka.companyForm.chooseOrOther;
  if (ids.length > 5) return ka.companyForm.tooManyCategories;
  const valid = await db.category.count({ where: { id: { in: ids }, isActive: true } });
  return valid === ids.length ? ids : ka.validation.chooseCategory;
}

function uploadMessage(e: unknown, maxMb: number) {
  if (e instanceof UploadError) return e.code === "size" ? ka.validation.fileSize(maxMb) : ka.validation.fileType;
  throw e;
}


// ─────────────────────────────── Profile ───────────────────────────────

export async function updateCompanyProfileAction(_: FormState, formData: FormData): Promise<FormState> {
  const companyId = String(formData.get("companyId"));
  const { user } = await assertCompanyPermission(companyId, "company.edit");
  const company = await db.company.findUniqueOrThrow({ where: { id: companyId } });
  const raw = Object.fromEntries(formData);

  // Legal data is locked once verified — changes then go through the platform admin.
  const legalLocked = company.verificationStatus === "VERIFIED" || company.verificationStatus === "IN_REVIEW";
  const legal = legalLocked ? null : legalSchema.safeParse(raw);
  const profile = profileSchema.safeParse(raw);
  const cats = await parseCategories(formData);
  if ((legal && !legal.success) || !profile.success || typeof cats === "string") {
    const errors = {
      ...(legal && !legal.success ? Object.fromEntries(legal.error.issues.map((i) => [String(i.path[0]), i.message])) : {}),
      ...(profile.success ? {} : Object.fromEntries(profile.error.issues.map((i) => [String(i.path[0]), i.message]))),
      ...(typeof cats === "string" ? { categoryIds: cats } : {}),
    };
    return fail(ka.validation.formErrors, formData, errors);
  }

  const images: { logoUrl?: string } = {};
  try {
    const [logo] = filesFrom(formData, "logo");
    if (logo) images.logoUrl = (await storeFile(logo, { visibility: "public", folder: "logos", allowed: IMAGE_TYPES, maxMb: 5 })).url!;
  } catch (e) {
    return fail(uploadMessage(e, 5), formData);
  }

  try {
    await db.$transaction([
      db.company.update({
        where: { id: companyId },
        data: { ...(legal?.success ? legal.data : {}), ...profile.data, ...images },
      }),
      db.companyCategory.deleteMany({ where: { companyId } }),
      db.companyCategory.createMany({ data: cats.map((categoryId) => ({ companyId, categoryId })) }),
    ]);
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      return fail(ka.validation.formErrors, formData, { registrationNumber: ka.companyForm.duplicate });
    }
    throw e;
  }
  if (images.logoUrl) await deletePublicFile(company.logoUrl);
  await audit({ actorId: user.id, action: "company.updated", entityType: "Company", entityId: companyId });
  revalidatePath("/company", "layout");
  revalidatePath(`/companies/${company.slug}`);
  return { ok: true, message: ka.common.saved };
}

export async function updateCompanySettingsAction(_: FormState, formData: FormData): Promise<FormState> {
  const companyId = String(formData.get("companyId"));
  const { user } = await assertCompanyPermission(companyId, "owner");
  const data = z.object({ showEmailPublicly: zCheckbox, showPhonePublicly: zCheckbox }).parse(Object.fromEntries(formData));
  const company = await db.company.update({ where: { id: companyId }, data });
  await audit({ actorId: user.id, action: "company.updated", entityType: "Company", entityId: companyId, metadata: data });
  revalidatePath(`/companies/${company.slug}`);
  return { ok: true, message: ka.common.saved };
}

// ─────────────────────────────── Team ───────────────────────────────

export async function addMemberAction(_: FormState, formData: FormData): Promise<FormState> {
  const companyId = String(formData.get("companyId"));
  const { user } = await assertCompanyPermission(companyId, "owner");
  const parsed = z
    .object({ email: zEmail, role: z.enum(["OWNER", "EMPLOYEE", "FINANCE"], { error: ka.validation.required }) })
    .safeParse(Object.fromEntries(formData));
  if (!parsed.success) return invalid(parsed.error, formData);
  // No manual selection → permissions follow the chosen role.
  const picked = sanitizePermissions(formData.getAll("permissions").map(String));
  const permissions = parsed.data.role === "OWNER" || picked.length === 0 ? DEFAULT_PERMISSIONS[parsed.data.role] : picked;

  const target = await db.user.findUnique({ where: { email: parsed.data.email }, select: { id: true } });
  if (!target) {
    // Not registered yet → keep a pending invitation; it is applied automatically on registration.
    const pending = await db.companyInvitation.findFirst({
      where: { companyId, email: parsed.data.email, acceptedAt: null, revokedAt: null },
    });
    const expiresAt = new Date(Date.now() + 30 * 864e5);
    // The link carries a one-time secret; only its hash is stored. Re-inviting issues a fresh link.
    const token = randomBytes(24).toString("base64url");
    const tokenHash = createHash("sha256").update(token).digest("hex");
    if (pending) {
      await db.companyInvitation.update({ where: { id: pending.id }, data: { role: parsed.data.role, permissions, expiresAt, tokenHash } });
    } else {
      await db.companyInvitation.create({
        data: {
          companyId,
          email: parsed.data.email,
          role: parsed.data.role,
          permissions,
          invitedById: user.id,
          expiresAt,
          tokenHash,
        },
      });
    }
    // Email the invitation with the employee registration link.
    const path = `/register?invite=${token}`;
    const link = `${appUrl()}${path}`;
    if (emailEnabled()) {
      const inviter = await db.company.findUniqueOrThrow({ where: { id: companyId }, select: { legalName: true, tradeName: true } });
      const name = inviter.tradeName || inviter.legalName;
      const { html, text } = renderEmail({ title: ka.sgba.inviteEmailTitle(name), body: ka.sgba.inviteEmailBody(name, parsed.data.email), link: path, button: ka.sgba.inviteEmailButton, footer: ka.email.footer });
      await sendEmail({ to: parsed.data.email, subject: ka.sgba.inviteEmailTitle(name), html, text });
    }
    await audit({ actorId: user.id, action: "company.member_invited", entityType: "Company", entityId: companyId, metadata: { email: parsed.data.email, role: parsed.data.role } });
    revalidatePath("/company/team");
    return { ok: true, message: `${ka.team.invited(parsed.data.email)} ${ka.sgba.inviteLinkNote(link)}` };
  }
  const existing = await db.companyMember.findUnique({ where: { companyId_userId: { companyId, userId: target.id } } });
  if (existing?.status === "ACTIVE") return fail(ka.validation.formErrors, formData, { email: ka.team.alreadyMember });

  await db.companyMember.upsert({
    where: { companyId_userId: { companyId, userId: target.id } },
    create: { companyId, userId: target.id, role: parsed.data.role, permissions },
    update: { role: parsed.data.role, permissions, status: "ACTIVE" },
  });
  const company = await db.company.findUniqueOrThrow({ where: { id: companyId }, select: { legalName: true, tradeName: true } });
  await notify([target.id], { type: "MEMBER_INVITED", title: ka.notifications.memberAdded(company.tradeName || company.legalName), link: "/company" });
  await audit({
    actorId: user.id,
    action: "company.member_added",
    entityType: "Company",
    entityId: companyId,
    metadata: { userId: target.id, role: parsed.data.role, permissions },
  });
  revalidatePath("/company/team");
  return { ok: true, message: ka.team.added };
}

async function ownerCount(companyId: string) {
  return db.companyMember.count({ where: { companyId, role: "OWNER", status: "ACTIVE" } });
}

export async function updateMemberAction(_: FormState, formData: FormData): Promise<FormState> {
  const memberId = String(formData.get("memberId"));
  const member = await db.companyMember.findUnique({ where: { id: memberId } });
  if (!member) throw new ForbiddenError();
  const { user } = await assertCompanyPermission(member.companyId, "owner");
  const roleParsed = z.enum(["OWNER", "EMPLOYEE", "FINANCE"]).safeParse(formData.get("role"));
  if (!roleParsed.success) return fail(ka.validation.formErrors, formData, { role: ka.validation.required });
  const role = roleParsed.data;
  if (member.role === "OWNER" && role !== "OWNER" && (await ownerCount(member.companyId)) <= 1) {
    return fail(ka.team.cannotRemoveOwner);
  }
  const picked = sanitizePermissions(formData.getAll("permissions").map(String));
  const permissions = role === "OWNER" || picked.length === 0 ? DEFAULT_PERMISSIONS[role] : picked;
  await db.companyMember.update({ where: { id: memberId }, data: { role, permissions } });
  await audit({
    actorId: user.id,
    action: "company.member_updated",
    entityType: "Company",
    entityId: member.companyId,
    metadata: { memberId, role, permissions },
  });
  revalidatePath("/company/team");
  return { ok: true, message: ka.team.updated };
}

export async function removeMemberAction(_: FormState, formData: FormData): Promise<FormState> {
  const memberId = String(formData.get("memberId"));
  const member = await db.companyMember.findUnique({ where: { id: memberId } });
  if (!member) throw new ForbiddenError();
  const { user } = await assertCompanyPermission(member.companyId, "owner");
  if (member.role === "OWNER" && (await ownerCount(member.companyId)) <= 1) return fail(ka.team.cannotRemoveOwner);
  await db.companyMember.update({ where: { id: memberId }, data: { status: "REMOVED" } });
  await audit({ actorId: user.id, action: "company.member_removed", entityType: "Company", entityId: member.companyId, metadata: { memberId } });
  revalidatePath("/company/team");
  return { ok: true, message: ka.team.removed };
}

export async function revokeInvitationAction(formData: FormData) {
  const inv = await db.companyInvitation.findUnique({ where: { id: String(formData.get("invitationId")) } });
  if (!inv) return;
  const { user } = await assertCompanyPermission(inv.companyId, "owner");
  await db.companyInvitation.update({ where: { id: inv.id }, data: { revokedAt: new Date() } });
  await audit({ actorId: user.id, action: "company.invitation_revoked", entityType: "Company", entityId: inv.companyId, metadata: { email: inv.email } });
  revalidatePath("/company/team");
}
