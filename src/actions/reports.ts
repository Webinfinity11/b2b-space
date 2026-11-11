"use server";

import { z } from "zod";
import { ka } from "@/i18n/ka";
import { audit } from "@/lib/audit";
import { assertUser, getActiveMembership } from "@/lib/authz";
import { db } from "@/lib/db";
import { fail, type FormState } from "@/lib/forms";
import { notify } from "@/lib/notify";
import { rateLimit } from "@/lib/rate-limit";
import { visibleConversations } from "@/lib/scope";

/**
 * "საჩივარი": any member can report an offer, a company or a chat message. It lands in the
 * admin queue (/admin/reports); admins are notified.
 */
export async function createReportAction(_: FormState, formData: FormData): Promise<FormState> {
  const user = await assertUser();
  const parsed = z
    .object({ targetType: z.enum(["OFFER", "COMPANY", "MESSAGE"]), targetId: z.string().min(1).max(60), reason: z.string().trim().min(10, { error: ka.reports.reasonShort }).max(2000) })
    .safeParse(Object.fromEntries(formData));
  if (!parsed.success) return fail(ka.validation.formErrors, formData, Object.fromEntries(parsed.error.issues.map((i) => [String(i.path[0]), i.message])));
  if (!rateLimit(`report:${user.id}`, 10, 60 * 60_000)) return fail(ka.auth.tooManyAttempts, formData);
  const { targetType, targetId, reason } = parsed.data;

  // The target must exist and be visible to the reporter.
  if (targetType === "OFFER" && !(await db.offer.findUnique({ where: { id: targetId }, select: { id: true } }))) return fail(ka.errors.generic);
  if (targetType === "COMPANY" && !(await db.company.findUnique({ where: { id: targetId }, select: { id: true } }))) return fail(ka.errors.generic);
  if (targetType === "MESSAGE") {
    const m = await getActiveMembership(user.id);
    const msg = await db.message.findFirst({ where: { id: targetId, conversation: visibleConversations(user.id, m) }, select: { id: true } });
    if (!msg) return fail(ka.errors.generic);
  }
  const open = await db.report.findFirst({ where: { reporterId: user.id, targetType, targetId, status: { in: ["OPEN", "IN_REVIEW"] } }, select: { id: true } });
  if (open) return { ok: true, message: ka.reports.already };

  const report = await db.report.create({ data: { reporterId: user.id, targetType, targetId, reason } });
  const admins = await db.user.findMany({ where: { platformRole: "ADMIN", status: "ACTIVE" }, select: { id: true } });
  await notify(admins.map((a) => a.id), { type: "COMPANY_STATUS_CHANGED", title: ka.reports.newNotify(ka.reports.target[targetType]), link: "/admin/reports" });
  await audit({ actorId: user.id, action: "report.created", entityType: "Report", entityId: report.id, metadata: { targetType, targetId } });
  return { ok: true, message: ka.reports.sent };
}
