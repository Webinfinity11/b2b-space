import "server-only";
import { db } from "./db";

export const CHAT_ACCESS_ACTION = "conversation.admin_access";
/** How long one justified access grant lasts. */
export const CHAT_ACCESS_MINUTES = 30;

/** Active grant for this admin + conversation (from the audit log), or null. */
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
