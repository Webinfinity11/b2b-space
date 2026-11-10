import { activeChatGrant } from "@/lib/admin-access";
import { audit } from "@/lib/audit";
import { getActiveMembership } from "@/lib/authz";
import { db } from "@/lib/db";
import { visibleConversations } from "@/lib/scope";
import { getCurrentUser } from "@/lib/session";
import { mimeForKey, readStoredFile } from "@/lib/storage";

/** Chat attachments — only for users who can access the conversation, or an admin with an active, justified grant (audited). */
export async function GET(_req: Request, ctx: RouteContext<"/api/chat-files/[id]">) {
  const { id } = await ctx.params;
  const user = await getCurrentUser();
  if (!user) return new Response("Unauthorized", { status: 401 });
  const m = await getActiveMembership(user.id);
  let message = await db.message.findFirst({
    where: { id, kind: "FILE", conversation: visibleConversations(user.id, m) },
    select: { fileUrl: true, fileName: true, conversationId: true },
  });
  if (!message && user.platformRole === "ADMIN") {
    const candidate = await db.message.findFirst({ where: { id, kind: "FILE" }, select: { fileUrl: true, fileName: true, conversationId: true } });
    if (candidate && (await activeChatGrant(user.id, candidate.conversationId))) {
      message = candidate;
      await audit({ actorId: user.id, action: "conversation.admin_file_viewed", entityType: "Conversation", entityId: candidate.conversationId, metadata: { messageId: id } });
    }
  }
  if (!message?.fileUrl) return new Response("Not found", { status: 404 });
  const data = await readStoredFile("private", message.fileUrl);
  if (!data) return new Response("Not found", { status: 404 });
  const mime = mimeForKey(message.fileUrl);
  return new Response(new Uint8Array(data), {
    headers: {
      "Content-Type": mime,
      "Content-Disposition": `inline; filename*=UTF-8''${encodeURIComponent(message.fileName ?? "file")}`,
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
      ...(mime.endsWith("pdf") ? {} : { "Content-Security-Policy": "default-src 'none'; img-src 'self'; style-src 'unsafe-inline'; sandbox" }),
    },
  });
}
