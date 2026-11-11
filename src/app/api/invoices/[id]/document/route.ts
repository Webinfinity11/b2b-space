import { audit } from "@/lib/audit";
import { getActiveMembership } from "@/lib/authz";
import { db } from "@/lib/db";
import { visibleInvoices } from "@/lib/scope";
import { getCurrentUser } from "@/lib/session";
import { mimeForKey, readStoredFile } from "@/lib/storage";

/** The seller's attached invoice/contract — only for the two parties (or an admin, audited). */
export async function GET(_req: Request, ctx: RouteContext<"/api/invoices/[id]/document">) {
  const { id } = await ctx.params;
  const user = await getCurrentUser();
  if (!user) return new Response("Unauthorized", { status: 401 });
  const isAdmin = user.platformRole === "ADMIN";
  const m = await getActiveMembership(user.id);
  const inv = await db.invoice.findFirst({
    where: isAdmin ? { id } : { AND: [{ id }, visibleInvoices(user.id, m)] },
    select: { id: true, documentKey: true, documentName: true },
  });
  if (!inv?.documentKey) return new Response("Not found", { status: 404 });
  if (isAdmin) await audit({ actorId: user.id, action: "invoice.document_viewed", entityType: "Invoice", entityId: inv.id });
  const data = await readStoredFile("private", inv.documentKey);
  if (!data) return new Response("Not found", { status: 404 });
  const mime = mimeForKey(inv.documentKey);
  return new Response(new Uint8Array(data), {
    headers: {
      "Content-Type": mime,
      "Content-Disposition": `inline; filename*=UTF-8''${encodeURIComponent(inv.documentName ?? "document")}`,
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
      ...(mime.endsWith("pdf") ? {} : { "Content-Security-Policy": "default-src 'none'; img-src 'self'; style-src 'unsafe-inline'; sandbox" }),
    },
  });
}
