"use server";

import bcrypt from "bcryptjs";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { ka } from "@/i18n/ka";
import { audit, clientIp } from "@/lib/audit";
import { db } from "@/lib/db";
import { fail, invalid, zCheckbox, zEmail, zPassword, zPhone, zText, type FormState } from "@/lib/forms";
import { notify } from "@/lib/notify";
import { rateLimit } from "@/lib/rate-limit";
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

export async function registerAction(_: FormState, formData: FormData): Promise<FormState> {
  const ip = (await clientIp()) ?? "unknown";
  if (!rateLimit(`register:${ip}`, 5, 15 * 60_000)) return fail(ka.auth.tooManyAttempts, formData);

  const parsed = registerSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return invalid(parsed.error, formData);
  const d = parsed.data;

  const exists = await db.user.findUnique({ where: { email: d.email }, select: { id: true } });
  if (exists) return fail(ka.validation.formErrors, formData, { email: ka.auth.emailTaken });

  const user = await db.user.create({
    data: {
      firstName: d.firstName,
      lastName: d.lastName,
      email: d.email,
      phone: d.phone,
      passwordHash: await bcrypt.hash(d.password, 12),
    },
  });
  await audit({ actorId: user.id, action: "auth.register", entityType: "User", entityId: user.id });

  // Pending company invitations for this email become memberships right away.
  const invitations = await db.companyInvitation.findMany({
    where: { email: d.email, acceptedAt: null, revokedAt: null, expiresAt: { gt: new Date() } },
    include: { company: { select: { legalName: true, tradeName: true } } },
  });
  for (const inv of invitations) {
    await db.$transaction([
      db.companyMember.upsert({
        where: { companyId_userId: { companyId: inv.companyId, userId: user.id } },
        create: { companyId: inv.companyId, userId: user.id, role: inv.role, permissions: inv.permissions },
        update: { role: inv.role, permissions: inv.permissions, status: "ACTIVE" },
      }),
      db.companyInvitation.update({ where: { id: inv.id }, data: { acceptedAt: new Date() } }),
    ]);
    await notify([user.id], { type: "MEMBER_INVITED", title: ka.notifications.memberAdded(inv.company.tradeName || inv.company.legalName), link: "/company" });
    await audit({ actorId: user.id, action: "company.invitation_accepted", entityType: "Company", entityId: inv.companyId, metadata: { invitationId: inv.id } });
  }
  const h = await headers();
  await createSession(user.id, { ip, userAgent: h.get("user-agent") });
  redirect(safeNext(formData.get("next")) ?? "/app");
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
  if (!user || !ok) {
    if (user) await audit({ actorId: user.id, action: "auth.login_failed", entityType: "User", entityId: user.id });
    return fail(ka.auth.invalidCredentials, formData);
  }
  if (user.status !== "ACTIVE") return fail(ka.auth.suspended, formData);

  const h = await headers();
  await createSession(user.id, { ip, userAgent: h.get("user-agent") });
  await db.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
  await audit({ actorId: user.id, action: "auth.login", entityType: "User", entityId: user.id });

  const fallback = user.platformRole === "ADMIN" ? "/admin" : "/app";
  redirect(safeNext(formData.get("next")) ?? fallback);
}

export async function logoutAction() {
  await destroySession();
  redirect("/");
}
