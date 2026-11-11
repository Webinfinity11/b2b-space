"use server";

import bcrypt from "bcryptjs";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { ka } from "@/i18n/ka";
import { audit, clientIp } from "@/lib/audit";
import { db } from "@/lib/db";
import { fail, invalid, zCheckbox, zEmail, zOptionalText, zPassword, zPhone, zText, type FormState } from "@/lib/forms";
import { DEFAULT_PERMISSIONS } from "@/lib/permissions";
import { slugify } from "@/lib/slug";
import { notify } from "@/lib/notify";
import { emailEnabled, renderEmail, sendEmail } from "@/lib/email";
import { rateLimit } from "@/lib/rate-limit";
import { RESET_HOURS, createResetLink, findReset } from "@/lib/password-reset";
import { createSession, destroySession } from "@/lib/session";

/** Only same-site relative paths are allowed as post-login targets. */
function safeNext(next: FormDataEntryValue | null): string | null {
  if (typeof next !== "string") return null;
  return next.startsWith("/") && !next.startsWith("//") && !next.startsWith("/\\") ? next : null;
}

const registerSchema = z
  .object({
    firstName: zText(1, 60),
    lastName: zText(1, 60),
    email: zEmail,
    phone: zPhone,
    password: zPassword,
    passwordConfirm: z.string(),
    acceptTerms: zCheckbox.refine((v) => v, { error: ka.validation.acceptTerms }),
  })
  .refine((d) => d.password === d.passwordConfirm, { path: ["passwordConfirm"], error: ka.validation.passwordMismatch });

const companySchema = z.object({
  legalName: zText(2, 200),
  registrationNumber: zText(3, 40),
  categoryId: z.string({ error: ka.validation.chooseCategory }).min(1, { error: ka.validation.chooseCategory }),
  city: zText(2, 80),
  businessRole: z.enum(["BUYER", "SELLER", "BOTH"]),
  size: z.enum(["SMALL", "MEDIUM", "LARGE"]),
  direction: zOptionalText(120),
  legalAddress: zOptionalText(300),
});

const errorsOf = (e: z.ZodError) => Object.fromEntries(e.issues.map((i) => [String(i.path[0]), i.message]));

/**
 * Registration is for companies only: the owner account and the company are created together and
 * both wait for an administrator's approval. Invited employees (mode=invited) join their already
 * approved company right away.
 */
export async function registerAction(_: FormState, formData: FormData): Promise<FormState> {
  const ip = (await clientIp()) ?? "unknown";
  const invitedMode = formData.get("mode") === "invited";

  const raw = Object.fromEntries(formData);
  const parsed = registerSchema.safeParse(raw);
  const company = invitedMode ? null : companySchema.safeParse(raw);
  if (!parsed.success || (company && !company.success)) {
    const errors = { ...(parsed.success ? {} : errorsOf(parsed.error)), ...(company && !company.success ? errorsOf(company.error) : {}) };
    return fail(ka.validation.formErrors, formData, errors);
  }
  // Only well-formed submissions count towards the limit (typos in the form do not lock people out).
  if (!rateLimit(`register:${ip}`, 10, 15 * 60_000)) return fail(ka.auth.tooManyAttempts, formData);
  const d = parsed.data;

  const exists = await db.user.findUnique({ where: { email: d.email }, select: { id: true } });
  if (exists) return fail(ka.validation.formErrors, formData, { email: ka.auth.emailTaken });

  // Pending invitations for this email are applied on registration — with or without the link.
  const invitations = await db.companyInvitation.findMany({
    where: { email: d.email, acceptedAt: null, revokedAt: null, expiresAt: { gt: new Date() } },
    include: { company: { select: { legalName: true, tradeName: true } } },
  });
  if (invitedMode && invitations.length === 0) return fail(ka.sgba.noInvitation, formData);

  const passwordHash = await bcrypt.hash(d.password, 12);
  const userData = { firstName: d.firstName, lastName: d.lastName, email: d.email, phone: d.phone, passwordHash };

  if (company?.success) {
    const c = company.data;
    const category = await db.category.findFirst({ where: { id: c.categoryId, kind: "INDUSTRY", isActive: true }, select: { id: true } });
    if (!category) return fail(ka.validation.formErrors, formData, { categoryId: ka.validation.chooseCategory });
    const dup = await db.company.findUnique({ where: { country_registrationNumber: { country: "GE", registrationNumber: c.registrationNumber } }, select: { id: true } });
    if (dup) return fail(ka.validation.formErrors, formData, { registrationNumber: ka.companyForm.duplicate });

    const slug = await uniqueCompanySlug(c.legalName);
    const user = await db.$transaction(async (tx) => {
      const u = await tx.user.create({ data: { ...userData, status: "PENDING" } });
      await tx.company.create({
        data: {
          slug,
          legalName: c.legalName,
          registrationNumber: c.registrationNumber,
          country: "GE",
          city: c.city,
          legalAddress: c.legalAddress ?? "",
          businessRole: c.businessRole,
          size: c.size,
          direction: c.direction,
          contactPerson: `${d.firstName} ${d.lastName}`,
          contactEmail: d.email,
          contactPhone: d.phone,
          verificationStatus: "IN_REVIEW",
          createdById: u.id,
          categories: { create: [{ categoryId: c.categoryId }] },
          members: { create: { userId: u.id, role: "OWNER", permissions: DEFAULT_PERMISSIONS.OWNER } },
        },
      });
      return u;
    });
    await audit({ actorId: user.id, action: "auth.register", entityType: "User", entityId: user.id, metadata: { company: c.legalName } });
    // Invited elsewhere too? Those memberships are ready once the account is approved.
    await applyInvitations(user.id, `${d.firstName} ${d.lastName}`, invitations);
    await notifyAdminsOfRegistration(`${c.legalName} — ${d.firstName} ${d.lastName}`, d.email);
    redirect("/login?registered=1");
  }

  // Invited employee: active right away, joins the inviting companies.
  const user = await db.user.create({ data: { ...userData, status: "ACTIVE" } });
  await audit({ actorId: user.id, action: "auth.register", entityType: "User", entityId: user.id, metadata: { invited: true } });
  await applyInvitations(user.id, `${d.firstName} ${d.lastName}`, invitations);
  const h = await headers();
  await createSession(user.id, { ip, userAgent: h.get("user-agent") });
  redirect("/app");
}

async function uniqueCompanySlug(base: string) {
  const root = slugify(base) || "company";
  for (let i = 0; i < 50; i++) {
    const slug = i === 0 ? root : `${root}-${i + 1}`;
    if (!(await db.company.findUnique({ where: { slug }, select: { id: true } }))) return slug;
  }
  return `${root}-${Date.now().toString(36)}`;
}

/** Emails platform admins that a new account is waiting for approval. */
async function notifyAdminsOfRegistration(name: string, email: string) {
  if (!emailEnabled()) return;
  const admins = await db.user.findMany({ where: { platformRole: "ADMIN", status: "ACTIVE" }, select: { email: true } });
  const { html, text } = renderEmail({
    title: ka.approval.adminEmailTitle,
    body: `${name} · ${email}`,
    link: "/admin/users?status=PENDING",
    button: ka.email.open,
    footer: ka.email.footer,
  });
  await Promise.allSettled(admins.map((a) => sendEmail({ to: a.email, subject: ka.approval.adminEmailTitle, html, text })));
}

// Email for regular users; the platform admin may use a plain login name (ADMIN_EMAIL).
const loginSchema = z.object({
  email: z.string({ error: ka.validation.required }).trim().toLowerCase().min(1, { error: ka.validation.required }).max(200),
  password: z.string().min(1, { error: ka.validation.required }),
});

// Pre-computed hash so unknown emails take the same time as wrong passwords.
const DUMMY_HASH = bcrypt.hashSync("dummy-password-for-timing", 12);

export async function loginAction(_: FormState, formData: FormData): Promise<FormState> {
  const ip = (await clientIp()) ?? "unknown";
  const parsed = loginSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return invalid(parsed.error, formData);
  const { email, password } = parsed.data;

  if (!rateLimit(`login:ip:${ip}`, 20, 15 * 60_000) || !rateLimit(`login:email:${email}`, 8, 15 * 60_000)) {
    return fail(ka.auth.tooManyAttempts, formData);
  }

  const user = await db.user.findUnique({ where: { email } });
  const ok = await bcrypt.compare(password, user?.passwordHash ?? DUMMY_HASH);
  // Admin login form: only platform admins may sign in there
  const adminForm = formData.get("admin") === "1";
  if (!user || !ok || (adminForm && user.platformRole !== "ADMIN")) {
    if (user) await audit({ actorId: user.id, action: "auth.login_failed", entityType: "User", entityId: user.id });
    return fail(ka.auth.invalidCredentials, formData);
  }
  if (user.status === "PENDING") return fail(ka.auth.pendingApproval, formData);
  if (user.status === "REJECTED") return fail(ka.auth.rejectedAccount, formData);
  if (user.status !== "ACTIVE") return fail(ka.auth.suspended, formData);

  const h = await headers();
  await createSession(user.id, { ip, userAgent: h.get("user-agent") });
  await db.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
  await audit({ actorId: user.id, action: "auth.login", entityType: "User", entityId: user.id });

  const fallback = user.platformRole === "ADMIN" ? "/admin" : "/app";
  redirect(adminForm ? "/admin" : (safeNext(formData.get("next")) ?? fallback));
}

export async function logoutAction() {
  await destroySession();
  redirect("/");
}

// ─────────────────────────────── Password reset ───────────────────────────────

/** "Forgot password": emails a one-time link. Same answer whether or not the email exists. */
export async function requestPasswordResetAction(_: FormState, formData: FormData): Promise<FormState> {
  const ip = (await clientIp()) ?? "unknown";
  const parsed = z.object({ email: zEmail }).safeParse(Object.fromEntries(formData));
  if (!parsed.success) return invalid(parsed.error, formData);
  if (!rateLimit(`reset:ip:${ip}`, 10, 60 * 60_000) || !rateLimit(`reset:email:${parsed.data.email}`, 3, 60 * 60_000)) {
    return fail(ka.auth.tooManyAttempts, formData);
  }
  const user = await db.user.findUnique({ where: { email: parsed.data.email }, select: { id: true, email: true, firstName: true, status: true } });
  if (user && user.status === "ACTIVE") {
    const path = await createResetLink(user.id);
    await audit({ actorId: user.id, action: "auth.password_reset_requested", entityType: "User", entityId: user.id });
    if (emailEnabled()) {
      const { html, text } = renderEmail({ title: ka.reset.emailTitle, body: ka.reset.emailBody(user.firstName, RESET_HOURS), link: path, button: ka.reset.emailButton, footer: ka.email.footer });
      await sendEmail({ to: user.email, subject: ka.reset.emailTitle, html, text });
    }
  }
  return { ok: true, message: ka.reset.sent };
}

/** Sets a new password from a reset link; signs out every session of that user. */
export async function resetPasswordAction(_: FormState, formData: FormData): Promise<FormState> {
  const token = String(formData.get("token") ?? "");
  const parsed = z
    .object({ password: zPassword, passwordConfirm: z.string() })
    .refine((d) => d.password === d.passwordConfirm, { path: ["passwordConfirm"], error: ka.validation.passwordMismatch })
    .safeParse(Object.fromEntries(formData));
  if (!parsed.success) return invalid(parsed.error, formData);
  const reset = await findReset(token);
  if (!reset || reset.user.status !== "ACTIVE") return fail(ka.reset.invalid);
  const done = await db.passwordReset.updateMany({ where: { id: reset.id, usedAt: null }, data: { usedAt: new Date() } });
  if (!done.count) return fail(ka.reset.invalid);
  await db.$transaction([
    db.user.update({ where: { id: reset.user.id }, data: { passwordHash: await bcrypt.hash(parsed.data.password, 12) } }),
    db.session.deleteMany({ where: { userId: reset.user.id } }),
  ]);
  await audit({ actorId: reset.user.id, action: "auth.password_reset", entityType: "User", entityId: reset.user.id });
  redirect("/login?reset=1");
}

type PendingInvitation = {
  id: string;
  companyId: string;
  role: "OWNER" | "EMPLOYEE" | "FINANCE";
  permissions: string[];
  positionId: string | null;
  departmentId: string | null;
  company: { legalName: string; tradeName: string | null };
};

/** Turns pending invitations into memberships (with the role and job data the owner chose); the link stops working. */
async function applyInvitations(userId: string, name: string, invitations: PendingInvitation[]) {
  for (const inv of invitations) {
    const job = { role: inv.role, permissions: inv.permissions, positionId: inv.positionId, departmentId: inv.departmentId };
    await db.$transaction([
      db.companyMember.upsert({
        where: { companyId_userId: { companyId: inv.companyId, userId } },
        create: { companyId: inv.companyId, userId, ...job },
        update: { ...job, status: "ACTIVE" },
      }),
      db.companyInvitation.update({ where: { id: inv.id }, data: { acceptedAt: new Date(), token: null } }),
    ]);
    await notify([userId], { type: "MEMBER_INVITED", title: ka.notifications.memberAdded(inv.company.tradeName || inv.company.legalName), link: "/company" });
    const owners = await db.companyMember.findMany({ where: { companyId: inv.companyId, role: "OWNER", status: "ACTIVE", NOT: { userId } }, select: { userId: true } });
    await notify(owners.map((o) => o.userId), { type: "MEMBER_INVITED", title: ka.team.inviteAccepted(name), link: "/company/team" });
    await audit({ actorId: userId, action: "company.invitation_accepted", entityType: "Company", entityId: inv.companyId, metadata: { invitationId: inv.id } });
  }
}
