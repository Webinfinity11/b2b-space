import "server-only";
import { ka } from "@/i18n/ka";
import { audit } from "./audit";
import type { Membership } from "./authz";
import { db } from "./db";
import { notify } from "./notify";

/**
 * Opens (or reuses) a direct negotiation between the user's active company and another approved
 * company. Returns the conversation id, or null when the target cannot be contacted.
 * `firstMessage` is posted by the initiator (e.g. a reply to a campaign).
 */
export async function openDirectConversation(userId: string, m: Membership, targetCompanyId: string, firstMessage?: string) {
  if (targetCompanyId === m.companyId) return null;
  const target = await db.company.findFirst({
    where: { id: targetCompanyId, verificationStatus: "VERIFIED" },
    select: { id: true, legalName: true, tradeName: true, members: { where: { status: "ACTIVE", role: "OWNER" }, select: { userId: true }, take: 1 } },
  });
  const ownerId = target?.members[0]?.userId;
  if (!target || !ownerId) return null;
  const mine = m.company.tradeName || m.company.legalName;

  const existing = await db.conversation.findFirst({
    where: { offerId: null, AND: [{ participants: { some: { companyId: m.companyId } } }, { participants: { some: { companyId: target.id } } }] },
    select: { id: true },
  });
  if (existing) {
    if (firstMessage) {
      await db.message.create({ data: { conversationId: existing.id, senderId: userId, kind: "TEXT", body: firstMessage } });
      await db.conversation.update({ where: { id: existing.id }, data: { lastMessageAt: new Date() } });
      await notify([ownerId], { type: "NEW_MESSAGE", title: ka.chat.newMessageNotification(mine), link: `/app/conversations/${existing.id}` });
    }
    return existing.id;
  }

  const theirs = target.tradeName || target.legalName;
  const conversation = await db.conversation.create({
    data: {
      subject: `${mine} ↔ ${theirs}`,
      participants: {
        create: [
          { userId: ownerId, companyId: target.id, side: "AUTHOR" },
          { userId, companyId: m.companyId, side: "RESPONDER", lastReadAt: new Date() },
        ],
      },
      messages: {
        create: [{ kind: "SYSTEM", body: "conversation.opened" }, ...(firstMessage ? [{ kind: "TEXT" as const, senderId: userId, body: firstMessage }] : [])],
      },
    },
  });
  await notify([ownerId], { type: "NEW_MESSAGE", title: ka.chat.newMessageNotification(mine), link: `/app/conversations/${conversation.id}` });
  await audit({ actorId: userId, action: "conversation.direct_opened", entityType: "Conversation", entityId: conversation.id, metadata: { from: m.companyId, to: target.id } });
  return conversation.id;
}
