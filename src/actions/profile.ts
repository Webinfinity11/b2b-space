"use server";

import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { ka } from "@/i18n/ka";
import { audit } from "@/lib/audit";
import { assertUser } from "@/lib/authz";
import { db } from "@/lib/db";
import { fail, invalid, zOptionalPhone, zPassword, zText, type FormState } from "@/lib/forms";
import { rateLimit } from "@/lib/rate-limit";
import { destroyOtherSessions } from "@/lib/session";

export async function updateProfileAction(_: FormState, formData: FormData): Promise<FormState> {
  const user = await assertUser();
  const parsed = z.object({ firstName: zText(1, 60), lastName: zText(1, 60), phone: zOptionalPhone }).safeParse(Object.fromEntries(formData));
  if (!parsed.success) return invalid(parsed.error, formData);
  await db.user.update({ where: { id: user.id }, data: parsed.data });
  revalidatePath("/app", "layout");
  return { ok: true, message: ka.common.saved };
}

export async function changePasswordAction(_: FormState, formData: FormData): Promise<FormState> {
  const user = await assertUser();
  if (!rateLimit(`password:${user.id}`, 5, 15 * 60_000)) return fail(ka.auth.tooManyAttempts);
  const parsed = z
    .object({ currentPassword: z.string().min(1, { error: ka.validation.required }), newPassword: zPassword, passwordConfirm: z.string() })
    .refine((d) => d.newPassword === d.passwordConfirm, { path: ["passwordConfirm"], error: ka.validation.passwordMismatch })
    .safeParse(Object.fromEntries(formData));
  if (!parsed.success) return invalid(parsed.error, formData);

  const row = await db.user.findUniqueOrThrow({ where: { id: user.id }, select: { passwordHash: true } });
  if (!(await bcrypt.compare(parsed.data.currentPassword, row.passwordHash))) {
    return fail(ka.validation.formErrors, undefined, { currentPassword: ka.profile.wrongPassword });
  }
  await db.user.update({ where: { id: user.id }, data: { passwordHash: await bcrypt.hash(parsed.data.newPassword, 12) } });
  await destroyOtherSessions(user.id);
  await audit({ actorId: user.id, action: "auth.password_changed", entityType: "User", entityId: user.id });
  return { ok: true, message: ka.profile.passwordChanged };
}

export async function updateEmailPrefsAction(_: FormState, formData: FormData): Promise<FormState> {
  const user = await assertUser();
  const on = formData.get("emailNotifications") === "on";
  await db.user.update({ where: { id: user.id }, data: { emailNotifications: on } });
  revalidatePath("/app/profile");
  return { ok: true, message: ka.common.saved };
}
