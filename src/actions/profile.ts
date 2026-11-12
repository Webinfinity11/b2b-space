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
import { NOTIFY_TOPICS } from "@/lib/notify-topics";
import { IMAGE_TYPES, UploadError, deletePublicFile, filesFrom, storeFile } from "@/lib/storage";

export async function updateProfileAction(_: FormState, formData: FormData): Promise<FormState> {
  const user = await assertUser();
  const parsed = z.object({ firstName: zText(1, 60), lastName: zText(1, 60), phone: zOptionalPhone }).safeParse(Object.fromEntries(formData));
  if (!parsed.success) return invalid(parsed.error, formData);
  let avatarUrl: string | undefined;
  const [avatar] = filesFrom(formData, "avatar");
  if (avatar) {
    try {
      avatarUrl = (await storeFile(avatar, { visibility: "public", folder: "avatars", allowed: IMAGE_TYPES, maxMb: 3 })).url!;
    } catch (e) {
      if (e instanceof UploadError) return fail(ka.validation.formErrors, formData, { avatar: e.code === "size" ? ka.validation.fileSize(3) : ka.validation.fileType });
      throw e;
    }
  }
  const removeAvatar = formData.get("removeAvatar") === "on";
  const before = await db.user.findUnique({ where: { id: user.id }, select: { avatarUrl: true } });
  await db.user.update({ where: { id: user.id }, data: { ...parsed.data, ...(avatarUrl ? { avatarUrl } : removeAvatar ? { avatarUrl: null } : {}) } });
  if ((avatarUrl || removeAvatar) && before?.avatarUrl) await deletePublicFile(before.avatarUrl);
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
  // Checked topics stay on; unchecked ones are muted.
  const enabled = formData.getAll("topics").map(String);
  const mutedTopics = NOTIFY_TOPICS.filter((t) => !enabled.includes(t));
  await db.user.update({ where: { id: user.id }, data: { emailNotifications: on, mutedTopics } });
  revalidatePath("/app/profile");
  return { ok: true, message: ka.common.saved };
}
