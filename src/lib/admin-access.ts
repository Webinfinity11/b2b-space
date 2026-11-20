import "server-only";
import { audit } from "./audit";
import { db } from "./db";

export const CHAT_ACCESS_ACTION = "conversation.admin_access";
/** Platform admins may open any conversation directly; every viewing session is audited. */
export const CHAT_ACCESS_MINUTES = 30;

/** Window after which opening a conversation is logged again (the audit log records each viewing session). */
export async function activeChatGrant(adminId: string, conversationId: string) {
  return db.auditLog.findFirst({
    where: {
      actorId: adminId,
      action: CHAT_ACCESS_ACTION,
      entityType: "Conversation",
      entityId: conversationId,
      createdAt: { gte: new Date(Date.now() - CHAT_ACCESS_MINUTES * 60_000) },
    },
    orderBy: { createdAt: "desc" },
  });
}

/** Admin opens a conversation: reuse the current audit entry or record a new one (no justification needed). */
export async function ensureChatAccess(adminId: string, conversationId: string) {
  const existing = await activeChatGrant(adminId, conversationId);
  if (existing) return existing;
  await audit({ actorId: adminId, action: CHAT_ACCESS_ACTION, entityType: "Conversation", entityId: conversationId, metadata: { reason: "direct", direct: true } });
  return activeChatGrant(adminId, conversationId);
}
