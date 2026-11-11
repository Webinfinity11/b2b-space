import "server-only";
import { ka } from "@/i18n/ka";
import { audit } from "./audit";
import type { Membership } from "./authz";
import { db } from "./db";
import { notify } from "./notify";
import { hasPermission } from "./permissions";

/**
 * Opens (or reuses) a direct negotiation between the user's active company and another verified
 * company. Every active owner of the target joins the conversation; owners and members who handle
 * responses are notified. Returns the conversation id, or null when the target cannot be contacted.
 * `firstMessage` is posted by the initiator (e.g. a reply to a campaign).
 */
export async function openDirectConversation(
  userId: string,
  m: Membership,
  targetCompanyId: string,
  firstMessage?: string,
  origin: "direct" | "campaign" = "direct",
) {
  if (targetCompanyId === m.companyId) return null;
  const target = await db.company.findFirst({
    where: { id: targetCompanyId, verificationStatus: "VERIFIED" },
    select: { id: true, legalName: true, tradeName: true, members: { where: { status: "ACTIVE" }, select: { userId: true, role: true, permissions: true } } },
  });
  const owners = target?.members.filter((x) => x.role === "OWNER").map((x) => x.userId) ?? [];
  if (!target || owners.length === 0) return null;
  const handlers = target.members.filter((x) => hasPermission(x, "responses.manage")).map((x) => x.userId);
  const recipients = [...new Set([...owners, ...handlers])].filter((id) => id !== userId);
  const mine = m.company.tradeName || m.company.legalName;

  const existing = await db.conversation.findFirst({
    where: { offerId: null, AND: [{ participants: { some: { companyId: m.companyId } } }, { participants: { some: { companyId: target.id } } }] },
    select: { id: true },
  });
  if (existing) {
    if (firstMessage) {
      await db.message.create({ data: { conversationId: existing.id, senderId: userId, kind: "TEXT", body: firstMessage } });
      await db.conversation.update({ where: { id: existing.id }, data: { lastMessageAt: new Date() } });
      await notify(recipients, { type: "NEW_MESSAGE", title: ka.chat.newMessageNotification(mine), link: `/app/conversations/${existing.id}` });
    }
    return existing.id;
  }

  const theirs = target.tradeName || target.legalName;
  const conversation = await db.conversation.create({
    data: {
      subject: `${mine} ↔ ${theirs}`,
      participants: {
        create: [
          ...owners.filter((id) => id !== userId).map((id) => ({ userId: id, companyId: target.id, side: "AUTHOR" as const })),
          { userId, companyId: m.companyId, side: "RESPONDER", lastReadAt: new Date() },
        ],
      },
      messages: {
        create: [
          { kind: "SYSTEM", body: origin === "campaign" ? "conversation.campaign" : "conversation.direct" },
          ...(firstMessage ? [{ kind: "TEXT" as const, senderId: userId, body: firstMessage }] : []),
        ],
      },
    },
  });
  await notify(recipients, { type: "NEW_MESSAGE", title: ka.chat.newMessageNotification(mine), link: `/app/conversations/${conversation.id}` });
  await audit({ actorId: userId, action: "conversation.direct_opened", entityType: "Conversation", entityId: conversation.id, metadata: { from: m.companyId, to: target.id, origin } });
  return conversation.id;
}
