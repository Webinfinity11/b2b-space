import { getActiveMembership } from "@/lib/authz";
import { db } from "@/lib/db";
import { visibleConversations } from "@/lib/scope";
import { getCurrentUser } from "@/lib/session";
import { mimeForKey, readStoredFile } from "@/lib/storage";

/** Chat attachments — only for users who can access the conversation. */
export async function GET(_req: Request, ctx: RouteContext<"/api/chat-files/[id]">) {
  const { id } = await ctx.params;
  const user = await getCurrentUser();
  if (!user) return new Response("Unauthorized", { status: 401 });
  const m = await getActiveMembership(user.id);
  const message = await db.message.findFirst({
    where: { id, kind: "FILE", conversation: visibleConversations(user.id, m) },
    select: { fileUrl: true, fileName: true },
  });
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
