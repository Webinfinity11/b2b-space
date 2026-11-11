"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { ka } from "@/i18n/ka";
import { audit } from "@/lib/audit";
import { ForbiddenError, assertUser, getActiveMembership } from "@/lib/authz";
import { db } from "@/lib/db";
import { openDirectConversation } from "@/lib/direct-chat";
import { fail, invalid, zOptionalText, zOptionalUrl, zText, type FormState } from "@/lib/forms";
import { companyCanAct } from "@/lib/company-policy";
import { notify } from "@/lib/notify";
import { hasPermission } from "@/lib/permissions";
import { rateLimit } from "@/lib/rate-limit";
import { DOCUMENT_TYPES, UploadError, filesFrom, storeFile } from "@/lib/storage";

const c = ka.sgba;

const schema = z.object({
  title: zText(3, 120),
  message: zText(10, 3000),
  perk: zOptionalText(80),
  ctaUrl: zOptionalUrl,
  positions: zOptionalText(200),
  startDate: z
    .string()
    .optional()
    .transform((s) => (s ? new Date(`${s}T10:00:00+04:00`) : null))
    .refine((d) => !d || !Number.isNaN(d.getTime()), { error: ka.validation.required }),
});

/** Campaign application form (package or custom): audience filters + the offer that will be delivered. */
export async function requestCampaignAction(_: FormState, formData: FormData): Promise<FormState> {
  const user = await assertUser();
  const m = await getActiveMembership(user.id);
  // Running a paid campaign is a company decision: owners and members who manage offers.
  if (!m || !hasPermission(m, "offers.manage") || !companyCanAct(m.company.verificationStatus)) throw new ForbiddenError();
  if (!rateLimit(`campaign:${user.id}`, 20, 60 * 60_000)) return fail(ka.auth.tooManyAttempts, formData);

  const parsed = schema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return invalid(parsed.error, formData);
  const packageId = String(formData.get("packageId") ?? "") || null;
  if (packageId && !(await db.campaignPackage.findFirst({ where: { id: packageId, isActive: true }, select: { id: true } }))) return fail(ka.errors.generic);

  const list = (k: string, allowed?: string[]) => [...new Set(formData.getAll(k).map(String))].filter((v) => v && (!allowed || allowed.includes(v)));
  const industryIds = list("industryIds");
  if (industryIds.length && (await db.category.count({ where: { id: { in: industryIds }, kind: "INDUSTRY" } })) !== industryIds.length) return fail(ka.errors.generic);

  let file: { url: string; name: string } | null = null;
  const [upload] = filesFrom(formData, "file");
  if (upload) {
    try {
      const stored = await storeFile(upload, { visibility: "public", folder: "campaigns", allowed: DOCUMENT_TYPES, maxMb: 10 });
      file = { url: stored.url!, name: stored.fileName };
    } catch (e) {
      if (e instanceof UploadError) return fail(ka.validation.formErrors, formData, { file: e.code === "size" ? ka.validation.fileSize(10) : ka.validation.fileType });
      throw e;
    }
  }

  const d = parsed.data;
  const req = await db.campaignRequest.create({
    data: {
      packageId,
      companyId: m.companyId,
      userId: user.id,
      title: d.title,
      message: d.message,
      perk: d.perk,
      ctaUrl: d.ctaUrl,
      positions: d.positions,
      startDate: d.startDate,
      industryIds,
      cities: list("cities"),
      sizes: list("sizes", ["SMALL", "MEDIUM", "LARGE"]),
      roles: list("roles", ["BUYER", "SELLER", "BOTH"]),
      fileUrl: file?.url,
      fileName: file?.name,
    },
  });
  await audit({ actorId: user.id, action: "campaign.requested", entityType: "CampaignRequest", entityId: req.id, metadata: { packageId, title: d.title } });
  redirect(`/app/campaigns/${req.id}?sent=1`);
}

/** The requester withdraws an application that has not been approved yet. */
export async function cancelCampaignAction(formData: FormData) {
  const user = await assertUser();
  const m = await getActiveMembership(user.id);
  if (!m || !hasPermission(m, "offers.manage")) throw new ForbiddenError();
  const id = String(formData.get("requestId"));
  const r = await db.campaignRequest.updateMany({
    where: { id, companyId: m?.companyId ?? "__none__", status: { in: ["NEW", "IN_PROGRESS"] } },
    data: { status: "REJECTED", adminNote: c.campCancelledByUser },
  });
  if (!r.count) throw new ForbiddenError();
  await audit({ actorId: user.id, action: "campaign.cancelled", entityType: "CampaignRequest", entityId: id });
  revalidatePath(`/app/campaigns/${id}`);
  revalidatePath("/app/campaigns");
  revalidatePath("/admin/campaigns");
}

/** A recipient answers a campaign: opens a negotiation with the campaign's company. */
export async function replyToCampaignAction(_: FormState, formData: FormData): Promise<FormState> {
  const user = await assertUser();
  const m = await getActiveMembership(user.id);
  if (!m || !hasPermission(m, "responses.manage")) throw new ForbiddenError();
  const requestId = String(formData.get("requestId"));
  const message = String(formData.get("message") ?? "").trim().slice(0, 3000);
  if (message.length < 5) return fail(ka.validation.formErrors, formData, { message: ka.validation.required });
  const recipient = await db.campaignRecipient.findUnique({
    where: { requestId_companyId: { requestId, companyId: m.companyId } },
    include: { request: { select: { companyId: true, title: true, status: true, userId: true } } },
  });
  if (!recipient || recipient.request.status !== "RUNNING") throw new ForbiddenError();
  const conversationId = await openDirectConversation(user.id, m, recipient.request.companyId, `${c.campReplyPrefix(recipient.request.title)}\n\n${message}`, "campaign");
  if (!conversationId) return fail(ka.errors.generic);
  // The person who ordered the campaign hears about every reply.
  if (recipient.request.userId !== user.id) {
    await notify([recipient.request.userId], { type: "CAMPAIGN", title: c.campNewReply(recipient.request.title, m.company.tradeName || m.company.legalName), link: `/app/conversations/${conversationId}` });
  }
  await db.campaignRecipient.update({ where: { id: recipient.id }, data: { repliedAt: recipient.repliedAt ?? new Date(), viewedAt: recipient.viewedAt ?? new Date() } });
  await audit({ actorId: user.id, action: "campaign.replied", entityType: "CampaignRequest", entityId: requestId, metadata: { conversationId } });
  redirect(`/app/conversations/${conversationId}`);
}
